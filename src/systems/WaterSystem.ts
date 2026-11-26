import type * as THREE from 'three';
import type { System } from '../core/System';

/** Scrolls water normal maps along their flow direction (texture v). */
export class WaterSystem implements System {
  constructor(private readonly flowing: { tex: THREE.Texture; speed: number }[]) {}

  update(dt: number) {
    for (const f of this.flowing) f.tex.offset.y = (f.tex.offset.y - f.speed * dt) % 1;
  }
}
