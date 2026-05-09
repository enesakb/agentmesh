/**
 * UI stress test — pretends to be a real human / agent visiting the site
 * via Chrome DevTools Protocol. Walks every section, clicks every button,
 * follows every internal anchor, and verifies each interaction lands on
 * something useful.
 *
 * NOTE: this script needs a Chrome-connection runtime. Driven externally
 * by `apps/site/test-ui.ps1` or by Playwright when wired up. The body here
 * is a deterministic checklist that produces a JSON report of findings.
 */

interface Finding {
  severity: 'error' | 'warn' | 'info';
  area: string;
  detail: string;
}

export const UI_CHECKLIST = [
  {
    id: 'hero.cta.github',
    selector: 'a.btn-primary[href*="github.com"]',
    expect: { hrefIncludes: 'github.com/enesakb/agentmesh' },
  },
  {
    id: 'hero.cta.try-live',
    selector: 'a.btn-ghost[href="#try"]',
    expect: { scrollsTo: '#try' },
  },
  {
    id: 'hero.cta.spec',
    selector: 'a.btn-ghost[href="#sequence"]',
    expect: { scrollsTo: '#sequence' },
  },
  {
    id: 'topbar.nav.how',
    selector: 'nav a[href="#how"]',
    expect: { scrollsTo: '#how' },
  },
  {
    id: 'topbar.nav.layers',
    selector: 'nav a[href="#layers"]',
    expect: { scrollsTo: '#layers' },
  },
  {
    id: 'topbar.nav.sdk',
    selector: 'nav a[href="#sdk"]',
    expect: { scrollsTo: '#sdk' },
  },
  {
    id: 'topbar.nav.live',
    selector: 'nav a[href="#live"]',
    expect: { scrollsTo: '#live' },
  },
  {
    id: 'topbar.nav.tests',
    selector: 'nav a[href="#tests"]',
    expect: { scrollsTo: '#tests' },
  },
  {
    id: 'topbar.nav.manifesto',
    selector: 'nav a[href="#manifesto"]',
    expect: { scrollsTo: '#manifesto' },
  },
  {
    id: 'topbar.nav.compare',
    selector: 'nav a[href="#compare"]',
    expect: { scrollsTo: '#compare' },
  },
  {
    id: 'topbar.nav.faq',
    selector: 'nav a[href="#faq"]',
    expect: { scrollsTo: '#faq' },
  },
  {
    id: 'live-protocol.run',
    selector: '#live button.btn-primary',
    expect: { textContains: 'run demo' },
  },
  {
    id: 'live-protocol.reset',
    selector: '#live button.btn-ghost',
    expect: { textContains: 'reset' },
  },
  {
    id: 'try.city-input',
    selector: '#try input[type="text"]',
    expect: { placeholder: '' },
  },
  {
    id: 'try.step-button',
    selector: '#try button.btn-primary',
    expect: { textContains: 'GET' },
  },
  {
    id: 'sections.exist',
    multi: ['#how', '#layers', '#sdk', '#sequence', '#live', '#try', '#tests', '#manifesto', '#compare', '#why', '#faq', '#feed'],
    expect: { allPresent: true },
  },
  {
    id: 'chainbar.no-broken-links',
    selector: 'a[href="#"]',
    expect: { count: 0 },
  },
];

export function classifyFinding(
  id: string,
  result: 'pass' | 'fail',
  detail: string,
): Finding | null {
  if (result === 'pass') return null;
  const sev = id.startsWith('try.') || id.startsWith('hero.') ? 'error' : 'warn';
  return { severity: sev, area: id, detail };
}
