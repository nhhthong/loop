import * as THREE from 'three';
import type { Assets } from '../engine/Assets';
import type { Physics } from '../engine/Physics';
import { placeProp, type PropSpec } from './Props';
import { CORRIDOR, ROOM_H } from './Level';
import { Q } from '../engine/Quality';

const F = '/models/furniture/', D = '/models/decor/', A = '/models/architecture/', H = '/models/hallway/', M = '/models/modern/';

/**
 * Interior dressing. Wall yaw convention (model front = +Z):
 * left wall (x=-1) rot 90 · right wall (x=1) rot -90 · leg-B north wall (z=-3) rot 180 · back wall (z=-5) rot 0 · end wall (x=5) rot -90
 * (exceptions: portrait, clock and console face +X natively → rot 0 on the left wall)
 */
export const PROPS: PropSpec[] = [
  // ---- Leg A, left wall: coat rack by the entrance; credenza with lamp + rotary phone (heirloom), portrait (heirloom) above; grandfather clock (heirloom)
  { name: 'coatRack', url: M + 'coat_rack.glb', pos: [-0.75, 0, -0.45], rot: 0, h: 1.75, collide: true, age: 0 },
  { name: 'console', url: M + 'console_table.glb', pos: [-0.76, 0, -2.0], rot: 0, h: 0.72, collide: true, age: 0 },
  { name: 'tableLamp', url: M + 'table_lamp.glb', pos: [-0.8, 0.72, -2.5], rot: 0, h: 0.55, only: /^Object_(4|5|7|19|21|22)$/, age: 0, shadow: false },
  { name: 'phone', url: F + 'rotary_telephone.glb', pos: [-0.78, 0.72, -1.55], rot: 110, w: 0.25, age: 0.05 },
  { name: 'portrait', url: F + 'oil_portrait_gilt_frame.glb', pos: [-0.95, 1.68, -2.0], rot: 0, h: 0.75, floor: false, age: 0.05 },
  { name: 'clock', url: F + 'grandfather_clock.glb', pos: [-0.8, 0, -3.35], rot: 0, h: 2.1, collide: true, age: 0.05 },
  // ---- Leg A, right wall: plant by the door, ladder shelf
  { name: 'monstera', url: D + 'monstera_potted.glb', pos: [0.68, 0, -0.5], rot: 200, h: 1.2, collide: true, age: 0 },
  { name: 'shelf', url: M + 'ladder_shelf.glb', pos: [0.8, 0, -2.0], rot: -90, h: 1.8, collide: true, age: 0 },
  // ---- Corner by window A: boucle armchair facing the door, teddy bear sitting in it, tripod floor lamp
  { name: 'armchair', url: M + 'accent_armchair.glb', pos: [-0.45, 0, -4.3], rot: 25, h: 0.8, collide: true, age: 0 },
  { name: 'teddy', url: D + 'teddy_bear.glb', pos: [-0.43, 0.4, -4.25], rot: 25, h: 0.3, age: 0.05 },
  { name: 'floorLamp', url: M + 'floor_lamp.glb', pos: [-0.8, 0, -4.75], rot: 25, h: 1.55, collide: true, age: 0 },
  // ---- Leg B: abstract canvas between the windows; round mirror + snake plant on the z=-3 wall (bathroom door at x 2.0–2.75); runner
  { name: 'art', url: M + 'wall_art_abstract.glb', pos: [1.55, 1.55, -4.985], rot: 0, h: 1.0, floor: false, age: 0 },
  { name: 'mirror', url: M + 'round_mirror.glb', pos: [4.0, 1.5, -3.015], rot: 180, h: 0.75, floor: false, age: 0 },
  { name: 'snakePlant', url: M + 'plant_snake.glb', pos: [4.0, 0, -3.25], rot: 0, h: 0.6, collide: true, age: 0 },
  { name: 'runner', url: H + 'persian_runner_rug.glb', pos: [3.1, 0.004, -4.0], rot: 90, w: 2.6, shadow: false, age: 0.05 },
  // ---- Corridor (wet concrete, unchanged)
  { name: 'cageLamp', url: A + 'caged_industrial_lamp.glb', pos: [0, CORRIDOR.h - 0.16, 3.0], rot: 0, h: 0.32, floor: false, age: 0.4 },
  { name: 'rubble', url: A + 'concrete_rubble.glb', pos: [0.22, 0, 1.2], rot: 40, w: 0.75, age: 0 },
  { name: 'rubble2', url: A + 'concrete_rubble.glb', pos: [-0.3, 0, 4.4], rot: 160, w: 0.55, age: 0 },
  { name: 'switch', url: A + 'vintage_light_switch.glb', pos: [0.52, 1.3, 0.55], rot: -90, h: 0.085, floor: false, only: /^Object_4$/, age: 0.4 },
];

