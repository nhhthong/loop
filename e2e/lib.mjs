/**
 * e2e helpers. The real-time loop is held (`game.debugHold()`); the simulation is advanced with `game.debugAdvance()` (no rendering), frames are
 * rendered only for screenshots. Playwright: the `playwright` package, or $PLAYWRIGHT (path to its index.mjs).
 */
import { existsSync } from 'node:fs';

const CONTAINER_PW = '/opt/node22/lib/node_modules/playwright/index.mjs';
export async function playwright() {
  if (process.env.PLAYWRIGHT) return import(process.env.PLAYWRIGHT);
  try { return await import('playwright'); } catch { if (existsSync(CONTAINER_PW)) return import(CONTAINER_PW); throw new Error('playwright not found: set $PLAYWRIGHT'); }
}
export const BROWSER_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'];

/** A test session on one page: assertions, simulation control, screenshots. */
export class Session {
  results = [];
  checking = true;

  constructor(page, { label, shots }) { this.page = page; this.label = label; this.shots = shots; }

  check(name, ok, info = '') {
    if (!this.checking) return;
    this.results.push({ name, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'} [${this.label}] ${name}${info ? ' — ' + info : ''}`);
  }

  eval(fn, arg) { return this.page.evaluate(fn, arg); }
  advance(sec) { return this.eval((s) => game.debugAdvance(s), sec); }
  /** advance in slices, sampling `probe` (a function source evaluated in the page) after each; returns the max */
  async sampleMax(sec, probe, slice = 0.1) {
    return this.eval(([sec, src, slice]) => { const f = new Function('game', `return (${src})`); let m = -Infinity; for (let t = 0; t < sec; t += slice) { game.debugAdvance(slice); m = Math.max(m, f(game)); } return m; }, [sec, probe, slice]);
  }
  /** debugView = place + reset camera/control (use between scenes); teleport = place only (keeps running sequences intact) */
  view(x, z, yaw, pitch = 0, y = 0) { return this.eval((a) => { game.debugView(a[0], a[1], a[2], a[3], 1.62, a[4]); game.player.lookEnabled = true; game.debugAdvance(0.1); }, [x, z, yaw, pitch, y]); }
  teleport(x, z, yaw, y = 0) { return this.eval((a) => { game.debugTeleport(...a); game.debugAdvance(0.1); }, [x, z, yaw, y]); }
  aim(door) { return this.eval((d) => { const P = game.player; const v = game.doors[d].handleWorld().sub(P.eyePos()); P.yaw = Math.atan2(-v.x, -v.z); P.pitch = Math.atan2(v.y, Math.hypot(v.x, v.z)); game.debugAdvance(0.1); }, door); }
  press(code) { return this.eval((c) => { game.debugPress(c); game.debugAdvance(1 / 30); }, code); }
  pos() { return this.eval(() => { const v = game.player.position; return { x: v.x, y: v.y, z: v.z }; }); }
  state() {
    return this.eval(() => {
      const D = game.doors, radio = game.furn.props.get('radio');
      let radioPlaying = false; radio?.traverse((o) => { if (o.type === 'Audio' && o.isPlaying) radioPlaying = true; });
      return { loop: game.director.loop, portal: game.portal.active, radioPlaying, prompt: document.querySelector('#prompt').classList.contains('on'),
        store: { open: D.store.isOpen, locked: D.store.locked, rot: D.store.pivot.rotation.y }, bottom: D.stairBottom.isOpen,
        basement: { open: D.basement.isOpen, locked: D.basement.locked }, bath: { locked: D.bath.locked, rot: D.bath.pivot.rotation.y }, control: game.player.control };
    });
  }
  async shot(name) {
    if (!this.shots) return;
    await this.eval(() => game.debugRender());
    await this.page.screenshot({ path: `${this.shots}/${this.label}_${name}.png` });
  }
  summary() { const f = this.results.filter((r) => !r.ok).length; console.log(`\n[${this.label}] ${this.results.length - f}/${this.results.length} passed`); return f; }
}

/**
 * Deterministic page: the real-time loop is held from the moment `window.game` is created (so only `debugAdvance` moves time)
 * and `Math.random` is seeded (same flicker, roaches, drips on every run → comparable images and numbers).
 */
export async function newTestPage(browser, { context, viewport = { width: 640, height: 360 } } = {}) {
  const page = await (context ?? browser).newPage(context ? undefined : { viewport });
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
  await page.addInitScript(() => {
    let s = 12345; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    let g; Object.defineProperty(window, 'game', { configurable: true, get: () => g, set: (v) => { g = v; v.debugHold(); } });
  });
  return page;
}

/** Open the game, press Start, skip the intro (unless `intro: true`). The real-time loop stays held. */
export async function openGame(browser, { base, q, label, shots, context, intro = false, viewport }) {
  const page = await newTestPage(browser, { context, viewport });
  await page.goto(`${base}?q=${q}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 600000 });
  await page.evaluate((intro) => { document.getElementById('start').click(); if (intro) game.debugAdvance(2); else { game.debugIntro(16); game.debugAdvance(0.2); } }, intro);
  return new Session(page, { label, shots });
}
