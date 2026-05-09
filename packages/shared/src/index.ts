import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Address, keccak256, stringToBytes } from 'viem';

export * from './abis/index.js';

export type SupportedChain = 'anvil' | 'amoy' | 'base-sepolia';

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

export const CHAIN_IDS: Record<SupportedChain, number> = {
  anvil: 31337,
  amoy: 80002,
  'base-sepolia': 84532,
};

export const RPC_URLS: Record<SupportedChain, string> = {
  anvil: process.env.ANVIL_RPC ?? 'http://127.0.0.1:8545',
  amoy: process.env.POLYGON_AMOY_RPC ?? 'https://rpc-amoy.polygon.technology',
  'base-sepolia': process.env.BASE_SEPOLIA_RPC ?? 'https://sepolia.base.org',
};

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
