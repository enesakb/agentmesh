/**
 * Adversarial stress test — verify the API rejects every malicious / malformed
 * attempt with a 4xx and never leaks weather data without proof of payment.
 */
import { BASE_URL } from './client.js';

interface Attack {
  name: string;
  build: () => Promise<{ url: string; init?: RequestInit }>;
  expectedStatus: number;
}

const attacks: Attack[] = [
  {
    name: 'no payment header',
    expectedStatus: 402,
    build: async () => ({ url: `${BASE_URL}/api/weather/Berlin` }),
  },
  {
    name: 'wrong scheme prefix',
    expectedStatus: 402,
    build: async () => ({
      url: `${BASE_URL}/api/weather/Berlin`,
      init: { headers: { 'X-PAYMENT': 'coinbase-x402;orderId=lol' } },
    }),
  },
  {
    name: 'missing orderId field',
    expectedStatus: 402,
    build: async () => ({
      url: `${BASE_URL}/api/weather/Berlin`,
      init: { headers: { 'X-PAYMENT': 'agentmesh-marketplace' } },
    }),
  },
  {
    name: 'malformed token (3 parts)',
    expectedStatus: 402,
    build: async () => ({
      url: `${BASE_URL}/api/weather/Berlin`,
      init: { headers: { 'X-PAYMENT': 'agentmesh-marketplace;orderId=a.b.c' } },
    }),
  },
  {
    name: 'forged signature',
    expectedStatus: 402,
    build: async () => {
      // build a token with the correct shape but an invented HMAC
      const t = Date.now();
      const exp = t + 60_000;
      const fake = `${t}.AAAAAAAAAAA.5.1000000000000000.${exp}.deadbeefdeadbeefdeadbeefdeadbeef`;
      return {
        url: `${BASE_URL}/api/weather/Berlin`,
        init: { headers: { 'X-PAYMENT': `agentmesh-marketplace;orderId=${fake}` } },
      };
    },
  },
  {
    name: 'expired token (manipulated expiresAt in past)',
    expectedStatus: 402,
    build: async () => {
      const t = Date.now() - 120_000;
      const fake = `${t}.AAAAAAAAAAA.5.1000000000000000.${t + 1000}.somesignaturebytes==`;
      return {
        url: `${BASE_URL}/api/weather/Berlin`,
        init: { headers: { 'X-PAYMENT': `agentmesh-marketplace;orderId=${fake}` } },
      };
    },
  },
  {
    name: 'wrong listingId in token',
    expectedStatus: 402,
    build: async () => {
      const t = Date.now();
      const fake = `${t}.AAAAAAAAAAA.999.1000000000000000.${t + 60_000}.fakesignature==`;
      return {
        url: `${BASE_URL}/api/weather/Berlin`,
        init: { headers: { 'X-PAYMENT': `agentmesh-marketplace;orderId=${fake}` } },
      };
    },
  },
  {
    name: 'wrong priceWei in token',
    expectedStatus: 402,
    build: async () => {
      const t = Date.now();
      const fake = `${t}.AAAAAAAAAAA.5.1.${t + 60_000}.fakesignature==`;
      return {
        url: `${BASE_URL}/api/weather/Berlin`,
        init: { headers: { 'X-PAYMENT': `agentmesh-marketplace;orderId=${fake}` } },
      };
    },
  },
  {
    name: 'empty X-PAYMENT',
    expectedStatus: 402,
    build: async () => ({
      url: `${BASE_URL}/api/weather/Berlin`,
      init: { headers: { 'X-PAYMENT': '' } },
    }),
  },
  {
    name: 'huge token (10kb garbage)',
    expectedStatus: 402,
    build: async () => ({
      url: `${BASE_URL}/api/weather/Berlin`,
      init: {
        headers: {
          'X-PAYMENT': 'agentmesh-marketplace;orderId=' + 'X'.repeat(10000),
        },
      },
    }),
  },
];

console.log(`[stress:adversarial] target=${BASE_URL} attempts=${attacks.length}\n`);

let pass = 0;
let fail = 0;
const breaches: string[] = [];

for (const attack of attacks) {
  const { url, init } = await attack.build();
  try {
    const r = await fetch(url, init);
    const ok = r.status === attack.expectedStatus;
    if (ok) {
      console.log(`  ✓ ${attack.name.padEnd(45)} → ${r.status} (expected ${attack.expectedStatus})`);
      pass++;
    } else {
      console.log(`  ✗ ${attack.name.padEnd(45)} → ${r.status} (expected ${attack.expectedStatus})`);
      fail++;
      // CRITICAL: if attack returned 200, it means data leaked
      if (r.status === 200) {
        const body = await r.text();
        breaches.push(`SECURITY BREACH on '${attack.name}': got 200 with body ${body.slice(0, 120)}`);
      }
    }
  } catch (e) {
    console.log(`  ! ${attack.name.padEnd(45)} → request error: ${String(e).slice(0, 60)}`);
    fail++;
  }
}

console.log('\n--- summary ---');
console.log(`  rejected correctly : ${pass}/${attacks.length}`);
console.log(`  unexpected         : ${fail}`);

if (breaches.length > 0) {
  console.log('\n*** SECURITY BREACHES ***');
  for (const b of breaches) console.log(`  - ${b}`);
  process.exit(2);
}

if (fail > 0) process.exit(1);
