import * as THREE from 'three';
import type { Assets } from '../engine/Assets';
import type { Physics } from '../engine/Physics';

export interface PropSpec {
  url: string;
  pos: [number, number, number];
  /** yaw in degrees */
  rot?: number;
  /** extra rotation (degrees) applied before fitting – for models authored lying down etc. */
  pre?: [number, number, number];
  /** fit: target height (m) or target largest horizontal extent (m) */
  h?: number;
  w?: number;
  /** keep the model's own scale multiplied by this */
  scale?: number;
  /** place bbox bottom at pos.y (default true). If false, bbox center is at pos. */
  floor?: boolean;
  /** 'back' = place bbox back face at pos (for wall-mounted items, back faces -localZ before yaw) */
  collide?: boolean;
  shadow?: boolean;
  name?: string;
  /** only keep meshes whose name matches */
  only?: RegExp;
  tint?: number;
  /** dust/age: blend albedo towards grey-brown and raise roughness */
  age?: number;
  /** stage-2 prop: loaded in the background after Start is enabled (not visible from the menu, the basement or R1) */
  late?: boolean;
}

/** Load, normalise (scale/orient), age and place a GLB prop. Returns the placed root. */
export async function placeProp(assets: Assets, physics: Physics, parent: THREE.Object3D, s: PropSpec): Promise<THREE.Object3D | null> {
  const gltf = await assets.model(s.url);
  if (!gltf) return null;
  const src = gltf.scene;
  const model = s.only ? src.clone(true) : src.clone(true);
  if (s.only) {
    const drop: THREE.Object3D[] = [];
    model.traverse((o) => { if ((o as THREE.Mesh).isMesh && !s.only!.test(o.name)) drop.push(o); });
    drop.forEach((o) => o.removeFromParent());
  }
  const inner = new THREE.Group();
  inner.add(model);
  if (s.pre) inner.rotation.set(...(s.pre.map(THREE.MathUtils.degToRad) as [number, number, number]));
  inner.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(inner, true);
  const size = box.getSize(new THREE.Vector3());
  let k = s.scale ?? 1;
  if (s.h) k = s.h / size.y;
  else if (s.w) k = s.w / Math.max(size.x, size.z);
  const root = new THREE.Group();
  root.name = s.name ?? s.url.split('/').pop()!.replace('.glb', '');
  const holder = new THREE.Group();
  holder.scale.setScalar(k);
  holder.add(inner);
  // recentre: xz centre to origin, bottom (or centre) to y=0
  const c = box.getCenter(new THREE.Vector3());
  inner.position.set(-c.x, s.floor === false ? -c.y : -box.min.y, -c.z);
  root.add(holder);
  root.position.set(...s.pos);
  root.rotation.y = THREE.MathUtils.degToRad(s.rot ?? 0);
  parent.add(root);

  const age = s.age ?? 0.25;
  const dust = new THREE.Color(0x6b6256);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = s.shadow !== false;
    m.receiveShadow = true;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach((mat, i) => {
      const std = (mat as THREE.MeshStandardMaterial).clone();
      if (!(std as THREE.MeshStandardMaterial).isMeshStandardMaterial) return;
      if (s.tint !== undefined) std.color.multiply(new THREE.Color(s.tint));
      if (age > 0) {
        std.color.lerp(dust.clone().multiply(std.color).multiplyScalar(1.6), age * 0.5);
        std.roughness = Math.min(1, std.roughness + age * 0.25);
      }
      if (std.transparent && std.opacity > 0.95 && !std.alphaMap) std.transparent = false;
      if (std.map) std.map.anisotropy = 8;
      if (Array.isArray(m.material)) m.material[i] = std; else m.material = std;
    });
  });

  if (s.collide) {
    root.updateMatrixWorld(true);
    // world AABB (exact for 90° yaws, shrunk for diagonal placements)
    const wb = new THREE.Box3().setFromObject(holder, true);
    const half = wb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    if (Math.abs(Math.sin(root.rotation.y * 2)) > 0.1) half.multiplyScalar(0.8);
    physics.addBox(wb.getCenter(new THREE.Vector3()), half);
  }
  return root;
}
