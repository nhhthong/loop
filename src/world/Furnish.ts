import * as THREE from 'three';
import type { Assets } from '../engine/Assets';
import type { Physics } from '../engine/Physics';
import { placeProp, type PropSpec } from './Props';
import { CORRIDOR, FAN } from './Level';
import { Q } from '../engine/Quality';

const F = '/models/furniture/', D = '/models/decor/', A = '/models/architecture/', H = '/models/hallway/', M = '/models/modern/';

/**
 * Interior dressing (layout in Level.ts). Model front = +Z unless noted. Wall yaw:
 * west wall (room +x) 90 · east wall (room −x) −90 · north wall (room +z) 0 · south wall (room −z) 180.
 * Natively +X-facing models (portrait, clock, credenza): west 0 · north −90 · south 90.
 * Sconce's room side is −Z: west −90 · east 90 · north 180 · south 0.
 */
export const PROPS: PropSpec[] = [
  // ---- R1 entrance leg: umbrella stand, dresser + mirror, frame (west); planter with plants + sconce (east, procedural box)
  { name: 'umbrella', url: H + 'umbrella_stand.glb', pos: [-0.78, 0, -0.4], rot: 0, h: 0.72, collide: true, age: 0.05 },
  { name: 'dresserA', url: H + 'wooden_side_table.glb', pos: [-0.77, 0, -1.65], rot: 90, h: 0.78, collide: true, age: 0.05 },
  { name: 'mirror', url: H + 'wall_mirror.glb', pos: [-0.985, 1.55, -1.65], rot: 90, h: 0.85, floor: false, age: 0 },
  { name: 'photoA1', url: H + 'vintage_framed_photos.glb', pos: [-0.985, 1.6, -2.8], rot: 90, h: 0.3, floor: false, only: /^pictureFrame3Large/, age: 0.05 },
  { name: 'snake1', url: M + 'plant_snake.glb', pos: [0.8, 0.45, -0.95], rot: 0, h: 0.6, age: 0 },
  { name: 'monsteraP', url: D + 'monstera_potted.glb', pos: [0.8, 0.45, -1.75], rot: 160, h: 1.0, age: 0 },
  { name: 'snake2', url: M + 'plant_snake.glb', pos: [0.8, 0.45, -2.55], rot: 90, h: 0.55, age: 0 },
  { name: 'sconceP', url: F + 'antique_wall_sconce.glb', pos: [0.86, 1.95, -1.75], rot: 90, h: 0.45, floor: false, age: 0.1, shadow: false },
  // ---- R2 corner: frame beside the bathroom door
  { name: 'photoR2', url: H + 'vintage_framed_photos.glb', pos: [2.8, 1.6, -3.515], rot: 180, h: 0.36, floor: false, only: /^pictureFrame1Large/, age: 0.05 },
  // ---- R6 alcove by the west windows: rug, leather armchair with the teddy bear in it, floor lamp, plant
  { name: 'rug', url: D + 'persian_rug.glb', pos: [0.3, 0.004, -5.75], rot: 90, w: 2.0, shadow: false, age: 0.1 },
  { name: 'armchair', url: F + 'leather_armchair.glb', pos: [0.55, 0, -6.0], rot: 200, h: 1.05, only: /ARMCHAIR/, collide: true, age: 0.1 },
  { name: 'teddy', url: D + 'teddy_bear.glb', pos: [0.55, 0.43, -5.95], rot: 200, h: 0.3, age: 0.1 },
  { name: 'floorLamp', url: F + 'leather_armchair.glb', pos: [1.22, 0, -6.35], rot: 200, h: 1.62, only: /FLOORLAMP/, collide: true, age: 0.05 },
  { name: 'monsteraA', url: D + 'monstera_potted.glb', pos: [-0.66, 0, -6.3], rot: 30, h: 1.2, collide: true, age: 0 },
  // ---- R3 recess: grandfather clock (heirloom)
  { name: 'clock', url: F + 'grandfather_clock.glb', pos: [2.4, 0, -5.82], rot: -90, h: 2.1, collide: true, age: 0.1 },
  // ---- Rs recess: credenza with two fabric lamps, rotary phone (heirloom), landscape painting
  { name: 'console', url: M + 'console_table.glb', pos: [4.5, 0, -5.8], rot: -90, h: 0.7, collide: true, age: 0.05 },
  { name: 'lampL', url: F + 'table_lamp_fabric.glb', pos: [3.97, 0.7, -5.85], rot: 0, h: 0.6, age: 0, shadow: false },
  { name: 'lampR', url: F + 'table_lamp_fabric.glb', pos: [5.03, 0.7, -5.85], rot: 0, h: 0.6, age: 0, shadow: false },
  { name: 'phone', url: F + 'rotary_telephone.glb', pos: [4.5, 0.7, -5.75], rot: 20, w: 0.25, age: 0.1 },
  { name: 'painting', url: F + 'landscape_oil_painting.glb', pos: [4.5, 1.72, -6.035], rot: 0, h: 0.7, floor: false, age: 0.05 },
  // ---- RN nook beside the stairs: coat rack + small wooden cabinet
  { name: 'coatRack', url: H + 'wooden_coat_rack.glb', pos: [5.2, 0, -1.35], rot: 0, h: 1.8, only: /^Object_4$/, collide: true, age: 0.05 },
  { name: 'dresserN', url: H + 'wooden_side_table.glb', pos: [5.95, 0, -1.25], rot: 180, h: 0.78, collide: true, age: 0.05 },
  // ---- R8 passage to the front doors: runner, sconces both sides, frames
  { name: 'runner', url: H + 'persian_runner_rug.glb', pos: [6.2, 0.004, -7.6], rot: 0, w: 2.2, shadow: false, age: 0.05 },
  { name: 'sconce8a', url: F + 'antique_wall_sconce.glb', pos: [5.74, 1.9, -7.0], rot: -90, h: 0.45, floor: false, age: 0.1, shadow: false },
  { name: 'sconce8b', url: F + 'antique_wall_sconce.glb', pos: [6.66, 1.9, -8.4], rot: 90, h: 0.45, floor: false, age: 0.1, shadow: false },
  { name: 'photo8a', url: H + 'vintage_framed_photos.glb', pos: [5.615, 1.6, -8.4], rot: 90, h: 0.26, floor: false, only: /^pictureFrame2Large/, age: 0.05 },
  { name: 'photo8b', url: H + 'vintage_framed_photos.glb', pos: [6.785, 1.6, -7.0], rot: -90, h: 0.2, floor: false, only: /^pictureFrame2_/, age: 0.05 },
  // ---- RE east hall toward door 9: bookcase (south), portrait (heirloom) + small photos (north)
  { name: 'bookcase', url: F + 'antique_bookcase.glb', pos: [8.3, 0, -3.68], rot: 180, h: 1.9, collide: true, age: 0.1 },
  { name: 'portrait', url: F + 'oil_portrait_gilt_frame.glb', pos: [8.6, 1.7, -5.485], rot: -90, h: 0.75, floor: false, age: 0.1 },
  { name: 'photoE1', url: H + 'vintage_framed_photos.glb', pos: [9.45, 1.62, -5.485], rot: 0, h: 0.18, floor: false, only: /^pictureFrame1_/, age: 0.05 },
  { name: 'photoE2', url: H + 'vintage_framed_photos.glb', pos: [9.45, 1.38, -5.485], rot: 0, h: 0.16, floor: false, only: /^pictureFrame3_/, age: 0.05 },
  // ---- Corridor (wet concrete, unchanged)
  { name: 'cageLamp', url: A + 'caged_industrial_lamp.glb', pos: [0, CORRIDOR.h - 0.16, 4.75], rot: 0, h: 0.32, floor: false, age: 0.4, shadow: false },
  { name: 'switch', url: A + 'vintage_light_switch.glb', pos: [0.52, 1.3, 0.55], rot: -90, h: 0.085, floor: false, only: /^Object_4$/, age: 0.4 },
];

