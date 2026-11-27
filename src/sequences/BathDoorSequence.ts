import * as THREE from 'three';
import type { AudioSys } from '../engine/Audio';
import type { Player } from '../player/Player';
import type { UI } from '../ui/UI';
import type { Door } from '../world/Door';
import type { System } from '../core/System';
import { seg, crossed } from '../core/timeline';

const TURN = 1.0, CLOSE_AT = 0.8, CLOSE_DUR = 3.0, END = 3.9;

/**
 * Loop 2: passing the ajar bathroom door, control is taken away, the view turns to the door and it slowly swings
 * shut (creak, then the latch). Control comes back; the door is locked from then on (`onDone`).
 */
export class BathDoorSequence implements System {
  private t = -1;
  private yaw0 = 0;
  private pitch0 = 0;
  private dYaw = 0;
  private dPitch = 0;

  constructor(
    private readonly player: Player,
    private readonly door: Door,
    private readonly audio: AudioSys,
    private readonly ui: UI,
    private readonly onDone: () => void,
  ) {}

  get active() { return this.t >= 0; }

  start() {
    const P = this.player;
    this.t = 0;
    P.control = 0;
    P.lookEnabled = false;
    this.ui.cinematic(true);
    this.ui.prompt('');
    // look at the middle of the leaf, a little below eye height
    const to = this.door.handleWorld().setY(1.3).sub(P.eyePos());
    this.yaw0 = P.yaw; this.pitch0 = P.pitch;
    const yaw = Math.atan2(-to.x, -to.z);
    this.dYaw = THREE.MathUtils.euclideanModulo(yaw - P.yaw + Math.PI, Math.PI * 2) - Math.PI;
    this.dPitch = Math.atan2(to.y, Math.hypot(to.x, to.z)) - P.pitch;
  }

  update(dt: number) {
    if (this.t < 0) return;
    const t = (this.t += dt), P = this.player, k = seg(t, 0, TURN);
    P.yaw = this.yaw0 + this.dYaw * k;
    P.pitch = this.pitch0 + this.dPitch * k;
    if (crossed(t, dt, CLOSE_AT)) {
      this.door.swingShut(CLOSE_DUR);
      this.audio.play3D('door_creak', this.door.handle, 0.85, { ref: 0.8, rate: 0.62 });
    }
    if (crossed(t, dt, CLOSE_AT + CLOSE_DUR)) this.audio.play3D('door_handle', this.door.handle, 1.0, { ref: 0.8, rate: 0.85 });
    if (t > END) {
      this.t = -1;
      P.control = 1;
      P.lookEnabled = true;
      this.ui.cinematic(false);
      this.onDone();
    }
  }
}
