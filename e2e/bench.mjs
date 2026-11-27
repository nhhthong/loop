/**
 * Performance benchmark (budgets: e2e/budgets.json, explained in specs/006-performance/budget.md).
 *   node e2e/bench.mjs [--q=low|mobile|medium|high] [--save=DIR] [--diff=DIR] [--base=URL]
 * Renders the 8 standard views once each (software GPU in the cloud: numbers are renderer counts, not real FPS), prints draw
 * calls / triangles / lights / shadow-updating lights, the first-load size, and fails when a budget is exceeded.
 * --save=DIR writes the view images; --diff=DIR compares them with images saved earlier (mean per-pixel difference, 0–255).
 * Needs a dev server (npm run dev) and, for the JS part of the load size, a build (npm run build).
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { playwright, BROWSER_ARGS, newTestPage } from './lib.mjs';

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const q = arg('q', 'low'), save = arg('save', ''), diff = arg('diff', ''), base = arg('base', 'http://localhost:5173/');
const budget = JSON.parse(readFileSync(new URL('./budgets.json', import.meta.url)))[q];
const E = -Math.PI / 2, N = 0;
/** [name, x, z, yaw, pitch, y] — keep in sync with specs/006-performance/budget.md */
const VIEWS = [['intro'], ['corridor', 0, 6, N, 0], ['r1', 0, 2.6, N, 0], ['r2hall', 0.2, -4.6, E, 0.05], ['front', 6.2, -6, N, 0.05],
  ['easthall', 8, -4.5, E, 0], ['atrium', 4.3, -4.4, N, -0.15], ['stairwell', 10.5, -4.5, E, -0.38]];

const { chromium } = await playwright();
const browser = await chromium.launch({ args: BROWSER_ARGS });
const page = await newTestPage(browser, { viewport: { width: 960, height: 540 } });
let assetBytes = 0;
page.on('response', (r) => { if (/\/(models|textures|audio)\//.test(r.url())) assetBytes += +(r.headers()['content-length'] ?? 0); });
await page.goto(`${base}?q=${q}`);
await page.waitForFunction(() => window.__ready, null, { timeout: 600000 });
const loadedBytes = assetBytes; // stage 1 (Start enabled); stage 2 continues in the background
await page.waitForFunction(() => window.__loaded, null, { timeout: 600000 });
const allBytes = assetBytes;
let jsBytes = 0;
if (existsSync('dist/assets')) for (const f of readdirSync('dist/assets')) if (f.endsWith('.js')) jsBytes += gzipSync(readFileSync(`dist/assets/${f}`)).length; // JS is served compressed (GitHub Pages gzips it)
const mb = (loadedBytes + jsBytes) / 1e6;

await page.evaluate(() => { document.getElementById('start').click(); game.debugAdvance(2); });
const rows = [], shots = {};
for (const [name, x, z, yaw, pitch] of VIEWS) {
  await page.evaluate(([name, x, z, yaw, pitch]) => {
    if (name === 'intro') game.debugIntro(5.6);
    else {
      if (name === 'stairwell') { game.doors.store.open(); game.debugAdvance(2.5); }
      game.debugView(x, z, yaw, pitch);
    }
    game.debugAdvance(1);
  }, [name, x, z, yaw, pitch]);
  const m = await page.evaluate(() => {
    const R = game.renderer.renderer; R.info.autoReset = false;
    const gl = R.getContext(); const times = [];
    for (let i = 0; i < 3; i++) { R.info.reset(); const t = performance.now(); game.debugRender(); gl.finish(); times.push(performance.now() - t); }
    let lights = 0, shadow = 0;
    game.scene.traverse((o) => { if (o.isLight && o.visible && o.intensity > 0.001) { lights++; if (o.castShadow && o.shadow && (o.shadow.autoUpdate || o.shadow.needsUpdate)) shadow++; } });
    return { calls: R.info.render.calls, tris: R.info.render.triangles, lights, shadow, ms: times.sort((a, b) => a - b)[1] };
  });
  shots[name] = await page.screenshot({ timeout: 300000 });
  rows.push({ name, ...m });
}
await browser.close();

console.log(`\n[${q}] view          calls    tris   lights shadow   ms(sw)`);
for (const r of rows) console.log(`${r.name.padEnd(16)} ${String(r.calls).padStart(6)} ${String(r.tris).padStart(7)} ${String(r.lights).padStart(6)} ${String(r.shadow).padStart(6)} ${r.ms.toFixed(0).padStart(8)}`);
const worst = { calls: Math.max(...rows.map((r) => r.calls)), tris: Math.max(...rows.map((r) => r.tris)), lights: Math.max(...rows.map((r) => r.lights)), shadowLights: Math.max(...rows.map((r) => r.shadow)), mb };
console.log(`worst: ${worst.calls} calls · ${(worst.tris / 1e6).toFixed(2)} M tris · ${worst.lights} lights · ${worst.shadowLights} shadow lights · first load ${mb.toFixed(1)} MB (assets ${(loadedBytes / 1e6).toFixed(1)} + js ${(jsBytes / 1e6).toFixed(1)} gz; stage 2 adds ${((allBytes - loadedBytes) / 1e6).toFixed(1)} MB in the background)`);

let over = 0;
for (const [k, label] of [['calls', 'draw calls'], ['tris', 'triangles'], ['lights', 'lights'], ['shadowLights', 'shadow lights'], ['mb', 'first load MB']]) {
  const lim = budget[k]; if (lim == null) continue;
  const ok = worst[k] <= lim; if (!ok) over++;
  console.log(`${ok ? 'PASS' : 'OVER'} ${label}: ${k === 'mb' ? worst[k].toFixed(1) : worst[k]} (budget ${lim})`);
}

if (save) { mkdirSync(save, { recursive: true }); for (const [n, b] of Object.entries(shots)) writeFileSync(`${save}/${q}_${n}.png`, b); console.log(`saved ${Object.keys(shots).length} images to ${save}`); }
if (diff) {
  const b2 = await chromium.launch(); const p2 = await b2.newPage();
  console.log('\nimage diff vs', diff, '(mean abs per-pixel difference, 0–255; budget ≤ 1)');
  for (const [n, buf] of Object.entries(shots)) {
    const f = `${diff}/${q}_${n}.png`; if (!existsSync(f)) { console.log(n.padEnd(12), 'no baseline'); continue; }
    const d = await p2.evaluate(async ([a, b]) => {
      const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
      const [A, B] = await Promise.all([load(a), load(b)]);
      const px = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
      const da = px(A), db = px(B); if (da.length !== db.length) return -1;
      let s = 0; for (let i = 0; i < da.length; i += 4) s += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
      return s / (da.length / 4 * 3);
    }, [readFileSync(f).toString('base64'), buf.toString('base64')]);
    console.log(`${d >= 0 && d <= 1 ? 'PASS' : 'DIFF'} ${n.padEnd(12)} ${d.toFixed(3)}`);
  }
  await b2.close();
}
process.exit(over ? 1 : 0);
