import * as THREE from 'three';
import type { Physics } from '../engine/Physics';
import type { Assets } from '../engine/Assets';
import { worldBox, pbrMaterial, makeWet, makeGrime, stainTexture, decal } from './Materials';

/**
 * LAYOUT (meters, Y up, top view; −z is "up" on the owner's floor plan). Walkway width 2 m, ceilings 3 m,
 * except the double-height void (atrium + stairwell + upper gallery, 6 m) where the ceiling fan hangs.
 *
 *                                [exit: double wooden doors]   z=-9.6
 *                                   | R8 |  narrow passage
 *  z=-6.6 ┌── R6 alcove ──┐┌R3┐  ┌─Rs─┐|    |
 *         │ (rug, chair)  │└──┘  └────┘|    |
 *  z=-5.5 W┌──────────── R2 ───────────┬──── RA atrium (6 m) ───┬──── RE east hall ────┐
 *         W│                            │   fan                   │                [door 9 → store]
 *  z=-3.5 │R1├──── RB bath ────┐ ┌ RS stairs ┐┌ RN nook ┐      └──────────────────────┘
 *         │  │   (dark, ajar)   │ │ (rise +z) ││coat rack│  RG gallery above RN/RS top (floor y=3)
 *         │  └─────────────────┘ └───────────┘└─────────┘
 *  z=3    └──[door]──┘  x=-1..1   (entrance leg R1 is 6.5 m long)
 *              |  |  concrete corridor (1.1 m wide, 2.4 m high)
 *  z=9         +--+  ← player wakes here
 */
export const CORRIDOR = { x0: -0.55, x1: 0.55, z0: 3.12, z1: 9.0, h: 2.4 };
export const ROOM_H = 3.0;
export const DIV_Z = 3; // dividing wall center (door wall between corridor and house)
export const DOOR = { x0: -0.45, x1: 0.45, h: 2.1 };
const WALL_T = 0.12; // auto walls sit outside their room, interior face on the room edge

export interface Room { name: string; x0: number; x1: number; z0: number; z1: number; y0: number; h: number; dark?: boolean; skip?: ('n' | 's' | 'e' | 'w')[] }
export const ROOMS: Room[] = [
  { name: 'R1', x0: -1, x1: 1, z0: -3.5, z1: DIV_Z, y0: 0, h: 3, skip: ['s'] },
  { name: 'R2', x0: -1, x1: 3.4, z0: -5.5, z1: -3.5, y0: 0, h: 3 },
  { name: 'R6', x0: -1, x1: 1.6, z0: -6.6, z1: -5.5, y0: 0, h: 3 },
  { name: 'R3', x0: 1.9, x1: 2.9, z0: -6.05, z1: -5.5, y0: 0, h: 3 },
  { name: 'Rs', x0: 3.7, x1: 5.3, z0: -6.05, z1: -5.5, y0: 0, h: 3 },
  { name: 'RA', x0: 3.4, x1: 7.2, z0: -5.5, z1: -3.5, y0: 0, h: 6 },
  { name: 'R8', x0: 5.6, x1: 6.8, z0: -9.6, z1: -5.5, y0: 0, h: 3 },
  { name: 'RE', x0: 7.2, x1: 10, z0: -5.5, z1: -3.5, y0: 0, h: 3 },
  { name: 'RB', x0: 1.24, x1: 3.16, z0: -3.26, z1: -1.2, y0: 0, h: 2.6, dark: true },
  { name: 'RS', x0: 3.4, x1: 4.6, z0: -3.5, z1: 0.4, y0: 0, h: 6 },
  { name: 'RN', x0: 4.6, x1: 6.4, z0: -3.5, z1: -1.0, y0: 0, h: 3 }, // open to the stair's east side
  { name: 'RG', x0: 4.6, x1: 6.4, z0: -3.5, z1: 0.4, y0: 3, h: 6 },
];
export const STAIRS = { x0: 3.4, x1: 4.6, zBottom: -3.5, zTop: -0.2, rise: 3, steps: 16 };
export const FAN = new THREE.Vector3(5.1, 6, -4.5);

