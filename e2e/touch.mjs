/**
 * Touch controls e2e (Pixel 7 landscape, real touch events via CDP) + desktop UI regression.
 *   node e2e/touch.mjs [--base=URL]
 */
import { playwright, BROWSER_ARGS, Session } from './lib.mjs';

const base = process.argv.find((a) => a.startsWith('--base='))?.split('=')[1] ?? 'http://localhost:5173/';
const { chromium, devices } = await playwright();
const browser = await chromium.launch({ args: BROWSER_ARGS });
const dev = devices['Pixel 7'];
const ctx = await browser.newContext({ ...dev, viewport: { width: dev.viewport.height, height: dev.viewport.width } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
const t = new Session(page, { label: 'touch' });
const cdp = await ctx.newCDPSession(page);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
const center = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
const visible = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0; }, sel);

await page.goto(base);
await page.waitForFunction(() => window.__ready, null, { timeout: 600000 });
t.check('touch device → mobile profile, no quality selector', await page.evaluate(() => document.body.classList.contains('touch')) && !(await visible('#quality')));
t.check('touch UI hidden in the menu', !(await visible('#t-stick')));
const [sx, sy] = await center('#start');
await touch('touchStart', [[sx, sy]]); await touch('touchEnd', []);
await page.evaluate(() => { game.debugIntro(16); game.debugHold(); game.debugAdvance(0.2); game.debugView(0, 6, 0, 0); game.player.lookEnabled = true; });
t.check('touch UI visible after Start', await visible('#t-stick') && await visible('#t-use') && await visible('#t-pause'));
const [kx, ky] = await center('#t-stick');
let a = await t.pos();
await touch('touchStart', [[kx, ky]]); await touch('touchMove', [[kx, ky - 60]]); await t.advance(1);
let b = await t.pos(); await touch('touchEnd', []);
t.check('stick forward walks −z', b.z < a.z - 0.5, `dz=${(b.z - a.z).toFixed(2)}`);
await t.advance(0.6); a = await t.pos(); await t.advance(0.5); b = await t.pos(); // let the step momentum settle first
t.check('stops on release, knob recentres', Math.abs(b.z - a.z) < 0.05 && await page.evaluate(() => document.querySelector('#t-knob').style.transform === ''));
const vw = await page.evaluate(() => innerWidth), vh = await page.evaluate(() => innerHeight);
const yaw0 = await page.evaluate(() => game.player.yaw);
await touch('touchStart', [[vw * 0.65, vh * 0.4]]);
for (let i = 1; i <= 5; i++) { await touch('touchMove', [[vw * 0.65 - i * 20, vh * 0.4]]); await t.advance(1 / 30); }
await touch('touchEnd', []);
t.check('drag turns the view', (await page.evaluate(() => game.player.yaw)) > yaw0 + 0.05);
await t.view(0, 3.9, 0, -0.25); await t.aim('basement');
const [ex, ey] = await center('#t-use');
await touch('touchStart', [[ex, ey]]); await touch('touchEnd', []); await t.advance(1.5);
t.check('E button opens the basement door', (await t.state()).basement.open);
const [px, py] = await center('#t-pause');
await touch('touchStart', [[px, py]]); await touch('touchEnd', []);
t.check('pause button → overlay, controls hidden', await visible('#pause') && !(await visible('#t-stick')));
await touch('touchStart', [[vw / 2, vh / 2]]); await touch('touchEnd', []);
t.check('tap resumes', !(await visible('#pause')) && await visible('#t-stick'));
await page.evaluate(() => document.fullscreenElement && document.exitFullscreen()); await page.waitForTimeout(300);
await page.setViewportSize({ width: dev.viewport.width, height: dev.viewport.height });
t.check('portrait → rotate overlay', await visible('#rotate'));
await ctx.close();
// desktop regression
const d = await browser.newPage({ viewport: { width: 960, height: 540 } });
await d.goto(base); await d.waitForFunction(() => window.__ready, null, { timeout: 600000 });
const r = await d.evaluate(() => ({ touch: document.body.classList.contains('touch'), quality: getComputedStyle(document.getElementById('quality')).display !== 'none', level: document.querySelector('#quality button.on')?.dataset.q }));
t.check('desktop: no touch UI, quality selector shown, default Low', !r.touch && r.quality && r.level === 'low', JSON.stringify(r));
await browser.close();
process.exit(t.summary() ? 1 : 0);
