import type { AudioSys } from '../engine/Audio';
import type { Player } from '../player/Player';
import type { Door } from '../world/Door';
import type { System } from '../core/System';
import { DOOR_LOCKED, pick } from '../data/audio';

const NEAR = 1.6, AWAY = 3.5; // m from the bathroom door handle: knocks start on coming back near after having been away
const NEAR_FALLBACK = 6; // s of rattling with the player hovering nearby before the knocks start anyway
const KNOCKS = 5, KNOCK_GAP = 0.62, PAUSE = 0.7;

/**
 * Loop 3: after door 9 slams, someone inside the locked bathroom keeps trying the handle (rattles every 1–2 s).
 * The slam happens right beside the bathroom, so the player must first walk away; when they come back close the
 * rattling stops, a beat later five slow knocks, then silence for good.
 */
export class ToiletKnockSequence implements System {
  private phase: 'idle' | 'rattle' | 'pause' | 'knock' | 'done' = 'idle';
  private t = 0;
  private away = false;
  private rattling = 0;
  /** knocks played so far (dev hooks / tests) */
  knocks = 0;

  constructor(private readonly player: Player, private readonly door: Door, private readonly audio: AudioSys) {}

  start() { if (this.phase === 'idle') { this.phase = 'rattle'; this.t = 0.8; } }

  update(dt: number) {
    if (this.phase === 'idle' || this.phase === 'done') return;
    this.t -= dt;
    if (this.phase === 'rattle') {
      const d = this.door.handleWorld().distanceTo(this.player.eyePos());
      this.rattling += dt;
      if (d > AWAY) this.away = true;
      if (d < NEAR && (this.away || this.rattling > NEAR_FALLBACK)) { this.phase = 'pause'; this.t = PAUSE; return; }
      if (this.t <= 0) {
        this.door.rattle();
        this.audio.play3D(pick(DOOR_LOCKED), this.door.handle, 0.85, { ref: 0.9, rate: 0.9 + Math.random() * 0.15 });
        this.t = 1 + Math.random();
      }
    } else if (this.t <= 0) {
      this.phase = 'knock';
      this.door.knock();
      this.audio.play3D('door_knock', this.door.handle, 1, { ref: 1, rate: 0.96 + Math.random() * 0.08 });
      this.t = KNOCK_GAP;
      if (++this.knocks >= KNOCKS) this.phase = 'done';
    }
  }
}