/** Openings: `along` = axis the wall runs along, `at` = wall line (matches walls within 0.3 m). */
export interface Opening { along: 'x' | 'z'; at: number; a0: number; a1: number; y0: number; y1: number }
export const BATH_DOOR: Opening = { along: 'x', at: -3.38, a0: 1.5, a1: 2.25, y0: 0, y1: 2.05 };
export const EXIT_DOOR: Opening = { along: 'x', at: -9.6, a0: 5.65, a1: 6.75, y0: 0, y1: 2.4 };
export const STORE_DOOR: Opening = { along: 'z', at: 10, a0: -4.95, a1: -4.05, y0: 0, y1: 2.1 };
export const WIN_A: Opening = { along: 'z', at: -1, a0: -5.0, a1: -4.0, y0: 0.95, y1: 2.55 };
export const WIN_B: Opening = { along: 'z', at: -1, a0: -6.35, a1: -5.65, y0: 0.95, y1: 2.55 };
const OPENINGS = [BATH_DOOR, EXIT_DOOR, STORE_DOOR, WIN_A, WIN_B];
const DOORS = [BATH_DOOR, EXIT_DOOR, STORE_DOOR];

interface Hole { a0: number; a1: number; y0: number; y1: number }
type Mat = THREE.Material;

export interface LevelMats {
  concreteWall: THREE.MeshStandardMaterial; concreteFloor: THREE.MeshStandardMaterial; concreteCeil: THREE.MeshStandardMaterial;
  wallPaint: THREE.MeshStandardMaterial; woodFloor: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial; trim: THREE.MeshStandardMaterial; blackMetal: THREE.MeshStandardMaterial;
}

export class Level {
  readonly group = new THREE.Group();
  mats!: LevelMats;
  /** meshes that belong to corridor vs room (for env-map assignment) */
  readonly corridorMeshes: THREE.Mesh[] = [];
  readonly roomMeshes: THREE.Mesh[] = [];

  constructor(private readonly physics: Physics, private readonly assets: Assets) {}

