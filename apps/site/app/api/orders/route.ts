/**
 * /api/orders
 *
 * POST → issue a new HMAC-signed order token. The weather endpoint can verify
 * it without any shared store, so it works across Vercel Edge isolates.
 */
import { issueOrder } from '@/lib/orders';

export const runtime = 'edge';

export async function POST() {
  const o = await issueOrder();
  return Response.json({
    orderId: o.id,
    listingId: o.listingId,
    priceWei: o.priceWei,
    expiresAt: o.expiresAt,
    note: 'demo order — redeemable at GET /api/weather/:city via X-PAYMENT header within 60s',
  });
}

export async function GET() {
  return Response.json({
    note: 'POST to this endpoint to receive a fresh signed orderId. (No order list — stateless demo.)',
  });
}
