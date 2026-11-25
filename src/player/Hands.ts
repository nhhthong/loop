import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Photogrammetry right hand ("Male Hand" scan), auto-rigged at runtime.
 *
 * The scan ships without a skeleton, so we:
 *  1. normalise it (palm faces +Z, fingers +Y, thumb +X, metres)
 *  2. place 21 joints from landmarks measured on orthographic renders
 *  3. compute skin weights from distance-to-bone-segment (inverse-power falloff, top-4)
 *  4. drive it with a virtual shoulder→elbow IK for the forearm, an explicit hand frame + wrist roll,
 *     and per-finger curls around anatomical hinge axes.
 * Framing keeps the scan's wrist cut out of shot (close-up camera, hand raised from below).
 */

// Landmarks in probe space (scan normalised to 0.205 m tall, see tools/scanprobe.ts) — x, y, z
const J = {
  forearm: [-0.012, 0.001, 0], wrist: [-0.011, 0.055, 0],
  index: [[0.010, 0.1244, -0.008], [0.017, 0.1584, -0.006], [0.0206, 0.177, -0.003], [0.0252, 0.196, 0]],
  middle: [[-0.009, 0.125, -0.009], [-0.0096, 0.16, -0.006], [-0.0096, 0.181, -0.003], [-0.0096, 0.203, 0]],
  ring: [[-0.029, 0.123, -0.008], [-0.0344, 0.1524, -0.006], [-0.0372, 0.1714, -0.003], [-0.0396, 0.19, 0]],
  pinky: [[-0.0416, 0.114, -0.007], [-0.0516, 0.1354, -0.005], [-0.058, 0.148, -0.003], [-0.064, 0.161, 0]],
  thumb: [[0.012, 0.069, 0.009], [0.033, 0.094, 0.014], [0.0504, 0.116, 0.018], [0.066, 0.131, 0.02]],
};
const PROBE_H = 0.205;
const SCALE = 1.26; // scan → real adult hand (wrist crease → middle tip ≈ 18.5 cm)

const v3 = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]).multiplyScalar(SCALE);
const Q = () => new THREE.Quaternion();

interface Finger { bones: THREE.Bone[]; axes: THREE.Vector3[]; amt: number[] }

export class Hands {
  readonly rig = new THREE.Group();
  private mesh!: THREE.SkinnedMesh;
  private forearm!: THREE.Bone;
  private hand!: THREE.Bone;
  private fingers: Finger[] = [];
  private foreLen = 0;
  private visible = false;
  private weight = 0;

  // pose state (camera space), driven by the sequencer
  target = new THREE.Vector3(0.12, -0.35, -0.35);
  pole = new THREE.Vector3(1, -1, 0.3);
  /** desired finger direction / back-of-hand normal (camera space) */
  f = new THREE.Vector3(0, 1, -0.2);
  b = new THREE.Vector3(0, 0, -1);
  roll = 0;
  /** index, middle, ring, pinky, thumb (0 = straight, 1 = fist) */
  curls = [0.15, 0.2, 0.25, 0.3, 0.1];
  /** virtual shoulder in camera space (right) */
  shoulder = new THREE.Vector3(0.2, -0.32, 0.12);

