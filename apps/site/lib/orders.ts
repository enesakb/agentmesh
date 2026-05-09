/**
 * In-memory order book for the demo agent endpoint.
 *
 * Real AgentMesh deployments store orders on-chain in
 * `ServiceMarketplace.placeOrder()`. This module is the hosted equivalent:
 * a single-process Map that holds orders for a few minutes and rejects
 * replay.
 *
 * Edge runtime resets the map on cold start — fine for a demo, intentional
 * (we don't want hosted state to grow without bound). The site labels this
 * mode "agentmesh-demo" not "polygon-amoy" so visitors aren't misled.
 */

export type OrderStatus = 'created' | 'completed' | 'expired';

export interface DemoOrder {
  id: string;
  listingId: string;
  priceWei: string;
  status: OrderStatus;
  createdAt: number;
  expiresAt: number;
  completedAt?: number;
}

export const ALPHA_ADDRESS = '0x74De72391f09EF3F5491e33D751b2a67BAaEf633';
export const MARKETPLACE_ADDRESS = '0x0165878A594ca255338adfa4d48449f69242Eb8F';
export const LISTING_ID = '5';
export const PRICE_WEI = '1000000000000000'; // 0.001 ETH

// Module-scoped Map — persists across requests within a single instance.
const _orders = new Map<string, DemoOrder>();

let _counter = 0;

export const orders = _orders;

export function makeOrder(): DemoOrder {
  _counter += 1;
  // Mix in a wall-clock low-res tick + counter so colliding instances see distinct ids.
  const id = `${Date.now().toString(36)}-${_counter.toString(36)}`;
  const o: DemoOrder = {
    id,
    listingId: LISTING_ID,
    priceWei: PRICE_WEI,
    status: 'created',
    createdAt: Date.now(),
    expiresAt: Date.now() + 60_000,
  };
  return o;
}
