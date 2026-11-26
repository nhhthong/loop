import * as THREE from 'three';
import { Q } from '../engine/Quality';
import type { Player } from '../player/Player';
import type { System } from '../core/System';
import { configureShadow, type Lamp } from '../world/Furnish';

const SHADOW_REFRESH_DIST = 7;
const PROXY_HYSTERESIS = 1.3;
const POOL_FADE = 0.3; // s: a lamp fades in/out when it joins/leaves the light pool

/**
 * Lamp flicker, corridor bulb drop-outs, per-lamp drivers, shadow refresh gating, the `low`-quality shadow proxy and,
 * with `Q.lightPool`, the light pool (a fixed number of scene lights fed by the most relevant lamps).
 */
export class LightingSystem implements System {
  private time = 0;
  private bulbOut = 0;
  private proxy: THREE.PointLight | null = null;
  private proxyFor = -1;
  /** light pool slots: which lamp each pooled light currently shows, and its fade (0..1) */
  private readonly pool: { light: THREE.PointLight; lamp: number; fade: number }[] = [];
  /** a second place the pool must light (e.g. what a portal shows); null when none */
  extraFocus: () => THREE.Vector3 | null = () => null;

  /** `holdCorridor`: while true the corridor bulb burns steady (wake-up). */
  constructor(private readonly lamps: Lamp[], private readonly player: Player, scene: THREE.Scene, private readonly holdCorridor: () => boolean) {
    if (Q.shadowProxy) {
      this.proxy = new THREE.PointLight(0xffffff, 0, 6, 2);
      configureShadow(this.proxy);
      scene.add(this.proxy);
    }
    for (let i = 0; i < Q.lightPool; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 1, 2);
      scene.add(light);
      this.pool.push({ light, lamp: -1, fade: 0 });
    }
  }

  update(dt: number) {
    const t = (this.time += dt);
    const pp = this.player.eyePos(); // the camera (also right in the menu, where the body stays put)
    this.lamps.forEach((l, i) => {
      let k = 1;
      const corridor = l.tag === 'corridor';
      if (l.flicker > 0 && !(corridor && this.holdCorridor())) {
        const n = Math.sin(t * 13.1 + i * 7) * Math.sin(t * 7.3 + i) * Math.sin(t * 2.1 + i * 3);
        k = 1 - l.flicker * Math.max(0, n) * 0.6;
        if (corridor) { // corridor bulb drop-outs
          if (this.bulbOut <= 0 && Math.random() < dt * 0.25) this.bulbOut = 0.05 + Math.random() * 0.25;
          if (this.bulbOut > 0) { this.bulbOut -= dt; k *= 0.05 + Math.random() * 0.15; }
        }
      }
      if (l.driver) k *= l.driver();
      l.light.intensity = l.base * k;
      if (l.glow) l.glow.visible = k > 0.25;
      l.light.shadow.autoUpdate = l.light.position.distanceTo(pp) < SHADOW_REFRESH_DIST;
    });
    if (this.proxy) this.updateShadowProxy(this.proxy);
    if (this.pool.length) this.updatePool(dt);
  }

  /**
   * Light pool: the K lamps scoring highest near the player (intensity / (1 + d²), members boosted for hysteresis) are
   * rendered by the K pooled lights; a lamp leaving fades out before its slot is reused, a newcomer fades in.
   */
  private updatePool(dt: number) {
    const p = this.player.eyePos(), q = this.extraFocus();
    const d2 = (v: THREE.Vector3) => Math.min(v.distanceToSquared(p), q ? v.distanceToSquared(q) : Infinity);
    const member = new Set(this.pool.filter((s) => s.lamp >= 0 && s.fade > 0).map((s) => s.lamp));
    const wanted = this.lamps
      .map((l, i) => ({ i, score: (l.light.intensity / (1 + d2(l.light.position))) * (member.has(i) ? PROXY_HYSTERESIS : 1) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.pool.length)
      .map((c) => c.i);
    const step = dt / POOL_FADE;
    for (const s of this.pool) {
      if (s.lamp >= 0 && wanted.includes(s.lamp)) s.fade = Math.min(1, s.fade + step);
      else if (s.lamp >= 0 && (s.fade -= step) <= 0) { s.lamp = -1; s.fade = 0; }
    }
    for (const i of wanted) {
      if (this.pool.some((s) => s.lamp === i)) continue;
      const free = this.pool.find((s) => s.lamp < 0);
      if (free) { free.lamp = i; free.fade = 0; }
    }
    for (const s of this.pool) {
      if (s.lamp < 0) { s.light.intensity = 0; continue; }
      const src = this.lamps[s.lamp].light;
      s.light.position.copy(src.position);
      s.light.color.copy(src.color);
      s.light.distance = src.distance;
      s.light.intensity = src.intensity * s.fade;
    }
  }

  /**
   * `low` quality: one shadow-casting point light stands in for the strongest lamp near the player
   * (that lamp is muted while the proxy plays its part). Constant light count → no shader recompiles.
   */
  private updateShadowProxy(proxy: THREE.PointLight) {
    const p = this.player.eyePos();
    const score = (l: THREE.Light) => l.intensity / (1 + l.position.distanceToSquared(p));
    let best = this.proxyFor, bestScore = best >= 0 ? score(this.lamps[best].light) * PROXY_HYSTERESIS : 0;
    this.lamps.forEach((l, i) => {
      if (l.tag === 'leak' || l.base <= 0) return;
      const sc = score(l.light);
      if (sc > bestScore) { best = i; bestScore = sc; }
    });
    this.proxyFor = best;
    if (best < 0) { proxy.intensity = 0; return; }
    const src = this.lamps[best].light;
    proxy.position.copy(src.position);
    proxy.color.copy(src.color);
    proxy.distance = src.distance;
    proxy.decay = src.decay;
    proxy.intensity = src.intensity;
    src.intensity = 0;
  }
}
