import * as THREE from 'three';
import type { Physics } from '../engine/Physics';
import type { Assets } from '../engine/Assets';
import { worldBox, pbrMaterial, makeWet, makeGrime, stainTexture, decal, waterNormalTexture } from './Materials';
import { buildWindow } from './Window';
import {
  CORRIDOR, ROOM_H, DIV_Z, DOOR, WALL_T, STAIRWELL, STAIR_BOTTOM_Y, STAIR_FLIGHT_END, ROOMS, STAIRS, OPENINGS, DOOR_OPENINGS, BATH_DOOR, EXIT_DOOR, STORE_DOOR, UPPER_DOOR, WIN_A, WIN_B, WIN_C, type Room, type Opening,
} from '../data/layout';

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
  /** scrolling water normal maps (stairwell stream + wall seepage), advanced by WaterSystem in m/s along the flow */
  readonly flowing: { tex: THREE.Texture; speed: number }[] = [];
  /** stairwell behind door 9 (own group so it can be hidden when it cannot be seen) */
  readonly stairwell = new THREE.Group();

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
    // semi-gloss paint over the plaster texture: lamps leave sheen streaks along the walls (grime areas stay matte)
    wallPaint.roughnessMap = null;
    wallPaint.roughness = 0.32;
    wallPaint.envMapIntensity = 1.2;
    // off-white painted trim (baseboards, crown, casings, sills, doors)
    const trim = new THREE.MeshStandardMaterial({ color: 0xd9d3c6, roughness: 0.45, normalMap: plaster.normalMap, normalScale: new THREE.Vector2(0.15, 0.15) });
    const blackMetal = new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0.5, roughness: 0.5 });
    this.mats = { concreteWall, concreteFloor, concreteCeil, wallPaint, woodFloor, plaster, trim, blackMetal };

    this.buildCorridor();
    this.buildRoom();
    const n0 = this.group.children.length;
    this.buildStairwell();
    this.stairwell.add(...this.group.children.slice(n0));
    this.group.add(this.stairwell);
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
    // nothing exists beyond the exit (door 9 leads into the stairwell)
    const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.box(EXIT_DOOR.a1 - EXIT_DOOR.a0 + 0.3, EXIT_DOOR.y1 + 0.2, 0.05, black, new THREE.Vector3((EXIT_DOOR.a0 + EXIT_DOOR.a1) / 2, EXIT_DOOR.y1 / 2, EXIT_DOOR.at - WALL_T - 0.05), 1, 'r');
    // void behind the upper doorway
    this.box(0.05, 2.3, 1.1, black, new THREE.Vector3(UPPER_DOOR.at + WALL_T + 0.3, (UPPER_DOOR.y0 + UPPER_DOOR.y1) / 2, (UPPER_DOOR.a0 + UPPER_DOOR.a1) / 2), 1, 'r');
    for (const w of [WIN_A, WIN_B, WIN_C]) this.buildWindowFrame(w);
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
    const doorGaps = DOOR_OPENINGS.filter((o) => o.along === along && Math.abs(o.at - line) < 0.3);
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
  private buildDoorFrame(along: 'x' | 'z', fixed: number, a0: number, a1: number, h: number, t: number, y0 = 0) {
    const M = this.mats;
    const w = 0.09, d = 0.03, mid = (a0 + a1) / 2, span = a1 - a0;
    const add = (alongLen: number, hh: number, depth: number, a: number, y: number, off: number) => {
      const [sx, sz] = along === 'x' ? [alongLen, depth] : [depth, alongLen];
      const m = new THREE.Mesh(worldBox(sx, hh, sz, 0.6), M.trim);
      m.position.set(along === 'x' ? a : fixed + off, y0 + y, along === 'x' ? fixed + off : a);
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

  /** Painted 6-over-6 sash window (frame + glass) in a west or north wall, built in a local frame (wall plane z=0, room +z). */
  private buildWindowFrame(o: Opening) {
    const M = this.mats;
    const g = new THREE.Group();
    if (o.along === 'z') g.position.set(o.at, 0, (o.a0 + o.a1) / 2); else g.position.set((o.a0 + o.a1) / 2, 0, o.at);
    g.rotation.y = o.along === 'z' ? Math.PI / 2 : 0; // local +z (room side) → world +x (west walls) / +z (north walls)
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
    g.add(buildWindow(x0, x1, y0, y1, z).group); // black exterior + glass
    this.group.add(g);
  }

  /**
   * Behind door 9: straight wet-concrete stair down (+x) to the portal door. Dark grey concrete walls and treads,
   * a thin stream running down the treads along the north wall, seepage streaks on both walls, a puddle at the foot.
   */
  private buildStairwell() {
    const { concreteWall: cw, concreteFloor: cf, concreteCeil: cc } = this.mats;
    const S = STAIRWELL, r = S.riser, t = S.tread, n = S.risers - 1; // n treads between the landings
    const zc = (S.z0 + S.z1) / 2, w = S.z1 - S.z0, yb = STAIR_BOTTOM_Y, wallX0 = S.doorX - S.doorT / 2;
    const stepMats = [cw, cw, cf, cw, cw, cw]; // wet top face
    // landings + treads (solid blocks down to below the bottom landing)
    this.box(S.flightX - STORE_DOOR.at + 0.02, 0.2, w, cf, new THREE.Vector3((STORE_DOOR.at - 0.02 + S.flightX) / 2, -0.1, zc), 1.6, 'c');
    for (let i = 0; i < n; i++) {
      const top = -(i + 1) * r, bot = yb - 0.1;
      this.box(t, top - bot, w, stepMats, new THREE.Vector3(S.flightX + i * t + t / 2, (top + bot) / 2, zc), 1.6, 'c', false);
    }
    this.box(S.doorX + 0.6 - STAIR_FLIGHT_END, 0.2, w, cf, new THREE.Vector3((STAIR_FLIGHT_END + S.doorX + 0.6) / 2, yb - 0.1, zc), 1.6, 'c');
    // walking surface over the flight: one ramp collider through the tread centres (±r/2 from each tread top)
    const run = STAIR_FLIGHT_END - S.flightX, drop = -yb, rampDrop = n * r;
    const rq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.atan2(r, t));
    this.physics.addBox(new THREE.Vector3(S.flightX + run / 2, -r / 2 - rampDrop / 2, zc).addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(rq), -0.05), new THREE.Vector3(Math.hypot(run, rampDrop) / 2, 0.05, w / 2), rq);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.atan2(drop, run));
    // side walls (full height) and ceilings: flat over the landings, sloped over the flight
    for (const z of [S.z0 - 0.1, S.z1 + 0.1]) this.box(wallX0 - S.x0 + 0.1, S.h - yb + 0.4, 0.2, cw, new THREE.Vector3((S.x0 + wallX0) / 2, (yb + S.h) / 2, z), 1.8, 'c');
    this.box(S.flightX - S.x0, 0.2, w + 0.2, cc, new THREE.Vector3((S.x0 + S.flightX) / 2, S.h + 0.1, zc), 1.6, 'c');
    this.box(wallX0 - STAIR_FLIGHT_END + 0.05, 0.2, w + 0.2, cc, new THREE.Vector3((STAIR_FLIGHT_END + wallX0) / 2, yb + S.h + 0.1, zc), 1.6, 'c');
    const slope = this.box(Math.hypot(run, drop) + 0.12, 0.2, w + 0.2, cc, new THREE.Vector3(S.flightX + run / 2, S.h - drop / 2 + 0.1, zc), 1.6, 'c', false);
    slope.quaternion.copy(q);
    // bottom door wall (copy of the corridor's door end) with a painted frame
    const D = { a0: zc - 0.45, a1: zc + 0.45 };
    this.wall('z', S.doorX, S.z0 - 0.2, S.z1 + 0.2, S.h + 0.2, S.doorT, [cw, cw, cw, cw, cw, cw], [{ a0: D.a0, a1: D.a1, y0: yb, y1: yb + 2.1 }], 1.8, 'c', yb);
    this.buildDoorFrame('z', S.doorX, D.a0, D.a1, 2.1, S.doorT, yb);

    // ---- water
    const nrm = waterNormalTexture();
    const water = (speed: number, opacity: number, rough: number) => {
      const tex = nrm.clone(); tex.needsUpdate = true;
      this.flowing.push({ tex, speed });
      return new THREE.MeshStandardMaterial({ color: 0x050607, roughness: rough, metalness: 0, normalMap: tex, normalScale: new THREE.Vector2(0.7, 0.7),
        transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, envMapIntensity: 1.6 });
    };
    const stream = water(0.9, 0.7, 0.03), seep = water(0.25, 0.45, 0.06), pool = water(0.04, 0.75, 0.02);
    const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
    /** strip of width `wd` × length `len`; texture v (flow) runs along `flow`, normal = `nrmDir` */
    const strip = (wd: number, len: number, across: THREE.Vector3, flow: THREE.Vector3, nrmDir: THREE.Vector3, c: THREE.Vector3, mat: THREE.Material) => {
      const geo = new THREE.PlaneGeometry(wd, len);
      geo.attributes.uv.array.forEach((_, k, a) => { if (k % 2) (a as Float32Array)[k] *= len / wd / 4; });
      const m = new THREE.Mesh(geo, mat);
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across, flow, nrmDir));
      m.position.copy(c); m.receiveShadow = true;
      this.group.add(m); this.corridorMeshes.push(m);
    };
    const sz = S.z0 + 0.09, sw = 0.13; // stream hugs the north wall
    strip(sw, S.flightX - S.x0 - 0.3, Z, X, Y, new THREE.Vector3((S.x0 + 0.3 + S.flightX) / 2, 0.003, sz), stream);
    for (let i = 0; i < n; i++) {
      const x0 = S.flightX + i * t, top = -(i + 1) * r;
      strip(sw, r, Z.clone().negate(), Y.clone().negate(), X.clone().negate(), new THREE.Vector3(x0 - 0.003, top + r / 2, sz), stream); // riser
      strip(sw, t, Z, X, Y, new THREE.Vector3(x0 + t / 2, top + 0.003, sz), stream); // tread
    }
    strip(sw, r, Z.clone().negate(), Y.clone().negate(), X.clone().negate(), new THREE.Vector3(STAIR_FLIGHT_END - 0.003, yb + r / 2, sz), stream);
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), pool);
    puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1.3, 0.75, 1); puddle.position.set(STAIR_FLIGHT_END + 0.45, yb + 0.003, sz + 0.25);
    this.group.add(puddle); this.corridorMeshes.push(puddle);
    // seepage streaks running down both walls
    const floorAt = (x: number) => (x < S.flightX ? 0 : x > STAIR_FLIGHT_END ? yb : -Math.ceil((x - S.flightX) / t) * r);
    const ceilAt = (x: number) => (x < S.flightX ? S.h : x > STAIR_FLIGHT_END ? yb + S.h : S.h - (x - S.flightX) * drop / run);
    for (const [x, side, wd] of [[10.7, 0, 0.09], [12.25, 1, 0.12], [13.4, 0, 0.07], [14.8, 1, 0.1], [11.6, 1, 0.06]] as [number, number, number][]) {
      const y0 = floorAt(x), y1 = ceilAt(x) - 0.05, z = side ? S.z1 - 0.002 : S.z0 + 0.002;
      strip(wd, y1 - y0, side ? X : X.clone().negate(), Y.clone().negate(), side ? Z.clone().negate() : Z, new THREE.Vector3(x, (y0 + y1) / 2, z), seep);
    }
  }

  /** L-shaped stair with a mid landing; flight 1 open on its east side (balustrade), flight 2 between walls and lost in the dark. */
  private buildStairs() {
    const M = this.mats, S = STAIRS, r = S.riser, t = S.tread, n = S.perFlight;
    const riser = M.woodFloor.clone();
    riser.color.multiplyScalar(0.6);
    riser.roughness = 0.5;
    const rail = new THREE.MeshStandardMaterial({ color: 0x2e2018, roughness: 0.4, map: M.woodFloor.map });
    const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; this.group.add(mesh); this.roomMeshes.push(mesh); return mesh; };
    const step = (w: number, d: number, y0: number, top: number, x: number, z: number) => {
      add(new THREE.Mesh(worldBox(w, top - y0, d, 0.8), riser)).position.set(x, (y0 + top) / 2, z);
      add(new THREE.Mesh(worldBox(w + 0.02, 0.035, d + 0.035, 0.8), M.woodFloor)).position.set(x, top + 0.0175, z);
    };
    // flight 1 (+z): 8 treads, then the mid landing is the 9th rise
    const w1 = S.x1 - S.x0 - 0.05, cx1 = S.x0 + w1 / 2;
    for (let i = 0; i < n; i++) step(w1, t, 0, (i + 1) * r, cx1, S.z1Start + i * t + t / 2);
    const lTop = (n + 1) * r, lz0 = S.landingZ, lz1 = S.z2[1];
    step(S.x1 - S.x0, lz1 - lz0, 0, lTop, (S.x0 + S.x1) / 2, (lz0 + lz1) / 2);
    // flight 2 (+x) from the landing to the upper floor (its 9th rise)
    const d2 = S.z2[1] - S.z2[0], cz2 = (S.z2[0] + S.z2[1]) / 2;
    for (let j = 0; j < n; j++) step(t, d2, lTop, lTop + (j + 1) * r, S.x2Start + j * t + t / 2, cz2);

    // physics: two ramps + landing
    const run1 = n * t, ang1 = Math.atan2(n * r, run1);
    const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -ang1);
    this.physics.addBox(new THREE.Vector3(cx1, n * r / 2, S.z1Start + run1 / 2).addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(q1), -0.05), new THREE.Vector3(w1 / 2, 0.05, Math.hypot(n * r, run1) / 2), q1);
    this.physics.addBox(new THREE.Vector3((S.x0 + S.x1) / 2, lTop - 0.05, (lz0 + lz1) / 2), new THREE.Vector3((S.x1 - S.x0) / 2, 0.05, (lz1 - lz0) / 2));
    const run2 = n * t, ang2 = Math.atan2(n * r, run2);
    const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang2);
    this.physics.addBox(new THREE.Vector3(S.x2Start + run2 / 2, lTop + n * r / 2, cz2).addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(q2), -0.05), new THREE.Vector3(Math.hypot(n * r, run2) / 2, 0.05, d2 / 2), q2);

    // balustrade on flight 1's open east side: newel at the foot, newel at the turn, two balusters per tread, raked rail
    const ex = S.x1 - 0.04;
    for (let i = 0; i < n; i++) for (const f of [0.25, 0.75]) {
      const top = (i + 1) * r, z = S.z1Start + (i + f) * t;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.92, 0.03), rail)).position.set(ex, top + 0.46, z);
    }
    for (const [y, z] of [[0, S.z1Start + 0.05], [lTop, lz0 + 0.05]] as [number, number][]) {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), rail)).position.set(ex, y + 0.6, z);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.13), rail)).position.set(ex, y + 1.22, z);
    }
    const rake = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, Math.hypot(n * r, run1)), rail));
    rake.position.set(ex, n * r / 2 + 0.98, S.z1Start + run1 / 2);
    rake.rotation.x = -ang1;
    this.physics.addBox(new THREE.Vector3(ex, n * r / 2 + 0.5, S.z1Start + run1 / 2), new THREE.Vector3(0.03, 0.5, Math.hypot(n * r, run1) / 2), q1);
    // wall handrails: flight 1 (west wall) and flight 2 (south wall)
    const hr1 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, Math.hypot(n * r, run1), 12), rail));
    hr1.position.set(S.x0 + 0.06, n * r / 2 + 0.9, S.z1Start + run1 / 2);
    hr1.rotation.x = Math.PI / 2 - ang1;
    const hr2 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, Math.hypot(n * r, run2), 12), rail));
    hr2.position.set(S.x2Start + run2 / 2, lTop + n * r / 2 + 0.9, S.z2[1] - 0.06);
    hr2.rotation.z = -(Math.PI / 2 - ang2);
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
