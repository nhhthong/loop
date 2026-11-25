import * as THREE from 'three';
import type { Physics } from '../engine/Physics';
import type { Assets } from '../engine/Assets';
import { worldBox, pbrMaterial, makeWet, stainTexture, decal } from './Materials';

/**
 * LAYOUT (meters, Y up, top view):
 *
 *            x=-1       x=1                 x=5
 *   z=-5  +---[winA]--------------[winB]------+
 *         |  corner    |       LEG B       [endDoor]  (locked, never opens)
 *   z=-3  |            +--[bath]-------------+
 *         |  LEG A     |  bathroom (dark,    |
 *         |  (2m wide) |  door ajar)         |
 *   z=-1  |            +---------------------+
 *   z=0   +---[door]---+
 *              |  |
 *              |  |  concrete corridor (1.1m wide, 2.4m high)
 *   z=6        +--+  ← player wakes here
 *
 * Room height 3m.
 */
export const CORRIDOR = { x0: -0.55, x1: 0.55, z0: 0.12, z1: 6.0, h: 2.4 };
export const ROOM_H = 3.0;
export const DIV_Z = 0; // dividing wall center (door wall)
export const DOOR = { x0: -0.45, x1: 0.45, h: 2.1 };
export const WIN_A = { x0: -0.5, x1: 0.5, y0: 0.95, y1: 2.55 };
export const WIN_B = { x0: 2.9, x1: 3.9, y0: 0.95, y1: 2.55 };
/** locked door closing the end of the L (in the x=5 wall, spans z) */
export const END_DOOR = { z0: -4.45, z1: -3.55, h: 2.1 };
/** bathroom door (in the z=−3 wall, spans x), left ajar into a dark room */
export const BATH_DOOR = { x0: 2.0, x1: 2.75, h: 2.05 };
export const BATH = { x0: 1.24, x1: 3.3, z0: -2.76, z1: -1.0, h: 2.6 };

interface Hole { a0: number; a1: number; y0: number; y1: number }
type Mat = THREE.Material;

export interface LevelMats {
  concreteWall: THREE.MeshStandardMaterial; concreteFloor: THREE.MeshStandardMaterial; concreteCeil: THREE.MeshStandardMaterial;
  wallpaper: THREE.MeshStandardMaterial; panel: THREE.MeshStandardMaterial; parquet: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial; trim: THREE.MeshStandardMaterial; paintedWood: THREE.MeshStandardMaterial;
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
    const [concreteWall, concreteFloor, concreteCeil, wallpaper, panel, parquet, plaster] = await Promise.all([
      pbrMaterial(A, 'concrete_wall_006', { tint: 0xb8b4aa }),
      pbrMaterial(A, 'damaged_concrete_floor', { tint: 0x9a958c }),
      pbrMaterial(A, 'concrete_wall_003', { tint: 0x8a877f }),
      pbrMaterial(A, 'decrepit_wallpaper', { tint: 0xd6c9b0 }),
      pbrMaterial(A, 'dark_paneled_wood', { tint: 0x8a6a4c, envIntensity: 0.6 }),
      pbrMaterial(A, 'herringbone_parquet', { tint: 0xc09070, envIntensity: 0.9 }),
      pbrMaterial(A, 'plastered_wall', { tint: 0xd8d0c0 }),
    ]);
    makeWet(concreteWall, 'wall', 1);
    makeWet(concreteFloor, 'floor', 1);
    makeWet(concreteCeil, 'ceiling', 0.8);
    // Parquet: polished but worn — keep roughness map, lower overall
    parquet.roughness = 0.75;
    const trim = panel.clone();
    trim.color.set(0x5a3e28);
    const paintedWood = new THREE.MeshStandardMaterial({ color: 0xcfc6b2, roughness: 0.55, map: plaster.map, normalMap: plaster.normalMap, normalScale: new THREE.Vector2(0.3, 0.3) });
    this.mats = { concreteWall, concreteFloor, concreteCeil, wallpaper, panel, parquet, plaster, trim, paintedWood };

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
    if (!facingUp) { g.scale(1, -1, 1); g.computeVertexNormals(); }
    const m = new THREE.Mesh(g, mat);
    if (!facingUp) (m.material as THREE.Material).side = THREE.FrontSide;
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

