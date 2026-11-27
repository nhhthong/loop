# Feature Specification: Performance phase (no Blender)

**Feature Branch**: `006-performance` (no branch created; work lands on main via one PR)

**Created**: 2026-11-27

**Status**: Planned

**Input**: Owner: "The next phase optimises game performance." Reported: long loading; slow on mobile. Rendering must stay
realistic (AAA look); gameplay unchanged.

## Owner decisions (2026-11-27)

| Topic | Decision |
|---|---|
| Budgets | Keep today's marks and cut clearly — numbers in [budget.md](budget.md); checked automatically before every merge. |
| KTX2 | Trial on 3 materials first (plaster wall, wood floor, wet concrete): UASTC for normal maps, high-quality ETC1S for colour/roughness/AO; compare by SSIM + close-up images; the owner decides whether to convert everything. |
| "Must not change the image" items | Mean per-pixel difference ≤ 1/255 (grain only) on the 8 standard views at `?q=low` before/after; if more, stop and report. |
| Scope | One PR, all groups E, B, C, A, D (below). Blender work (baked lightmaps, box-projected probes) and WebGPU are out of scope. |
| Docs | Performance numbers live in `budget.md`, not in CLAUDE.md (CLAUDE.md stays short and only points here). |

## User Stories

### US1 - Measure before and after (P1)
`npm run bench` prints draw calls, triangles, lights, shadow-updating lights and frame cost at fixed views for each preset
(`low`, `mobile`; `medium`/`high` where the cloud can render), and fails when a budget is exceeded.

### US2 - Faster first load (P1)
The first load downloads less and the loading screen is shorter: compressed meshes/textures/audio, bundle split, lazy loading
of far areas, cached on repeat visits.

### US3 - Smoother frames (P1)
Fewer draw calls and cheaper lighting/shadows on all presets with the image unchanged.

## Requirements (groups)

- **E (measure)**: benchmark + budgets enforced by script; baseline recorded in `budget.md` before any change.
- **B (shadows & light)**: cache shadow maps (redraw only when something in range moves: doors, swaying bulb, the player is not a caster);
  cap simultaneously updating shadow lights; light pool for desktop; wet mask baked instead of per-pixel fbm.
- **C (geometry & draw calls)**: merge static meshes by material and area; instancing for repeated parts; extend area culling
  (basement, R6, R8, house stair); LOD/simplify for heavy models; texture atlas for small props.
- **A (loading)**: KTX2 (after the trial); Meshopt for GLB geometry; staged loading (basement + R1 first, rest in the background);
  service-worker cache; audio re-encode (opus); split bundle, Rapier as a separate wasm file; parallel shader compile + warm-up in the menu.
- **D (render)**: adaptive resolution on desktop; fewer full-screen passes; cheaper AO on Medium; half-res portal on desktop.

## Success Criteria

- **SC-001**: all budgets in `budget.md` met at the standard views (`npm run bench` passes) for `low` and `mobile`.
- **SC-002**: standard-view screenshots differ ≤ 1/255 mean from the pre-change baseline (except where the owner approves, e.g. KTX2).
- **SC-003**: `npm run typecheck`, `npm run build`, `npm run e2e -- --q=low`, `--q=mobile`, `npm run e2e:touch` pass.
- **SC-004**: first load ≤ the budgeted MB; owner confirms smoother play on a real phone with `?stats`.

## Out of Scope

Baked lightmaps, box-projected reflection probes, WebGPU, visual redesign, new gameplay.
