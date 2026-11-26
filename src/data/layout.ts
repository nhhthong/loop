import * as THREE from 'three';

/**
 * LAYOUT (meters, Y up, top view; −z is "up" on the owner's floor plan). Walkway width 2 m, ceilings 3 m,
 * except the double-height void (atrium + stairwell + upper gallery, 6 m) where the ceiling fan hangs.
 *
 *                                [exit: double wooden doors]   z=-9.6
 *                                   | R8 |  narrow passage
 *  z=-6.6 ┌── R6 alcove ──┐            |    |
 *         │ (rug, chair)  │ clock [win] credenza |
 *  z=-5.5 W┌──────────── R2 ───────────┬──── RA atrium (6 m) ───┬──── RE east hall ────┐
 *         W│                            │   fan                   │                [door 9 → store]
 *  z=-3.5 │R1├──── RB bath ────┐ ┌ RS stairs ┐┌ RN nook ┐      └──────────────────────┘
 *         │  │   (dark, ajar)   │ │flight 1 +z││coat rack│
 *         │  │                  │ │  landing ─┼─ RF2 flight 2 (+x) ─ RU upper landing (y 3.25, dark doorway)
 *         │  └─────────────────┘ └───────────┘└─────────┘
 *  z=3    └──[door]──┘  x=-1..1   (entrance leg R1 is 6.5 m long)
 *              |  |  concrete corridor (1.1 m wide, 2.4 m high)
 *  z=9         +--+  ← player wakes here
 */
export const CORRIDOR = { x0: -0.55, x1: 0.55, z0: 3.12, z1: 9.0, h: 2.4 };
export const ROOM_H = 3.0;
export const DIV_Z = 3; // dividing wall center (door wall between corridor and house)
export const DOOR = { x0: -0.45, x1: 0.45, h: 2.1 };
export const WALL_T = 0.12; // auto walls sit outside their room, interior face on the room edge

export interface Room { name: string; x0: number; x1: number; z0: number; z1: number; y0: number; h: number; dark?: boolean; skip?: ('n' | 's' | 'e' | 'w')[] }
export const ROOMS: Room[] = [
  { name: 'R1', x0: -1, x1: 1, z0: -3.5, z1: DIV_Z, y0: 0, h: 3, skip: ['s'] },
  { name: 'R2', x0: -1, x1: 3.4, z0: -5.5, z1: -3.5, y0: 0, h: 3 },
  { name: 'R6', x0: -1, x1: 1.6, z0: -6.6, z1: -5.5, y0: 0, h: 3 },
  { name: 'RA', x0: 3.4, x1: 7.2, z0: -5.5, z1: -3.5, y0: 0, h: 6 },
  { name: 'R8', x0: 5.6, x1: 6.8, z0: -9.6, z1: -5.5, y0: 0, h: 3 },
  { name: 'RE', x0: 7.2, x1: 10, z0: -5.5, z1: -3.5, y0: 0, h: 3 },
  { name: 'RB', x0: 1.24, x1: 3.16, z0: -3.26, z1: -1.2, y0: 0, h: 2.6, dark: true },
  { name: 'RS', x0: 3.4, x1: 4.6, z0: -3.5, z1: 0.4, y0: 0, h: 6 },
  { name: 'RN', x0: 4.6, x1: 6.4, z0: -3.5, z1: -1.24, y0: 0, h: 3 }, // open to flight 1's east side
  { name: 'RF2', x0: 4.6, x1: 6.76, z0: -1.0, z1: 0.4, y0: 1.625, h: 6 }, // second flight (between walls), floor = mid landing
  { name: 'RU', x0: 6.76, x1: 7.6, z0: -1.0, z1: 0.4, y0: 3.25, h: 6 },   // dark upper landing
];
/** L-shaped stair: flight 1 rises +z in RS to a mid landing, turns 90°, flight 2 rises +x in RF2 to the upper floor. */
export const STAIRS = { x0: 3.4, x1: 4.6, z1Start: -3.25, landingZ: -1.09, x2Start: 4.6, upperX: 6.76, z2: [-1.0, 0.4] as [number, number], riser: 3.25 / 18, tread: 0.27, perFlight: 8 };
export const FAN = new THREE.Vector3(5.1, 6, -4.5);

/** Openings: `along` = axis the wall runs along, `at` = wall line (matches walls within 0.3 m). */
export interface Opening { along: 'x' | 'z'; at: number; a0: number; a1: number; y0: number; y1: number }
export const BATH_DOOR: Opening = { along: 'x', at: -3.38, a0: 1.5, a1: 2.25, y0: 0, y1: 2.05 };
export const EXIT_DOOR: Opening = { along: 'x', at: -9.6, a0: 5.65, a1: 6.75, y0: 0, y1: 2.4 };
export const STORE_DOOR: Opening = { along: 'z', at: 10, a0: -4.95, a1: -4.05, y0: 0, y1: 2.1 };
export const WIN_A: Opening = { along: 'z', at: -1, a0: -5.0, a1: -4.0, y0: 0.95, y1: 2.55 };
export const WIN_B: Opening = { along: 'z', at: -1, a0: -6.35, a1: -5.65, y0: 0.95, y1: 2.55 };
/** window in the flat north wall between the grandfather clock and the credenza */
export const WIN_C: Opening = { along: 'x', at: -5.5, a0: 2.45, a1: 3.15, y0: 0.95, y1: 2.55 };
/** dark doorway off the upper landing (opens onto black) */
export const UPPER_DOOR: Opening = { along: 'z', at: 7.6, a0: -0.75, a1: 0.15, y0: 3.25, y1: 5.35 };
export const OPENINGS = [BATH_DOOR, EXIT_DOOR, STORE_DOOR, WIN_A, WIN_B, WIN_C, UPPER_DOOR];
/** openings that get a door frame / trim gap */
export const DOOR_OPENINGS = [BATH_DOOR, EXIT_DOOR, STORE_DOOR, UPPER_DOOR];

/** Player wake-up spot (feet), near the corridor's dead end. */
export const PLAYER_START = new THREE.Vector3(0.05, 0, CORRIDOR.z0 + 5.33);

export type Surface = 'concrete' | 'wood';
/** Floor material under a point (footsteps): the corridor is concrete, the house is wood. */
export const surfaceAt = (p: THREE.Vector3): Surface => (p.z > DIV_Z + 0.05 ? 'concrete' : 'wood');
