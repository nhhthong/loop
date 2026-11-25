import * as THREE from 'three';
import type { Assets } from '../engine/Assets';
import type { Physics } from '../engine/Physics';
import { placeProp, type PropSpec } from './Props';
import { CORRIDOR } from './Level';
import { Q } from '../engine/Quality';

const F = '/models/furniture/', D = '/models/decor/', A = '/models/architecture/', H = '/models/hallway/';

/**
 * Interior dressing. Wall yaw convention (model front = +Z):
 * left wall (x=-1) rot 90 · right wall (x=1) rot -90 · leg-B north wall (z=-3) rot 180 · back wall (z=-5) rot 0 · end wall (x=5) rot -90
 * (exceptions noted per model: portrait & clock face +X natively, sconce's room side is −Z, chest of drawers faces ±X)
 */
export const PROPS: PropSpec[] = [
  // ---- Leg A, entrance: coat rack behind the door, umbrella stand opposite
  { name: 'coatRack', url: H + 'wooden_coat_rack.glb', pos: [-0.74, 0, -0.5], rot: 20, h: 1.8, only: /^Object_4$/, collide: true, age: 0.05 },
  { name: 'umbrella', url: H + 'umbrella_stand.glb', pos: [0.8, 0, -0.32], rot: 0, h: 0.72, collide: true, age: 0.05 },
  // ---- Leg A, left wall: console with lamp + telephone (static), portrait above; clock near the corner
  { name: 'console', url: F + 'antique_side_table.glb', pos: [-0.74, 0, -2.0], rot: 90, h: 0.78, collide: true, age: 0.05 },
  { name: 'tableLamp', url: F + 'table_lamp_fabric.glb', pos: [-0.78, 0.78, -2.24], rot: 90, h: 0.6, age: 0, shadow: false },
  { name: 'phone', url: F + 'rotary_telephone.glb', pos: [-0.72, 0.78, -1.84], rot: 110, w: 0.25, age: 0.05 },
  { name: 'portrait', url: F + 'oil_portrait_gilt_frame.glb', pos: [-0.95, 1.78, -2.02], rot: 0, h: 0.82, floor: false, age: 0.05 },
  { name: 'clock', url: F + 'grandfather_clock.glb', pos: [-0.8, 0, -3.35], rot: 0, h: 2.1, collide: true, age: 0.05 },
  // ---- Leg A, right wall: dresser + mirror + orchid, bookcase
  { name: 'dresser', url: H + 'wooden_side_table.glb', pos: [0.77, 0, -0.88], rot: -90, h: 0.78, collide: true, age: 0.05 },
  { name: 'mirror', url: H + 'wall_mirror.glb', pos: [0.98, 1.55, -0.88], rot: -90, h: 0.85, floor: false, age: 0 },
  { name: 'orchid', url: H + 'ceramic_vase_orchids.glb', pos: [0.8, 0.78, -1.05], rot: 0, h: 0.5, age: 0 },
  { name: 'bookcase', url: F + 'antique_bookcase.glb', pos: [0.8, 0, -2.18], rot: -90, h: 2.0, collide: true, age: 0.1 },
  { name: 'rug', url: D + 'persian_rug.glb', pos: [0, 0.003, -2.3], rot: 0, w: 2.5, shadow: false, age: 0.1 },
  // ---- Corner by window A: armchair facing the door with a teddy bear sitting in it, floor lamp, candles on the sill
  { name: 'armchair', url: F + 'leather_armchair.glb', pos: [-0.45, 0, -4.3], rot: 25, h: 1.05, only: /ARMCHAIR/, collide: true, age: 0.1 },
  { name: 'teddy', url: D + 'teddy_bear.glb', pos: [-0.42, 0.43, -4.22], rot: 25, h: 0.36, age: 0.05 },
  { name: 'floorLamp', url: F + 'leather_armchair.glb', pos: [-0.78, 0, -4.78], rot: 25, h: 1.62, only: /FLOORLAMP/, collide: true, age: 0.05 },
  { name: 'candles', url: D + 'candles.glb', pos: [0.32, 0.975, -4.9], rot: 0, h: 0.2, only: /Stick0\d_geo|Wick/, age: 0.05 },
  // ---- Leg B, back wall (z=-5): chest of drawers between the windows, family photos above, books on top; radiator under window B
  { name: 'chest', url: H + 'chest_of_drawers.glb', pos: [1.5, 0, -4.66], rot: 90, h: 0.75, collide: true, age: 0.05 },
  { name: 'books', url: D + 'book_stack.glb', pos: [1.95, 0.75, -4.7], rot: 15, w: 0.26, age: 0.05 },
  { name: 'photo1', url: H + 'vintage_framed_photos.glb', pos: [1.05, 1.62, -4.985], rot: 0, h: 0.34, floor: false, only: /^pictureFrame1Large/, age: 0 },
  { name: 'photo2', url: H + 'vintage_framed_photos.glb', pos: [1.5, 1.75, -4.985], rot: 0, h: 0.24, floor: false, only: /^pictureFrame2Large/, age: 0 },
  { name: 'photo3', url: H + 'vintage_framed_photos.glb', pos: [1.88, 1.6, -4.985], rot: 0, h: 0.26, floor: false, only: /^pictureFrame3Large/, age: 0 },
  { name: 'photo4', url: H + 'vintage_framed_photos.glb', pos: [1.48, 1.45, -4.985], rot: 0, h: 0.15, floor: false, only: /^pictureFrame1_/, age: 0 },
  { name: 'photo5', url: H + 'vintage_framed_photos.glb', pos: [2.12, 1.82, -4.985], rot: 0, h: 0.14, floor: false, only: /^pictureFrame2_/, age: 0 },
  { name: 'radiator', url: A + 'old_radiator.glb', pos: [3.4, 0.06, -4.93], rot: 0, w: 0.9, collide: true, age: 0.05 },
  { name: 'monstera', url: D + 'monstera_potted.glb', pos: [4.55, 0, -4.62], rot: 200, h: 1.25, collide: true, age: 0.05 },
  // ---- Leg B, north wall (z=-3, bathroom door at x 2.0–2.75): sconces flanking the landscape painting; runner rug
  { name: 'painting', url: F + 'landscape_oil_painting.glb', pos: [3.95, 1.75, -3.07], rot: 180, h: 0.72, floor: false, age: 0.05 },
  { name: 'sconce1', url: F + 'antique_wall_sconce.glb', pos: [3.25, 1.85, -3.16], rot: 0, h: 0.45, floor: false, age: 0.05 },
  { name: 'sconce2', url: F + 'antique_wall_sconce.glb', pos: [4.65, 1.85, -3.16], rot: 0, h: 0.45, floor: false, age: 0.05 },
  { name: 'runner', url: H + 'persian_runner_rug.glb', pos: [3.1, 0.004, -4.0], rot: 90, w: 2.6, shadow: false, age: 0.1 },
  // ---- Corridor (wet concrete, unchanged)
  { name: 'cageLamp', url: A + 'caged_industrial_lamp.glb', pos: [0, CORRIDOR.h - 0.16, 3.0], rot: 0, h: 0.32, floor: false, age: 0.4 },
  { name: 'rubble', url: A + 'concrete_rubble.glb', pos: [0.22, 0, 1.2], rot: 40, w: 0.75, age: 0 },
  { name: 'rubble2', url: A + 'concrete_rubble.glb', pos: [-0.3, 0, 4.4], rot: 160, w: 0.55, age: 0 },
  { name: 'switch', url: A + 'vintage_light_switch.glb', pos: [0.52, 1.3, 0.55], rot: -90, h: 0.085, floor: false, only: /^Object_4$/, age: 0.4 },
];