export interface Furnished {
  props: Map<string, THREE.Object3D>;
  lamps: { light: THREE.PointLight | THREE.SpotLight; base: number; flicker: number; glow?: THREE.Mesh }[];
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
  lampA.glow = shadeGlow(scene, lampPos.clone().add(new THREE.Vector3(0, 0.02, 0)), 0.12, 0.12, 0.17, 0xffc27a);

  // floor lamp in the corner (flickers)
  const fl = props.get('floorLamp');
  const flBox = fl ? new THREE.Box3().setFromObject(fl) : null;
  const flPos = flBox ? new THREE.Vector3((flBox.min.x + flBox.max.x) / 2, flBox.max.y - 0.14, (flBox.min.z + flBox.max.z) / 2) : new THREE.Vector3(-0.78, 1.5, -4.78);
  const lampB = mkLight(0xff9248, 2.6, 7, flPos, 1024, 0.35);
  lampB.glow = shadeGlow(scene, flPos.clone(), 0.15, 0.15, 0.17, 0xffb062);

  // recessed ceiling downlight in leg B (index 2 — order matters for Game.updateLights)
  const lampC = downlight(scene, new THREE.Vector3(3.7, ROOM_H, -4.0), 14, 0.04);
  lamps.push(lampC);

  // corridor caged bulb (unstable)
  const bulbPos = new THREE.Vector3(0, CORRIDOR.h - 0.28, 3.0);
  const lampD = mkLight(0xffdca8, 3.2, 5, bulbPos, 1024, 0.6);
  lampD.glow = bulb(scene, bulbPos, 0xfff0c8);

  // light leaking under/around the closed door into the corridor
  const leak = new THREE.PointLight(0xffa860, 0.35, 1.6, 2);
  leak.position.set(0, 0.04, 0.25);
  scene.add(leak);
  lamps.push({ light: leak, base: 0.35, flicker: 0 });

  // remaining downlights: some dead (keeps pools of darkness), one unstable
  lamps.push(downlight(scene, new THREE.Vector3(0, ROOM_H, -2.4), 9, 0.02));
  lamps.push(downlight(scene, new THREE.Vector3(0, ROOM_H, -3.95), 12, 0.5));
  downlight(scene, new THREE.Vector3(0, ROOM_H, -0.9), 0, 0);
  downlight(scene, new THREE.Vector3(2.3, ROOM_H, -4.0), 0, 0);

  // procedural rusty pipes along the corridor ceiling
  scene.add(pipes());

  return { props, lamps };
}

/** Recessed can light: white trim ring + lens disc; intensity 0 = dead bulb (no light). */
function downlight(parent: THREE.Object3D, at: THREE.Vector3, intensity: number, flicker: number): Furnished['lamps'][number] {
  const trim = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.4, side: THREE.DoubleSide }));
  trim.position.copy(at).add(new THREE.Vector3(0, -0.006, 0));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.058, 0.08, 40), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.4 }));
  ring.rotation.x = Math.PI / 2; ring.position.copy(at).add(new THREE.Vector3(0, -0.012, 0));
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.058, 40), new THREE.MeshBasicMaterial({ color: intensity > 0 ? new THREE.Color(0xffd6a0).multiplyScalar(5) : new THREE.Color(0x2a2824) }));
  lens.rotation.x = Math.PI / 2; lens.position.copy(at).add(new THREE.Vector3(0, -0.004, 0));
  parent.add(trim, ring, lens);
  const l = new THREE.SpotLight(0xffc98a, intensity, 7, 0.95, 0.75, 2);
  l.position.copy(at).add(new THREE.Vector3(0, -0.02, 0));
  l.target.position.copy(at).setY(0);
  if (intensity > 0 && Q.shadows) {
    l.castShadow = true;
    l.shadow.mapSize.set(Q.shadowMap, Q.shadowMap);
    l.shadow.bias = -0.0008;
    l.shadow.normalBias = 0.03;
    l.shadow.camera.near = 0.05;
  }
  if (intensity > 0) parent.add(l, l.target);
  return { light: l, base: intensity, flicker, glow: lens };
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
