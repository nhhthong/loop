import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Physics } from '../engine/Physics';
import { worldBox } from './Materials';

export interface DoorOpts {
  /** hinge point at floor level */
  hinge: THREE.Vector3;
  width: number;
  height: number;
  /** yaw that makes the leaf's local +X run along the wall from the hinge */
  baseYaw: number;
  /** +1 / −1: which way positive opening angle swings */
  openSign: 1 | -1;
  /** starting opening angle (rad), e.g. ajar */
  angle?: number;
  color?: number;
}

/** Flat painted slab door with black lever, hinged at `hinge`. */
export class Door {
  readonly pivot = new THREE.Group();
  readonly handle: THREE.Object3D;
  private body: RAPIER.RigidBody;
  private angle = 0;
  private target = 0;
  private vel = 0;
  isOpen = false;
  readonly leafW: number;
  readonly leafH: number;
  readonly leafT = 0.045;
  private readonly baseYaw: number;
  private readonly openSign: number;

  constructor(physics: Physics, wood: THREE.MeshStandardMaterial, o: DoorOpts) {
    this.leafW = o.width - 0.01;
    this.leafH = o.height - 0.025;
    this.baseYaw = o.baseYaw;
    this.openSign = o.openSign;
    this.angle = this.target = o.angle ?? 0;
    const W = this.leafW, H = this.leafH, T = this.leafT;
    this.pivot.position.copy(o.hinge).add(new THREE.Vector3(0, 0.012, 0));
    const leaf = new THREE.Group();
    leaf.position.x = W / 2;
    this.pivot.add(leaf);

    // contemporary flat slab: painted white, square edges, matte black lever hardware
    const paint = wood.clone();
    paint.color.set(o.color ?? 0xf0ede6);
    paint.roughness = 0.45;
    const slab = new THREE.Mesh(worldBox(W, H, T, 0.8), paint);
    slab.position.set(0, H / 2, 0); slab.castShadow = true; slab.receiveShadow = true; leaf.add(slab);
    const black = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.45 });
    this.handle = new THREE.Group();
    this.handle.position.set(W / 2 - 0.065, 0.95, 0);
    leaf.add(this.handle);
    for (const s of [-1, 1]) {
      const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.008, 32), black);
      rose.rotation.x = Math.PI / 2; rose.position.set(0, 0, s * (T / 2 + 0.004)); this.handle.add(rose);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 16), black);
      neck.rotation.x = Math.PI / 2; neck.position.set(0, 0, s * (T / 2 + 0.03)); this.handle.add(neck);
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.016, 0.012), black);
      lever.position.set(-0.055, 0, s * (T / 2 + 0.055)); lever.castShadow = true; this.handle.add(lever);
    }
    for (const y of [0.22, H / 2, H - 0.22]) {
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.09, 0.03), black);
      hinge.position.set(-W / 2 - 0.002, y, 0); leaf.add(hinge);
    }

    this.pivot.rotation.y = this.baseYaw + this.openSign * this.angle;
    const { body } = physics.addKinematicBox(new THREE.Vector3(W / 2, H / 2, T / 2));
    this.body = body;
    this.syncBody();
  }

  /** World position of the knob (for the hand reach / interaction ray). */
  handleWorld(out = new THREE.Vector3()) { return this.handle.getWorldPosition(out); }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.target = 1.65;
  }

  update(dt: number) {
    // critically-damped spring with a slight heavy-door ease
    const k = 6, c = 2 * Math.sqrt(k) * 0.9;
    const acc = (this.target - this.angle) * k - this.vel * c;
    this.vel += acc * dt;
    this.angle += this.vel * dt * 0.55;
    this.pivot.rotation.y = this.baseYaw + this.openSign * this.angle;
    this.syncBody();
  }

  private syncBody() {
    this.pivot.updateMatrixWorld(true);
    const leafCenter = new THREE.Vector3(this.leafW / 2, this.leafH / 2, 0).applyMatrix4(this.pivot.matrixWorld);
    const q = new THREE.Quaternion().setFromRotationMatrix(this.pivot.matrixWorld);
    this.body.setNextKinematicTranslation(leafCenter);
    this.body.setNextKinematicRotation(q);
  }
}