export type LampTag = 'corridor' | 'leak' | 'lamp';
export interface Furnished {
  props: Map<string, THREE.Object3D>;
  lamps: { light: THREE.PointLight; base: number; flicker: number; glow?: THREE.Mesh; tag: LampTag }[];
  /** ceiling fan blades (spun by Game) and the fan root (for its creak) */
  fan: { root: THREE.Object3D; blades: THREE.Object3D | null } | null;
}

const WARM_SHADE = 0xffd09a, WARM_BULB = 0xffe0b8;

export async function furnish(assets: Assets, physics: Physics, scene: THREE.Group, onProp?: () => void): Promise<Furnished> {
  const props = new Map<string, THREE.Object3D>();
  await Promise.all(PROPS.map(async (s) => {
    const o = await placeProp(assets, physics, scene, s);
    if (o) props.set(s.name!, o);
    onProp?.();
  }));
  scene.add(planter(physics));

  const lamps: Furnished['lamps'] = [];
  const mkLight = (color: number, intensity: number, dist: number, pos: THREE.Vector3, shadow: boolean, flicker = 0, tag: LampTag = 'lamp') => {
    const l = new THREE.PointLight(color, intensity, dist, 2);
    l.position.copy(pos);
    if (shadow && Q.shadows) {
      l.castShadow = true;
      l.shadow.mapSize.set(Q.shadowMap, Q.shadowMap);
      l.shadow.bias = -0.0015;
      l.shadow.normalBias = 0.03;
      l.shadow.camera.near = 0.05;
    }
    scene.add(l);
    lamps.push({ light: l, base: intensity, flicker, tag });
    return lamps[lamps.length - 1];
  };
  const top = (name: string, dy: number, fb: THREE.Vector3) => {
    const o = props.get(name);
    if (!o) return fb;
    const bb = new THREE.Box3().setFromObject(o);
    return new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y - dy, (bb.min.z + bb.max.z) / 2);
  };

  // Warm, cosy pools of light with dark gaps between them (atrium/stairs/gallery stay unlit).
  const sp = top('sconceP', 0.07, new THREE.Vector3(0.8, 2.25, -1.75));
  mkLight(WARM_BULB, 6, 7, sp, true, 0.02).glow = bulb(scene, sp, 0xfff0d8, 0.02);
  const fl = top('floorLamp', 0.14, new THREE.Vector3(1.22, 1.5, -6.35));
  mkLight(WARM_SHADE, 5, 6, fl, true, 0.04).glow = shadeGlow(scene, fl, 0.08, 0.15, 0.2, 0xffb062);
  const ll = top('lampL', 0.16, new THREE.Vector3(3.97, 1.15, -5.85));
  mkLight(WARM_SHADE, 4, 6, ll, true, 0.01).glow = shadeGlow(scene, ll.clone().add(new THREE.Vector3(0, 0.02, 0)), 0.11, 0.17, 0.22, 0xffc27a);
  const lr = top('lampR', 0.16, new THREE.Vector3(5.03, 1.15, -5.85));
  mkLight(WARM_SHADE, 3, 5, lr, false, 0.01).glow = shadeGlow(scene, lr.clone().add(new THREE.Vector3(0, 0.02, 0)), 0.11, 0.17, 0.22, 0xffc27a);
  const s8a = top('sconce8a', 0.07, new THREE.Vector3(5.8, 2.2, -7.0));
  mkLight(WARM_BULB, 5, 6, s8a, true, 0.02).glow = bulb(scene, s8a, 0xfff0d8, 0.02);
  const s8b = top('sconce8b', 0.07, new THREE.Vector3(6.6, 2.2, -8.4));
  mkLight(WARM_BULB, 4, 6, s8b, false, 0.25).glow = bulb(scene, s8b, 0xfff0d8, 0.02);

  // faint night light on the upper landing: silhouettes the treads and balusters, the void above stays dark
  const nl = new THREE.Vector3(5.6, 3.35, 0.25);
  mkLight(WARM_SHADE, 2.2, 5.5, nl, true, 0.05).glow = bulb(scene, nl, 0xffd8a8, 0.02);

  // corridor caged bulb (unstable) and the light leaking under the closed door
  const bulbPos = new THREE.Vector3(0, CORRIDOR.h - 0.28, 4.75);
  mkLight(0xffdca8, 30, 7, bulbPos, true, 0.6, 'corridor').glow = bulb(scene, bulbPos, 0xfff0c8);
  mkLight(0xffa860, 0.35, 1.6, new THREE.Vector3(0, 0.04, 0.25), false, 0, 'leak');

  // bare bulb near door 9 at the far end of the east hall (dim, unsteady)
  const eb = new THREE.Vector3(9.2, 2.55, -4.5);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.45, 6), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }));
  cord.position.set(eb.x, 2.775, eb.z);
  scene.add(cord);
  mkLight(WARM_BULB, 5, 7, eb, true, 0.3).glow = bulb(scene, eb, 0xfff2dc, 0.03);

  scene.add(pipes());
  const fan = await ceilingFan(assets, scene);
  return { props, lamps, fan };
}

/** Old ceiling fan on a downrod in the double-height atrium. Blades node is spun around its local Z (world up). */
async function ceilingFan(assets: Assets, parent: THREE.Object3D): Promise<Furnished['fan']> {
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

/** Low wooden planter trough along the east wall of the entrance leg (plants sit on top). */
function planter(physics: Physics) {
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
function shadeGlow(parent: THREE.Object3D, at: THREE.Vector3, rTop: number, rBot: number, h: number, color: number) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 40, 1, true), mat);
  m.position.copy(at);
  parent.add(m);
  const b = bulb(parent, at.clone().add(new THREE.Vector3(0, -0.02, 0)), 0xfff2d0, 0.025);
  m.add(b); b.position.set(0, -0.02, 0);
  return m;
}

function bulb(parent: THREE.Object3D, at: THREE.Vector3, color: number, r = 0.03) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(6) }));
  m.position.copy(at);
  parent.add(m);
  return m;
}

function pipes() {
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
