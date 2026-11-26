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

/** What interaction and scripted events need from any door. */
export interface DoorLike {
  /** knob / lever: sound anchor */
  readonly handle: THREE.Object3D;
  readonly isOpen: boolean;
  /** locked: E only rattles it */
  locked: boolean;
  handleWorld(out?: THREE.Vector3): THREE.Vector3;
  open(): void;
  close(): void;
  rattle(): void;
  update(dt: number): void;
}

/** Painted four-panel door with a bronze knob, hinged at `hinge`. */
export class Door implements DoorLike {
  readonly pivot = new THREE.Group();
  readonly handle: THREE.Object3D;
  private body: RAPIER.RigidBody;
  private angle = 0;
  private target = 0;
  private vel = 0;
  isOpen = false;
  locked = false;
  private rattleT = 0;
  private slow: { from: number; t: number; dur: number } | null = null;
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

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.target = 0;
  }

  /** Swing shut over `dur` seconds (eased), from whatever angle it is at (e.g. ajar). */
  closeSlowly(dur: number) {
    this.slow = { from: this.angle, t: 0, dur };
    this.isOpen = false;
  }

  /** Locked: jiggle the handle and shake the leaf in its frame for a moment. */
  rattle() { this.rattleT = 0.6; }

  update(dt: number) {
    // critically-damped spring with a slight heavy-door ease
    if (this.slow) {
      const s = this.slow;
      s.t = Math.min(s.dur, s.t + dt);
      const x = s.t / s.dur;
      this.angle = this.target = s.from * (1 - x * x * (3 - 2 * x));
      this.vel = 0;
      if (x >= 1) this.slow = null;
    } else {
      const k = 6, c = 2 * Math.sqrt(k) * 0.9;
      const acc = (this.target - this.angle) * k - this.vel * c;
      this.vel += acc * dt;
      this.angle += this.vel * dt * 0.55;
    }
    let shake = 0;
    if (this.rattleT > 0) {
      this.rattleT = Math.max(0, this.rattleT - dt);
      const k = this.rattleT / 0.6;
      shake = Math.sin(this.rattleT * 70) * 0.004 * k;
      this.handle.rotation.z = Math.sin(this.rattleT * 45) * 0.35 * k;
    }
    this.pivot.rotation.y = this.baseYaw + this.openSign * (this.angle + shake);
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

/**
 * Pair of heavy stained-hardwood doors (the house's front entrance, always locked): raised panels with bolection
 * moulding, a glazed top panel per leaf, brass lever handles and a central astragal. Static collider; rattling shakes the pair.
 */
export class GrandDoor implements DoorLike {
  readonly group = new THREE.Group();
  readonly handle = new THREE.Object3D();
  readonly isOpen = false;
  locked = true;
  private shake = 0;

  constructor(physics: Physics, wood: THREE.MeshStandardMaterial, x0: number, x1: number, h: number, z: number) {
    const g = this.group;
    const stain = wood.clone();
    stain.color.set(0x6a4428);
    stain.roughness = 0.35;
    const brass = new THREE.MeshStandardMaterial({ color: 0x9a7438, metalness: 1, roughness: 0.3 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.08, metalness: 0, clearcoat: 1, envMapIntensity: 1.5 });
    const T = 0.06, lw = (x1 - x0) / 2 - 0.004;
    const box = (parent: THREE.Object3D, w: number, hh: number, d: number, x: number, y: number, zz: number, m: THREE.Material) => {
      const mesh = new THREE.Mesh(worldBox(w, hh, d, 0.6), m);
      mesh.position.set(x, y, zz); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    };
    for (const side of [-1, 1]) {
      const leaf = new THREE.Group();
      leaf.position.set((x0 + x1) / 2 + side * (lw / 2 + 0.002), 0, z);
      g.add(leaf);
      box(leaf, lw, h - 0.01, T * 0.6, 0, h / 2, 0, stain);
      const st = 0.12, rl = 0.14;
      box(leaf, st, h, T, -lw / 2 + st / 2, h / 2, 0, stain);
      box(leaf, st, h, T, lw / 2 - st / 2, h / 2, 0, stain);
      for (const [y, hh] of [[rl / 2, rl], [h * 0.36, 0.18], [h * 0.62, 0.12], [h - rl / 2, rl]] as [number, number][]) box(leaf, lw - st * 2, hh, T, 0, y, 0, stain);
      // raised panels + bolection moulding (both faces)
      for (const [a, b] of [[rl, h * 0.36 - 0.09], [h * 0.36 + 0.09, h * 0.62 - 0.06]] as [number, number][]) for (const sz of [-1, 1]) {
        box(leaf, lw - st * 2 - 0.02, b - a - 0.02, 0.012, 0, (a + b) / 2, sz * T * 0.36, stain);
        box(leaf, lw - st * 2 - 0.12, b - a - 0.12, 0.014, 0, (a + b) / 2, sz * T * 0.42, stain);
      }
      // glazed top panel
      box(leaf, lw - st * 2, h - rl - (h * 0.62 + 0.06), 0.012, 0, (h - rl + h * 0.62 + 0.06) / 2, 0, glass);
      // brass lever near the meeting stiles
      for (const sz of [-1, 1]) {
        box(leaf, 0.05, 0.22, 0.008, -side * (lw / 2 - 0.06), 1.0, sz * (T / 2 + 0.004), brass);
        box(leaf, 0.14, 0.018, 0.016, -side * (lw / 2 - 0.06) + side * 0.06, 1.03, sz * (T / 2 + 0.03), brass);
      }
    }
    box(g, 0.03, h, T + 0.02, (x0 + x1) / 2, h / 2, z, stain); // astragal
    this.handle.position.set((x0 + x1) / 2, 1.0, z + T); // between the levers, in front of the leaves
    g.add(this.handle);
    physics.addBox(new THREE.Vector3((x0 + x1) / 2, h / 2, z), new THREE.Vector3((x1 - x0) / 2, h / 2, T / 2));
  }

  handleWorld(out = new THREE.Vector3()) { return this.handle.getWorldPosition(out); }
  /** the front doors never open */
  open() {}
  close() {}
  rattle() { this.shake = 0.6; }

  update(dt: number) {
    if (this.shake <= 0) return;
    this.shake = Math.max(0, this.shake - dt);
    this.group.position.z = Math.sin(this.shake * 60) * 0.003 * (this.shake / 0.6);
  }
}
