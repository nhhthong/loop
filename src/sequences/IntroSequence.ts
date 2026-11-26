import * as THREE from 'three';
import type { AudioSys } from '../engine/Audio';
import type { Renderer } from '../engine/Renderer';
import type { Player } from '../player/Player';
import type { Hands } from '../player/Hands';
import type { UI } from '../ui/UI';
import type { System } from '../core/System';
import type { AmbienceSystem } from '../systems/AmbienceSystem';
import { seg, crossed } from '../core/timeline';

/** heavy breathing: [time, volume, rate] gasps that slowly calm down */
const GASPS: [number, number, number][] = [[0.2, 0.75, 1.08], [2.3, 0.7, 1.04], [4.5, 0.6, 1.0], [6.8, 0.5, 0.97], [9.2, 0.4, 0.94], [11.7, 0.28, 0.9]];
const SIT_EYE = 0.78, STAND_EYE = 1.62, SIT_PITCH = -0.26, SIT_YAW = 0.12;
const END = 15.2;

/**
 * Wake-up cinematic. Gasping awake on the corridor floor; eyes flutter open on an extreme close-up of the right hand
 * (narrow FOV), focus pulls in, the hand turns and flexes as if unfamiliar, then drops away and the view widens
 * before the player stands. The hand stays framed so the scan's wrist cut is never seen.
 */
export class IntroSequence implements System {
  /** seconds since start; −1 = not running */
  private t = -1;

  constructor(
    private readonly player: Player,
    private readonly hands: Hands,
    private readonly renderer: Renderer,
    private readonly ui: UI,
    private readonly audio: AudioSys,
    private readonly ambience: AmbienceSystem,
  ) {}

  get active() { return this.t >= 0; }

  start() {
    const P = this.player;
    this.t = 0;
    this.audio.play2D('heartbeat', 0.5, false, 1.0);
    P.control = 0;
    P.eye = SIT_EYE;
    P.pitch = SIT_PITCH;
    P.yaw = SIT_YAW;
    P.camera.fov = 40;
    P.camera.updateProjectionMatrix();
    this.renderer.setBlur(1);
    this.ui.setLids(0);
  }

  /** jump to `t` seconds (dev) */
  seek(t: number) { this.t = t; }

  /** abort without the hand-over to the player (dev views) */
  stop() { this.t = -1; this.ambience.fade = 1; }

  update(dt: number) {
    if (this.t < 0) return;
    const t = (this.t += dt);
    const P = this.player, H = this.hands;

    for (const [at, vol, rate] of GASPS) if (crossed(t, dt, at)) this.audio.play2D('breath_wake', vol, false, rate);
    const amp = THREE.MathUtils.lerp(1, 0.25, seg(t, 0, 13));
    const breath = Math.sin((t / 2.25) * Math.PI * 2);
    this.ambience.fade = seg(t, 1.5, 6);

    // eyelids: closed → flutter → heavy blink → open
    let lid = 0;
    if (t > 1.4) lid = 0.3 * seg(t, 1.4, 2.0);
    if (t > 2.0) lid = 0.3 - 0.28 * seg(t, 2.0, 2.15);
    if (t > 2.15) lid = 0.02 + 0.55 * seg(t, 2.15, 2.9);
    if (t > 3.3) lid = 0.57 - 0.5 * seg(t, 3.3, 3.45);
    if (t > 3.45) lid = 0.07 + 0.93 * seg(t, 3.45, 4.8);
    this.ui.setLids(lid);

    // focus pulls onto the hand; slight focus "hunting" while dazed
    const blur = 1 - seg(t, 2.2, 6.8);
    this.renderer.setBlur(Math.max(0, blur + Math.sin(t * 1.9) * 0.08 * blur));
    this.renderer.vignette.darkness = 0.55 + (1 - seg(t, 2, 9)) * 0.3;
    this.renderer.exposure.brightness = -0.22 * (1 - seg(t, 1.5, 7));

    // camera: sitting slumped against the end wall, zoomed in, chest heaving
    P.camera.fov = THREE.MathUtils.lerp(40, 70, seg(t, 11.3, 13.4));
    P.camera.updateProjectionMatrix();
    P.yaw = SIT_YAW;
    P.pitch = SIT_PITCH + breath * 0.016 * amp + Math.sin(t * 0.7) * 0.01;

    // hand: close-up, trembling with the breath
    H.setVisible(t < 11.3);
    H.target.set(0.06, -0.095 + breath * 0.005 * amp, -0.265);
    H.target.x += Math.sin(t * 6.1) * 0.0012 * amp + Math.sin(t * 1.3) * 0.003;
    H.target.y += Math.sin(t * 7.7) * 0.001 * amp;
    H.pole.set(1, -1.2, 0.4);
    H.f.set(-0.1, 1, -0.05).normalize();
    H.b.set(0, 0.02, -1).normalize();
    // wrist: palm → back of hand → palm
    H.roll = 1.5 * seg(t, 5.4, 7.3) - 2.2 * seg(t, 7.6, 9.4) + 0.7 * seg(t, 9.6, 10.6);
    // fingers: limp → sequential flex wave → slow fist → open
    const wave = seg(t, 6.4, 6.9) * (1 - seg(t, 8.4, 8.8));
    const fist = seg(t, 8.9, 9.7) * (1 - seg(t, 10.1, 10.8));
    H.curls = [0, 1, 2, 3, 4].map((i) => {
      const limp = 0.16 + Math.min(i, 3) * 0.015 + breath * 0.02 * amp;
      const w = 0.5 * (1 + Math.sin(t * 5.2 - i * 0.9)) * 0.7;
      return Math.max(limp + wave * w, fist * (i === 4 ? 0.8 : 1.0));
    });

    // stand up
    P.eye = THREE.MathUtils.lerp(SIT_EYE, STAND_EYE, seg(t, 13, END));
    if (t > 11.3) P.pitch = THREE.MathUtils.lerp(SIT_PITCH, 0, seg(t, 11.3, END)) + breath * 0.01 * amp;
    if (t > END) this.finish();
  }

  private finish() {
    this.t = -1;
    this.ambience.fade = 1;
    this.player.control = 1;
    this.player.lookEnabled = true;
    this.ui.crosshair(true);
    this.ui.hint('WASD move · Mouse look · E interact · Shift run · C crouch', 7);
  }
}
