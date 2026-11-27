---
description: "Task list for the performance phase"
---

# Tasks: Performance phase (one PR)

## E. Measure
- [X] T001 bench + budgets + baseline (e2e/bench.mjs, npm run bench; baseline images are local: e2e/.baseline)

## B. Shadows & light
- [X] T002 shadow cache (LightingSystem: dirty-on-move, budget per frame)
- [ ] T003 Desktop light pool (flag, measure before enabling)
- [ ] T004 Wet mask baked to a texture (`src/world/Materials.ts`)

## C. Geometry
- [X] T005 static merge + identical-material collapse (Level.mergeStatic)
- [ ] T006 Instancing (balusters, pipe flanges, water strips)
- [X] T007 basement/house culling (ZoneVisibility)
- [X] T008 heavy props simplified (phone, portrait, sconces, plants, radio, lamp, console, mirror, clock, xcellf roach); painting kept (simplify damaged it)

## A. Loading
- [ ] T009 KTX2 trial on 3 materials (SSIM + close-ups) → owner decision → convert
- [ ] T010 Meshopt for GLBs (and texture compression inside GLBs if T009 passes)
- [ ] T011 Staged loading (basement + R1 first)
- [ ] T012 Service worker (cache keyed by build hash)
- [X] T013 audio re-encoded (mono 64k positional, 96k ambience): −2.2 MB
- [ ] T014 Vite manual chunks, Rapier wasm as a file, parallel shader compile + menu warm-up

## D. Render
- [ ] T015 Desktop adaptive scale, merged post passes, cheaper AO (medium), portal scale flag

## Verification & delivery
- [X] T016 `npm run bench` meets `budget.md`; image diff ≤ 1/255 on the 8 views (except approved KTX2)
- [X] T017 typecheck, build, e2e low/mobile, e2e:touch pass
- [ ] T018 Update docs (`docs/architecture.md`, `budget.md` actuals); commit, PR, CI, merge (on owner request); owner checks a phone with `?stats`

## Done beyond the list / notes
- [X] Model textures ≤ 512 px on small props (−6 MB); mobile 512 px PBR texture sets (`public/textures/*/512`); JS size counted gzipped
- [X] e2e fix: a held loop no longer clears injected key presses (flaky touch test)
- Open (next performance round): KTX2 trial (needs `toktx`/basisu), Meshopt, staged loading, service worker, bundle split + parallel shader compile,
  instancing, desktop light pool / wet mask bake, adaptive scale + cheaper AO on desktop. Medium/High need an owner check on real hardware.

## Post-release fixes
- [X] F001 Shadow cache missed rotation-only movement (door leaves swing about their hinge, fan blades spin in place) → bath door / fan shadows stayed stale: casters are now compared by full world matrix; e2e `shadow cache: idle scene does not re-render, a swinging door does` (fails on the old code)
