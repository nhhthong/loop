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

/** Painted four-panel door with a bronze knob, hinged at `hinge`. */
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

    // painted four-panel door (stiles/rails proud of a thinner core), aged bronze knob
    const paint = wood.clone();
    paint.color.set(o.color ?? 0xd2cbbd);
    paint.roughness = 0.5;
    const add = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(worldBox(w, h, d, 0.8), paint);
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; leaf.add(m);
    };
    add(W - 0.02, H - 0.02, T * 0.6, 0, H / 2, 0);
    const st = 0.11, rail = 0.12;
    add(st, H, T, -W / 2 + st / 2, H / 2, 0);
    add(st, H, T, W / 2 - st / 2, H / 2, 0);
    for (const y of [rail / 2, H * 0.42, H - rail / 2]) add(W - st * 2, y === H * 0.42 ? 0.16 : rail, T, 0, y, 0);
    add(0.09, H - rail * 2, T, 0, H / 2, 0);
    const pw = (W - st * 2 - 0.09) / 2;
    for (const [a0, b0] of [[rail, H * 0.42 - 0.08], [H * 0.42 + 0.08, H - rail]]) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      add(pw - 0.06, b0 - a0 - 0.06, 0.008, sx * (pw / 2 + 0.045), (a0 + b0) / 2, sz * T * 0.34);
    }
    const black = new THREE.MeshStandardMaterial({ color: 0x3a2e22, metalness: 0.85, roughness: 0.5 });
    this.handle = new THREE.Group();
    this.handle.position.set(W / 2 - 0.065, 0.95, 0);
    leaf.add(this.handle);
    for (const s of [-1, 1]) {
      const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.008, 32), black);
      rose.rotation.x = Math.PI / 2; rose.position.set(0, 0, s * (T / 2 + 0.004)); this.handle.add(rose);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.04, 16), black);
      neck.rotation.x = Math.PI / 2; neck.position.set(0, 0, s * (T / 2 + 0.024)); this.handle.add(neck);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.027, 24, 16), black);
      knob.scale.set(1, 1, 0.8); knob.position.set(0, 0, s * (T / 2 + 0.05)); knob.castShadow = true; this.handle.add(knob);
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
