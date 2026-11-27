import * as THREE from 'three';
import type { AudioSys } from '../engine/Audio';
import type { Player } from '../player/Player';
import type { System } from '../core/System';
import type { Lamp } from '../world/Furnish';

const CRACKLE_DIST = 5; // m: sparks are heard from lamps this close
const CRACKLE_GAP = 0.5; // s: at most one crackle this often
const DIE_MIN = 1.2, DIE_MAX = 3; // s of stuttering before a dying lamp goes out for good
const DIM = 0.4; // level of the one bulb left burning
const ENV_DARK = 0.1; // scene.environmentIntensity once every dying lamp is out (the probes were baked with the lamps on)

/**
 * Failing wiring (loop 3): the dying lamps stutter for a moment, then go out for good one after another (crackle);
 * the one `dim` bulb keeps burning low with a nervous flicker and short drop-outs — just enough light to move.
 * Works through `Lamp.driver`, so the normal lighting (and the mobile light pool) apply on top. The reflection probes'
 * fill fades with the dead lamps, else the house would keep glowing in the dark.
 */
export class BrokenLightsSystem implements System {
  private lamps: Lamp[] = [];
  private state: { mode: 'on' | 'out' | 'stutter'; t: number; k: number; die: number; dim: boolean }[] = [];
  private time = 0;
  private sinceCrackle = 0;
  private env0 = 0;
  private dying = 0;

  constructor(private readonly player: Player, private readonly audio: AudioSys, private readonly scene: THREE.Scene) {}

  start(dying: Lamp[], dim?: Lamp) {
    this.lamps = dim ? [...dying, dim] : dying;
    this.time = 0;
    this.env0 = this.scene.environmentIntensity;
    this.dying = dying.length;
    this.state = this.lamps.map((l) => ({ mode: 'on', t: Math.random() * 0.3, k: 1, die: DIE_MIN + Math.random() * (DIE_MAX - DIE_MIN), dim: l === dim }));
    this.lamps.forEach((l, i) => { l.driver = () => this.state[i].k; });
  }

  update(dt: number) {
    if (!this.lamps.length) return;
    const t = (this.time += dt), eye = this.player.eyePos();
    this.sinceCrackle += dt;
    let dead = 0;
    this.lamps.forEach((l, i) => {
      const s = this.state[i];
      if (s.k === 0) { dead++; return; }
      if (!s.dim && t >= s.die) { s.k = 0; dead++; this.crackle(l, eye, true); return; }
      s.t -= dt;
      if (s.t <= 0) {
        if (s.mode !== 'on') { s.mode = 'on'; s.t = s.dim ? 1 + Math.random() * 3 : 0.1 + Math.random() * 0.4; }
        else {
          s.mode = Math.random() < 0.6 ? 'out' : 'stutter';
          s.t = s.dim ? 0.08 + Math.random() * 0.25 : 0.05 + Math.random() * 0.3;
          this.crackle(l, eye);
        }
      }
      const k = s.mode === 'out' ? 0.02
        : s.mode === 'stutter' ? (Math.sin(t * 57 + i * 3) > 0 ? 1 : 0.05)
        : 0.82 + 0.18 * Math.sin(t * 31 + i * 7) * Math.sin(t * 17.3 + i);
      s.k = s.dim ? k * DIM : k;
    });
    if (this.dying) this.scene.environmentIntensity = THREE.MathUtils.lerp(this.env0, ENV_DARK, dead / this.dying);
  }

  private crackle(l: Lamp, eye: THREE.Vector3, force = false) {
    if ((!force && this.sinceCrackle <= CRACKLE_GAP) || l.light.position.distanceTo(eye) >= CRACKLE_DIST) return;
    this.sinceCrackle = 0;
    this.audio.play3D('electric_crackle', l.light.position.clone(), 0.45, { ref: 0.8, rate: 0.9 + Math.random() * 0.25, scene: this.scene });
  }
}
