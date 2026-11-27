/**
 * Loop e2e: plays the loops in order with real passes between them (no rendering, see lib.mjs).
 *   node e2e/run.mjs [--q=low|mobile|medium] [--from=N] [--to=N] [--shots=DIR] [--base=URL]
 * --from=N skips the checks of loops before N (they are still played, quickly) — jump straight to the loop you work on.
 * Needs a running dev server (npm run dev).
 */
import { playwright, BROWSER_ARGS, openGame } from './lib.mjs';
import { LOOPS, LAST_LOOP, pass } from './loops.mjs';

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const q = arg('q', 'low'), from = +arg('from', 1), to = +arg('to', LAST_LOOP), shots = arg('shots', ''), base = arg('base', 'http://localhost:5173/');

const t0 = Date.now();
const { chromium } = await playwright();
const browser = await chromium.launch({ args: BROWSER_ARGS });
const t = await openGame(browser, { base, q, label: q, shots });
console.log(`loaded in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
for (let n = 1; n <= to; n++) {
  t.checking = n >= from;
  await LOOPS[n](t, q);
  if (n < to) { t.checking = n + 1 >= from; await pass(t, n); }
}
await browser.close();
const fails = t.summary();
console.log(`total ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fails ? 1 : 0);
