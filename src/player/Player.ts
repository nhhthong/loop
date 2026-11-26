import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Physics } from '../engine/Physics';
import type { Input } from '../engine/Input';
import type { AudioSys } from '../engine/Audio';
import { DIV_Z } from '../world/Level';

/** Kinematic capsule FPS controller with weighty movement, head bob, crouch and surface footsteps. */
export class Player {
  readonly camera: THREE.PerspectiveCamera;
  readonly head = new THREE.Object3D();     // yaw
  readonly pitchObj = new THREE.Object3D(); // pitch
  readonly bob = new THREE.Object3D();      // procedural offsets (bob, breathing, intro)
  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  private controller: RAPIER.KinematicCharacterController;
  yaw = 0;   // 0 = facing −z (toward the door)
  pitch = 0;
  private vel = new THREE.Vector3();
  private vy = 0;
  private bobT = 0;
  private stepDist = 0;
  private stepIdx = 0;
  private crouch = 0;
  eye = 1.62;
  /** 0 = no control (cinematic), 1 = full */
  control = 0;
  lookEnabled = false;
  sensitivity = 0.0019;
  private lookVel = new THREE.Vector2();

  constructor(physics: Physics, private readonly input: Input, private readonly audio: AudioSys, scene: THREE.Scene, start: THREE.Vector3) {
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.01, 60);
    scene.add(this.head);
    this.head.add(this.pitchObj);
    this.pitchObj.add(this.bob);
    this.bob.add(this.camera);
    const R = physics.rapier;
    this.body = physics.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x, start.y + 0.9, start.z));
    this.collider = physics.world.createCollider(R.ColliderDesc.capsule(0.55, 0.25), this.body);
    this.controller = physics.world.createCharacterController(0.02);
    this.controller.setUp({ x: 0, y: 1, z: 0 });
    this.controller.enableAutostep(0.22, 0.12, true);
    this.controller.enableSnapToGround(0.25);
    this.controller.setMaxSlopeClimbAngle(0.8);
    this.syncHead(0);
  }

  get position() { const t = this.body.translation(); return new THREE.Vector3(t.x, t.y - 0.9, t.z); }

  /** World position of the eyes. */
  eyePos(out = new THREE.Vector3()) { return this.camera.getWorldPosition(out); }

  forward(out = new THREE.Vector3()) { return this.camera.getWorldDirection(out); }

  update(dt: number) {
    const inp = this.input;
    // ---- look (slightly smoothed for weight)
    if (this.lookEnabled) {
      this.lookVel.x += (-inp.mouseDX * this.sensitivity - this.lookVel.x) * 0.6;
      this.lookVel.y += (-inp.mouseDY * this.sensitivity - this.lookVel.y) * 0.6;
      this.yaw += this.lookVel.x;
      this.pitch = THREE.MathUtils.clamp(this.pitch + this.lookVel.y, -1.45, 1.45);
    }
    // ---- move
    const c = this.control;
    let fx = 0, fz = 0;
    if (c > 0.5) {
      if (inp.down('KeyW') || inp.down('ArrowUp')) fz -= 1;
      if (inp.down('KeyS') || inp.down('ArrowDown')) fz += 1;
      if (inp.down('KeyA') || inp.down('ArrowLeft')) fx -= 1;
      if (inp.down('KeyD') || inp.down('ArrowRight')) fx += 1;
    }
    const crouching = c > 0.5 && (inp.down('KeyC') || inp.down('ControlLeft'));
    this.crouch += ((crouching ? 1 : 0) - this.crouch) * Math.min(1, dt * 8);
    const run = inp.down('ShiftLeft') && fz < 0 && !crouching;
    const speed = (run ? 2.3 : 1.25) * (1 - this.crouch * 0.5);
    const wish = new THREE.Vector3(fx, 0, fz);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const accel = wish.lengthSq() > 0 ? 7 : 9;
    this.vel.x += (wish.x - this.vel.x) * Math.min(1, dt * accel);
    this.vel.z += (wish.z - this.vel.z) * Math.min(1, dt * accel);
    this.vy = this.controller.computedGrounded() ? -0.5 : this.vy - 9.81 * dt;
    const desired = { x: this.vel.x * dt, y: this.vy * dt, z: this.vel.z * dt };
    this.controller.computeColliderMovement(this.collider, desired);
    const mv = this.controller.computedMovement();
    const t = this.body.translation();
    this.body.setNextKinematicTranslation({ x: t.x + mv.x, y: t.y + mv.y, z: t.z + mv.z });

    // ---- head bob & footsteps
    const hs = Math.hypot(mv.x, mv.z) / Math.max(dt, 1e-4);
    if (hs > 0.15) {
      this.bobT += dt * hs * 5.2;
      this.stepDist += hs * dt;
      const stride = run ? 0.85 : 0.62;
      if (this.stepDist > stride) { this.stepDist = 0; this.footstep(hs); }
    } else this.bobT += dt * 0.7; // idle breathing
    this.syncHead(hs);
  }

  private footstep(speed: number) {
    const p = this.position;
    const concrete = p.z > DIV_Z + 0.05;
    this.stepIdx = (this.stepIdx + 1 + Math.floor(Math.random() * 2)) % (concrete ? 4 : 5);
    const name = concrete ? `step_concrete_${this.stepIdx + 1}` : `step_wood_${this.stepIdx + 1}`;
    this.audio.play2D(name, (concrete ? 0.35 : 0.45) * (0.7 + speed * 0.2), false, 0.92 + Math.random() * 0.16);
    if (!concrete && Math.random() < 0.12) this.audio.play2D('floor_creak', 0.25, false, 0.9 + Math.random() * 0.2);
  }

  private syncHead(hs: number) {
    const t = this.body.translation();
    const eye = this.eye - this.crouch * 0.6;
    this.head.position.set(t.x, t.y - 0.9 + eye, t.z);
    this.head.rotation.y = this.yaw;
    this.pitchObj.rotation.x = this.pitch;
    const amp = Math.min(1, hs / 1.3);
    const breathe = Math.sin(this.bobT * 0.9) * 0.004;
    this.bob.position.set(Math.cos(this.bobT * 0.5) * 0.022 * amp, Math.abs(Math.sin(this.bobT * 0.5)) * 0.035 * amp + breathe, 0);
    this.bob.rotation.z = Math.cos(this.bobT * 0.5) * 0.006 * amp;
  }

  teleport(p: THREE.Vector3) { this.body.setTranslation({ x: p.x, y: p.y + 0.9, z: p.z }, true); this.syncHead(0); }
}
