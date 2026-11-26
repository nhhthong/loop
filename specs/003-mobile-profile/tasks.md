---
description: "Task list for the mobile profile"
---

# Tasks: Mobile Profile

**Input**: [spec.md](spec.md), [plan.md](plan.md) · Verification per task: `npm run typecheck`.

## Phase 0: Baseline

- [X] T001 Capture desktop baseline screenshots (6 views + intro, `?q=low`) and mobile-profile perf numbers

## Phase 1: Measure (US2)

- [X] T002 [US2] `?stats` overlay in `src/ui/Stats.ts`, wired in `src/main.ts`

## Phase 2: Profile (US1)

- [X] T003 [US1] `mobile` profile + new flags (`lightPool`, `wetLite`, `fpsCap`, `scaleRange`, `portalScale`) in `src/engine/Quality.ts`; desktop presets get today's values
- [X] T004 [US1] Hide the quality selector on mobile in `src/main.ts`
- [X] T005 [US1] No shadows on mobile (already flag-driven; verify Renderer/Furnish/LightingSystem honour it)

## Phase 3: Cheaper frame (US1)

- [X] T006 [US1] Light pool (+ `extraFocus` so the pool also lights what the portal shows) in `src/systems/LightingSystem.ts` (+ detached lamp lights in `src/world/Furnish.ts`), fade on swap
- [X] T007 [US1] `wetLite` octave reduction in `src/world/Materials.ts`
- [X] T008 [US1] `FrameGovernor` (30 FPS cap + adaptive render scale) in `src/engine/FrameGovernor.ts`, used by `src/game/Game.ts`
- [X] T009 [US1] Portal render target scale in `src/systems/PortalSystem.ts`

## Phase 4: Verification (US3)

- [X] T010 Desktop screenshots match baseline; desktop + mobile + loop e2e pass
- [X] T011 Mobile headless perf: 211–1,131 calls, 0.17–0.63 M tris, 6 lights (corridor view ~3% over SC-001; static mesh merging, deferred, would close it). Stairwell group hidden when it cannot be seen
- [X] T012 Update `CLAUDE.md`; commit, PR, CI (poll 20 s)
- [ ] T013 Owner checks a real phone with `?stats` (SC-002)
