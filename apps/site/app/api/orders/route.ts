/**
 * /api/orders
 *
 * POST → places a new "order" (escrow not real, but the orderId is binding for
 * a single weather call). Returns { orderId }.
 *
 * GET → returns recent orders (for the live activity feed).
 */
import { orders, makeOrder } from '@/lib/orders';

export const runtime = 'edge';

export async function POST() {
  const o = makeOrder();
  orders.set(o.id, o);
  return Response.json({
    orderId: o.id,
    listingId: o.listingId,
    priceWei: o.priceWei,
    expiresAt: o.expiresAt,
    note: 'demo order — single-use, redeemable at GET /api/weather/:city via X-PAYMENT header',
  });
}

export async function GET() {
  const recent = Array.from(orders.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20);
  return Response.json({ count: orders.size, orders: recent });
}