  // ---------------------------------------------------------------- room
  private buildRoom() {
    const M = this.mats;
    const t = 0.24, H = ROOM_H;
    const wp = M.wallpaper, pl = M.plaster;
    // floor (L polygon) + physics
    const L: [number, number][] = [[-1, -0.12], [1, -0.12], [1, -3], [5, -3], [5, -5], [-1, -5]];
    this.roomMeshes.push(this.slab(L, 0, M.parquet, 1.4, true));
    const ceil = this.slab(L, H, M.plaster, 1.8, false);
    this.roomMeshes.push(ceil);
    this.physics.addBox(new THREE.Vector3(0, -0.1, -2.6), new THREE.Vector3(1.2, 0.1, 2.6));
    this.physics.addBox(new THREE.Vector3(3, -0.1, -4), new THREE.Vector3(2.2, 0.1, 1.2));
    this.physics.addBox(new THREE.Vector3(2, H + 0.1, -2.6), new THREE.Vector3(3.4, 0.1, 2.8));

    const cc = M.concreteWall;
    // dividing (door) wall: +z face = corridor concrete, -z face = wallpaper
    this.wall('x', DIV_Z, -1.2, 1.2, H, t, [pl, pl, pl, pl, cc, wp], [{ a0: DOOR.x0, a1: DOOR.x1, y0: 0, y1: DOOR.h }], 1.6, 'r');
    // leg A walls
    this.wall('z', -1 - t / 2, -5.2, 0, H, t, [wp, wp, wp, wp, wp, wp], [], 1.6, 'r');
    this.wall('z', 1 + t / 2, -3 + t / 2, 0, H, t, [wp, wp, wp, wp, wp, wp], [], 1.6, 'r');
    // leg B walls
    this.wall('x', -3 + t / 2, 1, 5.2, H, t, [wp, wp, wp, wp, wp, wp], [{ a0: BATH_DOOR.x0, a1: BATH_DOOR.x1, y0: 0, y1: BATH_DOOR.h }], 1.6, 'r');
    this.wall('z', 5 + t / 2, -5.2, -2.8, H, t, [wp, wp, wp, wp, wp, wp], [{ a0: END_DOOR.z0, a1: END_DOOR.z1, y0: 0, y1: END_DOOR.h }], 1.6, 'r');
    // solid backing behind the locked door (nothing exists beyond it)
    this.box(0.1, END_DOOR.h + 0.1, END_DOOR.z1 - END_DOOR.z0 + 0.2, new THREE.MeshBasicMaterial({ color: 0x000000 }), new THREE.Vector3(5.3, END_DOOR.h / 2, (END_DOOR.z0 + END_DOOR.z1) / 2), 1, 'r');
    this.buildBathroom();
    // back wall with two windows
    this.wall('x', -5 - t / 2, -1.2, 5.2, H, t, [wp, wp, pl, pl, pl, wp], [
      { a0: WIN_A.x0, a1: WIN_A.x1, y0: WIN_A.y0, y1: WIN_A.y1 },
      { a0: WIN_B.x0, a1: WIN_B.x1, y0: WIN_B.y0, y1: WIN_B.y1 },
    ], 1.6, 'r');

    // wall trims along each interior face: [start(x,z), end(x,z), inward normal, gaps along the run]
    const faces: { p0: [number, number]; p1: [number, number]; n: [number, number]; gaps: [number, number][]; winGaps?: [number, number][] }[] = [
      { p0: [-1, -0.12], p1: [-1, -5], n: [1, 0], gaps: [] },
      { p0: [1, -0.12], p1: [1, -3], n: [-1, 0], gaps: [] },
      { p0: [1, -3], p1: [5, -3], n: [0, -1], gaps: [[BATH_DOOR.x0 - 1 - 0.09, BATH_DOOR.x1 - 1 + 0.09]] },
      { p0: [5, -3], p1: [5, -5], n: [-1, 0], gaps: [[-3 - END_DOOR.z1 - 0.09, -3 - END_DOOR.z0 + 0.09]] },
      { p0: [-1, -5], p1: [5, -5], n: [0, 1], gaps: [], winGaps: [[WIN_A.x0 + 1, WIN_A.x1 + 1], [WIN_B.x0 + 1, WIN_B.x1 + 1]] },
      { p0: [-1, -0.12], p1: [1, -0.12], n: [0, -1], gaps: [[DOOR.x0 + 1 - 0.09, DOOR.x1 + 1 + 0.09]] },
    ];
    for (const f of faces) this.trimFace(f.p0, f.p1, f.n, f.gaps);

    this.buildDoorFrame('x', DIV_Z, DOOR.x0, DOOR.x1, DOOR.h);
    this.buildDoorFrame('x', -3 + t / 2, BATH_DOOR.x0, BATH_DOOR.x1, BATH_DOOR.h);
    this.buildDoorFrame('z', 5 + t / 2, END_DOOR.z0, END_DOOR.z1, END_DOOR.h);
    this.buildWindowFrame(WIN_A.x0, WIN_A.x1);
    this.buildWindowFrame(WIN_B.x0, WIN_B.x1);
  }

