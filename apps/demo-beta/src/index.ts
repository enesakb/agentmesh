/**
 * demo-beta — consumer agent.
 *
 * Steps:
 *   1. Bootstrap AgentMesh, create+fund smart account.
 *   2. Register identity (capability: consumer).
 *   3. Discover providers with 'data.weather'.
 *   4. For the first provider: pick its active listing.
 *   5. fetchWithPayment(...) — automatically places an order on 402, retries.
 *   6. Print response data and reputation views.
 */
import 'dotenv/config';
import { AgentMesh } from '@agentmesh/sdk';
import type { SupportedChain } from '@agentmesh/shared';
import pino from 'pino';
import { type Hex, formatEther, parseEther } from 'viem';

const log = pino({
  name: 'demo-beta',
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.stdout.isTTY
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
});

const CHAIN = (process.env.AGENTMESH_CHAIN ?? 'anvil') as SupportedChain;
const CITY = process.argv[2] ?? 'Berlin';
const MAX_AMOUNT = parseEther('0.01');

async function main() {
  const ownerKey = process.env.PRIVATE_KEY_BETA as Hex;
  if (!ownerKey) throw new Error('PRIVATE_KEY_BETA missing');

  const mesh = await AgentMesh.create({ chain: CHAIN, ownerKey });
  log.info({ owner: mesh.ownerAddress, agent: mesh.agentAddress }, 'mesh created');

  await mesh.wallet.create();
  const balBefore = await mesh.wallet.getBalance();
  if (balBefore < parseEther('0.5')) {
    log.info('funding smart account from owner...');
    const fundTx = await mesh.wallet.fund(parseEther('1'));
    await mesh.waitForTx(fundTx);
  }
  log.info({ bal: formatEther(await mesh.wallet.getBalance()) }, 'smart account funded');

  const isReg = await mesh.identity.isRegistered(mesh.agentAddress);
  if (!isReg) {
    await mesh.identity.register({
      name: `demo-beta-${Date.now()}`,
      metadataURI: `data:application/json,${encodeURIComponent(JSON.stringify({ kind: 'demo-beta' }))}`,
      capabilities: ['consumer'],
    });
    log.info('registered as beta');
  }

  // Discovery
  const providers = await mesh.discovery.findByCapability('data.weather');
  log.info({ count: providers.length, providers }, 'providers found');
  if (providers.length === 0) throw new Error('no weather provider found — is alpha running?');

  // For each provider, find the first active listing; the alpha demo creates a fresh one each run
  let chosen: { provider: `0x${string}`; listingId: bigint; priceWei: bigint; serviceURI: string } | null =
    null;
  for (const provider of providers) {
    const listing = await mesh.marketplace.findFirstActiveListingFor(provider);
    if (listing) {
      chosen = {
        provider,
        listingId: listing.id,
        priceWei: listing.priceWei,
        serviceURI: listing.serviceURI,
      };
      break;
    }
  }
  if (!chosen) throw new Error('no active listing among providers');

  log.info(
    { ...chosen, listingId: chosen.listingId.toString(), priceWei: formatEther(chosen.priceWei) },
    'chosen listing',
  );

  // x402 fetch — alpha will respond 402, we place an order, retry, and get the data
  const url = `${chosen.serviceURI}/${encodeURIComponent(CITY)}`;
  log.info({ url }, 'fetching with payment');

  const res = await mesh.payment.fetchWithPayment({
    url,
    maxAmountWei: MAX_AMOUNT,
    allowedNetworks: [CHAIN],
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fetch failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  log.info({ data }, '✅ received data');

  // Wait briefly for the provider's auto-complete to settle
  await new Promise((r) => setTimeout(r, 2000));

  // Reputation
  const alphaRep = await mesh.reputation.get(chosen.provider);
  const betaRep = await mesh.reputation.get(mesh.agentAddress);
  log.info(
    {
      alpha: {
        success: alphaRep.successCount.toString(),
        failure: alphaRep.failureCount.toString(),
        score: alphaRep.score.toString(),
        volume: formatEther(alphaRep.totalVolumeWei),
      },
      beta: {
        success: betaRep.successCount.toString(),
        failure: betaRep.failureCount.toString(),
        score: betaRep.score.toString(),
        volume: formatEther(betaRep.totalVolumeWei),
      },
    },
    'reputation snapshot',
  );

  console.log('');
  console.log('=================================================');
  console.log('  ✅ End-to-end demo successful');
  console.log('=================================================');
  console.log(`  city        : ${CITY}`);
  console.log(`  data        : ${JSON.stringify(data)}`);
  console.log(`  provider    : ${chosen.provider}`);
  console.log(`  consumer    : ${mesh.agentAddress}`);
  console.log(`  paid        : ${formatEther(chosen.priceWei)} ETH`);
  console.log(`  alpha rep   : success=${alphaRep.successCount} score=${alphaRep.score}`);
  console.log(`  beta  rep   : success=${betaRep.successCount} score=${betaRep.score}`);
  console.log('=================================================');
}

main().catch((err) => {
  console.error('[beta-fatal]', err);
  process.exit(1);
});
