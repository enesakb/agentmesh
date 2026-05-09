/**
 * @agentmesh/sdk
 *
 * High-level TypeScript surface across all six AgentMesh layers. Each agent
 * instantiates one `AgentMesh` configured with:
 *   - chain: target network (anvil | amoy | base-sepolia)
 *   - ownerKey: EOA private key that signs txs for the agent's smart account
 *
 * Smart-account-aware writes go through:
 *   wallet.execute(target, value, data)
 *   wallet.executeBatch(targets, values, datas)
 *
 * The owner EOA is the signer; the agent's smart account is the on-chain
 * "self" that all other layers see.
 */
import {
  http,
  type Account,
  type Address,
  type Hash,
  type Hex,
  type TransactionReceipt,
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodeFunctionData,
} from 'viem';
// Viem's specific generic types are intentionally elided here: AgentMeshDeps
// only needs the runtime methods exposed by the clients, and the chain-specific
// generic produces "two different types with this name" errors across the
// monorepo's hoisted viem copies. Treating clients opaquely keeps the SDK
// surface clean without losing useful safety (we still narrow on each call).
type AnyPublicClient = ReturnType<typeof createPublicClient<any, any>>;
type AnyWalletClient = ReturnType<typeof createWalletClient<any, any, any>>;
import {
  type Deployment,
  RPC_URLS,
  type SupportedChain,
  agentAccountAbi,
  agentAccountFactoryAbi,
  agentRegistryAbi,
  capabilityHash,
  loadDeployment,
  recoveryModuleAbi,
  reputationRegistryAbi,
  serviceMarketplaceAbi,
  spendingPolicyModuleAbi,
} from '@agentmesh/shared';
import { type FetchWithPaymentOptions, fetchWithPayment } from '@agentmesh/x402-client';
import pino from 'pino';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, foundry, polygonAmoy } from 'viem/chains';

const logger = pino({ name: 'agentmesh-sdk', level: process.env.LOG_LEVEL ?? 'info' });

export interface AgentMeshConfig {
  chain: SupportedChain;
  ownerKey: Hex;
  rpcUrl?: string;
  /** If you've already created a smart account, pass its address. Otherwise it's lazily computed. */
  agentAddress?: Address;
  /** Salt used for CREATE2 in the factory. Defaults to 1. */
  accountSalt?: bigint;
}

interface AgentMeshDeps {
  publicClient: AnyPublicClient;
  walletClient: AnyWalletClient;
  account: Account;
  deployment: Deployment;
  agentAddress: Address;
  config: AgentMeshConfig;
}

export class AgentMesh {
  readonly identity: IdentityModule;
  readonly wallet: WalletModule;
  readonly discovery: DiscoveryModule;
  readonly marketplace: MarketplaceModule;
  readonly payment: PaymentModule;
  readonly reputation: ReputationModule;

  private constructor(public readonly deps: AgentMeshDeps) {
    this.identity = new IdentityModule(deps);
    this.wallet = new WalletModule(deps);
    this.discovery = new DiscoveryModule(deps);
    this.marketplace = new MarketplaceModule(deps);
    this.payment = new PaymentModule(this);
    this.reputation = new ReputationModule(deps);
  }

  static async create(config: AgentMeshConfig): Promise<AgentMesh> {
    const chain = config.chain === 'anvil' ? foundry : config.chain === 'amoy' ? polygonAmoy : baseSepolia;
    const rpcUrl = config.rpcUrl ?? RPC_URLS[config.chain];

    const account = privateKeyToAccount(config.ownerKey);
    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
    const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

    const deployment = loadDeployment(config.chain);

    const salt = config.accountSalt ?? 1n;
    const predictedAddress = (await publicClient.readContract({
      address: deployment.accountFactory,
      abi: agentAccountFactoryAbi,
      functionName: 'getAddress',
      args: [account.address, salt],
    })) as Address;

    const agentAddress = config.agentAddress ?? predictedAddress;

    return new AgentMesh({
      publicClient,
      walletClient,
      account,
      deployment,
      agentAddress,
      config,
    });
  }

  get agentAddress(): Address {
    return this.deps.agentAddress;
  }

  get ownerAddress(): Address {
    return this.deps.account.address;
  }

  get deployment(): Deployment {
    return this.deps.deployment;
  }

