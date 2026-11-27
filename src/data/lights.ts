import { CORRIDOR, FAN, STAIRWELL } from './layout';

export type LampTag = 'corridor' | 'leak' | 'lamp';
type V3 = [number, number, number];

/** Visible light source drawn at the lamp: a hot bulb sphere, or a lit fabric shade (cylinder shell + bulb). */
export type GlowSpec = { bulb: number; r?: number } | { shade: number; rTop: number; rBot: number; h: number; dy?: number };

/**
 * Point lights (warm, cosy pools with dark gaps; atrium/stairs/gallery stay mostly unlit).
 * Order matters: the flicker phase is seeded by the index.
 */
export interface LightSpec {
  id: string;
  color: number;
  intensity: number;
  dist: number;
  shadow: boolean;
  flicker?: number;
  tag?: LampTag;
  /** world position (fallback when `onProp` is missing) */
  pos: V3;
  /** snap to the top-centre of this prop's bounds, `dy` below its top */
  onProp?: [name: string, dy: number];
  /** only built if this prop/fixture exists */
  requires?: string;
  glow?: GlowSpec;
  /** black cord hanging from the ceiling (length, m) */
  cord?: number;
  /** pendulum swing amplitude (rad) on the cord */
  swing?: number;
  /** seen from far away (end of a hall, a stairwell): the mobile light pool treats it as 4× closer */
  landmark?: boolean;
}

const WARM_SHADE = 0xffd09a, WARM_BULB = 0xffe0b8;
const SCONCE: GlowSpec = { bulb: 0xfff0d8, r: 0.02 };
const TABLE_SHADE: GlowSpec = { shade: 0xffc27a, rTop: 0.11, rBot: 0.17, h: 0.22, dy: 0.02 };

export const LIGHTS: LightSpec[] = [
  { id: 'sconceE', color: WARM_BULB, intensity: 5, dist: 7, shadow: true, flicker: 0.02, pos: [-0.8, 2.25, 1.6], onProp: ['sconceE', 0.07], glow: SCONCE },
  { id: 'sconceP', color: WARM_BULB, intensity: 6, dist: 7, shadow: true, flicker: 0.02, pos: [0.8, 2.25, -1.75], onProp: ['sconceP', 0.07], glow: SCONCE },
  { id: 'floorLamp', color: WARM_SHADE, intensity: 5, dist: 6, shadow: true, flicker: 0.04, pos: [1.22, 1.5, -6.35], onProp: ['floorLamp', 0.14], glow: { shade: 0xffb062, rTop: 0.08, rBot: 0.15, h: 0.2 } },
  { id: 'lampL', color: WARM_SHADE, intensity: 4, dist: 6, shadow: true, flicker: 0.01, pos: [3.97, 1.15, -5.32], onProp: ['lampL', 0.16], glow: TABLE_SHADE },
  { id: 'lampR', color: WARM_SHADE, intensity: 3, dist: 5, shadow: false, flicker: 0.01, pos: [5.03, 1.15, -5.32], onProp: ['lampR', 0.16], glow: TABLE_SHADE },
  { id: 'sconce8a', color: WARM_BULB, intensity: 5, dist: 6, shadow: true, flicker: 0.02, pos: [5.8, 2.2, -7.0], onProp: ['sconce8a', 0.07], glow: SCONCE },
  { id: 'sconce8b', color: WARM_BULB, intensity: 4, dist: 6, shadow: false, flicker: 0.25, pos: [6.6, 2.2, -8.4], onProp: ['sconce8b', 0.07], glow: SCONCE },
  // faint night light on the upper landing (out of sight from the atrium): silhouettes treads and balusters, the void stays dark
  { id: 'nightLight', color: WARM_SHADE, intensity: 0.8, dist: 4, shadow: false, flicker: 0.05, pos: [7.25, 3.6, -0.3], glow: { bulb: 0xffd8a8, r: 0.015 } },
  // corridor caged bulb (unstable) and the light leaking under the closed basement door
  { id: 'corridorBulb', color: 0xffdca8, intensity: 30, dist: 7, shadow: true, flicker: 0.6, tag: 'corridor', pos: [0, CORRIDOR.h - 0.28, CORRIDOR.z0 + 4.63], glow: { bulb: 0xfff0c8 } },
  { id: 'doorLeak', color: 0xffa860, intensity: 0.35, dist: 1.6, shadow: false, tag: 'leak', pos: [0, 0.04, CORRIDOR.z0 + 0.13] },
  // bare bulb near door 9 at the far end of the east hall (dim, unsteady)
  { id: 'eastBulb', color: WARM_BULB, intensity: 5, dist: 7, shadow: true, flicker: 0.3, pos: [9.2, 2.55, -4.5], glow: { bulb: 0xfff2dc, r: 0.03 }, cord: 0.45, landmark: true },
  // small bare bulb swaying on its cord over the wet stair behind door 9
  { id: 'stairBulb', color: 0xffdcae, intensity: 6, dist: 6.5, shadow: true, flicker: 0.08, pos: [12.7, 1.1, (STAIRWELL.z0 + STAIRWELL.z1) / 2], glow: { bulb: 0xfff0d0, r: 0.022 }, cord: 0.3, swing: 0.09, landmark: true },
  // the ceiling fan's own light kit, dimmed (just under the fan body: FAN − 0.9 m downrod − 0.32 m)
  { id: 'fanLight', color: WARM_BULB, intensity: 2, dist: 6, shadow: true, flicker: 0.06, pos: [FAN.x, FAN.y - 1.22, FAN.z], requires: 'ceilingFan', glow: { bulb: 0xfff0d8, r: 0.025 } },
];
