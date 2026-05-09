/**
 * Sequential stress test — N consecutive full x402 round-trips.
 * Measures p50/p95/p99 latency and verifies every result is settled.
 */
import { fetchPaid, BASE_URL } from './client.js';

const N = Number(process.env.N ?? 50);
const cities = ['Berlin', 'Istanbul', 'Lagos', 'Tokyo', 'Mumbai', 'Lima', 'Cairo', 'Oslo', 'Bangkok', 'Reykjavik'];

const totals: { ok: number; fail: number; durations: number[]; trip: number[][] } = {
  ok: 0,
  fail: 0,
  durations: [],
  trip: [],
};

console.log(`[stress:sequential] target=${BASE_URL} runs=${N}\n`);

for (let i = 0; i < N; i++) {
  const city = cities[i % cities.length] + (i >= cities.length ? `-${Math.floor(i / cities.length)}` : '');
  const t = Date.now();
  try {
    const { result, tracelog } = await fetchPaid(city);
    const dt = Date.now() - t;
    totals.ok++;
    totals.durations.push(dt);
    totals.trip.push(tracelog.map((a) => a.latencyMs));
    process.stdout.write(
      `  ${(i + 1).toString().padStart(2)} ${'OK '.padEnd(4)} ${dt.toString().padStart(5)}ms  ` +
        `[${tracelog.map((t) => `${t.status}/${t.latencyMs}ms`).join(' → ')}]  ` +
        `${result.city}=${result.tempC}°C ${result.conditions}\n`,
    );
  } catch (e) {
    const dt = Date.now() - t;
    totals.fail++;
    process.stdout.write(`  ${(i + 1).toString().padStart(2)} FAIL  ${dt}ms  ${String(e).slice(0, 80)}\n`);
  }
}

function pct(arr: number[], p: number) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

const avg = totals.durations.reduce((s, x) => s + x, 0) / Math.max(1, totals.durations.length);

console.log('\n--- summary ---');
console.log(`  passed     : ${totals.ok}/${N}`);
console.log(`  failed     : ${totals.fail}`);
console.log(`  avg total  : ${avg.toFixed(0)}ms`);
console.log(`  p50 total  : ${pct(totals.durations, 50)}ms`);
console.log(`  p95 total  : ${pct(totals.durations, 95)}ms`);
console.log(`  p99 total  : ${pct(totals.durations, 99)}ms`);
console.log(`  min / max  : ${Math.min(...totals.durations)}ms / ${Math.max(...totals.durations)}ms`);

const leg = (i: number) => totals.trip.map((t) => t[i] ?? 0).filter((x) => x > 0);
console.log('\n--- per-leg latency ---');
console.log(`  leg 1 (initial 402) : avg ${avg0(leg(0))}ms / p95 ${pct(leg(0), 95)}ms`);
console.log(`  leg 2 (POST orders) : avg ${avg0(leg(1))}ms / p95 ${pct(leg(1), 95)}ms`);
console.log(`  leg 3 (paid fetch)  : avg ${avg0(leg(2))}ms / p95 ${pct(leg(2), 95)}ms`);

function avg0(a: number[]) {
  return a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0;
}

if (totals.fail > 0) process.exit(1);