  /// Wait for tx to be mined. Throws if status != success.
  async waitForTx(hash: Hash): Promise<TransactionReceipt> {
    const receipt = await this.deps.publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      throw new Error(`tx ${hash} failed: ${receipt.status}`);
    }
    return receipt;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Wallet (smart account)
// ─────────────────────────────────────────────────────────────────────────

export interface InstallPolicyOptions {
  dailyLimitWei: bigint;
  perTxLimitWei: bigint;
}

export class WalletModule {
  constructor(private deps: AgentMeshDeps) {}

  /**
   * Create the agent's smart account if it does not yet exist on-chain.
   * Idempotent — returns the existing address otherwise.
   */
  async create(): Promise<Address> {
    const { publicClient, walletClient, deployment, account, config } = this.deps;
    const salt = config.accountSalt ?? 1n;
    const predicted = this.deps.agentAddress;

    const code = await publicClient.getCode({ address: predicted });
    if (code && code !== '0x') {
      logger.info({ predicted }, 'smart account already deployed');
      return predicted;
    }

    const hash = await walletClient.writeContract({
      address: deployment.accountFactory,
      abi: agentAccountFactoryAbi,
      functionName: 'createAccount',
      args: [account.address, salt],
      chain: walletClient.chain,
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    logger.info({ predicted, hash }, 'smart account created');
    return predicted;
  }

  /// Execute an arbitrary call from the smart account.
  async execute(target: Address, value: bigint, data: Hex): Promise<Hash> {
    const { walletClient, account, agentAddress } = this.deps;
    return walletClient.writeContract({
      address: agentAddress,
      abi: agentAccountAbi,
      functionName: 'execute',
      args: [target, value, data],
      chain: walletClient.chain,
      account,
    });
  }

  async executeAndWait(target: Address, value: bigint, data: Hex): Promise<TransactionReceipt> {
    const hash = await this.execute(target, value, data);
    return this.deps.publicClient.waitForTransactionReceipt({ hash });
  }

  /// Set policy on the SpendingPolicyModule and install it as a hook on the account.
  /// Idempotent — safe to call multiple times.
  async installPolicy(opts: InstallPolicyOptions): Promise<void> {
    const { deployment, publicClient, walletClient, account, agentAddress } = this.deps;

    const setPolicyData = encodeFunctionData({
      abi: spendingPolicyModuleAbi,
      functionName: 'setPolicy',
      args: [opts.dailyLimitWei, opts.perTxLimitWei],
    });
    await this.executeAndWait(deployment.spendingPolicy, 0n, setPolicyData);

    // Check if hook is already installed
    const alreadyInstalled = (await publicClient.readContract({
      address: agentAddress,
      abi: agentAccountAbi,
      functionName: 'isModuleInstalled',
      args: [4n, deployment.spendingPolicy, '0x'],
    })) as boolean;

    if (alreadyInstalled) {
      logger.info({ agentAddress }, 'policy hook already installed; updated limits only');
      return;
    }

    const installHash = await walletClient.writeContract({
      address: agentAddress,
      abi: agentAccountAbi,
      functionName: 'installModule',
      args: [4n, deployment.spendingPolicy, '0x'],
      chain: walletClient.chain,
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: installHash });
    logger.info({ agentAddress, ...opts }, 'policy installed');
  }

  /// Configure social recovery guardians.
  async installRecovery(guardians: Address[], threshold: number): Promise<void> {
    const { deployment, walletClient, account, agentAddress, publicClient } = this.deps;

    // 1) point the account's recoveryModule at the deployed module
    const setRecHash = await walletClient.writeContract({
      address: agentAddress,
      abi: agentAccountAbi,
      functionName: 'setRecoveryModule',
      args: [deployment.recoveryModule],
      chain: walletClient.chain,
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: setRecHash });

    // 2) configure guardians via the account (so recovery._guardians[acct] is keyed correctly)
    const setGuardiansData = encodeFunctionData({
      abi: recoveryModuleAbi,
      functionName: 'setGuardians',
      args: [guardians, BigInt(threshold)],
    });
    await this.executeAndWait(deployment.recoveryModule, 0n, setGuardiansData);
    logger.info({ agentAddress, guardians, threshold }, 'recovery installed');
  }

  /// Fund the smart account from the owner EOA.
  async fund(amountWei: bigint): Promise<Hash> {
    const { walletClient, account, agentAddress } = this.deps;
    return walletClient.sendTransaction({
      to: agentAddress,
      value: amountWei,
      chain: walletClient.chain,
      account,
    });
  }

  async getBalance(): Promise<bigint> {
    return this.deps.publicClient.getBalance({ address: this.deps.agentAddress });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Identity
// ─────────────────────────────────────────────────────────────────────────

export interface RegisterOptions {
  name: string;
  metadataURI: string;
  capabilities: string[]; // human strings; hashed automatically
}

export class IdentityModule {
  constructor(private deps: AgentMeshDeps) {}

  async register(opts: RegisterOptions): Promise<TransactionReceipt> {
    const { deployment } = this.deps;
    const caps = opts.capabilities.map(capabilityHash);
    const data = encodeFunctionData({
      abi: agentRegistryAbi,
      functionName: 'register',
      args: [opts.name, opts.metadataURI, caps],
    });
    const hash = await new WalletModule(this.deps).execute(deployment.registry, 0n, data);
    return this.deps.publicClient.waitForTransactionReceipt({ hash });
  }

  async lookup(addr: Address) {
    return this.deps.publicClient.readContract({
      address: this.deps.deployment.registry,
      abi: agentRegistryAbi,
      functionName: 'lookup',
      args: [addr],
    });
  }

  async lookupByName(name: string) {
    return this.deps.publicClient.readContract({
      address: this.deps.deployment.registry,
      abi: agentRegistryAbi,
      functionName: 'lookupByName',
      args: [name],
    });
  }

  async isRegistered(addr: Address): Promise<boolean> {
    return (await this.deps.publicClient.readContract({
      address: this.deps.deployment.registry,
      abi: agentRegistryAbi,
      functionName: 'isRegistered',
      args: [addr],
    })) as boolean;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Discovery
// ─────────────────────────────────────────────────────────────────────────

export class DiscoveryModule {
  constructor(private deps: AgentMeshDeps) {}

  async findByCapability(capability: string): Promise<readonly Address[]> {
    return (await this.deps.publicClient.readContract({
      address: this.deps.deployment.registry,
      abi: agentRegistryAbi,
      functionName: 'findByCapability',
      args: [capabilityHash(capability)],
    })) as readonly Address[];
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Marketplace
// ─────────────────────────────────────────────────────────────────────────

export interface ListOptions {
  serviceURI: string;
  priceWei: bigint;
}

export class MarketplaceModule {
  constructor(private deps: AgentMeshDeps) {}

  async list(opts: ListOptions): Promise<bigint> {
    const { deployment, publicClient } = this.deps;
    const data = encodeFunctionData({
      abi: serviceMarketplaceAbi,
      functionName: 'createListing',
      args: [opts.serviceURI, opts.priceWei],
    });
    const hash = await new WalletModule(this.deps).execute(deployment.marketplace, 0n, data);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== deployment.marketplace.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({ abi: serviceMarketplaceAbi, data: log.data, topics: log.topics });
        if (decoded.eventName === 'ListingCreated') {
          return decoded.args.listingId;
        }
      } catch {}
    }
    throw new Error('ListingCreated event not found');
  }

  async deactivate(listingId: bigint): Promise<void> {
    const { deployment } = this.deps;
    const data = encodeFunctionData({
      abi: serviceMarketplaceAbi,
      functionName: 'deactivateListing',
      args: [listingId],
    });
    const hash = await new WalletModule(this.deps).execute(deployment.marketplace, 0n, data);
    await this.deps.publicClient.waitForTransactionReceipt({ hash });
  }

  async buy(listingId: bigint): Promise<bigint> {
    const { deployment, publicClient } = this.deps;
    const listing = await this.getListing(listingId);
    if (!listing.active) throw new Error('listing not active');

    const data = encodeFunctionData({
      abi: serviceMarketplaceAbi,
      functionName: 'placeOrder',
      args: [listingId],
    });
    const hash = await new WalletModule(this.deps).execute(deployment.marketplace, listing.priceWei, data);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== deployment.marketplace.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({ abi: serviceMarketplaceAbi, data: log.data, topics: log.topics });
        if (decoded.eventName === 'OrderPlaced') {
          return decoded.args.orderId;
        }
      } catch {}
    }
    throw new Error('OrderPlaced event not found');
  }

  async complete(orderId: bigint, proof: Hex): Promise<void> {
    const { deployment } = this.deps;
    const data = encodeFunctionData({
      abi: serviceMarketplaceAbi,
      functionName: 'completeOrder',
      args: [orderId, proof],
    });
    const hash = await new WalletModule(this.deps).execute(deployment.marketplace, 0n, data);
    await this.deps.publicClient.waitForTransactionReceipt({ hash });
  }

  async refund(orderId: bigint): Promise<void> {
    const { deployment } = this.deps;
    const data = encodeFunctionData({
      abi: serviceMarketplaceAbi,
      functionName: 'refundOrder',
      args: [orderId],
    });
    const hash = await new WalletModule(this.deps).execute(deployment.marketplace, 0n, data);
    await this.deps.publicClient.waitForTransactionReceipt({ hash });
  }

  async getListing(listingId: bigint) {
    return this.deps.publicClient.readContract({
      address: this.deps.deployment.marketplace,
      abi: serviceMarketplaceAbi,
      functionName: 'getListing',
      args: [listingId],
    });
  }

  async getOrder(orderId: bigint) {
    return this.deps.publicClient.readContract({
      address: this.deps.deployment.marketplace,
      abi: serviceMarketplaceAbi,
      functionName: 'getOrder',
      args: [orderId],
    });
  }

  async getActiveListings(provider: Address): Promise<readonly bigint[]> {
    return (await this.deps.publicClient.readContract({
      address: this.deps.deployment.marketplace,
      abi: serviceMarketplaceAbi,
      functionName: 'getActiveListingsByProvider',
      args: [provider],
    })) as readonly bigint[];
  }

  /** Convenience: pick the first active listing for a given provider. */
  async findFirstActiveListingFor(provider: Address) {
    const listings = await this.getActiveListings(provider);
    if (listings.length === 0) return null;
    const id = listings[0];
    return { id, ...(await this.getListing(id)) };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Payment (x402)
// ─────────────────────────────────────────────────────────────────────────

export interface FetchWithPaymentArgs {
  url: string;
  maxAmountWei: bigint;
  allowedNetworks?: string[];
  init?: RequestInit;
}

export class PaymentModule {
  constructor(private mesh: AgentMesh) {}

  async fetchWithPayment(args: FetchWithPaymentArgs): Promise<Response> {
    const opts: FetchWithPaymentOptions = {
      maxAmountWei: args.maxAmountWei,
      allowedNetworks: args.allowedNetworks,
      init: args.init,
      placeOrder: async ({ marketplace, listingId, amountWei }) => {
        // Sanity-check that the marketplace in the challenge matches our deployment
        if (marketplace.toLowerCase() !== this.mesh.deployment.marketplace.toLowerCase()) {
          throw new Error(
            `challenge marketplace ${marketplace} != deployment ${this.mesh.deployment.marketplace}`,
          );
        }
        const orderId = await this.mesh.marketplace.buy(listingId);
        // amountWei is informational; the contract enforces priceWei via msg.value
        void amountWei;
        return { orderId };
      },
    };
    return fetchWithPayment(args.url, opts);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Reputation
// ─────────────────────────────────────────────────────────────────────────

export interface ReputationView {
  totalTxCount: bigint;
  successCount: bigint;
  failureCount: bigint;
  totalVolumeWei: bigint;
  firstSeenTimestamp: bigint;
  lastSeenTimestamp: bigint;
  uniqueCounterpartiesCount: bigint;
  score: bigint;
}

export class ReputationModule {
  constructor(private deps: AgentMeshDeps) {}

  async get(addr: Address): Promise<ReputationView> {
    const stats = (await this.deps.publicClient.readContract({
      address: this.deps.deployment.reputation,
      abi: reputationRegistryAbi,
      functionName: 'getReputation',
      args: [addr],
    })) as {
      totalTxCount: bigint;
      successCount: bigint;
      failureCount: bigint;
      totalVolumeWei: bigint;
      firstSeenTimestamp: bigint;
      lastSeenTimestamp: bigint;
      uniqueCounterpartiesCount: bigint;
    };
    const score = (await this.deps.publicClient.readContract({
      address: this.deps.deployment.reputation,
      abi: reputationRegistryAbi,
      functionName: 'getReputationScore',
      args: [addr],
    })) as bigint;
    return { ...stats, score };
  }
}
