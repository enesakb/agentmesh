import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Address, keccak256, stringToBytes } from 'viem';

export * from './abis/index.js';

export type SupportedChain =
  | 'anvil'
  | 'amoy'
  | 'base-sepolia'
  | 'arbitrum-sepolia'
  | 'optimism-sepolia'
  | 'sonic-testnet';

export interface Deployment {
  chainId: number;
  blockNumber?: number;
  deployer: Address;
  registry: Address;
  reputation: Address;
  marketplace: Address;
  accountImpl: Address;
  accountFactory: Address;
  spendingPolicy: Address;
  recoveryModule: Address;
}

export interface ChainMeta {
  name: string;
  shortName: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl?: string;
  faucetUrl?: string;
  status: 'live' | 'planned' | 'local';
}

export const CHAINS: Record<SupportedChain, ChainMeta> = {
  anvil: {
    name: 'Anvil (local)',
    shortName: 'anvil',
    chainId: 31337,
    rpcUrl: 'http://127.0.0.1:8545',
    status: 'local',
  },
  amoy: {
    name: 'Polygon Amoy',
    shortName: 'amoy',
    chainId: 80002,
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorerUrl: 'https://amoy.polygonscan.com',
    faucetUrl: 'https://faucet.polygon.technology',
    status: 'planned',
  },
  'base-sepolia': {
    name: 'Base Sepolia',
    shortName: 'base',
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    faucetUrl: 'https://www.alchemy.com/faucets/base-sepolia',
    status: 'planned',
  },
  'arbitrum-sepolia': {
    name: 'Arbitrum Sepolia',
    shortName: 'arb',
    chainId: 421614,
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    faucetUrl: 'https://www.alchemy.com/faucets/arbitrum-sepolia',
    status: 'planned',
  },
  'optimism-sepolia': {
    name: 'Optimism Sepolia',
    shortName: 'op',
    chainId: 11155420,
    rpcUrl: 'https://sepolia.optimism.io',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    faucetUrl: 'https://app.optimism.io/faucet',
    status: 'planned',
  },
  'sonic-testnet': {
    name: 'Sonic Testnet',
    shortName: 'sonic',
    chainId: 64165,
    rpcUrl: 'https://rpc.testnet.soniclabs.com',
    explorerUrl: 'https://testnet.sonicscan.org',
    faucetUrl: 'https://testnet.soniclabs.com/account',
    status: 'planned',
  },
};

// Back-compat exports
export const CHAIN_IDS: Record<SupportedChain, number> = Object.fromEntries(
  Object.entries(CHAINS).map(([k, v]) => [k, v.chainId]),
) as Record<SupportedChain, number>;

export const RPC_URLS: Record<SupportedChain, string> = Object.fromEntries(
  Object.entries(CHAINS).map(([k, v]) => [k, v.rpcUrl]),
) as Record<SupportedChain, string>;

/// Map a string capability ("data.weather") to its on-chain bytes32 hash.
export function capabilityHash(capability: string): `0x${string}` {
  return keccak256(stringToBytes(capability));
}

/// Reverse mapping is not on-chain; in MVP the SDK keeps a small registry.
/// Use this only for UI/debugging.
const KNOWN_CAPABILITIES = [
  'data.weather',
  'data.crypto-price',
  'data.news',
  'compute.image',
  'compute.text',
  'consumer',
] as const;
const HASH_TO_NAME: Record<string, string> = {};
for (const c of KNOWN_CAPABILITIES) HASH_TO_NAME[capabilityHash(c)] = c;
export function capabilityName(hash: `0x${string}`): string | undefined {
  return HASH_TO_NAME[hash];
}

/// Resolve absolute path to deployments/<chain>.json relative to repo root.
function findRepoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // packages/shared/src → repo root
  return resolve(here, '..', '..', '..');
}

export function loadDeployment(chain: SupportedChain): Deployment {
  const root = findRepoRoot();
  const path = join(root, 'deployments', `${chain}.json`);
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return {
    chainId: Number(raw.chainId),
    blockNumber: raw.blockNumber !== undefined ? Number(raw.blockNumber) : undefined,
    deployer: raw.deployer as Address,
    registry: raw.registry as Address,
    reputation: raw.reputation as Address,
    marketplace: raw.marketplace as Address,
    accountImpl: raw.accountImpl as Address,
    accountFactory: raw.accountFactory as Address,
    spendingPolicy: raw.spendingPolicy as Address,
    recoveryModule: raw.recoveryModule as Address,
  };
}

export const ZERO_BYTES = '0x' as `0x${string}`;
