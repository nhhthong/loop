# Feature Specification: Mobile Profile (smooth play on phones)

**Feature Branch**: `003-mobile-profile` (no branch created; work lands on main via PR)

**Created**: 2026-11-26

**Status**: Implemented (owner to verify on a real phone)

**Input**: Owner: "Plan the mobile version. Mobile has a single interface, optimised to play smoothly. Logic must not do
too much work and must be easy to extend. Evaluate carefully before building. Desktop must stay exactly as it is."

## Owner decisions (2026-11-26)

| Topic | Decision |
|---|---|
| "One interface" | One fixed graphics profile `mobile` on touch devices; no Low/Medium/High selector on the mobile menu. Desktop keeps its 3 presets. |
| Target | Stable 30 FPS (frame cap), cooler phone, longer battery. |
| Shadows | None on mobile. |
| Scope | Items 0–3, 5, 6 of the evaluation: stats overlay, mobile profile, no shadows, light pool, lite wet shader, dynamic resolution + half-res portal. Not now: static mesh merging, KTX2 textures. |
| Desktop | Must render and behave exactly as today (verified by before/after screenshots). |

## Evaluation (measured on the current `low` preset, headless)

| Metric | Now | Phone budget |
|---|---|---|
| Draw calls / frame | 1,900–2,650 (with cube shadow) · 210–1,100 (without) | 150–300 |
| Triangles / frame | 1.3–1.6 M (with shadow) · 0.17–0.6 M (without) | < 0.5 M |
| Point lights evaluated per pixel | 16 | 4–6 |
| Shadow passes | 6 per frame (cube proxy) | 0 |
| Wet shader | 5-octave fbm per pixel on corridor + stair surfaces | 2–3 octaves |
| Portal (stair door open) | +1 full-res scene render | half res |
| Render resolution | fixed 0.75 | adaptive |

Biggest wins, in order: drop shadows (~50–85% of frame cost), light pool (~3× cheaper lighting shader), lighter wet shader,
adaptive resolution. Mesh merging and texture compression would help further but touch the asset/level pipeline; deferred.

## User Scenarios & Testing

### User Story 1 - Smooth play on a phone (Priority: P1)

On a touch device the game starts with the `mobile` profile and holds ~30 FPS through the corridor, house, stairwell
and portal, without shader-compile hitches.

**Acceptance Scenarios**:

1. **Given** a touch device, **When** the game loads, **Then** the `mobile` profile is used and the menu shows no quality buttons.
2. **Given** play on a mid-range phone, **Then** the frame rate stays at the 30 FPS cap in normal play (owner verifies with `?stats`).
3. **Given** the player walks between rooms, **Then** lighting changes smoothly (pooled lights swap without pops or hitches).
4. **Given** the frame time rises above budget, **Then** render resolution drops step by step (never below 0.6×), and rises again when there is headroom.

### User Story 2 - Measure on real hardware (Priority: P1)

`?stats` shows FPS, frame ms, draw calls, triangles, active lights and render scale on any device.

### User Story 3 - Desktop unchanged (Priority: P1)

**Acceptance**: desktop Low/Medium/High screenshots of the standard views are identical before/after; menu unchanged.

## Requirements

- **FR-001**: `Quality` MUST pick profile `mobile` when `IS_TOUCH` (dev override `?q=` still works); the mobile menu MUST hide the quality selector.
- **FR-002**: All mobile behaviour MUST come from profile flags read by the systems (`Q.*`); no `IS_TOUCH` checks inside rendering/lighting code.
- **FR-003**: Mobile: no shadow maps (no lamp shadows, no shadow proxy), no AO/DOF/bloom/SMAA, 1K textures, 64 px probes.
- **FR-004**: Light pool: with `Q.lightPool = K > 0`, only K scene point lights exist; each frame they take position, colour, range and intensity of the K highest-scoring lamps near the player (score = intensity / (1 + d²), with hysteresis). Lamp glows stay visible for all lamps. Light count is constant (no recompiles).
- **FR-005**: `Q.wetLite` MUST reduce the wet shader noise cost (fewer fbm octaves) while keeping the glossy wet look.
- **FR-006**: Frame cap at `Q.fpsCap` (30 on mobile) and adaptive render scale within `Q.scaleRange` driven by average frame time.
- **FR-007**: Portal render target at `Q.portalScale` (0.5 on mobile) of the drawing buffer.
- **FR-008**: `?stats` overlay (all devices).
- **FR-009**: Desktop presets keep their current values; new flags default to today's behaviour.

## Success Criteria

- **SC-001**: Mobile profile headless: ≤ 1,100 draw calls, ≤ 0.6 M triangles, exactly K (+1 hemisphere) lights in the worst view.
- **SC-002**: Owner's phone holds 30 FPS in the corridor, R1, atrium, stairwell and while the portal is open.
- **SC-003**: Desktop before/after screenshots match; desktop and mobile e2e suites pass.

## Out of Scope

Static mesh merging, KTX2 texture compression, separate mobile assets, mobile-specific level changes.

## Changes after release

- 2026-11-27: lamps seen from afar (`eastBulb`, `stairBulb`) are `landmark`s, weighted 4× closer by the light pool (owner: door 9 and the stair were dark on mobile).
