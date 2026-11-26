# Implementation Plan: Phase 1 - House Layout, Wake-up and Doors

**Branch**: `001-phase1-house-layout` (retroactive) | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-phase1-house-layout/spec.md` (status: implemented; this plan documents the existing design).

## Summary

First-person walkable horror vignette: wet concrete basement corridor + wake-up intro, a basement door that opens then shuts and locks behind the player, and a furnished, lit L-shaped house with locked doors that only rattle. Approach: everything is data (`src/data`) turned into geometry/props/lights by builders (`src/world`), driven by small `System`s ticked in a fixed order by the composition root `Game`; a post-processing stack gives the muted crisp look; presets in `Quality.ts` scale cost.

## Technical Context

**Language/Version**: TypeScript ^5.6.3 (strict via `tsconfig.json`), ES modules

**Primary Dependencies**: three ^0.170.0 (r170), `@dimforge/rapier3d-compat` ^0.14.0, `postprocessing` ^6.36.4, `n8ao` ^1.9.4; dev: Vite ^5.4.11, `@types/three`

**Storage**: none; only `localStorage` key `loop.quality` (graphics preset), wrapped in try/catch

**Testing**: no test framework. Verification = `npm run typecheck` (`tsc --noEmit`) before every commit, `npm run build` for release, owner screenshots on real hardware for scene look; light dev pages `inspect.html`, `handtest.html`, `scanprobe.html`; headless screenshots only with `?q=low`

**Target Platform**: desktop browser with WebGL2, keyboard + mouse, pointer lock

**Project Type**: single-project browser game (Vite)

**Performance Goals**: playable on real GPUs at Medium/High; Low light enough for software rendering. No numeric fps target (owner decision for Phase 1)

**Constraints**: no fog, crisp image, bloom only on bright sources, DOF only in intro; Low = exactly one shadow (proxy light), no AO/DOF/bloom/SMAA, 1K textures; delta time capped at 1/20 s; GLBs small (no LFS)

**Scale/Scope**: 11 rooms, 7 openings, 36 prop specs (+ procedural planter, pipes, digital clock, fan), 12 lamps, 24 sounds, 4 doors (3 interactive), 12 roaches, one 15.2 s cinematic

## Constitution Check

*GATE: passed before research; re-checked after design.*

| Principle | Status | Evidence |
|---|---|---|
| I. Ask, never guess | Pass | Ambiguities resolved with the owner (spec: Resolved Decisions); owner chose stair option A, +3 m R1, flat north wall |
| II. Simplicity / surgical | Pass | No loop code, no extra mechanics; only 3 `Interactable`-style uses (`DoorInteraction` x3) and 1 `TriggerZone` |
| III. Goal-driven verification | Pass | typecheck gate, no e2e; visual check by owner |
| IV. Owner decisions | Pass | Out-of-scope list mirrors CLAUDE.md exclusions |
| V. Visual direction | Pass | Renderer grade/bloom/DOF/grain per CLAUDE.md; no fog |
| VI. Data-driven | Pass | `data/*` pure data; `Game` is only composition root; typed `SoundId` |
| VII. Licensed assets | Pass | Manifests exist for all model groups and audio; Credits reads all 7 model groups (incl. `house`) |

## Project Structure

### Documentation (this feature)

```text
specs/001-phase1-house-layout/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

(No `contracts/`: the game exposes no external interface.)

### Source Code (repository root)

```text
index.html  inspect.html  handtest.html  scanprobe.html   # game shell + dev pages
public/
├── audio/            # 24 mp3 + manifest.json (Freesound CC0)
├── models/           # architecture decor furniture hallway hands_bugs house modern (+ manifest.json each)
└── textures/         # Poly Haven: concrete_wall_003/005, damaged_concrete_floor, plastered_wall, wood_floor
src/
├── main.ts           # menu, loading bar, start, pause, credits, quality buttons
├── core/             # System.ts, timeline.ts (ease, seg, crossed)
├── data/             # layout.ts props.ts lights.ts audio.ts creatures.ts  (pure data)
├── engine/           # Renderer.ts Physics.ts Assets.ts Input.ts Audio.ts Quality.ts
├── game/             # Game.ts (composition root, load -> wire() -> System[] loop)
├── gameplay/         # Interactable.ts DoorInteraction.ts TriggerZone.ts
├── systems/          # InteractionSystem TriggerSystem LightingSystem FanSystem AmbienceSystem
├── sequences/        # IntroSequence.ts
├── player/           # Player.ts (Rapier capsule), Hands.ts (runtime hand rig)
├── world/            # Level Materials Window Door HouseDoors Props Furnish fixtures Probes Cockroaches Atmosphere
├── ui/               # UI.ts, style.css
└── tools/            # handtest.ts inspect.ts scanprobe.ts (dev pages)
```

**Structure Decision**: single Vite project, layered by role: data -> world builders -> behaviour (systems/gameplay/sequences) -> composition root. No tests directory.

## Key Design Decisions

1. **Data-driven world**: rooms, openings, props, lights, sounds, roach groups are arrays in `src/data`; `Level` generates walls from room edges (`WALL_T` 0.12 outside each room, heights per room, openings punched through), trims and window frames; `Furnish` places props then lights. See data-model.md.
2. **Frame order** (`Game.wire`): intro, player, physics step, triggers, interaction, doors, hands, drips, roaches (react only once `control > 0.5`), lighting, fan, ambience; then render.
3. **Doors**: `DoorLike` interface (`handle`, `isOpen`, `locked`, `open/close/rattle`); `Door` (four-panel leaf with Rapier collider) and `GrandDoor` (always locked). `DoorInteraction` handles open vs. rattle; `shutAndLock` + one `TriggerZone` (`z < DIV_Z - 1.4`, once, when open and unlocked) implements close-and-lock. A lamp `driver` ties the `leak` light to the door state.
4. **Interaction**: `InteractionSystem` picks the first registered `Interactable` within `REACH` 1.5 m and aim dot > 0.82; disabled while `player.control < 1`.
5. **Intro** is a `System` with a clock using `seg`/`crossed`; drives eyelids (UI), DOF blur, vignette/exposure, FOV, eye height, breathing sounds and the hand pose; ends in `finish()` handing control to the player.
6. **Hands**: photoscan GLB rigged at runtime from landmarks (distal finger fixes); only shown in intro close-ups so the wrist cut never appears.
7. **Lighting**: point lights from data with flicker seeded by index; shadow refresh gated by distance (7 m); Low quality uses one proxy light that adopts the strongest lamp near the player (hysteresis 1.3) so the light count never changes (no shader recompiles). Corridor/house environment probes baked once (`Probes`).
8. **Post stack**: AO (n8ao) -> DOF (intro only) -> bloom + AgX tonemap + `GradeEffect` (saturation 0.42) + contrast + chromatic aberration -> vignette + grain (+ SMAA). Passes are conditional on `Q`.
9. **Audio**: three.js listener on the camera; `SOUNDS` is the single list; footsteps by `surfaceAt` (concrete if `z > DIV_Z + 0.05`); ambience crossfade by distance to the door wall; looping `EMITTERS` anchored to named props.
10. **Quality**: `Q` singleton read at boot from `?q=`, else `localStorage`, else medium; changing level reloads.

## Complexity Tracking

No constitution violations requiring justification. (Licence-credit gap is tracked as an open issue in research.md R8, not a deliberate violation.)
