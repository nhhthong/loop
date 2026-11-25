import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Physics } from '../engine/Physics';
import { worldBox } from './Materials';
import { DOOR, DIV_Z } from './Level';

/** Six-panel hardwood door hinged on the left jamb, swinging into the room. */
export class Door {
  readonly pivot = new THREE.Group();
  readonly handle: THREE.Object3D;
  private body: RAPIER.RigidBody;
  private angle = 0;
  private target = 0;
  private vel = 0;
  isOpen = false;
  readonly leafW = DOOR.x1 - DOOR.x0 - 0.01;
  readonly leafH = DOOR.h - 0.025;
  readonly leafT = 0.045;

  constructor(physics: Physics, wood: THREE.MeshStandardMaterial) {
    const W = this.leafW, H = this.leafH, T = this.leafT;
    this.pivot.position.set(DOOR.x0 + 0.005, 0.012, DIV_Z - 0.05);
    const leaf = new THREE.Group();
    leaf.position.x = W / 2;
    this.pivot.add(leaf);

    const doorWood = wood.clone();
    doorWood.color.set(0x6a4630);
    doorWood.roughness = 0.7;
    const add = (w: number, h: number, d: number, x: number, y: number, z: number, mat = doorWood) => {
      const m = new THREE.Mesh(worldBox(w, h, d, 0.8), mat);
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; leaf.add(m);
      return m;
    };
    // core slab (slightly thinner) + stiles & rails proud of it
    add(W - 0.02, H - 0.02, T * 0.6, 0, H / 2, 0);
    const st = 0.12, rail = 0.13;
    add(st, H, T, -W / 2 + st / 2, H / 2, 0);
    add(st, H, T, W / 2 - st / 2, H / 2, 0);
    for (const y of [rail / 2, H * 0.38, H * 0.66, H - rail / 2]) add(W - st * 2, rail, T, 0, y, 0);
    add(0.1, H - rail * 2, T, 0, H / 2, 0); // muntin
    // raised panels on both faces
    const pw = (W - st * 2 - 0.1) / 2;
    const rows: [number, number][] = [[rail, H * 0.38 - rail / 2], [H * 0.38 + rail / 2, H * 0.66 - rail / 2], [H * 0.66 + rail / 2, H - rail]];
    for (const [a, b] of rows) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = sx * (pw / 2 + 0.05);
      add(pw - 0.05, b - a - 0.05, 0.012, px, (a + b) / 2, sz * T * 0.32);
      add(pw - 0.12, b - a - 0.12, 0.01, px, (a + b) / 2, sz * T * 0.38);
    }
    // brass hardware: backplates + knobs on both sides, hinges
    const brass = new THREE.MeshStandardMaterial({ color: 0x8c6b32, metalness: 1, roughness: 0.32 });
    const tarnish = new THREE.MeshStandardMaterial({ color: 0x5e4a26, metalness: 1, roughness: 0.55 });
    this.handle = new THREE.Group();
    this.handle.position.set(W / 2 - 0.07, 0.98, 0);
    leaf.add(this.handle);
    for (const s of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.006), tarnish);
      plate.position.set(0, 0, s * (T / 2 + 0.003)); plate.castShadow = true; this.handle.add(plate);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.04, 16), brass);
      neck.rotation.x = Math.PI / 2; neck.position.set(0, 0.02, s * (T / 2 + 0.024)); this.handle.add(neck);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.027, 24, 16), brass);
      knob.scale.set(1, 1, 0.8); knob.position.set(0, 0.02, s * (T / 2 + 0.05)); knob.castShadow = true; this.handle.add(knob);
      const key = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.002), new THREE.MeshBasicMaterial({ color: 0x050403 }));
      key.position.set(0, -0.055, s * (T / 2 + 0.0065)); this.handle.add(key);
    }
    for (const y of [0.25, H - 0.25]) {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 10), tarnish);
      hinge.position.set(-W / 2 - 0.002, y, -T / 2); leaf.add(hinge);
    }

    const { body } = physics.addKinematicBox(new THREE.Vector3(W / 2, H / 2, T / 2));
    this.body = body;
    this.syncBody();
  }

  /** World position of the knob (for the hand reach / interaction ray). */
  handleWorld(out = new THREE.Vector3()) { return this.handle.getWorldPosition(out); }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.target = -1.65; // swing into the room (−z)
  }

  update(dt: number) {
    // critically-damped spring with a slight heavy-door ease
    const k = 6, c = 2 * Math.sqrt(k) * 0.9;
    const acc = (this.target - this.angle) * k - this.vel * c;
    this.vel += acc * dt;
    this.angle += this.vel * dt * 0.55;
    this.pivot.rotation.y = -this.angle;
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
