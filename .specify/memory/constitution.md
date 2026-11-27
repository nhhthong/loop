<!--
Sync Impact Report
Version change: 1.0.0 -> 1.1.0 (MINOR: materially expanded verification + workflow guidance)
Modified principles: III. Goal-Driven Verification (fast simulation e2e is now the gate for gameplay/loop changes)
Added sections: Development Workflow — standard phase workflow (spec-kit → implement → e2e → PR/CI → owner review)
Removed sections: none
Templates: plan/tasks follow the workflow below (tasks end with e2e + PR/CI); specs 002–005 updated
Follow-up TODOs: none
History: 1.0.0 (2026-11-26) ratified retroactively from CLAUDE.md after Phase 1.
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
Every task has a verifiable success criterion. `npm run typecheck` (`tsc --noEmit`) MUST pass before every commit.
Changes to gameplay, loops, doors, triggers, sequences, input or the mobile profile MUST pass the simulation e2e suites
(`npm run e2e -- --q=low`, `--q=mobile`, and `npm run e2e:touch` when input/UI changed). They advance the real game logic
without rendering (`game.debugAdvance`), so a full multi-loop run takes well under a minute. Loops MUST be tested through
real passes (door 9 → stairwell → portal), never by calling `LoopDirector` directly; `--from=N` skips earlier checks only.
Each new loop adds its scenario to `e2e/loops.mjs`. Rendered headless screenshots (`--shots`, `?q=low`/`mobile` only — no
GPU in the cloud container) are taken only when the look matters. Isolated visual checks use `inspect.html`,
`handtest.html`, `scanprobe.html`. Scene-level look is verified by the owner on real hardware.

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

Standard workflow for every phase / feature (all developers):
1. **Clarify** with the owner (Principle I) — options and consequences, decisions recorded in the spec's "Owner decisions" table.
2. **Spec-kit**: `specs/NNN-name/` with `spec.md` (user stories, FR/SC), `plan.md` (design, Constitution Check), `tasks.md`.
3. **Implement** data-first (Principle VI); per-loop content only in `src/gameplay/loops.ts`; new assets with manifests (VII).
4. **Verify**: typecheck + build; e2e suites (Principle III) incl. a new scenario for new loop content; mobile checklist
   (CLAUDE.md: pool-relevant lights, no shadow-only scares, mobile budget, profile flags for heavy effects).
5. **Ship** only when the owner asks: commit → PR (summary + verification) → CI green (polled every 20 s) → merge →
   confirm the GitHub Pages deployment runs the merged commit.
6. **Owner review** on real hardware; fixes found later are recorded in the feature's `tasks.md` ("Post-release fixes").

Gates before commit: typecheck passes; required e2e suites pass; changed lines trace to the request; owner decisions untouched.

## Governance

This constitution supersedes other practices; CLAUDE.md is the runtime guidance and the source it was derived from.
Amendments require the owner's approval, a version bump (MAJOR: principle removal/redefinition; MINOR: new principle or
materially expanded guidance; PATCH: wording), and an update of dependent specs/plans. Every plan includes a Constitution
Check; violations MUST be justified in Complexity Tracking.

**Version**: 1.1.0 | **Ratified**: 2026-11-26 | **Last Amended**: 2026-11-27
