import * as THREE from 'three';
import type { Assets } from '../engine/Assets';
import type { Physics } from '../engine/Physics';
import { Q } from '../engine/Quality';
import { placeProp } from './Props';
import { PROPS } from '../data/props';
import { LIGHTS, type LightSpec, type LampTag } from '../data/lights';
import { ceilingFan, digitalClock, planter, pipes, bulb, shadeGlow, cord, type CeilingFan } from './fixtures';

/** A placed light. `base` is its nominal intensity; LightingSystem multiplies it each frame (flicker, `driver`). */
export interface Lamp {
  readonly id: string;
  readonly light: THREE.PointLight;
  base: number;
  readonly flicker: number;
  readonly tag: LampTag;
  glow?: THREE.Mesh;
  /** optional extra multiplier (0..1) evaluated every frame, e.g. tie a light to a door's state */
  driver?: () => number;
  /** pendulum: light + glow hang `len` below `anchor` on `cord` (animated by PendantSystem) */
  swing?: { anchor: THREE.Vector3; len: number; amp: number; cord?: THREE.Mesh };
  /** seen from far away: weighted as 4× closer by the light pool */
  readonly landmark: boolean;
}

export interface Furnished {
  /** placed props + named fixtures (`ceilingFan`), by name */
  props: Map<string, THREE.Object3D>;
  lamps: Lamp[];
  fan: CeilingFan | null;
}

/** Dress the house from data: props (`data/props.ts`), fixtures, then lights (`data/lights.ts`). */
export async function furnish(assets: Assets, physics: Physics, scene: THREE.Group): Promise<Furnished> {
  const props = new Map<string, THREE.Object3D>();
  await Promise.all(PROPS.filter((s) => !s.late).map(async (s) => {
    const o = await placeProp(assets, physics, scene, s);
    if (o) props.set(s.name!, o);
  }));

  scene.add(planter(physics), pipes());
  const cab = props.get('clockCabinet');
  if (cab) scene.add(digitalClock(new THREE.Vector3(0.84, new THREE.Box3().setFromObject(cab).max.y, 1.85), -Math.PI / 2));
  const fan = await ceilingFan(assets, scene);
  if (fan) props.set('ceilingFan', fan.root);

  const lamps = LIGHTS.filter((s) => !s.requires || props.has(s.requires)).map((s) => buildLamp(s, props, scene));
  return { props, lamps, fan };
}

/** Stage 2: place the late props, then move lamps anchored to them onto their real positions. Returns the new objects. */
export async function furnishLate(f: Furnished, assets: Assets, physics: Physics, scene: THREE.Group): Promise<THREE.Object3D[]> {
  const added: THREE.Object3D[] = [];
  await Promise.all(PROPS.filter((s) => s.late).map(async (s) => {
    const o = await placeProp(assets, physics, scene, s);
    if (o) { f.props.set(s.name!, o); added.push(o); }
  }));
  for (const l of f.lamps) {
    const s = LIGHTS.find((x) => x.id === l.id)!;
    if (!s.onProp || !f.props.has(s.onProp[0])) continue;
    const pos = lampPos(s, f.props);
    l.light.position.copy(pos);
    if (l.glow) l.glow.position.copy(pos).add(new THREE.Vector3(0, s.glow && 'shade' in s.glow ? s.glow.dy ?? 0 : 0, 0));
  }
  return added;
}

/** Lamp position: on top of its prop when that prop is loaded, else the spec's fallback position. */
function lampPos(s: LightSpec, props: Map<string, THREE.Object3D>) {
  const pos = new THREE.Vector3(...s.pos);
  const anchor = s.onProp && props.get(s.onProp[0]);
  if (anchor) {
    const bb = new THREE.Box3().setFromObject(anchor);
    pos.set((bb.min.x + bb.max.x) / 2, bb.max.y - s.onProp![1], (bb.min.z + bb.max.z) / 2);
  }
  return pos;
}

function buildLamp(s: LightSpec, props: Map<string, THREE.Object3D>, parent: THREE.Object3D): Lamp {
  const pos = lampPos(s, props);
  const light = new THREE.PointLight(s.color, s.intensity, s.dist, 2);
  light.position.copy(pos);
  if (s.shadow && Q.shadows) configureShadow(light);
  if (!Q.lightPool) parent.add(light); // pooled: the light is a parameter holder, LightingSystem's pool renders it
  const cordMesh = s.cord ? cord(parent, pos, s.cord) : undefined;
  let glow: THREE.Mesh | undefined;
  if (s.glow && 'bulb' in s.glow) glow = bulb(parent, pos, s.glow.bulb, s.glow.r);
  else if (s.glow) glow = shadeGlow(parent, pos.clone().add(new THREE.Vector3(0, s.glow.dy ?? 0, 0)), s.glow.rTop, s.glow.rBot, s.glow.h, s.glow.shade);
  const swing = s.swing && s.cord ? { anchor: pos.clone().add(new THREE.Vector3(0, s.cord, 0)), len: s.cord, amp: s.swing, cord: cordMesh } : undefined;
  return { id: s.id, light, base: s.intensity, flicker: s.flicker ?? 0, tag: s.tag ?? 'lamp', glow, swing, landmark: !!s.landmark };
}

/** Shared point-light shadow settings (lamps and the low-quality shadow proxy). */
export function configureShadow(l: THREE.PointLight) {
  l.castShadow = true;
  l.shadow.mapSize.set(Q.shadowMap, Q.shadowMap);
  l.shadow.bias = -0.0015;
  l.shadow.normalBias = 0.03;
  l.shadow.camera.near = 0.05;
}