export interface Furnished {
  props: Map<string, THREE.Object3D>;
  lamps: { light: THREE.PointLight; base: number; flicker: number; glow?: THREE.Mesh }[];
}

export async function furnish(assets: Assets, physics: Physics, scene: THREE.Group, onProp?: () => void): Promise<Furnished> {
  const props = new Map<string, THREE.Object3D>();
  await Promise.all(PROPS.map(async (s) => {
    const o = await placeProp(assets, physics, scene, s);
    if (o) props.set(s.name!, o);
    onProp?.();
  }));

  const lamps: Furnished['lamps'] = [];
  const mkLight = (color: number, intensity: number, dist: number, pos: THREE.Vector3, shadow: number, flicker = 0) => {
    const l = new THREE.PointLight(color, intensity, dist, 2);
    l.position.copy(pos);
    if (shadow && Q.shadows) {
      l.castShadow = true;
      l.shadow.mapSize.set(Math.min(shadow, Q.shadowMap), Math.min(shadow, Q.shadowMap));
      l.shadow.bias = -0.0015;
      l.shadow.normalBias = 0.03;
      l.shadow.radius = 5;
      l.shadow.camera.near = 0.05;
    }
    scene.add(l);
    lamps.push({ light: l, base: intensity, flicker });
    return lamps[lamps.length - 1];
  };

  // table lamp on console: glow shell over its fabric shade
  const tl = props.get('tableLamp');
  const tlTop = tl ? new THREE.Box3().setFromObject(tl) : null;
  const lampPos = tlTop ? new THREE.Vector3((tlTop.min.x + tlTop.max.x) / 2, tlTop.max.y - 0.16, (tlTop.min.z + tlTop.max.z) / 2) : new THREE.Vector3(-0.78, 1.25, -2.24);
  const lampA = mkLight(0xffa458, 4.5, 6, lampPos, 1024, 0.02);
  lampA.glow = shadeGlow(scene, lampPos.clone().add(new THREE.Vector3(0, 0.02, 0)), 0.11, 0.17, 0.22, 0xffc27a);

  // floor lamp in the corner (flickers)
  const fl = props.get('floorLamp');
  const flBox = fl ? new THREE.Box3().setFromObject(fl) : null;
  const flPos = flBox ? new THREE.Vector3((flBox.min.x + flBox.max.x) / 2, flBox.max.y - 0.14, (flBox.min.z + flBox.max.z) / 2) : new THREE.Vector3(-0.78, 1.5, -4.78);
  const lampB = mkLight(0xff9248, 2.6, 7, flPos, 1024, 0.35);
  lampB.glow = shadeGlow(scene, flPos.clone(), 0.08, 0.15, 0.2, 0xffb062);

  // working sconce in leg B (the other one is dead)
  const sc = props.get('sconce2');
  const scBox = sc ? new THREE.Box3().setFromObject(sc) : null;
  const scPos = scBox ? new THREE.Vector3(scBox.min.x + (scBox.max.x - scBox.min.x) * 0.3, scBox.max.y - 0.06, scBox.min.z + 0.05) : new THREE.Vector3(4.0, 2.2, -3.3);
  const lampC = mkLight(0xffa860, 1.6, 6, scPos, 512, 0.08);
  lampC.glow = bulb(scene, scPos, 0xffc890);

  // corridor caged bulb (unstable)
  const bulbPos = new THREE.Vector3(0, CORRIDOR.h - 0.28, 3.0);
  const lampD = mkLight(0xffdca8, 3.2, 5, bulbPos, 1024, 0.6);
  lampD.glow = bulb(scene, bulbPos, 0xfff0c8);

  // light leaking under/around the closed door into the corridor
  const leak = new THREE.PointLight(0xffa860, 0.35, 1.6, 2);
  leak.position.set(0, 0.04, 0.25);
  scene.add(leak);
  lamps.push({ light: leak, base: 0.35, flicker: 0 });

  // procedural rusty pipes along the corridor ceiling
  scene.add(pipes());

  return { props, lamps };
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
