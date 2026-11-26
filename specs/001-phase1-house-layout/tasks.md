---

description: "Task list for Phase 1 (retroactive; all tasks implemented)"
---

# Tasks: Phase 1 - House Layout, Wake-up and Doors

**Input**: Design documents from `/specs/001-phase1-house-layout/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: None requested; the project has no test framework. Verification per task = `npm run typecheck` plus owner review (see plan.md).

**Organization**: Grouped by user story. All tasks are complete (`[X]`); this file records what exists.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Vite + TypeScript project with three, Rapier, postprocessing, n8ao in `package.json`, `tsconfig.json`, `vite.config.ts`
- [X] T002 [P] Game shell and menu markup in `index.html`, styles in `src/ui/style.css`
- [X] T003 [P] Dev pages `inspect.html`, `handtest.html`, `scanprobe.html` with `src/tools/inspect.ts`, `src/tools/handtest.ts`, `src/tools/scanprobe.ts`

---

## Phase 2: Foundational (blocks all stories)

- [X] T004 [P] `System` interface and timeline helpers in `src/core/System.ts`, `src/core/timeline.ts`
- [X] T005 [P] Engine services: `src/engine/Assets.ts` (cache, missing file -> null), `src/engine/Input.ts`, `src/engine/Physics.ts`, `src/engine/Audio.ts` (typed `SoundId`)
- [X] T006 [P] Quality presets (`?q=`, localStorage, reload on change) in `src/engine/Quality.ts`
- [X] T007 Post-processing stack (n8ao, DOF, bloom, AgX, `GradeEffect`, CA, vignette, grain, SMAA) in `src/engine/Renderer.ts`
- [X] T008 [P] Layout data (`ROOMS`, `CORRIDOR`, openings, `STAIRS`, `FAN`, `PLAYER_START`, `surfaceAt`) in `src/data/layout.ts`
- [X] T009 [P] Sound list, footsteps, emitters in `src/data/audio.ts`; assets and manifests in `public/audio/`
- [X] T010 Materials (PBR from Poly Haven, `makeWet`, `makeGrime`, stains) in `src/world/Materials.ts`; textures in `public/textures/`
- [X] T011 Level builder (walls from room edges, trims, windows, stairs, corridor, stains) in `src/world/Level.ts`, `src/world/Window.ts`
- [X] T012 Player controller (Rapier kinematic capsule, bob, crouch, footsteps by surface) in `src/player/Player.ts`
- [X] T013 Composition root with load, `wire()` and ordered `System[]` loop in `src/game/Game.ts`; menu/start/pause in `src/main.ts`; overlay in `src/ui/UI.ts`
- [X] T014 Environment probes in `src/world/Probes.ts`

**Checkpoint**: player can walk collidable rooms with sound and post look.

---

## Phase 3: User Story 1 - Wake up in the wet basement (P1) MVP

**Goal**: 15.2 s intro in the wet corridor, then player control.

**Independent Test**: Start; observe breathing, eyelids, hand close-up, stand-up, hint.

- [X] T015 [US1] Runtime hand auto-rig from landmarks with finger fixes in `src/player/Hands.ts`; asset `public/models/hands_bugs/male_hand_scan.glb`
- [X] T016 [US1] Intro timeline (gasps, lids, blur, FOV, eye height, hand pose, hand-over, hint) in `src/sequences/IntroSequence.ts`
- [X] T017 [P] [US1] Corridor geometry and wet materials in `src/world/Level.ts` (`CORRIDOR`); pipes in `src/world/fixtures.ts`
- [X] T018 [P] [US1] Ceiling drips, ripples, plinks in `src/world/Atmosphere.ts`
- [X] T019 [P] [US1] Cockroach crawlers in `src/world/Cockroaches.ts`; groups in `src/data/creatures.ts`
- [X] T020 [P] [US1] Corridor caged bulb with drop-outs and `light_buzz` emitter: `src/data/lights.ts`, `src/systems/LightingSystem.ts`, `src/data/audio.ts`
- [X] T021 [US1] Ambience crossfade in `src/systems/AmbienceSystem.ts`, driven by the intro fade

**Checkpoint**: story 1 playable on its own.

---

## Phase 4: User Story 2 - Basement door opens, shuts, locks (P1)

**Goal**: E opens the door; passing z < 1.6 shuts and locks it.

**Independent Test**: Open, walk through, confirm auto-close and lock.

- [X] T022 [US2] Door classes (`DoorLike`, `Door`, `GrandDoor`) in `src/world/Door.ts`
- [X] T023 [US2] Door placement (basement, store, bath, front) in `src/world/HouseDoors.ts`
- [X] T024 [P] [US2] `Interactable` contract in `src/gameplay/Interactable.ts`; look-at + E system in `src/systems/InteractionSystem.ts`
- [X] T025 [US2] `DoorInteraction` (open sequence) and `shutAndLock` in `src/gameplay/DoorInteraction.ts`
- [X] T026 [P] [US2] `TriggerZone` in `src/gameplay/TriggerZone.ts`; `TriggerSystem` in `src/systems/TriggerSystem.ts`
- [X] T027 [US2] Wire close-and-lock trigger and `leak` lamp driver in `src/game/Game.ts` (`wire()`)

**Checkpoint**: stories 1 and 2 give the full Phase 1 beat.

---

## Phase 5: User Story 3 - Explore the furnished house (P2)

**Goal**: all rooms, props, lights, fan and stair as specified.

**Independent Test**: walk the route listed in spec Story 3; owner screenshots.

- [X] T028 [US3] Rooms/openings data (R1 6.5 m, R2, R6, RA, R8, RE, RB, RS, RN, RF2, RU) in `src/data/layout.ts`; L-shaped stair and balustrade in `src/world/Level.ts`
- [X] T029 [P] [US3] Prop auto-fit loader in `src/world/Props.ts`; prop list in `src/data/props.ts`; models in `public/models/{furniture,decor,architecture,hallway,modern}`
- [X] T030 [P] [US3] Fixtures (ceiling fan, 23:59 digital clock, planter, bulbs, cords, shade glow) in `src/world/fixtures.ts`; fan model `public/models/house/ceiling_fan.glb`
- [X] T031 [US3] Furnish from data (props, fixtures, lamps) in `src/world/Furnish.ts`; lamp specs in `src/data/lights.ts`
- [X] T032 [US3] Lamp flicker, drivers, shadow gating in `src/systems/LightingSystem.ts`
- [X] T033 [P] [US3] Fan spin/wobble in `src/systems/FanSystem.ts`
- [X] T034 [P] [US3] Positional emitters (fan creak, clock tick, window wind) started in `src/game/Game.ts` (`startEmitters`) from `src/data/audio.ts`
- [X] T035 [P] [US3] Window frames and black outside in `src/world/Window.ts`
- [X] T036 [US3] Collision for walls, stairs, collidable props (Rapier) in `src/world/Level.ts`, `src/world/Props.ts`

**Checkpoint**: house explorable end to end.

---

## Phase 6: User Story 4 - Locked doors rattle (P2)

**Goal**: store door, front double doors and relocked basement door rattle on E.

**Independent Test**: E at door 9 and at the front doors.

- [X] T037 [US4] `rattleLocked` + locked sounds in `src/gameplay/DoorInteraction.ts`, `src/data/audio.ts`
- [X] T038 [US4] Register store and front doors with `InteractionSystem` in `src/game/Game.ts`; `store.locked = true` and `GrandDoor.locked = true` in `src/world/HouseDoors.ts`, `src/world/Door.ts`
- [X] T039 [US4] Bathroom door left ajar (angle 0.6), not interactive: `src/world/HouseDoors.ts`

---

## Phase 7: User Story 5 - Graphics presets (P3)

**Goal**: Low/Medium/High behaving per spec.

**Independent Test**: switch presets; check feature set.

- [X] T040 [US5] Menu quality buttons in `index.html`, `src/main.ts`
- [X] T041 [US5] Preset-dependent passes and shadows in `src/engine/Renderer.ts`, `src/world/Furnish.ts` (`configureShadow`)
- [X] T042 [US5] Low-quality shadow proxy in `src/systems/LightingSystem.ts` (`updateShadowProxy`)

---

## Phase 8: User Story 6 - Credits and pause (P3)

**Goal**: attribution overlay and pause on pointer-lock loss.

- [X] T043 [US6] Credits overlay from `manifest.json` files in `src/main.ts`; manifests in `public/models/*/manifest.json`, `public/audio/manifest.json`
- [X] T044 [US6] Pause overlay and `Game.setPaused` in `src/main.ts`, `src/game/Game.ts`

---

## Phase 9: Polish and Cross-Cutting

- [X] T045 [P] Rooms-level look pass (grade, semi-gloss walls, grime, wet shine, probes) in `src/engine/Renderer.ts`, `src/world/Level.ts`, `src/world/Materials.ts`
- [X] T046 [P] Project rules and owner decisions in `CLAUDE.md`
- [X] T047 `npm run typecheck` passes (`package.json` script)
- [X] T048 Dev hooks `debugView`, `debugIntro`, `door` in `src/game/Game.ts`

---

## Dependencies & Execution Order

- Setup -> Foundational -> stories. US1 and US2 are P1 and independent of each other except that US2 starts after US1's hand-over. US3 needs US2 to be reachable; US4 needs US2/US3 doors; US5 and US6 are independent of gameplay.
- Within a story: data -> builders -> systems -> wiring in `Game.ts`.

## Notes

- Not covered by any task (out of scope): the loop, phone, scares, dust, bath-door interaction.
- Gaps found retroactively are resolved (see research.md R8 and spec Resolved Decisions).
