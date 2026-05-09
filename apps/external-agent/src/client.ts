/**
 * External AgentMesh client — exactly what a third-party developer would write
 * after reading the README. Uses ONLY public HTTP — no internal imports, no
 * shared types, no privileged knowledge of the deployment.
 *
 * Two helpers:
 *   - placeOrder(): POST /api/orders → signed orderId
 *   - fetchPaid(): GET /api/weather/<city> with X-PAYMENT, retrying through 402
 */

const BASE = process.env.AGENTMESH_BASE ?? 'https://agentmesh-neon.vercel.app';

export interface PlacedOrder {
  orderId: string;
  listingId: string;
  priceWei: string;
  expiresAt: number;
}

export interface WeatherResult {
  city: string;
  tempC: number;
  conditions: string;
  humidity: number;
  source: string;
  served_by: string;
  orderId: string;
  settled: boolean;
  timestamp: string;
}

export interface AttemptResult {
  ok: boolean;
  status: number;
  body: unknown;
  latencyMs: number;
}

export async function placeOrder(): Promise<PlacedOrder> {
  const res = await fetch(`${BASE}/api/orders`, { method: 'POST' });
  if (!res.ok) throw new Error(`placeOrder failed: ${res.status}`);
  return (await res.json()) as PlacedOrder;
}

/**
 * Full x402 round-trip. First request is unauthenticated → expects 402.
 * Then places an order. Then retries with X-PAYMENT.
 */
export async function fetchPaid(city: string): Promise<{ result: WeatherResult; tracelog: AttemptResult[] }> {
  const tracelog: AttemptResult[] = [];

  // 1) initial 402 challenge
  const t0 = Date.now();
  const r1 = await fetch(`${BASE}/api/weather/${encodeURIComponent(city)}`);
  const b1 = await safeJson(r1);
  tracelog.push({ ok: r1.status === 402, status: r1.status, body: b1, latencyMs: Date.now() - t0 });
  if (r1.status !== 402) throw new Error(`expected 402, got ${r1.status}`);

  // 2) place order
  const t1 = Date.now();
  const r2 = await fetch(`${BASE}/api/orders`, { method: 'POST' });
  const order = (await r2.json()) as PlacedOrder;
  tracelog.push({ ok: r2.ok, status: r2.status, body: { orderIdLen: order.orderId.length }, latencyMs: Date.now() - t1 });
  if (!r2.ok) throw new Error(`placeOrder failed: ${r2.status}`);

  // 3) retry with X-PAYMENT
  const t2 = Date.now();
  const r3 = await fetch(`${BASE}/api/weather/${encodeURIComponent(city)}`, {
    headers: { 'X-PAYMENT': `agentmesh-marketplace;orderId=${order.orderId}` },
  });
  const b3 = await safeJson(r3);
  tracelog.push({ ok: r3.ok, status: r3.status, body: b3, latencyMs: Date.now() - t2 });
  if (!r3.ok) throw new Error(`paid fetch failed: ${r3.status} ${JSON.stringify(b3)}`);

  return { result: b3 as WeatherResult, tracelog };
}

async function safeJson(r: Response): Promise<unknown> {
  try {
    return await r.json();
  } catch {
    return null;
  }
}

export const BASE_URL = BASE;