  async load(gltf: GLTF, camera: THREE.Camera) {
    const src = gltf.scene.getObjectByProperty('isMesh', true) as THREE.Mesh;
    gltf.scene.updateMatrixWorld(true);
    // ---- 1. normalise geometry
    const geo = src.geometry.clone().applyMatrix4(src.matrixWorld);
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const k = PROBE_H / (bb.max.y - bb.min.y) * SCALE;
    geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    geo.scale(k, k, k);
    geo.computeVertexNormals();

    // ---- 2. skeleton (bind orientations = identity; positions from landmarks)
    const P = {
      forearm: v3(J.forearm), wrist: v3(J.wrist),
      chains: [J.index, J.middle, J.ring, J.pinky, J.thumb].map((c) => c.map(v3)),
    };
    const bones: THREE.Bone[] = [];
    const mk = (name: string, world: THREE.Vector3, parent: THREE.Bone | null, parentWorld: THREE.Vector3) => {
      const b = new THREE.Bone();
      b.name = name;
      b.position.copy(world.clone().sub(parentWorld));
      parent?.add(b);
      bones.push(b);
      return b;
    };
    this.forearm = mk('forearm', P.forearm, null, new THREE.Vector3());
    this.hand = mk('hand', P.wrist, this.forearm, P.forearm);
    this.foreLen = P.wrist.distanceTo(P.forearm);
    // segments for weighting: [boneIndex, a, b]
    const segs: { bi: number; a: THREE.Vector3; b: THREE.Vector3; r: number }[] = [
      { bi: 0, a: P.forearm.clone().add(new THREE.Vector3(0, -0.3, 0)), b: P.wrist.clone().add(new THREE.Vector3(0, -0.012, 0)), r: 1 },
    ];
    const palmN = new THREE.Vector3(0, 0, 1);
    const thumbN = new THREE.Vector3(-0.75, 0, 0.66).normalize();
    P.chains.forEach((c, fi) => {
      const isThumb = fi === 4;
      // palm (hand bone) covers wrist → each finger base
      segs.push({ bi: 1, a: P.wrist, b: c[0], r: 1 });
      const fb: THREE.Bone[] = [];
      let parent = this.hand, pw = P.wrist;
      for (let s = 0; s < 3; s++) {
        const b = mk(`f${fi}_${s}`, c[s], parent, pw);
        fb.push(b);
        // thumb metacarpal shares the palm region; finger segments are thinner → tighter radius
        segs.push({ bi: bones.length - 1, a: c[s], b: c[s + 1], r: isThumb && s === 0 ? 0.9 : 0.75 });
        parent = b; pw = c[s];
      }
      const axes = fb.map((_, s) => {
        const dir = c[s + 1].clone().sub(c[s]).normalize();
        return dir.clone().cross(isThumb ? thumbN : palmN).normalize();
      });
      this.fingers.push({ bones: fb, axes, amt: isThumb ? [0.45, 0.75, 0.9] : [1.35, 1.6, 1.05] });
    });

    // ---- 3. skin weights
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const n = pos.count;
    const skinIndex = new Uint16Array(n * 4), skinWeight = new Float32Array(n * 4);
    const p = new THREE.Vector3(), tmp = new THREE.Vector3(), ab = new THREE.Vector3();
    const per = new Float32Array(bones.length);
    for (let i = 0; i < n; i++) {
      p.fromBufferAttribute(pos, i);
      per.fill(0);
      for (const s of segs) {
        ab.subVectors(s.b, s.a);
        const t = THREE.MathUtils.clamp(tmp.subVectors(p, s.a).dot(ab) / ab.lengthSq(), 0, 1);
        const d = tmp.copy(s.a).addScaledVector(ab, t).distanceTo(p) / s.r + 0.002;
        const w = 1 / Math.pow(d, 5);
        if (w > per[s.bi]) per[s.bi] = w; // palm uses its closest segment
      }
      // top-4
      const idx = [...per.keys()].sort((a, b2) => per[b2] - per[a]).slice(0, 4);
      let sum = 0;
      idx.forEach((bi) => (sum += per[bi]));
      idx.forEach((bi, j) => { skinIndex[i * 4 + j] = bi; skinWeight[i * 4 + j] = per[bi] / sum; });
    }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));

    // ---- material: photo albedo + soft skin response + cheap subsurface
    const oldMat = src.material as THREE.MeshStandardMaterial;
    const skin = new THREE.MeshPhysicalMaterial({
      map: oldMat.map, roughness: 0.52, metalness: 0, color: 0xd8ccc6,
      sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xc9786a),
      clearcoat: 0.08, clearcoatRoughness: 0.6, envMapIntensity: 0.4,
    });
    skin.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        float rim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.5);
        reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(0.6,0.14,0.07) * rim * 0.4;
        reflectedLight.directDiffuse += reflectedLight.directDiffuse * vec3(0.10,0.0,-0.03);`);
    };
    this.mesh = new THREE.SkinnedMesh(geo, skin);
    this.mesh.add(this.forearm);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(bones));

    this.rig.add(this.mesh);
    camera.add(this.rig);
    this.rig.visible = false;
  }

  setVisible(v: boolean) { this.visible = v; }

  update(dt: number) {
    if (!this.mesh) return;
    this.weight += ((this.visible ? 1 : 0) - this.weight) * Math.min(1, dt * 3);
    this.rig.visible = this.weight > 0.01;
    if (!this.rig.visible) return;
    // lowered toward the bottom of the frame while fading out
    const W = this.target.clone().add(new THREE.Vector3(0.06, -0.5, 0.12).multiplyScalar(1 - this.weight));

    // virtual elbow (two-bone IK from a shoulder) → forearm direction
    const L1 = 0.3, L2 = 0.27;
    const S = this.shoulder;
    const ST = W.clone().sub(S);
    const d = THREE.MathUtils.clamp(ST.length(), 0.05, L1 + L2 - 1e-3);
    ST.normalize();
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const perp = this.pole.clone().sub(ST.clone().multiplyScalar(this.pole.dot(ST))).normalize();
    const E = S.clone().addScaledVector(ST, a).addScaledVector(perp, h);
    const fore = W.clone().sub(E).normalize();

    // hand frame (flexion limited to ~45° from the forearm), then roll about the forearm
    const f1 = fore.clone().lerp(this.f.clone().normalize(), 0.4).normalize();
    let b1 = this.b.clone().sub(f1.clone().multiplyScalar(this.b.dot(f1))).normalize();
    const s1 = new THREE.Vector3().crossVectors(b1, f1).normalize();
    b1 = new THREE.Vector3().crossVectors(f1, s1).normalize();
    const rollH = Q().setFromAxisAngle(fore, this.roll);
    const rollF = Q().setFromAxisAngle(fore, this.roll * 0.6);
    const sH = s1.clone().applyQuaternion(rollH), fH = f1.clone().applyQuaternion(rollH), bH = b1.clone().applyQuaternion(rollH);
    const qHand = Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(sH, fH, bH.clone().negate()));
    const xF = s1.clone().sub(fore.clone().multiplyScalar(s1.dot(fore))).normalize().applyQuaternion(rollF);
    const qFore = Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xF, fore, new THREE.Vector3().crossVectors(xF, fore)));

    // apply (mesh sits at rig origin, rig = camera space)
    this.forearm.quaternion.copy(qFore);
    this.forearm.position.copy(W).addScaledVector(fore, -this.foreLen);
    this.hand.quaternion.copy(qFore.clone().invert().multiply(qHand));
    this.fingers.forEach((fg, fi) => {
      const c = this.curls[fi] ?? 0;
      fg.bones.forEach((b, s) => b.quaternion.setFromAxisAngle(fg.axes[s], c * fg.amt[s]));
    });
  }
}
