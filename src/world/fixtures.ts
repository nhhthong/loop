import * as THREE from 'three';
import type { Assets } from '../engine/Assets';
import type { Physics } from '../engine/Physics';
import { CORRIDOR, FAN } from '../data/layout';

/** Procedural / single-model fixtures used by Furnish. Each builder returns or adds its own object; no game logic here. */

export interface CeilingFan { root: THREE.Object3D; blades: THREE.Object3D | null }

/** Old ceiling fan on a downrod in the double-height atrium. Blades node is spun around its local Z (world up). */
export async function ceilingFan(assets: Assets, parent: THREE.Object3D): Promise<CeilingFan | null> {
  const gltf = await assets.model('/models/house/ceiling_fan.glb');
  if (!gltf) return null;
  const model = gltf.scene.clone(true);
  const box = new THREE.Box3().setFromObject(model, true);
  const size = box.getSize(new THREE.Vector3());
  const k = 1.25 / Math.max(size.x, size.z); // ~1.25 m sweep
  const root = new THREE.Group();
  const holder = new THREE.Group();
  holder.scale.setScalar(k);
  const c = box.getCenter(new THREE.Vector3());
  model.position.set(-c.x, -box.max.y, -c.z);
  holder.add(model);
  root.add(holder);
  const rod = 0.9;
  root.position.set(FAN.x, FAN.y - rod, FAN.z);
  const rodMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, rod, 10), new THREE.MeshStandardMaterial({ color: 0x2a2018, metalness: 0.8, roughness: 0.45 }));
  rodMesh.position.y = rod / 2;
  root.add(rodMesh);
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  parent.add(root);
  return { root, blades: model.getObjectByName('Vent_Blades') ?? null };
}

/** Bedside-style digital clock showing a frozen 23:59 in red 7-segment LEDs (unlit segments faintly visible). */
export function digitalClock(at: THREE.Vector3, yaw: number) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 192;
  const g = c.getContext('2d')!;
  g.fillStyle = '#050403'; g.fillRect(0, 0, 512, 192);
  // segment layout per digit (a..g) in a 70×130 cell
  const W = 70, H = 130, T = 12;
  const segs: [number, number, number, number][] = [
    [T, 0, W - 2 * T, T], [W - T, T, T, H / 2 - 1.5 * T], [W - T, H / 2 + T / 2, T, H / 2 - 1.5 * T],
    [T, H - T, W - 2 * T, T], [0, H / 2 + T / 2, T, H / 2 - 1.5 * T], [0, T, T, H / 2 - 1.5 * T], [T, H / 2 - T / 2, W - 2 * T, T],
  ];
  const ON: Record<string, string> = { '2': 'abged', '3': 'abgcd', '5': 'afgcd', '9': 'abfgcd' };
  const digit = (ch: string, x: number) => {
    segs.forEach((r, i) => {
      const lit = ON[ch].includes('abcdefg'[i]);
      g.fillStyle = lit ? '#ff2a1a' : 'rgba(80,10,6,0.35)';
      if (lit) { g.shadowColor = '#ff3020'; g.shadowBlur = 14; } else g.shadowBlur = 0;
      g.fillRect(x + r[0] + 2, 30 + r[1] + 2, r[2] - 4, r[3] - 4);
    });
  };
  digit('2', 40); digit('3', 130); digit('5', 290); digit('9', 380);
  g.fillStyle = '#ff2a1a'; g.shadowBlur = 14;
  g.fillRect(244, 70, 14, 14); g.fillRect(244, 120, 14, 14);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const root = new THREE.Group();
  root.position.copy(at);
  root.rotation.y = yaw;
  const plastic = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.075, 0.07), plastic);
  body.position.set(0, 0.0375, 0); body.rotation.x = -0.12; body.castShadow = true; body.receiveShadow = true;
  root.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.056), new THREE.MeshStandardMaterial({
    map: tex, emissiveMap: tex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 2.2, roughness: 0.15, color: 0x111111,
  }));
  face.position.set(0, 0.0375, 0.0361); face.rotation.x = -0.12;
  root.add(face);
  const glow = new THREE.PointLight(0xff2a1a, 0.06, 0.7, 2);
  glow.position.set(0, 0.04, 0.12);
  root.add(glow);
  return root;
}

/** Low wooden planter trough along the east wall of the entrance leg (plants sit on top). */
export function planter(physics: Physics) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3324, roughness: 0.55 });
  const soil = new THREE.MeshStandardMaterial({ color: 0x1c140e, roughness: 1 });
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 2.2), wood);
  box.position.set(0.8, 0.22, -1.75); box.castShadow = box.receiveShadow = true;
  const dirt = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 2.14), soil);
  dirt.position.set(0.8, 0.435, -1.75);
  g.add(box, dirt);
  physics.addBox(new THREE.Vector3(0.8, 0.3, -1.75), new THREE.Vector3(0.18, 0.3, 1.1));
  return g;
}

/** Additive translucent shell that makes a fabric shade look lit from inside. */
export function shadeGlow(parent: THREE.Object3D, at: THREE.Vector3, rTop: number, rBot: number, h: number, color: number) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 40, 1, true), mat);
  m.position.copy(at);
  parent.add(m);
  const b = bulb(parent, at.clone().add(new THREE.Vector3(0, -0.02, 0)), 0xfff2d0, 0.025);
  m.add(b); b.position.set(0, -0.02, 0);
  return m;
}

export function bulb(parent: THREE.Object3D, at: THREE.Vector3, color: number, r = 0.03) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(6) }));
  m.position.copy(at);
  parent.add(m);
  return m;
}

export function pipes() {
  const g = new THREE.Group();
  const rust = new THREE.MeshStandardMaterial({ color: 0x4a3426, metalness: 0.6, roughness: 0.75 });
  const paint = new THREE.MeshStandardMaterial({ color: 0x3c4a44, metalness: 0.4, roughness: 0.6 });
  const run = (r: number, x: number, y: number, mat: THREE.Material) => {
    const len = CORRIDOR.z1 - CORRIDOR.z0;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20), mat);
    p.rotation.x = Math.PI / 2; p.position.set(x, y, (CORRIDOR.z0 + CORRIDOR.z1) / 2);
    p.castShadow = p.receiveShadow = true; g.add(p);
    for (let z = CORRIDOR.z0 + 0.4; z < CORRIDOR.z1; z += 1.1) { // flanges + brackets
      const f = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.45, r * 1.45, 0.03, 20), rust);
      f.rotation.x = Math.PI / 2; f.position.set(x, y, z); f.castShadow = true; g.add(f);
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.02, CORRIDOR.h - y, 0.03), rust);
      br.position.set(x, (CORRIDOR.h + y) / 2, z + 0.06); g.add(br);
    }
  };
  run(0.05, CORRIDOR.x0 + 0.1, CORRIDOR.h - 0.14, rust);
  run(0.028, CORRIDOR.x0 + 0.22, CORRIDOR.h - 0.1, paint);
  run(0.018, CORRIDOR.x1 - 0.06, CORRIDOR.h - 0.06, rust);
  return g;
}

/** Thin black cord hanging `len` metres above a bare bulb. */
export function cord(parent: THREE.Object3D, bulbAt: THREE.Vector3, len: number) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, len, 6), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }));
  m.position.set(bulbAt.x, bulbAt.y + len / 2, bulbAt.z);
  parent.add(m);
  return m;
}
