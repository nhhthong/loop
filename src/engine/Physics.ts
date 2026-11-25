import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export type R = typeof RAPIER;

export class Physics {
  rapier!: R;
  world!: RAPIER.World;

  async init() {
    await RAPIER.init();
    this.rapier = RAPIER;
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  }

  /** Static axis-aligned or rotated box collider. */
  addBox(center: THREE.Vector3, half: THREE.Vector3, quat?: THREE.Quaternion) {
    const desc = this.rapier.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(center.x, center.y, center.z);
    if (quat) desc.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    return this.world.createCollider(desc);
  }

  /** Kinematic body (door) that we move manually. */
  addKinematicBox(half: THREE.Vector3) {
    const body = this.world.createRigidBody(this.rapier.RigidBodyDesc.kinematicPositionBased());
    const col = this.world.createCollider(this.rapier.ColliderDesc.cuboid(half.x, half.y, half.z), body);
    return { body, col };
  }

  step(dt: number) {
    this.world.timestep = Math.min(dt, 1 / 30);
    this.world.step();
  }
}
