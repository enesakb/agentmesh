/**
 * Stateless signed-token order book for the demo agent endpoint.
 *
 * On Vercel Edge each isolate has its own memory, so an in-memory Map can't
 * coordinate between POST /api/orders (isolate A) and GET /api/weather
 * (isolate B). Instead we issue a signed token from POST and verify it on GET.
 *
 * Token shape (dot-separated, base64url-encoded signature):
 *   <issuedAt>.<nonce>.<listingId>.<priceWei>.<expiresAt>.<hmac>
 *
 * Real AgentMesh deployments store orders on-chain in
 * `ServiceMarketplace.placeOrder()` and on-chain status drives replay
 * protection. This module is the hosted equivalent: a signed proof that
 * a (demo) order was issued. Demo accepts any well-signed token within
 * its TTL — replay across isolates would require a global store; for the
 * demo we accept that as a known limitation.
 */

export const ALPHA_ADDRESS = '0x74De72391f09EF3F5491e33D751b2a67BAaEf633';
export const MARKETPLACE_ADDRESS = '0x0165878A594ca255338adfa4d48449f69242Eb8F';
export const LISTING_ID = '5';
export const PRICE_WEI = '1000000000000000'; // 0.001 ETH
export const TOKEN_TTL_MS = 60_000;

function getSecret(): string {
  return process.env.ORDER_SECRET ?? 'agentmesh-demo-fallback-secret-not-for-production';
}

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(sig));
}

export interface IssuedOrder {
  id: string;
  listingId: string;
  priceWei: string;
  issuedAt: number;
  expiresAt: number;
}

export async function issueOrder(): Promise<IssuedOrder> {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + TOKEN_TTL_MS;
  const nonceBytes = new Uint8Array(8);
  crypto.getRandomValues(nonceBytes);
  const nonce = b64url(nonceBytes);

  const payload = `${issuedAt}.${nonce}.${LISTING_ID}.${PRICE_WEI}.${expiresAt}`;
  const sig = await hmac(getSecret(), payload);
  const id = `${payload}.${sig}`;

  return {
    id,
    listingId: LISTING_ID,
    priceWei: PRICE_WEI,
    issuedAt,
    expiresAt,
  };
}

export interface VerifiedOrder {
  ok: true;
  orderId: string;
  listingId: string;
  priceWei: string;
  expiresAt: number;
}

export type VerifyResult = VerifiedOrder | { ok: false; reason: string };

export async function verifyOrder(orderId: string): Promise<VerifyResult> {
  const parts = orderId.split('.');
  if (parts.length !== 6) return { ok: false, reason: 'malformed token (expected 6 parts)' };
  const [issuedAt, nonce, listingId, priceWei, expiresAt, sig] = parts;
  const payload = `${issuedAt}.${nonce}.${listingId}.${priceWei}.${expiresAt}`;
  const expectedSig = await hmac(getSecret(), payload);

  if (sig.length !== expectedSig.length) return { ok: false, reason: 'signature mismatch' };
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  if (diff !== 0) return { ok: false, reason: 'signature mismatch' };

  const exp = Number.parseInt(expiresAt, 10);
  if (Number.isNaN(exp)) return { ok: false, reason: 'malformed expiresAt' };
  if (Date.now() > exp) return { ok: false, reason: 'token expired' };

  if (listingId !== LISTING_ID) return { ok: false, reason: 'wrong listingId' };
  if (priceWei !== PRICE_WEI) return { ok: false, reason: 'wrong priceWei' };

  return { ok: true, orderId, listingId, priceWei, expiresAt: exp };
}
