/**
 * Run all three stress profiles in sequence and report a unified verdict.
 * Exit code 0 only if all three pass.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const tsx = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';

interface Phase {
  name: string;
  script: string;
  env?: Record<string, string>;
}

const phases: Phase[] = [
  { name: 'sequential', script: 'sequential.ts', env: { N: '20' } },
  { name: 'parallel', script: 'parallel.ts', env: { K: '8', R: '3' } },
  { name: 'adversarial', script: 'adversarial.ts' },
];

const results: { name: string; ok: boolean; stdout: string }[] = [];

for (const phase of phases) {
  console.log('\n' + '═'.repeat(72));
  console.log(`  PHASE: ${phase.name.toUpperCase()}`);
  console.log('═'.repeat(72));
  const r = spawnSync(tsx, [join(here, phase.script)], {
    stdio: 'inherit',
    env: { ...process.env, ...(phase.env ?? {}) },
    shell: true,
  });
  results.push({ name: phase.name, ok: r.status === 0, stdout: '' });
}

console.log('\n' + '═'.repeat(72));
console.log('  FINAL VERDICT');
console.log('═'.repeat(72));
for (const r of results) {
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}`);
}
if (results.every((r) => r.ok)) {
  console.log('\n  🎯 ALL EXTERNAL-AGENT STRESS TESTS PASSED');
  process.exit(0);
} else {
  console.log('\n  ✗ at least one phase failed');
  process.exit(1);
}
