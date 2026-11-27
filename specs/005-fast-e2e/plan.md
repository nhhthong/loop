# Implementation Plan: Fast simulation e2e

**Spec**: [spec.md](spec.md) · **Date**: 2026-11-27

| Part | Implementation |
|---|---|
| Simulation step | `Game.step(dt)` shared by the real loop and `debugAdvance`; `debugHold` gates the rAF loop (pointer lock used to un-pause it in headless runs, so the real loop kept rendering in parallel) |
| Helpers | `e2e/lib.mjs`: `Session` (check, advance, sampleMax, view/teleport/aim/press, state, shot), `openGame`, Playwright resolution (`playwright` or `$PLAYWRIGHT`) |
| Scenarios | `e2e/loops.mjs`: `route()` walks R1 → R2 → hall → door 9 with the simulation running (so per-loop triggers fire); `pass()` does a real pass with checks; `LOOPS[n]` per loop |
| Runner | `e2e/run.mjs` chains loops 1..to with passes; `--from` disables checks before N |
| Touch | `e2e/touch.mjs`: CDP touch on Pixel 7 + desktop UI regression |

## Constitution Check

Principle III amended (constitution 1.1.0): gameplay changes are gated by these suites; loops via real passes only.
