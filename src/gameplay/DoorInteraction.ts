import * as THREE from 'three';
import type { AudioSys } from '../engine/Audio';
import type { DoorLike } from '../world/Door';
import { DOOR_LOCKED, pick } from '../data/audio';
import type { Interactable } from './Interactable';

/** Locked: rattle + clack. Unlocked: handle click, latch, then the leaf swings open (no visible hand). */
export class DoorInteraction implements Interactable {
  readonly prompt = '[E]  Open door';
  private openT = -1;
  private readonly p = new THREE.Vector3();

  /** `onOpen`: called the moment the leaf starts to swing (e.g. open a linked door on the other side of a portal) */
  constructor(private readonly door: DoorLike, private readonly audio: AudioSys, private readonly onOpen?: () => void) {}

  focusPoint() {
    return this.door.isOpen || this.openT >= 0 ? null : this.door.handleWorld(this.p);
  }

  use() {
    if (this.door.locked) { rattleLocked(this.door, this.audio); return; }
    this.openT = 0;
    this.audio.play3D('door_handle', this.door.handle, 0.8, { ref: 0.6 });
  }

  update(dt: number) {
    if (this.openT < 0) return;
    const t0 = this.openT;
    this.openT += dt;
    if (t0 < 0.25 && this.openT >= 0.25) {
      this.door.open();
      this.onOpen?.();
      this.audio.play3D('door_creak', this.door.handle, 0.9, { ref: 0.8, rate: 0.85 });
    }
    if (this.openT > 0.5) this.openT = -1;
  }
}

export function rattleLocked(door: DoorLike, audio: AudioSys) {
  door.rattle();
  audio.play3D(pick(DOOR_LOCKED), door.handle, 0.9, { ref: 0.8, rate: 0.95 + Math.random() * 0.1 });
}

/** Swing the door shut (creak), lock it, and let the latch click a moment later. */
export function shutAndLock(door: DoorLike, audio: AudioSys) {
  door.close();
  door.locked = true;
  audio.play3D('door_creak', door.handle, 0.7, { ref: 0.8, rate: 1.1 });
  window.setTimeout(() => audio.play3D('door_handle', door.handle, 0.9, { ref: 0.8, rate: 0.8 }), 1300);
}
