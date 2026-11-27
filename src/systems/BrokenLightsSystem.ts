import * as THREE from 'three';
import type { AudioSys } from '../engine/Audio';
import type { Player } from '../player/Player';
import type { System } from '../core/System';
import type { Lamp } from '../world/Furnish';

const CRACKLE_DIST = 5; // m: sparks are heard from lamps this close
const CRACKLE_GAP = 0.5; // s: at most one crackle this often

/**
 * Failing wiring (loop 3): every lamp it is given stutters on its own random schedule — short and long blackouts,
 * rapid on/off bursts, a nervous flicker in between — with electric crackles from lamps near the player.
 * Works through `Lamp.driver`, so the normal lighting (and the mobile light pool) apply on top.
 */
export class BrokenLightsSystem implements System {
  private lamps: Lamp[] = [];
  private state: { mode: 'on' | 'out' | 'stutter'; t: number; k: number }[] = [];
  private time = 0;
  private sinceCrackle = 0;

  constructor(private readonly player: Player, private readonly audio: AudioSys, private readonly scene: THREE.Scene) {}

  start(lamps: Lamp[]) {
    this.lamps = lamps;
    this.state = lamps.map(() => ({ mode: 'on', t: 0.3 + Math.random() * 2, k: 1 }));
    lamps.forEach((l, i) => { l.driver = () => this.state[i].k; });
  }

  update(dt: number) {
    if (!this.lamps.length) return;
    const t = (this.time += dt), eye = this.player.eyePos();
    this.sinceCrackle += dt;
    this.lamps.forEach((l, i) => {
      const s = this.state[i];
      s.t -= dt;
      if (s.t <= 0) {
        if (s.mode !== 'on') { s.mode = 'on'; s.t = 0.8 + Math.random() * 3.2; }
        else {
          const r = Math.random();
          s.mode = r < 0.75 ? 'out' : 'stutter';
          s.t = r < 0.45 ? 0.2 + Math.random() * 0.2 : r < 0.75 ? 0.6 + Math.random() * 0.4 : 0.5 + Math.random() * 0.4;
          if (this.sinceCrackle > CRACKLE_GAP && l.light.position.distanceTo(eye) < CRACKLE_DIST) {
            this.sinceCrackle = 0;
            this.audio.play3D('electric_crackle', l.light.position.clone(), 0.45, { ref: 0.8, rate: 0.9 + Math.random() * 0.25, scene: this.scene });
          }
        }
      }
      s.k = s.mode === 'out' ? 0.02
        : s.mode === 'stutter' ? (Math.sin(t * 57 + i * 3) > 0 ? 1 : 0.05)
        : 0.82 + 0.18 * Math.sin(t * 31 + i * 7) * Math.sin(t * 17.3 + i);
    });
  }
}
