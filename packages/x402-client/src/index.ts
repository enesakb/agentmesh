import pino from 'pino';
/**
 * @agentmesh/x402-client
 *
 * fetch() wrapper that handles HTTP 402 Payment Required by placing a
 * marketplace order via the AgentMesh wallet, then retrying the request with
 * the orderId in `X-PAYMENT`.
 */
import type { Address } from 'viem';

const logger = pino({ name: 'x402-client', level: process.env.LOG_LEVEL ?? 'info' });

export interface AcceptedOption {
  scheme: 'agentmesh-marketplace';
  network: string;
  marketplace: Address;
  listingId: string;
  recipient: Address;
  amount: string;
  asset: string;
  resource: string;
  expiresAt: number;
}

export interface ChallengeBody {
  x402Version: 1;
  message: string;
  accepts: AcceptedOption[];
}

/// Caller provides this — usually wired to `mesh.marketplace.buy(listingId)` from the SDK.
export type PlaceOrderFn = (params: {
  marketplace: Address;
  listingId: bigint;
  amountWei: bigint;
}) => Promise<{ orderId: bigint }>;

export interface FetchWithPaymentOptions {
  /** Maximum amount in wei the client is willing to pay. Hard cap. */
  maxAmountWei: bigint;
  /** Function that places the order and returns its id. */
  placeOrder: PlaceOrderFn;
  /** Optional: only accept payments to one of these networks. */
  allowedNetworks?: string[];
  /** Optional fetch options forwarded on the retried request. */
  init?: RequestInit;
  /** Optional override for fetch (testing). */
  fetchImpl?: typeof fetch;
}

export class PaymentRefused extends Error {
  constructor(reason: string) {
    super(`payment refused: ${reason}`);
    this.name = 'PaymentRefused';
  }
}

export async function fetchWithPayment(url: string, opts: FetchWithPaymentOptions): Promise<Response> {
  const f = opts.fetchImpl ?? fetch;

  // First attempt
  const first = await f(url, opts.init);
  if (first.status !== 402) return first;

  const challenge = (await first.json()) as ChallengeBody;
  const choice = challenge.accepts.find((a) => a.scheme === 'agentmesh-marketplace');
  if (!choice) throw new PaymentRefused('no agentmesh-marketplace accept option');

  if (opts.allowedNetworks && !opts.allowedNetworks.includes(choice.network)) {
    throw new PaymentRefused(`network ${choice.network} not allowed`);
  }
  if (Date.now() > choice.expiresAt) throw new PaymentRefused('challenge expired');

  const amount = BigInt(choice.amount);
  if (amount > opts.maxAmountWei) {
    throw new PaymentRefused(`amount ${amount} > maxAmount ${opts.maxAmountWei}`);
  }

  logger.info({ choice: { listingId: choice.listingId, amount: choice.amount } }, 'placing order');

  const { orderId } = await opts.placeOrder({
    marketplace: choice.marketplace,
    listingId: BigInt(choice.listingId),
    amountWei: amount,
  });

  logger.info({ orderId: orderId.toString() }, 'order placed, retrying with X-PAYMENT');

  const retryHeaders = new Headers(opts.init?.headers ?? {});
  retryHeaders.set('X-PAYMENT', `agentmesh-marketplace;orderId=${orderId.toString()}`);

  const second = await f(url, { ...opts.init, headers: retryHeaders });
  return second;
}