  async build() {
    const A = this.assets;
    const [concreteWall, concreteFloor, concreteCeil, woodFloor, plaster] = await Promise.all([
      pbrMaterial(A, 'concrete_wall_005', { tint: 0x9a968e }), // dark basement concrete with rust bleed
      pbrMaterial(A, 'damaged_concrete_floor', { tint: 0x6e6a63 }),
      pbrMaterial(A, 'concrete_wall_003', { tint: 0x5e5b55 }),
      pbrMaterial(A, 'wood_floor', { tint: 0x7d6a58, envIntensity: 1.0 }),
      pbrMaterial(A, 'plastered_wall', { tint: 0xe6e1d8 }),
    ]);
    makeWet(concreteWall, 'wall', 1);
    makeWet(concreteFloor, 'floor', 1);
    // wetness reads through reflections: give the corridor surfaces a strong reflection response
    concreteWall.envMapIntensity = 1.6;
    concreteFloor.envMapIntensity = 1.1;
    makeWet(concreteCeil, 'ceiling', 0.8);
    woodFloor.roughness = 0.32; // polished: catches the lamps as long streaks
    // aged ivory plaster walls with visible trowel texture and light grime
    const wallPaint = makeGrime(plaster.clone(), 1);
    wallPaint.color.set(0xd6cfbf);
    wallPaint.normalScale.set(0.7, 0.7);
    // off-white painted trim (baseboards, crown, casings, sills, doors)
    const trim = new THREE.MeshStandardMaterial({ color: 0xd9d3c6, roughness: 0.45, normalMap: plaster.normalMap, normalScale: new THREE.Vector2(0.15, 0.15) });
    const blackMetal = new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0.5, roughness: 0.5 });
    this.mats = { concreteWall, concreteFloor, concreteCeil, wallPaint, woodFloor, plaster, trim, blackMetal };

    this.buildCorridor();
    this.buildRoom();
    this.buildStains();
    return this;
  }

  // ---------------------------------------------------------------- helpers
  private box(w: number, h: number, d: number, mat: Mat | Mat[], pos: THREE.Vector3, tile: number, zone: 'c' | 'r', collide = true) {
    const m = new THREE.Mesh(worldBox(w, h, d, tile), mat);
    m.position.copy(pos);
    m.castShadow = true;
    m.receiveShadow = true;
    this.group.add(m);
    (zone === 'c' ? this.corridorMeshes : this.roomMeshes).push(m);
    if (collide) this.physics.addBox(pos, new THREE.Vector3(w / 2, h / 2, d / 2));
    return m;
  }

  /**
   * Wall slab with rectangular holes. `along` = axis the wall runs along.
   * Materials: [ +x, -x, +y, -y, +z, -z ] per BoxGeometry convention.
   */
  private wall(along: 'x' | 'z', fixed: number, a0: number, a1: number, h: number, t: number, mats: Mat[], holes: Hole[], tile: number, zone: 'c' | 'r', y0 = 0) {
    const cuts = [a0, a1];
    holes.forEach((ho) => cuts.push(ho.a0, ho.a1));
    // only cut points inside this wall's span (holes elsewhere on the same line must not create extra segments)
    for (let i = cuts.length - 1; i >= 0; i--) if (cuts[i] < a0 || cuts[i] > a1) cuts.splice(i, 1);
    const xs = [...new Set(cuts)].sort((p, q) => p - q);
    for (let i = 0; i < xs.length - 1; i++) {
      const s0 = xs[i], s1 = xs[i + 1];
      const mid = (s0 + s1) / 2;
      const hole = holes.find((ho) => mid > ho.a0 && mid < ho.a1);
      const spans: [number, number][] = hole ? [[y0, hole.y0], [hole.y1, y0 + h]] : [[y0, y0 + h]];
      for (const [b, tp] of spans) {
        if (tp - b < 0.001) continue;
        const len = s1 - s0, hh = tp - b;
        const pos = along === 'x' ? new THREE.Vector3(mid, (b + tp) / 2, fixed) : new THREE.Vector3(fixed, (b + tp) / 2, mid);
        const [w, d] = along === 'x' ? [len, t] : [t, len];
        this.box(w, hh, d, mats, pos, tile, zone);
      }
    }
  }

  /** Floor/ceiling slab from a 2D polygon with world-space UVs (seamless across the L). */
  private slab(points: [number, number][], y: number, mat: Mat, tile: number, facingUp: boolean) {
    const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2); // shape y → -z
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / tile, pos.getZ(i) / tile);
    g.setAttribute('uv1', uv.clone());
    // ceilings: render the underside (BackSide flips the normal for lighting)
    const m = new THREE.Mesh(g, facingUp ? mat : Object.assign(mat.clone(), { side: THREE.BackSide }));
    m.position.y = y;
    m.receiveShadow = true;
    m.castShadow = !facingUp;
    this.group.add(m);
    return m;
  }

  // ---------------------------------------------------------------- corridor
  private buildCorridor() {
    const { concreteWall: cw, concreteFloor: cf, concreteCeil: cc } = this.mats;
    const C = CORRIDOR, t = 0.2;
    const len = C.z1 - C.z0 + 0.4, zc = (C.z0 + C.z1) / 2;
    // floor & ceiling
    this.box(C.x1 - C.x0 + 0.4, 0.2, len, cf, new THREE.Vector3(0, -0.1, zc), 1.6, 'c');
    this.box(C.x1 - C.x0 + 0.4, 0.2, len, cc, new THREE.Vector3(0, C.h + 0.1, zc), 1.6, 'c');
    // side walls
    this.wall('z', C.x0 - t / 2, C.z0 - 0.1, C.z1 + 0.2, C.h, t, [cw, cw, cw, cw, cw, cw], [], 1.8, 'c');
    this.wall('z', C.x1 + t / 2, C.z0 - 0.1, C.z1 + 0.2, C.h, t, [cw, cw, cw, cw, cw, cw], [], 1.8, 'c');
    // end wall
    this.wall('x', C.z1 + t / 2, C.x0 - t, C.x1 + t, C.h, t, [cw, cw, cw, cw, cw, cw], [], 1.8, 'c');
    // dark water channel/rust line at floor-wall junction
    const grime = new THREE.MeshStandardMaterial({ color: 0x1b1712, roughness: 0.25, transparent: true, opacity: 0.7 });
    for (const x of [C.x0 + 0.03, C.x1 - 0.03]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, C.z1 - C.z0), grime);
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.002, zc);
      this.group.add(m);
    }
  }

  // ---------------------------------------------------------------- house
  private buildRoom() {
    const M = this.mats;
    const dark = new THREE.MeshStandardMaterial({ color: 0x0c0c0b, roughness: 0.35, normalMap: M.plaster.normalMap });
    const darkFloor = new THREE.MeshStandardMaterial({ color: 0x080807, roughness: 0.4 });
    for (const r of ROOMS) {
      const poly: [number, number][] = [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]];
      this.roomMeshes.push(this.slab(poly, r.y0, r.dark ? darkFloor : M.woodFloor, 1.6, true));
      this.roomMeshes.push(this.slab(poly, r.h, r.dark ? dark : M.plaster, 1.8, false));
      this.physics.addBox(new THREE.Vector3((r.x0 + r.x1) / 2, r.y0 - 0.05, (r.z0 + r.z1) / 2), new THREE.Vector3((r.x1 - r.x0) / 2, 0.05, (r.z1 - r.z0) / 2));
      for (const e of ['n', 's', 'w', 'e'] as const) if (!r.skip?.includes(e)) this.roomEdge(r, e, r.dark ? dark : M.wallPaint);
    }
    // dividing wall between corridor and house: +z face = corridor concrete, −z face = paint
    const pl = M.plaster, cc = M.concreteWall, wp = M.wallPaint;
    this.wall('x', DIV_Z, -1.12, 1.12, ROOM_H, 0.24, [pl, pl, pl, pl, cc, wp], [{ a0: DOOR.x0, a1: DOOR.x1, y0: 0, y1: DOOR.h }], 1.6, 'r');
    this.trims([-1, DIV_Z - 0.12], [1, DIV_Z - 0.12], [0, -1], [[DOOR.x0 + 1 - 0.09, DOOR.x1 + 1 + 0.09]], 0, ROOM_H, true, true);
    this.buildDoorFrame('x', DIV_Z, DOOR.x0, DOOR.x1, DOOR.h, 0.24);
    this.buildDoorFrame('x', BATH_DOOR.at, BATH_DOOR.a0, BATH_DOOR.a1, BATH_DOOR.y1, 0.24);
    this.buildDoorFrame('x', EXIT_DOOR.at - WALL_T / 2, EXIT_DOOR.a0, EXIT_DOOR.a1, EXIT_DOOR.y1, WALL_T);
    this.buildDoorFrame('z', STORE_DOOR.at + WALL_T / 2, STORE_DOOR.a0, STORE_DOOR.a1, STORE_DOOR.y1, WALL_T);
    // nothing exists beyond the exit and the store door
    const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.box(EXIT_DOOR.a1 - EXIT_DOOR.a0 + 0.3, EXIT_DOOR.y1 + 0.2, 0.05, black, new THREE.Vector3((EXIT_DOOR.a0 + EXIT_DOOR.a1) / 2, EXIT_DOOR.y1 / 2, EXIT_DOOR.at - WALL_T - 0.05), 1, 'r');
    this.box(0.05, STORE_DOOR.y1 + 0.2, STORE_DOOR.a1 - STORE_DOOR.a0 + 0.3, black, new THREE.Vector3(STORE_DOOR.at + WALL_T + 0.05, STORE_DOOR.y1 / 2, (STORE_DOOR.a0 + STORE_DOOR.a1) / 2), 1, 'r');
    for (const w of [WIN_A, WIN_B]) this.buildWindowFrame(w);
    this.buildStairs();
  }

  /** Walls for one room edge: only where no neighbouring room space continues across the line (incl. height differences). */
  private roomEdge(r: Room, e: 'n' | 's' | 'w' | 'e', mat: Mat) {
    const along: 'x' | 'z' = e === 'n' || e === 's' ? 'x' : 'z';
    const line = e === 'n' ? r.z0 : e === 's' ? r.z1 : e === 'w' ? r.x0 : r.x1;
    const out = e === 'n' || e === 'w' ? -1 : 1; // outward direction along the fixed axis
    const [a0, a1] = along === 'x' ? [r.x0, r.x1] : [r.z0, r.z1];
    const nbrs = ROOMS.filter((q) => q !== r && Math.abs((e === 'n' ? q.z1 : e === 's' ? q.z0 : e === 'w' ? q.x1 : q.x0) - line) < 0.01)
      .map((q) => ({ q, b0: Math.max(a0, along === 'x' ? q.x0 : q.z0), b1: Math.min(a1, along === 'x' ? q.x1 : q.z1) }))
      .filter((n) => n.b1 - n.b0 > 0.01);
    const cuts = [...new Set([a0, a1, ...nbrs.flatMap((n) => [n.b0, n.b1])])].sort((p, q) => p - q);
    const holes = OPENINGS.filter((o) => o.along === along && Math.abs(o.at - line) < 0.3).map((o) => ({ a0: o.a0, a1: o.a1, y0: o.y0, y1: o.y1 }));
    const doorGaps = DOORS.filter((o) => o.along === along && Math.abs(o.at - line) < 0.3);
    for (let i = 0; i < cuts.length - 1; i++) {
      const s0 = cuts[i], s1 = cuts[i + 1], mid = (s0 + s1) / 2;
      // vertical spans of this room not covered by neighbours across the line
      let spans: [number, number][] = [[r.y0, r.h]];
      for (const n of nbrs) if (mid > n.b0 && mid < n.b1) spans = spans.flatMap(([y0, y1]) => {
        const res: [number, number][] = [];
        if (n.q.y0 > y0) res.push([y0, Math.min(y1, n.q.y0)]);
        if (n.q.h < y1) res.push([Math.max(y0, n.q.h), y1]);
        return res.filter(([p, q]) => q - p > 0.01);
      });
      // close outside corners at true room corners only
      const e0 = s0 === a0 ? s0 - WALL_T : s0, e1 = s1 === a1 ? s1 + WALL_T : s1;
      for (const [y0, y1] of spans) {
        this.wall(along, line + out * WALL_T / 2, e0, e1, y1 - y0, WALL_T, [mat, mat, mat, mat, mat, mat], holes, 1.6, 'r', y0);
        if (r.dark) continue;
        const n: [number, number] = along === 'x' ? [0, -out] : [-out, 0];
        const p0: [number, number] = along === 'x' ? [s0, line] : [line, s0];
        const p1: [number, number] = along === 'x' ? [s1, line] : [line, s1];
        const gaps = doorGaps.filter((d) => d.a1 > s0 && d.a0 < s1).map((d) => [d.a0 - s0 - 0.09, d.a1 - s0 + 0.09] as [number, number]);
        this.trims(p0, p1, n, gaps, y0, y1, y0 === r.y0, y1 === r.h);
      }
    }
  }

  /** Baseboard (gaps at doors) and/or crown molding along an interior face. */
  private trims(p0: [number, number], p1: [number, number], n: [number, number], gaps: [number, number][], floorY: number, topY: number, base: boolean, crown: boolean) {
    const M = this.mats;
    const dx = p1[0] - p0[0], dz = p1[1] - p0[1];
    const len = Math.hypot(dx, dz);
    const dir = new THREE.Vector2(dx / len, dz / len);
    const segs: [number, number][] = [];
    let cur = 0;
    for (const [g0, g1] of [...gaps].sort((a, b) => a[0] - b[0])) { if (g0 > cur) segs.push([cur, g0]); cur = Math.max(cur, g1); }
    if (cur < len) segs.push([cur, len]);
    const along = Math.abs(dir.x) > 0.5 ? 'x' : 'z';
    const put = (s0: number, s1: number, y0: number, y1: number, depth: number, tile: number) => {
      const l = s1 - s0, mid = (s0 + s1) / 2;
      const cx = p0[0] + dir.x * mid + n[0] * depth / 2;
      const cz = p0[1] + dir.y * mid + n[1] * depth / 2;
      const [w, d] = along === 'x' ? [l, depth] : [depth, l];
      const m = new THREE.Mesh(worldBox(w, y1 - y0, d, tile), M.trim);
      m.position.set(cx, (y0 + y1) / 2, cz);
      m.castShadow = true; m.receiveShadow = true;
      this.group.add(m); this.roomMeshes.push(m);
    };
    if (base) for (const [s0, s1] of segs) {
      put(s0, s1, floorY, floorY + 0.17, 0.018, 0.5);
      put(s0, s1, floorY + 0.15, floorY + 0.17, 0.028, 0.5);
      put(s0, s1, floorY, floorY + 0.025, 0.026, 0.5);
    }
    if (crown) {
      put(0, len, topY - 0.2, topY, 0.02, 0.6);
      put(0, len, topY - 0.13, topY, 0.05, 0.6);
      put(0, len, topY - 0.07, topY, 0.09, 0.6);
      put(0, len, topY - 0.03, topY, 0.13, 0.6);
    }
  }

  /** Casings on both faces, jamb linings and threshold for an opening in a wall of thickness `t`. */
  private buildDoorFrame(along: 'x' | 'z', fixed: number, a0: number, a1: number, h: number, t: number) {
    const M = this.mats;
    const w = 0.09, d = 0.03, mid = (a0 + a1) / 2, span = a1 - a0;
    const add = (alongLen: number, hh: number, depth: number, a: number, y: number, off: number) => {
      const [sx, sz] = along === 'x' ? [alongLen, depth] : [depth, alongLen];
      const m = new THREE.Mesh(worldBox(sx, hh, sz, 0.6), M.trim);
      m.position.set(along === 'x' ? a : fixed + off, y, along === 'x' ? fixed + off : a);
      m.castShadow = m.receiveShadow = true;
      this.group.add(m); this.roomMeshes.push(m);
    };
    for (const side of [-1, 1]) {
      const off = side * (t / 2 + d / 2);
      add(w, h + w, d, a0 - w / 2, (h + w) / 2, off);
      add(w, h + w, d, a1 + w / 2, (h + w) / 2, off);
      add(span + w * 2 + 0.04, w + 0.02, d + 0.01, mid, h + w / 2 + 0.01, off);
    }
    add(0.02, h, t, a0 + 0.01, h / 2, 0);
    add(0.02, h, t, a1 - 0.01, h / 2, 0);
    add(span, 0.02, t, mid, h - 0.01, 0);
    add(span + 0.1, 0.02, t + 0.06, mid, 0.01, 0);
  }

  /** Painted 6-over-6 sash window in a west (x = const) wall, built in a local frame (wall plane z=0, room +z). */
  private buildWindowFrame(o: Opening) {
    const M = this.mats;
    const g = new THREE.Group();
    g.position.set(o.at, 0, (o.a0 + o.a1) / 2);
    g.rotation.y = Math.PI / 2; // local +z (room side) → world +x
    const w = o.a1 - o.a0, x0 = -w / 2, x1 = w / 2, y0 = o.y0, y1 = o.y1, z = 0;
    const add = (ww: number, hh: number, dd: number, x: number, y: number, zz: number, mat: Mat = M.trim) => {
      const m = new THREE.Mesh(worldBox(ww, hh, dd, 0.5), mat);
      m.position.set(x, y, zz); m.castShadow = true; m.receiveShadow = true; g.add(m); this.roomMeshes.push(m);
    };
    add(0.09, y1 - y0 + 0.18, 0.025, x0 - 0.045, (y0 + y1) / 2 + 0.045, z + 0.012);
    add(0.09, y1 - y0 + 0.18, 0.025, x1 + 0.045, (y0 + y1) / 2 + 0.045, z + 0.012);
    add(w + 0.26, 0.1, 0.03, 0, y1 + 0.06, z + 0.015);
    add(w + 0.3, 0.035, 0.16, 0, y0 - 0.017, z + 0.03);
    add(w + 0.18, 0.08, 0.022, 0, y0 - 0.075, z + 0.011);
    add(0.02, y1 - y0, WALL_T, x0 + 0.01, (y0 + y1) / 2, z - WALL_T / 2, M.wallPaint);
    add(0.02, y1 - y0, WALL_T, x1 - 0.01, (y0 + y1) / 2, z - WALL_T / 2, M.wallPaint);
    add(w, 0.02, WALL_T, 0, y1 - 0.01, z - WALL_T / 2, M.wallPaint);
    const sz = z - 0.07, fd = 0.04;
    add(w - 0.04, 0.055, fd, 0, y0 + 0.028, sz); add(w - 0.04, 0.055, fd, 0, y1 - 0.028, sz);
    add(0.055, y1 - y0, fd, x0 + 0.048, (y0 + y1) / 2, sz); add(0.055, y1 - y0, fd, x1 - 0.048, (y0 + y1) / 2, sz);
    add(w - 0.04, 0.045, fd + 0.02, 0, (y0 + y1) / 2, sz);
    for (const fx of [1 / 3, 2 / 3]) add(0.018, y1 - y0 - 0.1, 0.03, x0 + w * fx, (y0 + y1) / 2, sz);
    for (const fy of [0.25, 0.75]) add(w - 0.1, 0.018, 0.03, 0, y0 + (y1 - y0) * fy, sz);
    this.group.add(g);
  }

  /** Steep old-house staircase rising +z to a landing at y=3, gallery railing over the atrium, wall handrail. */
  private buildStairs() {
    const M = this.mats, S = STAIRS;
    const run = S.zTop - S.zBottom, n = S.steps, rise = S.rise / n, tread = run / n, w = S.x1 - S.x0, cx = (S.x0 + S.x1) / 2;
    // dark-stained risers (painted ones read as a flat wall from the atrium); treads catch the light on their nosings
    const riser = M.woodFloor.clone();
    riser.color.multiplyScalar(0.6);
    riser.roughness = 0.5;
    for (let i = 0; i < n; i++) {
      const top = (i + 1) * rise, z0 = S.zBottom + i * tread;
      const body = new THREE.Mesh(worldBox(w, top, tread, 0.8), riser);
      body.position.set(cx, top / 2, z0 + tread / 2); body.castShadow = body.receiveShadow = true;
      const t = new THREE.Mesh(worldBox(w + 0.02, 0.035, tread + 0.035, 0.8), M.woodFloor); // tread with nosing
      t.position.set(cx, top + 0.015, z0 + tread / 2 - 0.015); t.castShadow = t.receiveShadow = true;
      this.group.add(body, t); this.roomMeshes.push(body, t);
    }
    // landing (y=3) from the stair top to the back wall, merges with the gallery floor
    const lz0 = S.zTop, lz1 = 0.4;
    const landing = new THREE.Mesh(worldBox(w, S.rise, lz1 - lz0, 0.8), M.trim);
    landing.position.set(cx, S.rise / 2, (lz0 + lz1) / 2); landing.receiveShadow = true;
    this.group.add(landing); this.roomMeshes.push(landing);
    this.roomMeshes.push(this.slab([[S.x0, lz0], [S.x1, lz0], [S.x1, lz1], [S.x0, lz1]], S.rise + 0.001, M.woodFloor, 1.6, true));
    // physics: slope + landing + gallery floor
    const ang = Math.atan2(S.rise, run), slope = Math.hypot(S.rise, run);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -ang);
    const nrm = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    this.physics.addBox(new THREE.Vector3(cx, S.rise / 2, (S.zBottom + S.zTop) / 2).addScaledVector(nrm, -0.05), new THREE.Vector3(w / 2, 0.05, slope / 2), q);
    this.physics.addBox(new THREE.Vector3(cx, S.rise - 0.05, (lz0 + lz1) / 2), new THREE.Vector3(w / 2, 0.05, (lz1 - lz0) / 2));
    // dark-stained joinery: from below the gallery reads only as a dark railing silhouette
    const rail = new THREE.MeshStandardMaterial({ color: 0x2e2018, roughness: 0.4, map: M.woodFloor.map });
    // gallery floor slab edge (fascia) seen from the atrium
    const g = ROOMS.find((r) => r.name === 'RG')!;
    const fascia = new THREE.Mesh(worldBox(g.x1 - g.x0, 0.28, 0.06, 0.6), rail);
    fascia.position.set((g.x0 + g.x1) / 2, g.y0 - 0.14, g.z0 + 0.03); fascia.castShadow = true;
    this.group.add(fascia); this.roomMeshes.push(fascia);
    // balustrade along the gallery edge: square balusters + moulded handrail (dark stained)
    const rz = g.z0 + 0.05, ry = g.y0;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(g.x1 - g.x0, 0.06, 0.08), rail);
    hand.position.set((g.x0 + g.x1) / 2, ry + 0.95, rz); hand.castShadow = true;
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(g.x1 - g.x0, 0.05, 0.07), rail);
    shoe.position.set((g.x0 + g.x1) / 2, ry + 0.025, rz);
    this.group.add(hand, shoe);
    for (let x = g.x0 + 0.08; x < g.x1; x += 0.13) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.9, 0.035), rail);
      b.position.set(x, ry + 0.48, rz); b.castShadow = true; this.group.add(b);
    }
    for (const x of [g.x0 + 0.04, g.x1 - 0.04]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.1, 0.09), rail);
      post.position.set(x, ry + 0.55, rz); post.castShadow = true; this.group.add(post);
    }
    this.physics.addBox(new THREE.Vector3((g.x0 + g.x1) / 2, ry + 0.5, rz), new THREE.Vector3((g.x1 - g.x0) / 2, 0.5, 0.05));
    // open east side: newel post, a baluster per tread and a raked handrail
    const ex = S.x1 - 0.05;
    for (let i = 0; i < n; i++) {
      const top = (i + 1) * rise, zc = S.zBottom + i * tread + tread / 2;
      const bal = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 0.03), rail);
      bal.position.set(ex, top + 0.45, zc); bal.castShadow = true; this.group.add(bal);
    }
    const newel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.15, 0.1), rail);
    newel.position.set(ex, 0.575, S.zBottom + 0.06); newel.castShadow = true; this.group.add(newel);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.13), rail);
    cap.position.set(ex, 1.175, S.zBottom + 0.06); this.group.add(cap);
    const rakeLen = Math.hypot(S.rise, run);
    const rake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, rakeLen), rail);
    rake.position.set(ex, S.rise / 2 + 0.95, (S.zBottom + S.zTop) / 2);
    rake.rotation.x = -ang; rake.castShadow = true; this.group.add(rake);
    this.physics.addBox(new THREE.Vector3(ex, S.rise / 2 + 0.5, (S.zBottom + S.zTop) / 2), new THREE.Vector3(0.03, 0.5, rakeLen / 2), q);

    // wall-mounted handrail along the west side of the stair
    const hr = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, slope, 12), rail);
    hr.position.set(S.x0 + 0.06, S.rise / 2 + 0.9, (S.zBottom + S.zTop) / 2);
    hr.rotation.x = Math.PI / 2 - ang; hr.castShadow = true;
    this.group.add(hr);
  }

  /** Dirt decals in the wet corridor only (the house itself is kept tidy). */
  private buildStains() {
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const add = (kind: 'water' | 'mold' | 'dirt' | 'scuff', pos: THREE.Vector3, rot: THREE.Euler, size: number, op = 1) => {
      const d = decal(stainTexture(Math.floor(rnd() * 1e6) + 1, kind), size, size * (0.7 + rnd() * 0.6), op);
      d.position.copy(pos); d.rotation.copy(rot); d.rotateZ(rnd() * Math.PI * 2);
      this.group.add(d);
    };
    const up = new THREE.Euler(-Math.PI / 2, 0, 0);
    // corridor floor muck
    for (let i = 0; i < 8; i++) add('dirt', new THREE.Vector3(-0.4 + rnd() * 0.8, 0.003, CORRIDOR.z0 + 0.4 + rnd() * 5.2), up, 0.5 + rnd() * 0.6);
  }
}
