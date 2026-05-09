import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import {
  ORDER_STATUS,
  type OrderTuple,
  type RequirePaymentOptions,
  buildChallenge,
  parseOrderId,
  requirePayment,
  verifyOrder,
} from './index.js';

const PROVIDER = '0x1111111111111111111111111111111111111111' as const;
const CONSUMER = '0x2222222222222222222222222222222222222222' as const;
const MARKET = '0x3333333333333333333333333333333333333333' as const;
const LISTING_ID = 7n;
const PRICE = 1_000_000_000_000_000n; // 0.001 ETH

function makeOrder(overrides: Partial<OrderTuple> = {}): OrderTuple {
  return {
    listingId: LISTING_ID,
    consumer: CONSUMER,
    provider: PROVIDER,
    priceWei: PRICE,
    status: ORDER_STATUS.Created,
    createdAt: 0n,
    timeoutAt: 9_999_999_999n,
    proofHash: '0x',
    ...overrides,
  };
}

function makeOpts(extra: Partial<RequirePaymentOptions> = {}): RequirePaymentOptions {
  return {
    rpcUrl: 'http://unused.local',
    network: 'anvil',
    marketplace: MARKET,
    listingId: LISTING_ID,
    provider: PROVIDER,
    priceWei: PRICE,
    fetchOrder: async () => makeOrder(),
    ...extra,
  };
}

describe('parseOrderId', () => {
  it('parses a valid header', () => {
    expect(parseOrderId('agentmesh-marketplace;orderId=42')).toBe(42n);
  });

  it('handles whitespace and trailing semicolons', () => {
    expect(parseOrderId('agentmesh-marketplace; orderId=42 ;')).toBe(42n);
  });

  it('rejects unknown scheme', () => {
    expect(parseOrderId('coinbase-x402;orderId=42')).toBeNull();
  });

  it('rejects missing orderId', () => {
    expect(parseOrderId('agentmesh-marketplace')).toBeNull();
  });

  it('rejects non-numeric orderId', () => {
    expect(parseOrderId('agentmesh-marketplace;orderId=abc')).toBeNull();
  });

  it('rejects negative orderId', () => {
    expect(parseOrderId('agentmesh-marketplace;orderId=-1')).toBeNull();
  });
});

describe('verifyOrder', () => {
  const opts = { provider: PROVIDER, listingId: LISTING_ID, priceWei: PRICE };

  it('accepts a fresh Created order', () => {
    const r = verifyOrder(opts, makeOrder());
    expect(r.ok).toBe(true);
  });

  it('rejects Completed order', () => {
    const r = verifyOrder(opts, makeOrder({ status: ORDER_STATUS.Completed }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not active/);
  });

  it('rejects Refunded order', () => {
    const r = verifyOrder(opts, makeOrder({ status: ORDER_STATUS.Refunded }));
    expect(r.ok).toBe(false);
  });

  it('rejects mismatched provider', () => {
    const r = verifyOrder(opts, makeOrder({ provider: '0x9999999999999999999999999999999999999999' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/different provider/);
  });

  it('rejects mismatched listingId', () => {
    const r = verifyOrder(opts, makeOrder({ listingId: 999n }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/listing/);
  });

  it('rejects mismatched price', () => {
    const r = verifyOrder(opts, makeOrder({ priceWei: PRICE / 2n }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/price/);
  });

  it('is case-insensitive on provider address', () => {
    const r = verifyOrder({ ...opts, provider: PROVIDER.toUpperCase() as `0x${string}` }, makeOrder());
    expect(r.ok).toBe(true);
  });
});

describe('buildChallenge', () => {
  it('returns a valid x402 challenge body', () => {
    const c = buildChallenge('/weather/Berlin', makeOpts());
    expect(c.x402Version).toBe(1);
    expect(c.accepts).toHaveLength(1);
    expect(c.accepts[0].scheme).toBe('agentmesh-marketplace');
    expect(c.accepts[0].network).toBe('anvil');
    expect(c.accepts[0].listingId).toBe(LISTING_ID.toString());
    expect(c.accepts[0].amount).toBe(PRICE.toString());
    expect(c.accepts[0].resource).toBe('/weather/Berlin');
    expect(c.accepts[0].expiresAt).toBeGreaterThan(Date.now());
  });
});

describe('requirePayment middleware (with supertest)', () => {
  function buildApp(extra: Partial<RequirePaymentOptions> = {}) {
    const app = express();
    app.get('/svc', requirePayment(makeOpts(extra)), (_req, res) => res.json({ ok: true }));
    return app;
  }

  it('returns 402 with challenge when X-PAYMENT missing', async () => {
    const app = buildApp();
    const res = await request(app).get('/svc');
    expect(res.status).toBe(402);
    expect(res.body.x402Version).toBe(1);
    expect(res.body.accepts[0].listingId).toBe(LISTING_ID.toString());
  });

  it('returns 402 when X-PAYMENT is malformed', async () => {
    const app = buildApp();
    const res = await request(app).get('/svc').set('X-PAYMENT', 'garbage;data=here');
    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/invalid X-PAYMENT/);
  });

  it('returns 200 with valid order', async () => {
    const app = buildApp();
    const res = await request(app).get('/svc').set('X-PAYMENT', 'agentmesh-marketplace;orderId=42');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 402 when provider mismatches', async () => {
    const app = buildApp({
      fetchOrder: async () => makeOrder({ provider: '0x9999999999999999999999999999999999999999' }),
    });
    const res = await request(app).get('/svc').set('X-PAYMENT', 'agentmesh-marketplace;orderId=42');
    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/different provider/);
  });

  it('returns 402 when price mismatches (wrong amount)', async () => {
    const app = buildApp({ fetchOrder: async () => makeOrder({ priceWei: PRICE / 2n }) });
    const res = await request(app).get('/svc').set('X-PAYMENT', 'agentmesh-marketplace;orderId=42');
    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/price/);
  });

  it('returns 402 when order is Completed (replay against on-chain status)', async () => {
    const app = buildApp({ fetchOrder: async () => makeOrder({ status: ORDER_STATUS.Completed }) });
    const res = await request(app).get('/svc').set('X-PAYMENT', 'agentmesh-marketplace;orderId=42');
    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/not active/);
  });

  it('rejects a second request with the same orderId (replay protection)', async () => {
    const app = buildApp();
    const ok = await request(app).get('/svc').set('X-PAYMENT', 'agentmesh-marketplace;orderId=99');
    expect(ok.status).toBe(200);
    const replay = await request(app).get('/svc').set('X-PAYMENT', 'agentmesh-marketplace;orderId=99');
    expect(replay.status).toBe(402);
    expect(replay.body.error).toMatch(/already consumed/);
  });

  it('returns 500 if fetchOrder throws', async () => {
    const app = buildApp({
      fetchOrder: async () => {
        throw new Error('rpc down');
      },
    });
    const res = await request(app).get('/svc').set('X-PAYMENT', 'agentmesh-marketplace;orderId=1');
    expect(res.status).toBe(500);
  });

  it('calls onComplete after successful response when autoComplete=true', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const app = buildApp({ autoComplete: true, onComplete });
    const res = await request(app).get('/svc').set('X-PAYMENT', 'agentmesh-marketplace;orderId=123');
    expect(res.status).toBe(200);
    // Allow microtask queue to drain for fire-and-forget completion.
    await new Promise((r) => setImmediate(r));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toBe(123n);
  });
});
