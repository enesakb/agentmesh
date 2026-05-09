import { describe, expect, it, vi } from 'vitest';
import { type AcceptedOption, PaymentRefused, fetchWithPayment } from './index.js';

const MARKETPLACE = '0xC0FFEEC0FFEEC0FFEEC0FFEEC0FFEEC0FFEEC0FF' as const;

function makeChallenge(extra: Partial<AcceptedOption> = {}): { x402Version: 1; accepts: AcceptedOption[] } {
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: 'agentmesh-marketplace',
        network: 'anvil',
        marketplace: MARKETPLACE,
        listingId: '7',
        recipient: '0x1111111111111111111111111111111111111111',
        amount: '1000000000000000',
        asset: 'native',
        resource: '/svc',
        expiresAt: Date.now() + 60_000,
        ...extra,
      },
    ],
  };
}

describe('fetchWithPayment', () => {
  it('returns the first response unchanged when status is not 402', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('hi', { status: 200 }));
    const placeOrder = vi.fn();
    const res = await fetchWithPayment('http://x', { maxAmountWei: 1n, placeOrder, fetchImpl });
    expect(res.status).toBe(200);
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it('places an order on 402 and retries with X-PAYMENT', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(makeChallenge()), {
          status: 402,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response('weather:Berlin', { status: 200 }));

    const placeOrder = vi.fn().mockResolvedValue({ orderId: 42n });

    const res = await fetchWithPayment('http://svc/weather/Berlin', {
      maxAmountWei: 10_000_000_000_000_000n, // 0.01 ETH
      placeOrder,
      fetchImpl,
    });

    expect(res.status).toBe(200);
    expect(placeOrder).toHaveBeenCalledOnce();
    expect(placeOrder.mock.calls[0][0]).toMatchObject({
      marketplace: MARKETPLACE,
      listingId: 7n,
      amountWei: 1_000_000_000_000_000n,
    });

    const retryCall = fetchImpl.mock.calls[1];
    const headers = new Headers(retryCall[1]?.headers);
    expect(headers.get('X-PAYMENT')).toBe('agentmesh-marketplace;orderId=42');
  });

  it('refuses when amount exceeds maxAmountWei', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(makeChallenge({ amount: '99999999999999999999' })), { status: 402 }),
      );
    const placeOrder = vi.fn();
    await expect(
      fetchWithPayment('http://x', { maxAmountWei: 1n, placeOrder, fetchImpl }),
    ).rejects.toBeInstanceOf(PaymentRefused);
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it('refuses when challenge is expired', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(makeChallenge({ expiresAt: Date.now() - 1_000 })), { status: 402 }),
      );
    const placeOrder = vi.fn();
    await expect(
      fetchWithPayment('http://x', { maxAmountWei: 10n ** 18n, placeOrder, fetchImpl }),
    ).rejects.toThrow(/expired/);
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it('refuses when network is not in allowedNetworks', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(makeChallenge({ network: 'mainnet' })), { status: 402 }),
      );
    await expect(
      fetchWithPayment('http://x', {
        maxAmountWei: 10n ** 18n,
        allowedNetworks: ['anvil', 'amoy'],
        placeOrder: vi.fn(),
        fetchImpl,
      }),
    ).rejects.toThrow(/not allowed/);
  });

  it('refuses when no agentmesh-marketplace option present', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ x402Version: 1, accepts: [] }), { status: 402 }));
    await expect(
      fetchWithPayment('http://x', {
        maxAmountWei: 10n ** 18n,
        placeOrder: vi.fn(),
        fetchImpl,
      }),
    ).rejects.toThrow(/no agentmesh-marketplace/);
  });
});
