import * as THREE from 'three';
import { Q } from '../engine/Quality';
import type { Player } from '../player/Player';
import type { System } from '../core/System';
import { configureShadow, type Lamp } from '../world/Furnish';

const SHADOW_REFRESH_DIST = 7;
const PROXY_HYSTERESIS = 1.3;

/** Lamp flicker, corridor bulb drop-outs, per-lamp drivers, shadow refresh gating and the `low`-quality shadow proxy. */
export class LightingSystem implements System {
  private time = 0;
  private bulbOut = 0;
  private proxy: THREE.PointLight | null = null;
  private proxyFor = -1;

  /** `holdCorridor`: while true the corridor bulb burns steady (wake-up). */
  constructor(private readonly lamps: Lamp[], private readonly player: Player, scene: THREE.Scene, private readonly holdCorridor: () => boolean) {
    if (Q.shadowProxy) {
      this.proxy = new THREE.PointLight(0xffffff, 0, 6, 2);
      configureShadow(this.proxy);
      scene.add(this.proxy);
    }
  }

  update(dt: number) {
    const t = (this.time += dt);
    const pp = this.player.position;
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