  /** Wainscot panels + chair rail + baseboard + crown molding along an interior face. */
  private trimFace(p0: [number, number], p1: [number, number], n: [number, number], gaps: [number, number][]) {
    const M = this.mats;
    const dx = p1[0] - p0[0], dz = p1[1] - p0[1];
    const len = Math.hypot(dx, dz);
    const dir = new THREE.Vector2(dx / len, dz / len);
    // segments excluding gaps (distance along run)
    const segs: [number, number][] = [];
    let cur = 0;
    for (const [g0, g1] of [...gaps].sort((a, b) => a[0] - b[0])) { if (g0 > cur) segs.push([cur, g0]); cur = g1; }
    if (cur < len) segs.push([cur, len]);
    const along = Math.abs(dir.x) > 0.5 ? 'x' : 'z';
    const put = (s0: number, s1: number, y0: number, y1: number, depth: number, mat: Mat, tile: number) => {
      const l = s1 - s0, mid = (s0 + s1) / 2;
      const cx = p0[0] + dir.x * mid + n[0] * depth / 2;
      const cz = p0[1] + dir.y * mid + n[1] * depth / 2;
      const [w, d] = along === 'x' ? [l, depth] : [depth, l];
      const m = new THREE.Mesh(worldBox(w, y1 - y0, d, tile), mat);
      m.position.set(cx, (y0 + y1) / 2, cz);
      m.castShadow = true; m.receiveShadow = true;
      this.group.add(m); this.roomMeshes.push(m);
    };
    for (const [s0, s1] of segs) {
      put(s0, s1, 0, 0.92, 0.018, M.panel, 1.2);        // wainscot
      put(s0, s1, 0, 0.16, 0.03, M.trim, 0.5);          // baseboard
      put(s0, s1, 0.9, 0.96, 0.04, M.trim, 0.5);        // chair rail
      put(s0, s1, 0.96, 0.975, 0.02, M.trim, 0.5);      // rail lip
    }
    // crown molding runs the full length (stepped profile)
    put(0, len, ROOM_H - 0.16, ROOM_H, 0.03, M.paintedWood, 0.6);
    put(0, len, ROOM_H - 0.08, ROOM_H, 0.07, M.paintedWood, 0.6);
    put(0, len, ROOM_H - 0.03, ROOM_H, 0.11, M.paintedWood, 0.6);
    // picture rail
    put(0, len, 2.35, 2.38, 0.025, M.trim, 0.5);
  }

