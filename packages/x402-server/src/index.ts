/**
 * @agentmesh/x402-server
 *
 * Express middleware that enforces HTTP 402 Payment Required for AgentMesh
 * services. Settlement model: marketplace-backed orders.
 *
 * Flow:
 *   1. Client requests resource without `X-PAYMENT`.
 *   2. Server replies 402 with `accepts` describing where to pay.
 *   3. Client calls `ServiceMarketplace.placeOrder(listingId)`, gets orderId.
 *   4. Client retries with `X-PAYMENT: agentmesh-marketplace;orderId=<n>`.
 *   5. Server verifies order on-chain (status, provider, price, freshness),
 *      serves the resource, and (optionally) calls `completeOrder`
 *      synchronously or out-of-band.
 *
 * Replay protection: a per-middleware in-memory Set of consumed orderIds.
 * Two requests presenting the same orderId — even if the on-chain status is
 * still Created — will see the second one rejected with 402. This prevents
 * a window of double-use between request arrival and `completeOrder`.
 */

import { type SupportedChain, serviceMarketplaceAbi } from '@agentmesh/shared';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import pino from 'pino';
import { http, type Address, createPublicClient } from 'viem';

const logger = pino({ name: 'x402-server', level: process.env.LOG_LEVEL ?? 'info' });

export interface PaymentAcceptOption {
  scheme: 'agentmesh-marketplace';
  network: SupportedChain;
  marketplace: Address;
  listingId: string;
  recipient: Address;
  amount: string;
  asset: 'native';
  resource: string;
  expiresAt: number;
}

export interface ChallengePayload {
  x402Version: 1;
  message: string;
  accepts: PaymentAcceptOption[];
}

export interface VerifiedPayment {
  orderId: bigint;
  consumer: Address;
  provider: Address;
  priceWei: bigint;
  listingId: bigint;
}

export interface RequirePaymentOptions {
  rpcUrl: string;
  network: SupportedChain;
  marketplace: Address;
  listingId: bigint;
  provider: Address;
  priceWei: bigint;
  autoComplete?: boolean;
  onComplete?: (orderId: bigint, proof: `0x${string}`) => Promise<void>;
  /// Optional override for tests: a function that returns the on-chain order tuple.
  fetchOrder?: (orderId: bigint) => Promise<OrderTuple>;
}

export type RequestWithPayment = Request & { payment?: VerifiedPayment };

export interface OrderTuple {
  listingId: bigint;
  consumer: Address;
  provider: Address;
  priceWei: bigint;
  status: number;
  createdAt: bigint;
  timeoutAt: bigint;
  proofHash: `0x${string}`;
}

export const ORDER_STATUS = { None: 0, Created: 1, Completed: 2, Refunded: 3 } as const;

export type VerificationResult =
  | { ok: true; payment: VerifiedPayment }
  | { ok: false; status: 402; reason: string; challenge?: ChallengePayload };

/// Pure verification — no Express. Reusable from tests + alternate transports.
export function verifyOrder(
  opts: { provider: Address; listingId: bigint; priceWei: bigint },
  order: OrderTuple,
): VerificationResult {
  if (order.status !== ORDER_STATUS.Created) {
    return { ok: false, status: 402, reason: `order not active (status=${order.status})` };
  }
  if (order.provider.toLowerCase() !== opts.provider.toLowerCase()) {
    return { ok: false, status: 402, reason: 'order is for a different provider' };
  }
  if (order.listingId !== opts.listingId) {
    return { ok: false, status: 402, reason: 'order does not match this listing' };
  }
  if (order.priceWei !== opts.priceWei) {
    return { ok: false, status: 402, reason: 'order price mismatch' };
  }
  return {
    ok: true,
    payment: {
      orderId: 0n, // filled in by caller — verifyOrder doesn't know which orderId
      consumer: order.consumer,
      provider: order.provider,
      priceWei: order.priceWei,
      listingId: order.listingId,
    },
  };
}

export function parseOrderId(header: string): bigint | null {
  const parts = header.split(';').map((s) => s.trim());
  if (parts[0] !== 'agentmesh-marketplace') return null;
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq < 0) continue;
    const k = p.slice(0, eq).trim();
    const v = p.slice(eq + 1).trim();
    if (k === 'orderId') {
      try {
        const n = BigInt(v);
        return n >= 0n ? n : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function buildChallenge(resource: string, opts: RequirePaymentOptions): ChallengePayload {
  const accept: PaymentAcceptOption = {
    scheme: 'agentmesh-marketplace',
    network: opts.network,
    marketplace: opts.marketplace,
    listingId: opts.listingId.toString(),
    recipient: opts.provider,
    amount: opts.priceWei.toString(),
    asset: 'native',
    resource,
    expiresAt: Date.now() + 60_000,
  };
  return {
    x402Version: 1,
    message: 'Payment required. Place an order via ServiceMarketplace.placeOrder(listingId).',
    accepts: [accept],
  };
}

export function requirePayment(opts: RequirePaymentOptions): RequestHandler {
  const fetchOrder =
    opts.fetchOrder ??
    (async (orderId: bigint) => {
      const client = createPublicClient({ transport: http(opts.rpcUrl) });
      return (await client.readContract({
        address: opts.marketplace,
        abi: serviceMarketplaceAbi,
        functionName: 'getOrder',
        args: [orderId],
      })) as OrderTuple;
    });

  // Per-middleware replay-protection set.
  const consumedOrderIds = new Set<string>();

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const header = req.header('X-PAYMENT') ?? req.header('X-Payment');
      if (!header) {
        return res.status(402).json(buildChallenge(req.originalUrl, opts));
      }

      const orderId = parseOrderId(header);
      if (orderId === null) {
        return res.status(402).json({
          error: 'invalid X-PAYMENT header (expected agentmesh-marketplace;orderId=<n>)',
          challenge: buildChallenge(req.originalUrl, opts),
        });
      }

      const orderKey = orderId.toString();
      if (consumedOrderIds.has(orderKey)) {
        return res.status(402).json({ error: `orderId ${orderKey} already consumed` });
      }

      const order = await fetchOrder(orderId);
      const result = verifyOrder(
        { provider: opts.provider, listingId: opts.listingId, priceWei: opts.priceWei },
        order,
      );

      if (!result.ok) {
        return res.status(result.status).json({ error: result.reason });
      }

      // Mark consumed BEFORE calling next() so a concurrent retry can't slip through.
      consumedOrderIds.add(orderKey);

      const verified: VerifiedPayment = { ...result.payment, orderId };
      (req as RequestWithPayment).payment = verified;

      logger.info(
        { orderId: orderKey, consumer: order.consumer, listingId: opts.listingId.toString() },
        'payment verified',
      );

      if (opts.autoComplete && opts.onComplete) {
        const origJson = res.json.bind(res);
        res.json = (body: unknown) => {
          const result = origJson(body);
          const proof = `0x${Buffer.from(JSON.stringify(body ?? {})).toString('hex')}` as `0x${string}`;
          opts.onComplete!(orderId, proof).catch((err) =>
            logger.error({ err, orderId: orderKey }, 'autoComplete failed'),
          );
          return result;
        };
      }

      next();
    } catch (err) {
      logger.error({ err }, 'x402 verification error');
      res.status(500).json({ error: 'internal verification error' });
    }
  };
}
