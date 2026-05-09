/**
 * Parallel stress test — K agents concurrently, each does R round-trips.
 * Verifies the API can handle simultaneous external integrators.
 */
import { fetchPaid, BASE_URL } from './client.js';

const K = Number(process.env.K ?? 10); // concurrent agents
const R = Number(process.env.R ?? 5); // rounds per agent
const cities = ['Berlin', 'Istanbul', 'Lagos', 'Tokyo', 'Mumbai', 'Lima', 'Cairo', 'Oslo', 'Bangkok', 'Reykjavik'];

console.log(`[stress:parallel] target=${BASE_URL} agents=${K} rounds_per_agent=${R} total=${K * R}\n`);

interface AgentResult {
  agentId: number;
  ok: number;
  fail: number;
  durations: number[];
}

const start = Date.now();
const agents = await Promise.all(
  Array.from({ length: K }, async (_, agentId): Promise<AgentResult> => {
    const r: AgentResult = { agentId, ok: 0, fail: 0, durations: [] };
    for (let round = 0; round < R; round++) {
      const city = `${cities[agentId % cities.length]}-A${agentId}-R${round}`;
      const t0 = Date.now();
      try {
        await fetchPaid(city);
        r.durations.push(Date.now() - t0);
        r.ok++;
      } catch {
        r.fail++;
      }
    }
    return r;
  }),
);
const wallClock = Date.now() - start;

let totalOK = 0;
let totalFail = 0;
const allDurations: number[] = [];

for (const a of agents) {
  totalOK += a.ok;
  totalFail += a.fail;
  allDurations.push(...a.durations);
  const avg = a.durations.length ? Math.round(a.durations.reduce((s, x) => s + x, 0) / a.durations.length) : 0;
  console.log(`  agent ${a.agentId.toString().padStart(2)} : ${a.ok}/${R} ok · avg ${avg}ms`);
}

function pct(arr: number[], p: number) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

const avgAll = allDurations.reduce((s, x) => s + x, 0) / Math.max(1, allDurations.length);

console.log('\n--- summary ---');
console.log(`  total cycles : ${totalOK}/${K * R}`);
console.log(`  failures     : ${totalFail}`);
console.log(`  wall clock   : ${wallClock}ms (${(wallClock / 1000).toFixed(1)}s)`);
console.log(`  throughput   : ${((totalOK * 1000) / wallClock).toFixed(2)} cycles/sec`);
console.log(`  avg latency  : ${avgAll.toFixed(0)}ms`);
console.log(`  p95 latency  : ${pct(allDurations, 95)}ms`);
console.log(`  p99 latency  : ${pct(allDurations, 99)}ms`);

if (totalFail > 0) process.exit(1);