  /** Casings on both faces, jamb linings and threshold for an opening in a 0.24 m wall. */
  private buildDoorFrame(along: 'x' | 'z', fixed: number, a0: number, a1: number, h: number) {
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
      const off = side * (0.12 + d / 2);
      add(w, h + w, d, a0 - w / 2, (h + w) / 2, off);
      add(w, h + w, d, a1 + w / 2, (h + w) / 2, off);
      add(span + w * 2 + 0.04, w + 0.02, d + 0.01, mid, h + w / 2 + 0.01, off);
    }
    add(0.02, h, 0.24, a0 + 0.01, h / 2, 0);
    add(0.02, h, 0.24, a1 - 0.01, h / 2, 0);
    add(span, 0.02, 0.24, mid, h - 0.01, 0);
    add(span + 0.1, 0.02, 0.3, mid, 0.01, 0);
  }

  /** Small windowless bathroom behind the ajar door: no light source, so it reads as pitch black. */
  private buildBathroom() {
    const B = BATH, t = 0.2;
    const tile = new THREE.MeshStandardMaterial({ color: 0x9a978f, roughness: 0.3, map: this.mats.plaster.map, normalMap: this.mats.plaster.normalMap });
    const floor = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.4 });
    const w = B.x1 - B.x0, d = B.z1 - B.z0, cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2;
    this.box(w + 0.4, 0.2, d + 0.4, floor, new THREE.Vector3(cx, -0.1, cz), 0.3, 'r');
    this.box(w + 0.4, 0.2, d + 0.4, tile, new THREE.Vector3(cx, B.h + 0.1, cz), 0.3, 'r');
    this.wall('z', B.x1 + t / 2, B.z0 - 0.1, B.z1 + t, B.h, t, [tile, tile, tile, tile, tile, tile], [], 0.3, 'r');
    this.wall('x', B.z1 + t / 2, B.x0, B.x1 + t, B.h, t, [tile, tile, tile, tile, tile, tile], [], 0.3, 'r');
  }

  /** Painted timber window: casing, sill, sash with mullions (glass handled by Window.ts). */
  private buildWindowFrame(x0: number, x1: number) {
    const M = this.mats;
    const z = -5, y0 = WIN_A.y0, y1 = WIN_A.y1, w = x1 - x0, cx = (x0 + x1) / 2;
    const pw = M.paintedWood;
    const add = (ww: number, hh: number, dd: number, x: number, y: number, zz: number, mat: Mat = pw) => {
      const m = new THREE.Mesh(worldBox(ww, hh, dd, 0.5), mat);
      m.position.set(x, y, zz); m.castShadow = true; m.receiveShadow = true; this.group.add(m); this.roomMeshes.push(m);
    };
    // casing (room side)
    add(0.1, y1 - y0 + 0.2, 0.03, x0 - 0.05, (y0 + y1) / 2 + 0.05, z + 0.015);
    add(0.1, y1 - y0 + 0.2, 0.03, x1 + 0.05, (y0 + y1) / 2 + 0.05, z + 0.015);
    add(w + 0.3, 0.12, 0.035, cx, y1 + 0.08, z + 0.017);
    // sill + apron
    add(w + 0.34, 0.04, 0.2, cx, y0 - 0.02, z + 0.02);
    add(w + 0.2, 0.09, 0.025, cx, y0 - 0.085, z + 0.012);
    // reveal linings
    add(0.02, y1 - y0, 0.24, x0 + 0.01, (y0 + y1) / 2, z - 0.12);
    add(0.02, y1 - y0, 0.24, x1 - 0.01, (y0 + y1) / 2, z - 0.12);
    add(w, 0.02, 0.24, cx, y1 - 0.01, z - 0.12);
    // sash: outer frame + meeting rail + glazing bars (6 over 6)
    const sz = z - 0.16, fd = 0.05;
    add(w - 0.04, 0.06, fd, cx, y0 + 0.03, sz); add(w - 0.04, 0.06, fd, cx, y1 - 0.03, sz);
    add(0.06, y1 - y0, fd, x0 + 0.05, (y0 + y1) / 2, sz); add(0.06, y1 - y0, fd, x1 - 0.05, (y0 + y1) / 2, sz);
    add(w - 0.04, 0.05, fd + 0.02, cx, (y0 + y1) / 2, sz);
    for (const fx of [1 / 3, 2 / 3]) add(0.02, y1 - y0 - 0.1, 0.03, x0 + w * fx, (y0 + y1) / 2, sz);
    for (const fy of [0.25, 0.75]) add(w - 0.1, 0.02, 0.03, cx, y0 + (y1 - y0) * fy, sz);
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
    for (let i = 0; i < 8; i++) add('dirt', new THREE.Vector3(-0.4 + rnd() * 0.8, 0.003, 0.5 + rnd() * 5.2), up, 0.5 + rnd() * 0.6);
  }
}
