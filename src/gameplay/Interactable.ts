import type * as THREE from 'three';

/** Something the player can use with E while looking at it (see InteractionSystem). */
export interface Interactable {
  /** prompt shown while focused */
  readonly prompt: string;
  /** point the player must look at, or null when not usable right now */
  focusPoint(): THREE.Vector3 | null;
  use(): void;
  update?(dt: number): void;
}
