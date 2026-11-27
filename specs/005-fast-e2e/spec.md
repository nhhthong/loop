# Feature Specification: Fast simulation e2e with loop jumping

**Feature Branch**: `005-fast-e2e` (no branch created; work lands on main via PR)

**Created**: 2026-11-27

**Status**: Implemented

**Input**: Owner: "Optimise the tests. Can tests jump phases? With many phases, test time would become extremely long."
Context: headless runs render with a software GPU (2–4 s per frame); a 3-loop run took 30–40 min per profile, and a
director shortcut used to save time hid a real bug (broken second pass).

## User Scenarios & Testing

### User Story 1 - Whole game in under a minute (P1)
Any developer runs `npm run e2e -- --q=low` (and `--q=mobile`) and gets the full loop chain checked in well under a minute.

### User Story 2 - Jump to the loop being worked on (P1)
`--from=N` plays earlier loops quickly without their checks (still through real passes) and checks loop N onward.

### User Story 3 - Add a loop without touching the runner (P2)
A new loop = one scenario function in `e2e/loops.mjs`.

## Requirements

- **FR-001**: Test hooks in `Game`: `debugHold` (stop the real-time loop regardless of pause/pointer lock), `debugAdvance(sec)`
  (fixed 1/30 s steps of the same systems as play, no rendering), `debugRender`, `debugPress`, `debugTeleport` (no camera/control reset).
- **FR-002**: Loops MUST be reached through real passes (door 9 → stairwell → stair-bottom door → portal → basement door); no direct
  `LoopDirector` calls in tests.
- **FR-003**: Runner flags: `--q`, `--from`, `--to`, `--shots`, `--base`; exit code ≠ 0 on any failure.
- **FR-004**: Touch-controls suite (`npm run e2e:touch`) uses the same hooks.

## Success Criteria

- **SC-001**: Full 3-loop chain: low 26/26 in ~29 s, mobile 28/28 in ~18 s (incl. ~15–25 s loading); touch suite 11/11.
- **SC-002**: The broken-second-pass bug (stair-bottom door left open) is caught by the chain.
