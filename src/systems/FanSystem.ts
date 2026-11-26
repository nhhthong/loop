import type { System } from '../core/System';
import type { CeilingFan } from '../world/fixtures';

/** Slow, uneven ceiling-fan spin with a slight wobble (its creak loop is a positional emitter on the fan). */
export class FanSystem implements System {
  private time = 0;

  constructor(private readonly fan: CeilingFan | null) {}

  update(dt: number) {
    const t = (this.time += dt);
    const f = this.fan;
    if (!f?.blades) return;
    const speed = 1.1 + Math.sin(t * 0.37) * 0.25 + Math.sin(t * 1.9) * 0.08; // rad/s
    f.blades.rotation.z += speed * dt;
    f.root.rotation.x = Math.sin(t * speed) * 0.012;
    f.root.rotation.z = Math.cos(t * speed) * 0.012;
  }
}
