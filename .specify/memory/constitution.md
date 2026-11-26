<!--
Sync Impact Report
Version change: (template, unratified) -> 1.0.0
Modified principles: none renamed (all principles newly defined from CLAUDE.md)
Added sections: Core Principles I-VII; Technical & Content Constraints; Development Workflow & Quality Gates; Governance
Removed sections: none
Follow-up TODOs: none
Note: ratified retroactively from CLAUDE.md after Phase 1 was implemented.
-->
# LOOP Constitution

## Core Principles

### I. Think Before Coding; Ask, Never Guess
Requirements that are ambiguous MUST be clarified with the owner before building: list the concrete options and their
visual/gameplay consequences. Assumptions MUST be stated; multiple interpretations MUST be presented, not picked silently.
If a simpler approach exists, say so. Guessing that drifts from the owner's intent is a defect.

### II. Simplicity and Surgical Changes
Write the minimum code that solves the stated problem: no speculative features, single-use abstractions, configurability
or error handling for impossible cases. Edits MUST touch only what the request requires, match existing style, and remove
only orphans the change itself created. Unrelated dead code is mentioned, not deleted.

### III. Goal-Driven Verification
Every task has a verifiable success criterion. The default check is `npm run typecheck` (`tsc --noEmit`), which MUST pass
before every commit. Headless/e2e full-game runs are NOT run unless truly needed or requested; the cloud container has no
GPU, so only `?q=low` is viable for headless screenshots. Isolated visual checks use `inspect.html`, `handtest.html`,
`scanprobe.html`. Scene-level look (lighting, prop placement) is verified by the owner on real hardware via screenshots.

### IV. Owner Decisions Are Authoritative
The "Owner decisions" in CLAUDE.md MUST NOT be changed without asking. No mechanic beyond the agreed phase scope may be added;
the owner is asked what a phase contains before any mechanic is built. Standing exclusions: no telephone interaction or
ringing, no scripted scares, no floating dust motes, no dialogue/subtitles, no visible hand/body outside the intro,
no floor creaks. The house is deserted, undamaged and lightly grimy; the entry corridor stays wet concrete with roaches.

### V. Crisp, Photoreal, Lonely Visual Direction
The image MUST be crisp (AAA-grade, not hazy): no fog, subtle grain/chromatic aberration, bloom only on bright sources,
depth of field only during the wake-up. Grade is muted, near-neutral warm grey with a faint olive cast (saturation ~0.4);
lamps are warm-white; cosy light pools separated by dark gaps, hard shadows, deep blacks, vignette. Wet surfaces MUST visibly
shine and reflect lights; house floor polished, walls semi-gloss. Take the genre look; never copy another game's layout or assets.
Outside the windows is pure black.

### VI. Data-Driven Architecture
Content lives in `src/data` (pure data, no logic); builders in `src/world`; behaviour in `src/systems`, `src/gameplay`,
`src/sequences`; engine services in `src/engine`; `src/game/Game.ts` is only the composition root (load, `wire()`, ordered
`System[]` loop). Rooms/openings/props/lights/sounds are added by editing data, not by special cases inside systems. Every sound
call is typed by `SoundId` from `data/audio.ts`. Missing asset files resolve to null and MUST NOT crash the game. Graphics
presets live only in `src/engine/Quality.ts`.

### VII. Licensed Assets, Recorded
Only licenses permitting commercial use are allowed: Sketchfab `by`/`cc0`, Poly Haven CC0, Freesound CC0. Every model and
sound MUST be recorded in its `manifest.json` (author, license, URL); the Credits screen reads them. New GLBs MUST be
optimised before commit (resize/webp to 1024, simplify above 150k faces, metalrough for spec-gloss) and kept small (no LFS).

## Technical & Content Constraints

- Stack: TypeScript, three.js r170, Rapier (`@dimforge/rapier3d-compat`), Vite 5, `postprocessing` + `n8ao`.
- Units are meters, Y up; ceilings 3 m, walkway 2 m wide, 6 m void around the fan.
- In-game text (menu, prompts, hints, credits) is English; no dialogue or subtitles.
- `low` quality MUST keep exactly one shadow (the proxy light following the strongest lamp near the player).
- Owner communication is in Vietnamese: answer first, few words, no filler. Specs and code comments are English.

## Development Workflow & Quality Gates

- Plan multi-step work briefly as step -> verify pairs; loop until the check passes.
- Gates before commit: `npm run typecheck` passes; changed lines trace to the request; owner decisions untouched.
- Build check: `npm run build` (typecheck + Vite build).
- Planned post-Phase-1 loop mechanics (door 9 -> basement -> start, per-loop `LoopDirector`) are NOT built until the owner approves a spec.

## Governance

This constitution supersedes other practices; CLAUDE.md is the runtime guidance and the source it was derived from.
Amendments require the owner's approval, a version bump (MAJOR: principle removal/redefinition; MINOR: new principle or
materially expanded guidance; PATCH: wording), and an update of dependent specs/plans. Every plan includes a Constitution
Check; violations MUST be justified in Complexity Tracking.

**Version**: 1.0.0 | **Ratified**: 2026-11-26 | **Last Amended**: 2026-11-26
