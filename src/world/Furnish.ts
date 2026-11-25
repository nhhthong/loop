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
  // Sconce model's room side is −Z: left wall rot −90 · right wall rot 90 · z=−3 wall rot 0.
  // ---- Leg A, left wall: small photo, lit sconce, credenza with dim lamp + rotary phone, portrait (heirloom), clock (heirloom) at the end
  { name: 'photoA1', url: H + 'vintage_framed_photos.glb', pos: [-0.985, 1.55, -0.55], rot: 90, h: 0.26, floor: false, only: /^pictureFrame3Large/, age: 0.1 },
  { name: 'sconce1', url: F + 'antique_wall_sconce.glb', pos: [-0.86, 1.85, -1.3], rot: -90, h: 0.45, floor: false, age: 0.15, shadow: false },
  { name: 'console', url: M + 'console_table.glb', pos: [-0.76, 0, -2.35], rot: 0, h: 0.72, collide: true, age: 0.1 },
  { name: 'tableLamp', url: M + 'table_lamp.glb', pos: [-0.8, 0.72, -2.8], rot: 0, h: 0.55, only: /^Object_(4|5|7|19|21|22)$/, age: 0.1, shadow: false },
  { name: 'phone', url: F + 'rotary_telephone.glb', pos: [-0.78, 0.72, -1.95], rot: 110, w: 0.25, age: 0.1 },
  { name: 'portrait', url: F + 'oil_portrait_gilt_frame.glb', pos: [-0.95, 1.68, -2.35], rot: 0, h: 0.75, floor: false, age: 0.1 },
  { name: 'clock', url: F + 'grandfather_clock.glb', pos: [-0.8, 0, -4.4], rot: 0, h: 2.1, collide: true, age: 0.1 },
  // ---- Leg A, right wall: frames, unlit sconce
  { name: 'photoA2', url: H + 'vintage_framed_photos.glb', pos: [0.985, 1.6, -0.9], rot: -90, h: 0.38, floor: false, only: /^pictureFrame1Large/, age: 0.1 },
  { name: 'photoA3', url: H + 'vintage_framed_photos.glb', pos: [0.985, 1.55, -1.6], rot: -90, h: 0.26, floor: false, only: /^pictureFrame2Large/, age: 0.1 },
  { name: 'sconce2', url: F + 'antique_wall_sconce.glb', pos: [0.86, 1.85, -2.25], rot: 90, h: 0.45, floor: false, age: 0.15, shadow: false },
  { name: 'photoA4', url: H + 'vintage_framed_photos.glb', pos: [0.985, 1.5, -2.75], rot: -90, h: 0.18, floor: false, only: /^pictureFrame1_/, age: 0.1 },
  // ---- Corner: teddy bear sitting on the floor, facing the way you came
  { name: 'teddy', url: D + 'teddy_bear.glb', pos: [0.72, 0, -4.72], rot: -30, h: 0.32, age: 0.15 },
  // ---- Leg B: frames along the z=−3 wall (bathroom door at x 2.0–2.75) with a flickering sconce; canvas between the windows
  { name: 'photoB1', url: H + 'vintage_framed_photos.glb', pos: [1.5, 1.55, -3.015], rot: 180, h: 0.2, floor: false, only: /^pictureFrame2_/, age: 0.1 },
  { name: 'sconce3', url: F + 'antique_wall_sconce.glb', pos: [3.25, 1.85, -3.14], rot: 0, h: 0.45, floor: false, age: 0.15, shadow: false },
  { name: 'photoB2', url: H + 'vintage_framed_photos.glb', pos: [3.95, 1.6, -3.015], rot: 180, h: 0.36, floor: false, only: /^pictureFrame1Large/, age: 0.1 },
  { name: 'photoB3', url: H + 'vintage_framed_photos.glb', pos: [4.6, 1.5, -3.015], rot: 180, h: 0.2, floor: false, only: /^pictureFrame3_/, age: 0.1 },
  { name: 'art', url: M + 'wall_art_abstract.glb', pos: [1.55, 1.55, -4.985], rot: 0, h: 0.8, floor: false, age: 0.1 },
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
      l.shadow.camera.near = 0.05;
    }
    scene.add(l);
    lamps.push({ light: l, base: intensity, flicker });
    return lamps[lamps.length - 1];
  };

  // Few, harsh sources. Order matters for Game.updateLights: [3] = corridor bulb, [4] = door leak.
  // [0] table lamp on the credenza — barely on
  const tl = props.get('tableLamp');
  const tlTop = tl ? new THREE.Box3().setFromObject(tl) : null;
  const lampPos = tlTop ? new THREE.Vector3((tlTop.min.x + tlTop.max.x) / 2, tlTop.max.y - 0.16, (tlTop.min.z + tlTop.max.z) / 2) : new THREE.Vector3(-0.8, 1.15, -2.8);
  const lampA = mkLight(0xffd2a0, 0.9, 3, lampPos, 0, 0.02);
  lampA.glow = shadeGlow(scene, lampPos.clone().add(new THREE.Vector3(0, 0.02, 0)), 0.12, 0.12, 0.17, 0x8a7458);

  // [1] lit sconce near the entrance, [2] flickering sconce in leg B (sconce2 stays dark)
  const sconceBulb = (name: string, fb: THREE.Vector3) => {
    const o = props.get(name);
    if (!o) return fb;
    const bb = new THREE.Box3().setFromObject(o);
    return new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y - 0.07, (bb.min.z + bb.max.z) / 2);
  };
  const s1 = sconceBulb('sconce1', new THREE.Vector3(-0.8, 2.15, -1.3));
  mkLight(0xffe4c2, 5, 7, s1, 1024, 0.02).glow = bulb(scene, s1, 0xfff1dc, 0.02);
  const s3 = sconceBulb('sconce3', new THREE.Vector3(3.25, 2.15, -3.2));
  mkLight(0xffe4c2, 4, 6, s3, 1024, 0.45).glow = bulb(scene, s3, 0xfff1dc, 0.02);

  // [3] corridor caged bulb (unstable)
  const bulbPos = new THREE.Vector3(0, CORRIDOR.h - 0.28, 3.0);
  const lampD = mkLight(0xffdca8, 3.2, 5, bulbPos, 1024, 0.6);
  lampD.glow = bulb(scene, bulbPos, 0xfff0c8);

  // [4] light leaking under/around the closed door into the corridor
  const leak = new THREE.PointLight(0xffa860, 0.35, 1.6, 2);
  leak.position.set(0, 0.04, 0.25);
  scene.add(leak);
  lamps.push({ light: leak, base: 0.35, flicker: 0 });

  // [5] bare bulb hanging at the end of the L — the focal point beside the locked door
  const endBulb = new THREE.Vector3(4.35, ROOM_H - 0.45, -4.0);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.42, 6), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }));
  cord.position.set(endBulb.x, ROOM_H - 0.21, endBulb.z);
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 20), new THREE.MeshStandardMaterial({ color: 0xd9d3c6, roughness: 0.5 }));
  canopy.position.set(endBulb.x, ROOM_H - 0.01, endBulb.z);
  scene.add(cord, canopy);
  mkLight(0xfff0dc, 7, 8, endBulb, 1024, 0.03).glow = bulb(scene, endBulb, 0xfff6e8, 0.03);

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
