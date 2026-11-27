# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes, followed by project-specific instructions.
General guidelines adapted from https://github.com/multica-ai/andrej-karpathy-skills/blob/main/CLAUDE.md

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

**Project rule (owner's explicit instruction):** never guess on ambiguous requirements. Ask detailed questions
(list the concrete options and their visual/gameplay consequences) before building. Guessing that drifts from
the owner's intent is treated as a defect.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Project: LOOP

First-person horror vignette. TypeScript · three.js r170 · Rapier (`@dimforge/rapier3d-compat`) · Vite 5 ·
`postprocessing` + `n8ao`. Target look: realistic, AAA-grade, lonely and creepy.

## Communication
- Owner writes in Vietnamese; reply in Vietnamese. Answer first, few words, no filler.
- In-game text (menu, prompts, hints) is **English**. No dialogue/subtitles in the game.

## Commands
```bash
npm run dev        # http://localhost:5173  (?q=low|medium|high — also selectable in the menu)
npm run typecheck  # tsc --noEmit — must pass before every commit
npm run build
npm run e2e          # loop e2e (needs npm run dev): --q=low|mobile  --from=N (jump to loop N)  --to=N  --shots=DIR
npm run e2e:touch    # touch controls (Pixel 7) + desktop UI
npm run bench        # performance budgets (e2e/budgets.json; numbers in specs/006-performance/budget.md): --q=low|mobile --save=DIR --diff=DIR
```
- Deployed by `.github/workflows/pages.yml` on every push to main → https://nhhthong.github.io/loop/ (Vite `base: './'`;
  load assets via root paths `/models/...` — `assetUrl()` / the LoadingManager URL modifier map them under the base). `ci.yml` = typecheck + build.

## Workflow (every phase / feature, every developer) — see `.specify/memory/constitution.md`
1. Clarify ambiguous requirements with the owner first (options + consequences); record decisions in the spec.
2. Spec-kit: `specs/NNN-name/{spec,plan,tasks}.md` (owner decisions table, FR/SC, Constitution Check, tasks ending with e2e + PR/CI).
3. Implement data-first; per-loop content only in `src/gameplay/loops.ts`; assets + manifests.
4. Verify: `npm run typecheck`, `npm run build`, `npm run e2e -- --q=low` and `-- --q=mobile` (+ `npm run e2e:touch` if input/UI changed);
   new loop content = new scenario in `e2e/loops.mjs`; mobile checklist below.
5. Commit / PR / merge only when the owner asks; poll CI every 20 s; confirm GitHub Pages deployed the merged commit.
6. Owner reviews on real hardware; later fixes go to the feature's `tasks.md` under "Post-release fixes".

## Verification policy
- `npm run typecheck` before every commit. Gameplay/loop/door/trigger/sequence/input/mobile changes: run the e2e suites.
- **e2e = simulation, not rendering** (`e2e/`): the real-time loop is held (`game.debugHold()`) and the real game logic is advanced with
  `game.debugAdvance(sec)` (physics, triggers, sequences, portal — no frames drawn), so a full 3-loop run takes ~20–30 s incl. loading.
  Loops are reached through **real passes** (door 9 → stairwell → stair-bottom door → portal), never by calling `LoopDirector` directly
  (that once hid a broken second pass). `--from=N` only skips the checks of earlier loops. Add each new loop as `N: async (t) => {...}` in `e2e/loops.mjs`.
- Rendered screenshots only when the look matters (`--shots=DIR`, `game.debugRender()`). The cloud container has no GPU:
  only `?q=low` / `?q=mobile` are viable headless; each rendered frame costs seconds.
- Graphics presets live in `src/engine/Quality.ts` (`Q` singleton, read at boot; changing level reloads the page): `low|medium|high` (desktop) + `mobile`.
  Desktop defaults to **low** (owner: fastest first load, ~23 MB vs ~80 MB for Medium/High); Medium/High from the menu are remembered.
- For isolated visual checks use the light dev pages instead: `inspect.html?f=group/model,...` (model orientation/scale),
  `handtest.html?fov=&tx=&ty=&tz=&roll=&curl=` (hand pose), `scanprobe.html` (hand-scan landmarks).
- Scene-level look (lighting, prop placement) is verified by the owner on real hardware — ask for screenshots.

## Where things are (read on demand — not loaded automatically)
- `docs/architecture.md` — house layout (rooms, openings, stairwell, portal), full code map, the loop mechanics and per-loop events. Update it when structure changes.
- `docs/assets-and-hands.md` — hand rig facts and asset/licence rules (every model/sound needs a `manifest.json` entry; commercial-use licences only).
- `specs/NNN-*/` — spec-kit per feature; `specs/006-performance/budget.md` — performance budgets (run before merging).
- Architecture rule in one line: content in `src/data`, builders in `src/world`, behaviour in `src/systems|gameplay|sequences`; `Game.ts` is only the composition root; per-loop content only in `src/gameplay/loops.ts`.

