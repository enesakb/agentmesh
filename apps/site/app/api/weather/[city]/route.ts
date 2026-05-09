/**
 * /api/weather/[city]
 *
 * Real AgentMesh agent endpoint deployed on Vercel.
 *
 * GET without X-PAYMENT → 402 Payment Required + accept body
 * GET with valid signed orderId → 200 weather JSON
 */
import type { NextRequest } from 'next/server';
import {
  ALPHA_ADDRESS,
  LISTING_ID,
  MARKETPLACE_ADDRESS,
  PRICE_WEI,
  TOKEN_TTL_MS,
  verifyOrder,
} from '@/lib/orders';

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
            expiresAt: Date.now() + TOKEN_TTL_MS,
          },
        ],
      },
      { status: 402 },
    );
  }

  const orderId = parseHeader(header);
  if (!orderId) {
    return Response.json(
      { error: 'invalid X-PAYMENT header (expected agentmesh-marketplace;orderId=<token>)' },
      { status: 402 },
    );
  }

  const verification = await verifyOrder(orderId);
  if (!verification.ok) {
    return Response.json({ error: verification.reason }, { status: 402 });
  }

  const weather = generateWeather(city);

  return Response.json({
    city,
    ...weather,
    source: 'demo-alpha',
    served_by: PROVIDER_ID,
    orderId: verification.orderId.slice(0, 24) + '…',
    settled: true,
    timestamp: new Date().toISOString(),
  });
}

function parseHeader(h: string): string | null {
  const parts = h.split(';').map((s) => s.trim());
  if (parts[0] !== 'agentmesh-marketplace') return null;
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq < 0) continue;
    const k = p.slice(0, eq).trim();
    const v = p.slice(eq + 1).trim();
    if (k === 'orderId') return v;
  }
  return null;
}

function generateWeather(city: string) {
  let h = 2166136261;
  for (let i = 0; i < city.length; i++) {
    h = (h ^ city.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  const tempC = 8 + ((h % 250) / 250) * 22;
  const conditions = ['clear', 'cloudy', 'partly cloudy', 'rain', 'fog'];
  return {
    tempC: Math.round(tempC * 10) / 10,
    conditions: conditions[h % conditions.length],
    humidity: 30 + ((h >> 4) % 70),
  };
}
