---
description: "Task list for Phase 2 - The Loop (loop 2)"
---

# Tasks: Phase 2 - The Loop (Loop 2)

**Input**: [spec.md](spec.md), [plan.md](plan.md) · Verification per task: `npm run typecheck`; e2e at the end.

## Phase 1: Assets

- [X] T001 [P] Radio model (Sketchfab CC BY, "1950 Bush DAC10", WebP textures) → `public/models/furniture/vintage_radio.glb` + manifest
- [X] T002 [P] `radio_static.mp3`, `water_trickle.mp3` (Freesound CC0) + manifest; ids in `SOUNDS`

## Phase 2: US1 - Stairwell + portal (P1)

- [X] T003 [US1] Stairwell data (`STAIRWELL`, `PORTAL`, `portalMatrix`) in `src/data/layout.ts`; stair surfaces = concrete footsteps
- [X] T004 [US1] `Level.buildStairwell()` geometry, colliders, water strips; removed the black box behind door 9
- [X] T005 [US1] Swaying `stairBulb` (`data/lights.ts`, `PendantSystem`); `WaterSystem`; trickle emitter
- [X] T006 [US1] `stairBottom` door (inverse-mapped basement door) in `src/world/HouseDoors.ts`; door 9 unlocked in loop 1
- [X] T007 [US1] `PortalSystem` (render target, doorway plane, crossing → `Player.transport`), `Renderer.beforeRender`
- [X] T008 [US1] Triggers: door 9 shuts on the stair; basement door shuts every pass → `LoopDirector.enteredHouse`

## Phase 3: US2 - Radio (P1)

- [X] T009 [US2] Radio prop on the console next to the phone (`data/props.ts`, phone moved 16 cm)
- [X] T010 [US2] Loop-2 event: looping positional static (`gameplay/loops.ts`)

## Phase 4: US3 - Bathroom door (P1)

- [X] T011 [US3] `Door.closeSlowly()` (renamed `swingShut()` in Phase 3)
- [X] T012 [US3] `BathDoorSequence` + loop-2 R2 trigger; bathroom door locked + interactable afterwards; `UI.cinematic` hides touch UI

## Phase 5: Verification

- [X] T013 Update `CLAUDE.md`
- [X] T014 e2e: door 9 → stair → portal → loop 2, radio, bathroom scene once, door 9 locked in loop 2
- [ ] T015 Commit, PR, CI (poll 20 s), merge
