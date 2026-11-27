import type { AudioSys } from '../engine/Audio';
import type { Door } from '../world/Door';
import type { System } from '../core/System';
import { DOOR_LOCKED, pick } from '../data/audio';

const KNOCKS = 5, KNOCK_GAP = 0.2; // five heavy blows within 1 s
const KNOCK_JOLT = 3; // leaf shake per blow (× a normal knock)

/**
 * Loop 3: after door 9 slams, someone inside the locked bathroom keeps trying the handle, without pause, until the
 * player presses E on the bathroom door (`answer`): the rattling stops and five violent blows shake the door, then silence.
 */
export class ToiletKnockSequence implements System {
  private phase: 'idle' | 'rattle' | 'knock' | 'done' = 'idle';
  private t = 0;
  /** knocks played so far (dev hooks / tests) */
  knocks = 0;

  constructor(private readonly door: Door, private readonly audio: AudioSys) {}

  start() { if (this.phase === 'idle') { this.phase = 'rattle'; this.t = 0.8; } }

  /** E on the bathroom door: true when it answers the rattling (the normal locked rattle is skipped). */
  answer() {
    if (this.phase !== 'rattle') return false;
    this.phase = 'knock';
    this.t = 0;
    return true;
  }

  update(dt: number) {
    if (this.phase === 'idle' || this.phase === 'done') return;
    this.t -= dt;
    if (this.t > 0) return;
    if (this.phase === 'rattle') {
      this.door.rattle();
      this.audio.play3D(pick(DOOR_LOCKED), this.door.handle, 0.85, { ref: 0.9, rate: 0.9 + Math.random() * 0.15 });
      this.t = 0.5 + Math.random() * 0.4;
    } else {
      this.door.knock(KNOCK_JOLT);
      this.audio.play3D('door_knock', this.door.handle, 3.2, { ref: 3, rate: 0.85 + Math.random() * 0.06 });
      this.t = KNOCK_GAP;
      if (++this.knocks >= KNOCKS) this.phase = 'done';
    }
  }
}
