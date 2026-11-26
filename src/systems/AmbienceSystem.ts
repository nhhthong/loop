import * as THREE from 'three';
import type { AudioSys } from '../engine/Audio';
import type { Player } from '../player/Player';
import type { System } from '../core/System';
import { DIV_Z } from '../data/layout';

/** Crossfades the corridor and house ambience beds by the player's side of the basement door. */
export class AmbienceSystem implements System {
  /** master fade 0..1 (driven by the wake-up sequence) */
  fade = 1;
  private corridor: THREE.Audio | null = null;
  private room: THREE.Audio | null = null;

  constructor(private readonly audio: AudioSys, private readonly player: Player) {}

  start() {
    this.corridor = this.audio.play2D('corridor_ambience', 0, true);
    this.room = this.audio.play2D('room_ambience', 0, true);
  }

  update(dt: number) {
    const inRoom = THREE.MathUtils.clamp(0.5 - (this.player.position.z - DIV_Z) / 1.5, 0, 1);
    const toward = (a: THREE.Audio | null, v: number) => a?.setVolume(THREE.MathUtils.lerp(a.getVolume(), v * this.fade, dt * 2));
    toward(this.corridor, 0.5 * (1 - inRoom * 0.8));
    toward(this.room, 0.45 * (0.2 + inRoom * 0.8));
  }
}
