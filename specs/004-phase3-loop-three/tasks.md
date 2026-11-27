---
description: "Task list for Phase 3 - Loop 3"
---

# Tasks: Phase 3 - Loop 3

- [X] T001 [P] Sounds `door_slam`, `door_knock`, `electric_crackle` (Freesound CC0) + manifest; ids in `SOUNDS`
- [X] T002 `Door.swingShut()` (rename), `Door.knock()`
- [X] T003 `LightingSystem.extraFocus` as a list
- [X] T004 `BrokenLightsSystem`
- [X] T005 `ToiletKnockSequence`
- [X] T006 Loop table: loop 2 unlocks door 9; loop 3 events; stair trigger re-arms every pass; wiring in `Game.wire()`
- [X] T007 e2e loop 3 (SC-001); update `CLAUDE.md`
- [X] T008 Commit, PR, CI, merge

## Post-release fixes (2026-11-27, owner report)

- [X] F001 Player slid down the stairwell on its own: `setMinSlopeSlideAngle(0.9)` (stairs/ramps are 31–34°)
- [X] F002 Second pass (loop 2 → 3) broke: the stair-bottom door stayed "open" after the first crossing (no E prompt, portal on, player
  transported into the closed basement door, loop 3 never started) → it snaps shut right after each crossing
- [X] F003 Mobile: door-9 bulb and stair bulb dropped out of the 5-light pool → `landmark: true` (pool weighs them 4× closer); door-9 bulb
  excluded from the loop-3 failing lights; stair bulb 4 → 6 cd
- [X] F004 Desktop defaults to the `low` preset (first load ~44 MB instead of ~80 MB)
- [X] F005 e2e now runs three real passes (no director shortcuts), on `low` and `mobile` — see `specs/005-fast-e2e/`
- [X] F006 (owner, 2026-11-27) Loop 2: the bathroom door closes in 0.8 s, speeding up into the frame, with a bang (`door_slam`) and a jolt
- [X] F007 (owner) Loop 3: lamps stutter then die; one dim flickering R1 sconce; door-9/stair bulbs lit as a lure; prop emissive + probe fill dim with lamps
- [X] F008 (owner) Loop 3: door 9 slams when the player is within 2 m of it
- [X] F009 (owner) Loop 3: bathroom rattles nonstop until E on it → 5 loud blows in 1.5 s with a strong leaf shake, then silence; e2e updated
