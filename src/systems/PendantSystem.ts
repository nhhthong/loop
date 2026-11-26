import * as THREE from 'three';
import type { System } from '../core/System';
import type { Lamp } from '../world/Furnish';

/** Gently swaying hanging bulbs: light, glow and cord follow a slow two-axis pendulum (shadows sweep with them). */
export class PendantSystem implements System {
  private time = 0;
  private readonly lamps: Lamp[];
  private readonly off = new THREE.Vector3();

  constructor(lamps: Lamp[]) { this.lamps = lamps.filter((l) => l.swing); }

  update(dt: number) {
    const t = (this.time += dt);
    this.lamps.forEach((l, i) => {
      const s = l.swing!;
      const ax = s.amp * Math.sin(t * 1.9 + i), az = s.amp * 0.45 * Math.sin(t * 1.37 + 1.3 + i);
      this.off.set(Math.sin(ax), -Math.cos(ax) * Math.cos(az), Math.sin(az)).multiplyScalar(s.len);
      l.light.position.copy(s.anchor).add(this.off);
      l.glow?.position.copy(l.light.position);
      if (s.cord) {
        s.cord.position.copy(s.anchor).addScaledVector(this.off, 0.5);
        s.cord.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.off.clone().negate().normalize());
      }
    });
  }
}
