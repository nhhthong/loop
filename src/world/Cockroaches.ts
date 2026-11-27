import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AudioSys } from '../engine/Audio';

/**
 * Cockroaches that crawl over every face of an axis-aligned box interior (floor, walls, ceiling),
 * wrapping around edges, pausing, twitching, and scattering from the player.
 */
interface Roach {
  obj: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
  p: THREE.Vector3; n: THREE.Vector3; d: THREE.Vector3;
  speed: number; target: number; pause: number; turn: number; box: THREE.Box3; climbAxes: ('x' | 'y' | 'z')[];
  scared: number; skitter: THREE.PositionalAudio | null;
}

const AX = ['x', 'y', 'z'] as const;

export class Cockroaches {
  private roaches: Roach[] = [];
  /** the crawling roach roots (moving shadow casters for the shadow cache) */
  get objects(): THREE.Object3D[] { return this.roaches.map((r) => r.obj); }
  private tmpM = new THREE.Matrix4();

  constructor(private readonly parent: THREE.Object3D, private readonly audio: AudioSys) {}

  /** Normalise a cockroach GLB to `length` metres, nose = +Z, back = +Y. */
  private prepare(gltf: GLTF, length: number) {
    const src = gltf.scene;
    const box = new THREE.Box3().setFromObject(src, true);
    const size = box.getSize(new THREE.Vector3());
    const k = length / Math.max(size.x, size.z);
    const c = box.getCenter(new THREE.Vector3());
    return { k, offset: new THREE.Vector3(-c.x, -box.min.y, -c.z), clip: gltf.animations[0] };
  }

/** `starts` (optional) pins the first roaches to given surface points + inward normals instead of random spots. */
  spawn(gltf: GLTF, count: number, box: THREE.Box3, climbAxes: ('x' | 'y' | 'z')[], length = 0.04, yawOffset = 0, starts: { p: THREE.Vector3; n: THREE.Vector3 }[] = []) {
    const prep = this.prepare(gltf, length);
    // dark, glossy chitin (the source textures read too pale under the near-monochrome grade)
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m.userData.roachMat) return;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[];
      mats.forEach((mt) => { mt.color.multiplyScalar(0.45); mt.roughness = Math.min(mt.roughness, 0.35); mt.metalness = 0; });
      m.userData.roachMat = true;
    });
    for (let i = 0; i < count; i++) {
      const model = skeletonClone(gltf.scene);
      model.position.copy(prep.offset);
      const inner = new THREE.Group();
      inner.add(model);
      inner.scale.setScalar(prep.k * (0.8 + Math.random() * 0.4));
      inner.rotation.y = yawOffset;
      const obj = new THREE.Group();
      obj.add(inner);
      obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      this.parent.add(obj);
      const mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(prep.clip);
      action.play();
      action.time = Math.random() * prep.clip.duration;
      // start somewhere random on a random face
      const s = box.getSize(new THREE.Vector3());
      const p = new THREE.Vector3(box.min.x + Math.random() * s.x, box.min.y, box.min.z + Math.random() * s.z);
      const n = new THREE.Vector3(0, 1, 0);
      if (climbAxes.includes('x') && Math.random() < 0.5) {
        const side = Math.random() < 0.5 ? 0 : 1;
        p.x = side ? box.max.x : box.min.x; p.y = box.min.y + Math.random() * s.y * 0.8;
        n.set(side ? -1 : 1, 0, 0);
      }
      if (starts[i]) { p.copy(starts[i].p); n.copy(starts[i].n); }
      const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      d.sub(n.clone().multiplyScalar(d.dot(n))).normalize();
      if (d.lengthSq() < 0.1) d.set(0, 0, 1).sub(n.clone().multiplyScalar(n.z)).normalize();
      this.roaches.push({ obj, mixer, action, p, n, d, speed: 0, target: 0.05, pause: Math.random() * 2, turn: 0, box, climbAxes, scared: 0, skitter: null });
    }
  }

  update(dt: number, player: THREE.Vector3) {
    for (const r of this.roaches) {
      // --- behaviour
      const toPlayer = r.p.distanceTo(player);
      if (toPlayer < 1.3 && r.scared <= 0) {
        r.scared = 2 + Math.random() * 1.5;
        if (!r.skitter && Math.random() < 0.6) {
          r.skitter = this.audio.play3D('cockroach_skitter', r.obj, 0.35, { ref: 0.4, rate: 1 + Math.random() * 0.4 });
          if (r.skitter) r.skitter.onEnded = () => { r.skitter?.removeFromParent(); r.skitter = null; };
        }
      }
      if (r.scared > 0) {
        r.scared -= dt;
        r.pause = 0;
        // steer away from the player (projected onto the surface)
        const away = r.p.clone().sub(player);
        away.sub(r.n.clone().multiplyScalar(away.dot(r.n))).normalize();
        r.d.lerp(away, Math.min(1, dt * 6)).normalize();
        r.target = 0.32;
      } else if (r.pause > 0) {
        r.pause -= dt;
        r.target = 0;
      } else {
        r.target = 0.06 + Math.sin(performance.now() * 0.001 + r.p.x * 9) * 0.03;
        r.turn += (Math.random() - 0.5) * dt * 10;
        r.turn *= 0.96;
        if (Math.random() < dt * 0.25) r.pause = 0.6 + Math.random() * 3;
      }
      r.speed += (r.target - r.speed) * Math.min(1, dt * 8);
      // turn around the surface normal
      r.d.applyAxisAngle(r.n, r.turn * dt * (r.scared > 0 ? 0.3 : 1));
      r.d.sub(r.n.clone().multiplyScalar(r.d.dot(r.n))).normalize();

      // --- move & wrap across box edges
      r.p.addScaledVector(r.d, r.speed * dt);
      for (const a of AX) {
        const lo = r.box.min[a], hi = r.box.max[a];
        if (r.p[a] >= lo && r.p[a] <= hi) continue;
        const side = r.p[a] > hi ? 1 : -1;
        r.p[a] = side > 0 ? hi : lo;
        if (Math.abs(r.n[a]) > 0.5) continue; // moving along the face's own axis can't overshoot
        if (r.climbAxes.includes(a)) {
          // new face: inward normal points opposite to the overshoot; heading folds onto the old normal
          const comp = Math.abs(r.d[a]);
          const oldN = r.n.clone();
          r.d[a] = 0; r.d.addScaledVector(oldN, comp).normalize();
          r.n.set(0, 0, 0); r.n[a] = -side;
        } else {
          r.d[a] *= -1; // bounce
        }
      }

      // --- orient: up = n, forward = d
      const x = new THREE.Vector3().crossVectors(r.n, r.d).normalize();
      this.tmpM.makeBasis(x, r.n, r.d);
      const q = new THREE.Quaternion().setFromRotationMatrix(this.tmpM);
      r.obj.quaternion.slerp(q, Math.min(1, dt * 14));
      r.obj.position.copy(r.p).addScaledVector(r.n, 0.002);

      r.action.timeScale = r.speed * 22;
      r.mixer.update(dt);
    }
  }
}
