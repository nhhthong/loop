import * as THREE from 'three';
import type { Player } from '../player/Player';
import type { Renderer } from '../engine/Renderer';
import type { UI } from '../ui/UI';
import type { System } from '../core/System';
import type { Lamp } from '../world/Furnish';

/** Menu backdrop: the R6 alcove from beside the west window — armchair with the teddy and the floor lamp on the right half, text on the dark left. */
const EYE = new THREE.Vector3(-0.9, 1.32, -5.05);
const LOOK = new THREE.Vector3(0.75, 0.62, -6.4);
const FOV = 46;
const FLICKER_END = 0.42, BLACKOUT = 0.5, HANDOVER = 1.1; // s after Start

/**
 * The live 3D menu background: a very slow, breathing camera drift on the alcove. On Start the floor lamp flickers,
 * the lights cut out (black), then `onDone` hands over to the wake-up intro.
 */
export class MenuScene implements System {
  private t = 0;
  private exitT = -1;
  private readonly base = new THREE.Euler();

  constructor(
    private readonly player: Player,
    private readonly renderer: Renderer,
    private readonly ui: UI,
    private readonly lamp: Lamp | undefined,
    private readonly onDone: () => void,
  ) {
    const m = new THREE.Matrix4().lookAt(EYE, LOOK, new THREE.Vector3(0, 1, 0));
    this.base.setFromRotationMatrix(m, 'YXZ');
  }

  get exiting() { return this.exitT >= 0; }

  enter() {
    const cam = this.player.camera;
    cam.fov = FOV; cam.updateProjectionMatrix();
    this.player.bob.position.set(0, 0, 0); this.player.bob.rotation.set(0, 0, 0);
    this.player.pitchObj.rotation.set(0, 0, 0);
    this.renderer.setBlur(0);
    this.ui.setLids(1);
  }

  /** Start pressed: flicker, blackout, hand over. */
  exit() { if (this.exitT < 0) this.exitT = 0; }

  /** Skip the exit animation (dev hooks). */
  finishNow() { if (this.exitT >= 0 && this.exitT < HANDOVER) { this.exitT = HANDOVER; this.done(); } }

  update(dt: number) {
    const t = (this.t += dt), head = this.player.head;
    // slow drift: a few centimetres of sway and a fraction of a degree of turn, like someone standing still and watching
    head.position.set(EYE.x + Math.sin(t * 0.11) * 0.06, EYE.y + Math.sin(t * 0.23) * 0.015, EYE.z + Math.sin(t * 0.07 + 1) * 0.05);
    head.rotation.set(this.base.x + Math.sin(t * 0.17) * 0.006, this.base.y + Math.sin(t * 0.09) * 0.02, Math.sin(t * 0.13) * 0.004, 'YXZ');
    if (this.exitT < 0) return;
    const e0 = this.exitT;
    this.exitT += dt;
    // the floor lamp stutters, then everything goes black
    if (this.lamp && this.exitT < FLICKER_END) this.lamp.driver = () => (Math.sin(this.exitT * 90) > 0.2 ? 1 : 0.08);
    if (e0 < BLACKOUT && this.exitT >= BLACKOUT) this.ui.setLids(0);
    if (e0 < HANDOVER && this.exitT >= HANDOVER) this.done();
  }

  private done() {
    if (this.lamp) this.lamp.driver = undefined;
    this.ui.setLids(0);
    this.player.head.rotation.set(0, 0, 0, 'XYZ');
    this.onDone();
  }
}
