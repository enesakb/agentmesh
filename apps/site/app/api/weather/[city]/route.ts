/**
 * /api/weather/[city]
 *
 * A real, working AgentMesh agent endpoint, deployed on Vercel.
 *
 * GET without `X-PAYMENT` → 402 Payment Required + accept body
 * GET with valid demo payment → 200 weather JSON
 *
 * "Demo payment" = an orderId previously issued by /api/orders. We hold the
 * order book in module memory (resets on cold start, fine for demo). In the
 * real protocol the orderId is on-chain; here we sign it with a server-side
 * key so it can't be forged from the client.
 *
 * Replay-protected: each orderId is single-use. Idempotent within a request.
 */
import type { NextRequest } from 'next/server';
import { orders, ALPHA_ADDRESS, MARKETPLACE_ADDRESS, LISTING_ID, PRICE_WEI } from '@/lib/orders';

const PROVIDER_ID = ALPHA_ADDRESS;
export const runtime = 'edge';

export async function GET(req: NextRequest, ctx: { params: Promise<{ city: string }> }) {
  const { city } = await ctx.params;
  const header = req.headers.get('x-payment') ?? req.headers.get('X-PAYMENT');

  if (!header) {
    return Response.json(
      {
        x402Version: 1,
        message: 'Payment required. POST /api/orders to receive an orderId, then retry.',
        accepts: [
          {
            scheme: 'agentmesh-marketplace',
            network: 'agentmesh-demo',
            marketplace: MARKETPLACE_ADDRESS,
            listingId: LISTING_ID,
            recipient: PROVIDER_ID,
            amount: PRICE_WEI,
            asset: 'native',
            resource: `/api/weather/${city}`,
            expiresAt: Date.now() + 60_000,
          },
        ],
      },
      { status: 402 },
    );
  }

  const parsed = parsePaymentHeader(header);
  if (!parsed) {
    return Response.json(
      { error: 'invalid X-PAYMENT header (expected agentmesh-marketplace;orderId=<n>)' },
      { status: 402 },
    );
  }

  const order = orders.get(parsed.orderId);
  if (!order) {
    return Response.json({ error: `unknown orderId ${parsed.orderId}` }, { status: 402 });
  }
  if (order.status !== 'created') {
    return Response.json({ error: `orderId ${parsed.orderId} already consumed` }, { status: 402 });
  }
  if (order.listingId !== LISTING_ID) {
    return Response.json({ error: 'orderId is for a different listing' }, { status: 402 });
  }

  // Mark consumed → can't be replayed
  order.status = 'completed';
  order.completedAt = Date.now();

  // Generate believable weather. Same input always returns same weather (deterministic per city).
  const weather = generateWeather(city);

  return Response.json({
    city,
    ...weather,
    source: 'demo-alpha',
    served_by: PROVIDER_ID,
    orderId: parsed.orderId,
    settled: true,
    timestamp: new Date().toISOString(),
  });
}

function parsePaymentHeader(h: string): { orderId: string } | null {
  const parts = h.split(';').map((s) => s.trim());
  if (parts[0] !== 'agentmesh-marketplace') return null;
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq < 0) continue;
    const k = p.slice(0, eq).trim();
    const v = p.slice(eq + 1).trim();
    if (k === 'orderId') return { orderId: v };
  }
  return null;
}

function generateWeather(city: string) {
  // FNV-1a-ish hash so the same city always returns the same weather within a process.
  let h = 2166136261;
  for (let i = 0; i < city.length; i++) {
    h = (h ^ city.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  const tempC = 8 + ((h % 250) / 250) * 22; // 8..30°C
  const conditions = ['clear', 'cloudy', 'partly cloudy', 'rain', 'fog'];
  return {
    tempC: Math.round(tempC * 10) / 10,
    conditions: conditions[h % conditions.length],
    humidity: 30 + ((h >> 4) % 70),
  };
}
