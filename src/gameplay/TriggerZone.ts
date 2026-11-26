import type * as THREE from 'three';

/**
 * Fires `action` when the player enters the region (`contains`) while `when` holds.
 * `once` zones disarm after firing. Building block for scripted, position-based events.
 */
export class TriggerZone {
  private inside = false;
  private fired = false;

  constructor(
    private readonly contains: (p: THREE.Vector3) => boolean,
    private readonly action: () => void,
    private readonly opts: { once?: boolean; when?: () => boolean } = {},
  ) {}

  update(p: THREE.Vector3) {
    if (this.fired && this.opts.once) return;
    const inside = this.contains(p) && (this.opts.when?.() ?? true);
    if (inside && !this.inside) { this.fired = true; this.action(); }
    this.inside = inside;
  }
}