## Owner decisions (do not change without asking)
- **Phase 1 = layout of the house only — DONE** (corridor + L-hallway layout, lighting, intro). No gameplay beyond walking and doors:
  the basement door opens with E, swings shut and locks behind the player; every closed door then only rattles (locked) on E.
- **Phase 2 = the loop + loop 2 events — DONE**; **Phase 3 = loop 3 — DONE** (see "The loop"). Ask the owner before adding loop 4 or any other mechanic.
- No telephone interaction/ringing (the phone is a static prop). No scripted scares except the owner-requested loop events (loop 2:
  radio static, bathroom door closing on its own; loop 3: failing lights, door 9 slam, bathroom rattling + 5 knocks). No floating dust motes (owner: they block the view).
- House is deserted, no damage/debris; walls lightly grimy. The entry corridor stays wet concrete with roaches.
- Outside the intro there is no visible hand/body: only camera movement + footstep sounds (no floor creaks).
- Image must be crisp (AAA, not hazy): no fog, subtle grain/CA, bloom only on bright sources, DOF only during the wake-up.
- Visual direction (owner's reference image = photoreal horror hallway; take the genre look, do **not** copy any specific game's layout/assets):
  muted, near-neutral warm-grey grade with a faint olive cast (`GradeEffect`, saturation ~0.4) — owner rejected both
  monochrome and strongly amber; lamps warm-white. Cosy pools of light with dark gaps; hard shadows, deep blacks,
  grain/vignette/chromatic aberration, bloom halos on bulbs. Owner feedback: not too dark — wet surfaces must visibly shine and
  reflect the lights (wet = dark glossy puddles + specular streaks, `makeWet`; polished house floor).
- Architecture: aged ivory plaster walls in **semi-gloss paint** (roughness ~0.32, lamps leave sheen streaks) with **light grime only** — grime patches matte (`makeGrime`, no trash on the floor), dark wood floor,
  tall stepped baseboards + crown molding, painted four-panel doors, white 6-over-6 sash windows (no blinds/curtains);
  outside the windows is pure black (no sky/moon/rain), glass keeps only a faint reflection.
- Furnished nooks/recesses (house must not be a bare straight L). Lights are data in `data/lights.ts`, tagged `corridor`, `leak`, `lamp`.
  Heirlooms kept: grandfather clock, oil portrait, rotary phone; vintage radio on the console (silent in loop 1).
- `low` quality keeps exactly **one** shadow: a proxy light that follows the strongest lamp near the player (`updateShadowProxy`).

## Menu (owner decisions)
- Left-aligned vertical menu (LOOP title, Start · Graphics (desktop only) · Credits) over the **live 3D R6 alcove** (armchair + teddy, floor lamp)
  seen from beside the west window; very slow camera drift. Loading shows black + bar; the scene fades in when ready.
  Start: the floor lamp flickers, lights cut to black, then the wake-up intro. `Game` modes: loading → menu (`menuSystems`) → game.

## Mobile (owner decisions)
- Touch devices (`IS_TOUCH` in `Input.ts`): minimal controls only — left virtual stick (move), drag to look, E button, pause button (top right).
  No run/crouch on mobile. Hand-coded (no library).
- **One fixed graphics profile `mobile`** (`Quality.ts`; no quality selector on the mobile menu; `?q=mobile` to test on desktop): stable 30 FPS cap,
  no shadows/AO/DOF/bloom/SMAA, light pool of 5 (`Q.lightPool`), lite wet shader (`Q.wetLite`), adaptive resolution (`FrameGovernor`,
  `Q.scaleRange`), half-res portal (`Q.portalScale`). Systems read only profile flags — never `IS_TOUCH` in rendering/lighting code.
  Desktop presets keep the other flags "off"; desktop `low` also uses a light pool of 8 (load 4.4 → 2.7 s: fewer per-pixel lights = faster shader compile). `?stats` shows fps / calls / tris / lights / scale on any device.
- **Checklist for every new phase**: (1) lights used by an event must be pool-relevant (near the player, `landmark: true` in `data/lights.ts` for lamps seen from afar, or `LightingSystem.extraFocus.push(...)`);
  (2) never rely only on shadows for a scare (mobile has none); (3) check the budgets before merging (`npm run bench -- --q=mobile` and `--q=low`, numbers in
  `specs/006-performance/budget.md`; owner's phone at 30 FPS with `?stats`); (4) any new heavy effect gets a profile flag.
- Landscape required: portrait shows a "Rotate your device" overlay; Start requests fullscreen + landscape lock (best effort).
- Pause: pause button or app/tab hidden; tap the overlay to resume. Desktop keeps pointer-lock pause.

