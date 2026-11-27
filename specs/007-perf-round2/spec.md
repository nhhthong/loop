# Feature Specification: Performance round 2 (loading + desktop FPS)

**Feature Branch**: `007-perf-round2` (no branch created; lands on main via one PR) · **Created**: 2026-11-27 · **Status**: In progress

**Input**: Owner: "Do priorities 2 and 3: write the spec, split the work across sub-agents, implement, commit, PR, merge."

## Owner decisions (2026-11-27)

| Topic | Decision |
|---|---|
| Staged loading | Start is enabled after the first stage (menu backdrop + basement corridor + R1). The rest of the house loads in the background during menu/intro. If the player reaches the basement door before it is done, the door stays locked (E rattles) until loading finishes. |
| Service worker | Yes — repeat visits load from cache; cache keyed by build so a new deploy is never served stale. |
| KTX2 | Trial only (3 materials: plaster wall, wood floor, wet concrete): numbers + close-ups for the owner; no asset change in this PR. |
| Light pool on Medium/High | No (pooled lights cast no shadows). |
| Desktop FPS | Bake the wet mask into a texture (image unchanged ≤ 1/255); adaptive resolution on Medium/High (min 0.75×, only when below 60 FPS); cheaper AO on Medium; half-res portal on desktop. |

## Requirements

- **FR-001 Staged loading**: `Game.load` resolves (Start enabled) after stage 1; stage 2 continues; `game.loaded` (promise/flag) tells when everything is in. The basement door's interaction rattles (locked) until stage 2 is done.
- **FR-002 Service worker**: precache/runtime-cache built assets and `/models|textures|audio`; versioned by build; no caching in `npm run dev`.
- **FR-003 GLB pruning**: remove meshes/textures never used by `PropSpec.only` (e.g. light switch, coat rack); reproducible script under `tools/`.
- **FR-004 Bundle split**: vendor chunks (three, postprocessing/n8ao, rapier) so they cache independently; no behaviour change.
- **FR-005 KTX2 trial report** in `specs/007-perf-round2/ktx2-trial.md` (sizes, VRAM estimate, SSIM/mean diff, close-up images path).
- **FR-006 Wet mask baked**: the per-pixel fbm in `makeWet`/`makeGrime` is replaced by sampling a pre-generated tileable mask texture with identical look (headless image diff ≤ 1/255 on the 8 bench views at `?q=low`).
- **FR-007 Desktop adaptive resolution**: `Q.scaleRange` for medium/high = [0.75×, 1×] of their pixel ratio, `fpsCap` stays 0; FrameGovernor budget = 60 FPS.
- **FR-008 Medium AO**: fewer samples / denoise settings on medium only.
- **FR-009 Desktop portal**: `Q.portalScale` 0.5 on low/medium/high.

## Success Criteria

- **SC-001**: time to Start on low/mobile (headless, build, localhost) lower than today (low 2.6–2.8 s, mobile 2.4–2.6 s); first-stage bytes reported by `npm run bench`.
- **SC-002**: repeat visit (service worker) downloads ~0 MB of assets.
- **SC-003**: `npm run bench -- --q=low|mobile` budgets pass; low image diff ≤ 1/255 for FR-006 (other items: medium/high only, owner checks on hardware).
- **SC-004**: typecheck, build, e2e low/mobile, e2e:touch pass (e2e covers "basement door waits for stage 2").

## Out of scope
Light pool on Medium/High, converting assets to KTX2, Blender work, WebGPU.
