/**
 * demo-alpha — provider agent.
 *
 * Steps:
 *   1. Bootstrap AgentMesh, create+fund smart account.
 *   2. Register identity (capability: data.weather).
 *   3. Install spending policy hook (1 ETH/day, 0.5 ETH/tx).
 *   4. Create marketplace listing pointing at our HTTP endpoint.
 *   5. Start Express server with x402 middleware on /weather/:city.
 *   6. On valid request: serve weather data + auto-complete the order.
 */
import 'dotenv/config';
import { AgentMesh } from '@agentmesh/sdk';
import type { SupportedChain } from '@agentmesh/shared';
import { type RequestWithPayment, requirePayment } from '@agentmesh/x402-server';
import express from 'express';
import pino from 'pino';
import { type Hex, parseEther } from 'viem';

const log = pino({
  name: 'demo-alpha',
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.stdout.isTTY
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
});

const CHAIN = (process.env.AGENTMESH_CHAIN ?? 'anvil') as SupportedChain;
const PORT = Number(process.env.ALPHA_PORT ?? 4001);
const SERVICE_URL = `http://127.0.0.1:${PORT}/weather`;
const LISTING_PRICE = parseEther('0.001');

async function main() {
  const ownerKey = process.env.PRIVATE_KEY_ALPHA as Hex;
  if (!ownerKey) throw new Error('PRIVATE_KEY_ALPHA missing');

  const mesh = await AgentMesh.create({ chain: CHAIN, ownerKey });
  log.info({ owner: mesh.ownerAddress, agent: mesh.agentAddress }, 'mesh created');

  // 1. Smart account
  await mesh.wallet.create();
  const balBefore = await mesh.wallet.getBalance();
  if (balBefore < parseEther('1')) {
    log.info('funding smart account from owner...');
    const fundTx = await mesh.wallet.fund(parseEther('5'));
    await mesh.waitForTx(fundTx);
  }
  log.info({ bal: (await mesh.wallet.getBalance()).toString() }, 'smart account funded');

  // 2. Identity (idempotent — skip if already registered)
  const isReg = await mesh.identity.isRegistered(mesh.agentAddress);
  if (!isReg) {
    await mesh.identity.register({
      name: `demo-alpha-${Date.now()}`,
      metadataURI: `data:application/json,${encodeURIComponent(JSON.stringify({ kind: 'demo-alpha' }))}`,
      capabilities: ['data.weather'],
    });
    log.info('registered as alpha');
  } else {
    log.info('already registered, skipping');
  }

  // 3. Spending policy
  try {
    await mesh.wallet.installPolicy({ dailyLimitWei: parseEther('1'), perTxLimitWei: parseEther('0.5') });
    log.info('spending policy installed');
  } catch (err) {
    // If hook is already installed, ignore the duplicate; otherwise re-throw
    const msg = String(err);
    if (msg.includes('ModuleAlreadyInstalled')) {
      log.info('policy already installed, continuing');
    } else {
      throw err;
    }
  }

  // 4. Listing
  const listingId = await mesh.marketplace.list({
    serviceURI: SERVICE_URL,
    priceWei: LISTING_PRICE,
  });
  log.info({ listingId: listingId.toString(), priceWei: LISTING_PRICE.toString() }, 'listing created');

  // 5. HTTP server
  const app = express();

  app.get(
    '/weather/:city',
    requirePayment({
      rpcUrl: process.env.ANVIL_RPC ?? 'http://127.0.0.1:8545',
      network: CHAIN,
      marketplace: mesh.deployment.marketplace,
      listingId,
      provider: mesh.agentAddress,
      priceWei: LISTING_PRICE,
      autoComplete: true,
      onComplete: async (orderId, proof) => {
        try {
          await mesh.marketplace.complete(orderId, proof);
          log.info({ orderId: orderId.toString() }, 'order completed on-chain');
        } catch (err) {
          log.error({ err, orderId: orderId.toString() }, 'completeOrder failed');
        }
      },
    }),
    (req, res) => {
      const r = req as RequestWithPayment;
      const city = req.params.city;
      const tempC = Math.round((18 + Math.random() * 12) * 10) / 10;
      log.info({ city, tempC, orderId: r.payment?.orderId.toString() }, 'serving weather');
      res.json({ city, tempC, source: 'demo-alpha', orderId: r.payment?.orderId.toString() });
    },
  );

  app.get('/health', (_req, res) => res.json({ ok: true, agent: mesh.agentAddress }));

  app.listen(PORT, '127.0.0.1', () => {
    log.info({ port: PORT }, 'alpha listening');
    console.log(
      `[alpha-ready] agent=${mesh.agentAddress} listing=${listingId.toString()} url=${SERVICE_URL}`,
    );
  });
}

main().catch((err) => {
  console.error('[alpha-fatal]', err);
  process.exit(1);
});
