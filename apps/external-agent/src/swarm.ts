/**
 * Swarm — 50-agent mass stress test on local anvil.
 *
 * Spawns N agents (default 50), each owning a smart account funded from
 * Anvil's prefunded accounts. Each agent picks a role (provider or consumer
 * by parity), registers with one of 8 capabilities, and runs an event loop:
 *   - Providers: list a service, await orders, complete them
 *   - Consumers: pick a random matching provider, place an order, expect data
 *
 * The simulation runs for DURATION_MS or until ORDER_TARGET orders settle.
 * Reports per-agent + aggregate metrics: tx count, escrow throughput, gas,
 * reputation score distribution.
 *
 * Designed to run against `pnpm anvil` (chain 31337). Produces JSON to
 * `docs/swarm-results.json` for the site to render.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  http,
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodeFunctionData,
  keccak256,
  parseEther,
  stringToBytes,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';

const here = dirname(fileURLToPath(import.meta.url));

const N = Number(process.env.N ?? 50);
const DURATION_MS = Number(process.env.DURATION_MS ?? 5 * 60_000);
const ORDER_TARGET = Number(process.env.ORDER_TARGET ?? 200);
const TICK_MS = 250;

const RPC = process.env.ANVIL_RPC ?? 'http://127.0.0.1:8545';

// Inline minimal ABIs so we don't need workspace links.
const factoryAbi = [
  {
    name: 'createAccount',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'salt', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'salt', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

const accountAbi = [
  {
    name: 'execute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

const registryAbi = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'metadataURI', type: 'string' },
      { name: 'capabilities', type: 'bytes32[]' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'findByCapability',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'capability', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'isRegistered',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

const marketAbi = [
  {
    name: 'createListing',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'serviceURI', type: 'string' },
      { name: 'priceWei', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'placeOrder',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'completeOrder',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'proof', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'getActiveListingsByProvider',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'provider', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'getListing',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'provider', type: 'address' },
          { name: 'serviceURI', type: 'string' },
          { name: 'priceWei', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'nextOrderId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'OrderPlaced',
    type: 'event',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: true, name: 'listingId', type: 'uint256' },
      { indexed: true, name: 'consumer', type: 'address' },
      { indexed: false, name: 'provider', type: 'address' },
      { indexed: false, name: 'priceWei', type: 'uint256' },
    ],
  },
] as const;

const reputationAbi = [
  {
    name: 'getReputation',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'totalTxCount', type: 'uint128' },
          { name: 'successCount', type: 'uint128' },
          { name: 'failureCount', type: 'uint128' },
          { name: 'totalVolumeWei', type: 'uint256' },
          { name: 'firstSeenTimestamp', type: 'uint64' },
          { name: 'lastSeenTimestamp', type: 'uint64' },
          { name: 'uniqueCounterpartiesCount', type: 'uint128' },
        ],
      },
    ],
  },
  {
    name: 'getReputationScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const CAPABILITIES = [
  'data.weather',
  'data.crypto-price',
  'data.news',
  'data.sports',
  'compute.image',
  'compute.text',
  'compute.search',
  'compute.translate',
];

interface Deployment {
  registry: Address;
  reputation: Address;
  marketplace: Address;
  accountFactory: Address;
}

interface Agent {
  id: number;
  role: 'provider' | 'consumer';
  ownerKey: Hex;
  ownerAddr: Address;
  smartAccount: Address;
  capability: string;
  capabilityHash: `0x${string}`;
  listingId?: bigint;
  priceWei: bigint;
}

const FUNDED_ANVIL_KEYS: Hex[] = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
];

async function loadDeployment(): Promise<Deployment> {
  const path = join(here, '..', '..', '..', 'deployments', 'anvil.json');
  const { readFileSync } = await import('node:fs');
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return {
    registry: raw.registry,
    reputation: raw.reputation,
    marketplace: raw.marketplace,
    accountFactory: raw.accountFactory,
  };
}

function capHash(s: string): `0x${string}` {
  return keccak256(stringToBytes(s));
}

async function spawnAgents(N: number, deployment: Deployment): Promise<Agent[]> {
  const agents: Agent[] = [];
  const fundingAccount = privateKeyToAccount(FUNDED_ANVIL_KEYS[0]);
  const publicClient = createPublicClient({ chain: foundry, transport: http(RPC) });
  const fundingClient = createWalletClient({ chain: foundry, account: fundingAccount, transport: http(RPC) });

  for (let i = 0; i < N; i++) {
    const ownerKey = generatePrivateKey();
    const ownerAccount = privateKeyToAccount(ownerKey);

    // fund owner with 5 ETH
    const fundTx = await fundingClient.sendTransaction({
      to: ownerAccount.address,
      value: parseEther('5'),
    });
    await publicClient.waitForTransactionReceipt({ hash: fundTx });

    // create smart account
    const ownerClient = createWalletClient({ chain: foundry, account: ownerAccount, transport: http(RPC) });
    const salt = BigInt(i + 1);
    const createTx = await ownerClient.writeContract({
      address: deployment.accountFactory,
      abi: factoryAbi,
      functionName: 'createAccount',
      args: [ownerAccount.address, salt],
    });
    await publicClient.waitForTransactionReceipt({ hash: createTx });
    const smartAccount = await publicClient.readContract({
      address: deployment.accountFactory,
      abi: factoryAbi,
      functionName: 'getAddress',
      args: [ownerAccount.address, salt],
    });

    // fund smart account
    const fundAcct = await fundingClient.sendTransaction({ to: smartAccount, value: parseEther('1') });
    await publicClient.waitForTransactionReceipt({ hash: fundAcct });

    const role: 'provider' | 'consumer' = i % 2 === 0 ? 'provider' : 'consumer';
    // Pair providers and consumers on the SAME capability — provider i=0 and
    // consumer i=1 both get capability 0, etc. Without this every consumer
    // sees an empty `findByCapability` result and the swarm idles.
    const capability = CAPABILITIES[Math.floor(i / 2) % CAPABILITIES.length];
    agents.push({
      id: i,
      role,
      ownerKey,
      ownerAddr: ownerAccount.address,
      smartAccount,
      capability,
      capabilityHash: capHash(capability),
      priceWei: parseEther(`0.00${(i % 9) + 1}`),
    });
  }
  return agents;
}

async function registerAndList(a: Agent, deployment: Deployment) {
  const owner = privateKeyToAccount(a.ownerKey);
  const client = createWalletClient({ chain: foundry, account: owner, transport: http(RPC) });
  const pub = createPublicClient({ chain: foundry, transport: http(RPC) });

  const registerData = encodeFunctionData({
    abi: registryAbi,
    functionName: 'register',
    args: [`agent-${a.id}`, `data:application/json,{"role":"${a.role}"}`, [a.capabilityHash]],
  });
  const txReg = await client.writeContract({
    address: a.smartAccount,
    abi: accountAbi,
    functionName: 'execute',
    args: [deployment.registry, 0n, registerData],
  });
  await pub.waitForTransactionReceipt({ hash: txReg });

  if (a.role === 'provider') {
    const listData = encodeFunctionData({
      abi: marketAbi,
      functionName: 'createListing',
      args: [`memory://agent-${a.id}/${a.capability}`, a.priceWei],
    });
    const txList = await client.writeContract({
      address: a.smartAccount,
      abi: accountAbi,
      functionName: 'execute',
      args: [deployment.marketplace, 0n, listData],
    });
    await pub.waitForTransactionReceipt({ hash: txList });

    const listings = await pub.readContract({
      address: deployment.marketplace,
      abi: marketAbi,
      functionName: 'getActiveListingsByProvider',
      args: [a.smartAccount],
    });
    if (listings.length > 0) a.listingId = listings[listings.length - 1];
  }
}

async function consumerTick(a: Agent, agents: Agent[], deployment: Deployment) {
  const matchingProviders = agents.filter(
    (p) => p.role === 'provider' && p.capability === a.capability && p.listingId !== undefined,
  );
  if (matchingProviders.length === 0) return null;
  const target = matchingProviders[Math.floor(Math.random() * matchingProviders.length)];

  const owner = privateKeyToAccount(a.ownerKey);
  const client = createWalletClient({ chain: foundry, account: owner, transport: http(RPC) });
  const pub = createPublicClient({ chain: foundry, transport: http(RPC) });

  const listing = await pub.readContract({
    address: deployment.marketplace,
    abi: marketAbi,
    functionName: 'getListing',
    args: [target.listingId!],
  });

  const placeData = encodeFunctionData({
    abi: marketAbi,
    functionName: 'placeOrder',
    args: [target.listingId!],
  });

  try {
    const tx = await client.writeContract({
      address: a.smartAccount,
      abi: accountAbi,
      functionName: 'execute',
      args: [deployment.marketplace, listing.priceWei, placeData],
    });
    const receipt = await pub.waitForTransactionReceipt({ hash: tx });

    let orderId: bigint | undefined;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== deployment.marketplace.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({ abi: marketAbi, data: log.data, topics: log.topics });
        if (decoded.eventName === 'OrderPlaced') {
          orderId = decoded.args.orderId;
          break;
        }
      } catch {}
    }
    return { provider: target, orderId };
  } catch {
    return null;
  }
}

async function providerComplete(p: Agent, orderId: bigint, deployment: Deployment) {
  const owner = privateKeyToAccount(p.ownerKey);
  const client = createWalletClient({ chain: foundry, account: owner, transport: http(RPC) });
  const pub = createPublicClient({ chain: foundry, transport: http(RPC) });
  const data = encodeFunctionData({
    abi: marketAbi,
    functionName: 'completeOrder',
    args: [orderId, '0x' as Hex],
  });
  try {
    const tx = await client.writeContract({
      address: p.smartAccount,
      abi: accountAbi,
      functionName: 'execute',
      args: [deployment.marketplace, 0n, data],
    });
    await pub.waitForTransactionReceipt({ hash: tx });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`[swarm] target=${RPC}  N=${N}  duration=${DURATION_MS}ms  order_target=${ORDER_TARGET}`);

  const deployment = await loadDeployment();
  console.log(`[swarm] deployment loaded: ${deployment.marketplace}`);

  console.log(`[swarm] spawning ${N} agents (each gets owner-EOA + smart account, both funded)…`);
  const agents = await spawnAgents(N, deployment);
  console.log(`[swarm] ✓ ${agents.length} agents spawned`);

  console.log(`[swarm] registering identities + provider listings…`);
  for (const a of agents) {
    await registerAndList(a, deployment);
  }
  console.log(
    `[swarm] ✓ registry populated, ${agents.filter((a) => a.role === 'provider').length} listings active`,
  );

  const start = Date.now();
  let placed = 0;
  let completed = 0;
  let failed = 0;
  const consumers = agents.filter((a) => a.role === 'consumer');

  console.log(`[swarm] starting trade loop…`);
  while (Date.now() - start < DURATION_MS && completed < ORDER_TARGET) {
    const c = consumers[Math.floor(Math.random() * consumers.length)];
    const order = await consumerTick(c, agents, deployment);
    if (order && order.orderId !== undefined) {
      placed++;
      const ok = await providerComplete(order.provider, order.orderId, deployment);
      if (ok) completed++;
      else failed++;
      if (completed % 10 === 0) console.log(`  ${completed} orders settled, ${failed} failed`);
    }
    await new Promise((r) => setTimeout(r, TICK_MS));
  }

  const wallTime = Date.now() - start;
  console.log(`[swarm] loop ended after ${wallTime}ms`);

  // Aggregate reputation
  const pub = createPublicClient({ chain: foundry, transport: http(RPC) });
  const reputations: { agent: number; success: bigint; total: bigint; score: bigint; volume: bigint }[] = [];
  for (const a of agents) {
    const stats = await pub.readContract({
      address: deployment.reputation,
      abi: reputationAbi,
      functionName: 'getReputation',
      args: [a.smartAccount],
    });
    const score = await pub.readContract({
      address: deployment.reputation,
      abi: reputationAbi,
      functionName: 'getReputationScore',
      args: [a.smartAccount],
    });
    reputations.push({
      agent: a.id,
      success: stats.successCount,
      total: stats.totalTxCount,
      volume: stats.totalVolumeWei,
      score,
    });
  }

  const totalVolume = reputations.reduce((s, r) => s + r.volume, 0n);
  const topByScore = [...reputations].sort((a, b) => Number(b.score - a.score)).slice(0, 5);

  const summary = {
    n_agents: N,
    providers: agents.filter((a) => a.role === 'provider').length,
    consumers: agents.filter((a) => a.role === 'consumer').length,
    duration_ms: wallTime,
    orders_placed: placed,
    orders_completed: completed,
    orders_failed: failed,
    settle_rate: completed / Math.max(1, placed),
    throughput_per_sec: completed / (wallTime / 1000),
    total_volume_wei: totalVolume.toString(),
    top_5_by_score: topByScore.map((r) => ({
      agent: r.agent,
      success: Number(r.success),
      total: Number(r.total),
      score: Number(r.score),
    })),
  };

  console.log('\n=== summary ===');
  console.log(
    `  agents          : ${summary.n_agents} (${summary.providers} prov + ${summary.consumers} cons)`,
  );
  console.log(`  duration        : ${(wallTime / 1000).toFixed(1)}s`);
  console.log(`  orders placed   : ${summary.orders_placed}`);
  console.log(`  orders settled  : ${summary.orders_completed}`);
  console.log(`  failures        : ${summary.orders_failed}`);
  console.log(`  settle rate     : ${(summary.settle_rate * 100).toFixed(1)}%`);
  console.log(`  throughput      : ${summary.throughput_per_sec.toFixed(2)} orders/sec`);
  console.log(`  total volume    : ${(Number(totalVolume) / 1e18).toFixed(4)} ETH`);
  console.log(`  top by score    : ${topByScore.map((r) => `#${r.agent}=${r.score}`).join(', ')}`);

  const outPath = join(here, '..', '..', '..', 'docs', 'swarm-results.json');
  writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`\n  wrote ${outPath}`);
}

main().catch((err) => {
  console.error('[swarm] fatal:', err);
  process.exit(1);
});
