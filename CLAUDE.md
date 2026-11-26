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
- In-game text (subtitles, prompts, hints) is Vietnamese.

## Commands
```bash
npm run dev        # http://localhost:5173  (?q=low|medium|high — also selectable in the menu)
npm run typecheck  # tsc --noEmit — must pass before every commit
npm run build
```

## Verification policy
- Default check = `npm run typecheck`. Do **not** run e2e / headless full-game runs unless truly needed or asked.
  The cloud container has no GPU: only `?q=low` (no shadows/AO/DOF/bloom, 1K textures) is viable for headless screenshots.
- Graphics presets live in `src/engine/Quality.ts` (`Q` singleton, read at boot; changing level reloads the page).
- For isolated visual checks use the light dev pages instead: `inspect.html?f=group/model,...` (model orientation/scale),
  `handtest.html?fov=&tx=&ty=&tz=&roll=&curl=` (hand pose), `scanprobe.html` (hand-scan landmarks).
- Scene-level look (lighting, prop placement) is verified by the owner on real hardware — ask for screenshots.

## Layout (meters, Y up) — rooms/openings are data in `src/world/Level.ts` (`ROOMS`, `*_DOOR`, `WIN_*`)
- Based on the owner's floor plan; walkway 2 m wide, ceilings 3 m; the void around the fan (atrium RA + stairwell RS + gallery RG) is 6 m.
- Corridor (wet concrete): x∈[-0.55, 0.55], z∈[0.12, 6], h 2.4. Player wakes at z≈5.45 facing −z; door at z=0 into R1.
- R1 entrance leg (planter + plants + sconce east, dresser/mirror west) → R2 corner with west windows → R6 alcove (rug, armchair + teddy, floor lamp).
- North recesses: R3 (grandfather clock), Rs (credenza, two lamps, rotary phone, painting). Bathroom RB south of R2 (ajar, pitch black).
- RA atrium (ceiling fan, creaking) → R8 narrow passage north to the **front entrance: locked grand double doors** (plan no. 8).
- RS stairs rise +z to a landing/gallery RG at y=3 (railing seen from below, dark, night light). RN nook beside the stairs (coat rack, cabinet).
- RE east hall → **door 9** (down to the store, same door type as the basement door; shut).
- Walls are generated from room edges; heights differ per room (`roomEdge`). Prop yaw convention is in `Furnish.ts`.

## Code map
- `src/engine` — Renderer (post stack), Physics, Assets (cache, missing file → null), Input, Audio (`/audio/<name>.mp3`).
- `src/world` — `Level` (geometry, trims, stains), `Materials` (world-UV boxes, wet-surface shader injection, decals),
  `Window`, `Door`, `Props` (`PropSpec` auto-fit loader), `Furnish` (prop list + lamps), `Cockroaches` (box-surface crawler),
  `Atmosphere` (drips, dust).
- `src/player` — `Player` (Rapier kinematic capsule), `Hands` (runtime auto-rig of a photogrammetry hand scan).
- `src/game/Game.ts` — wake-up cinematic, interactions, scripted events, light flicker, ambience.

## Owner decisions (do not change without asking)
- **Phase 1 = layout of the house only — DONE** (corridor + L-hallway layout, lighting, intro). No gameplay beyond walking and opening the first door with E.
  Ask the owner what Phase 2 contains before adding any mechanic.
- No telephone interaction/ringing (the phone is a static prop). No scripted scares.
- House is deserted, no damage/debris; walls lightly grimy. The entry corridor stays wet concrete with roaches.
- Outside the intro there is no visible hand/body: only camera movement + footstep sounds.
- Visual direction (owner's reference image = photoreal horror hallway; take the genre look, do **not** copy any specific game's layout/assets):
  muted, near-neutral warm-grey grade with a faint olive cast (`GradeEffect`, saturation ~0.4) — owner rejected both
  monochrome and strongly amber; lamps warm-white. Cosy pools of light with dark gaps; hard shadows, deep blacks,
  grain/vignette/chromatic aberration, bloom halos on bulbs. Owner feedback: not too dark — wet surfaces must visibly shine and
  reflect the lights (wet = dark glossy puddles + specular streaks, `makeWet`; polished house floor).
- Architecture: aged ivory plaster walls with **light grime only** (`makeGrime`, no trash on the floor), dark wood floor,
  tall stepped baseboards + crown molding, painted four-panel doors, white 6-over-6 sash windows (no blinds/curtains).
- Furnished nooks/recesses (house must not be a bare straight L). Lights are tagged in `Furnish.ts` (`corridor`, `leak`, `lamp`).
  Heirlooms kept: grandfather clock, oil portrait, rotary phone.
- `low` quality keeps exactly **one** shadow: a proxy light that follows the strongest lamp near the player (`updateShadowProxy`).

## Hands
- Model: `public/models/hands_bugs/male_hand_scan.glb` (photoscan, unrigged). Rig built in code from landmarks in `Hands.ts`.
- **Show the hand only as long as the model is.** No sleeve, no procedural forearm extension.
- The scan's wrist cut must never be on screen → the hand is shown only in framed close-ups
  (intro: FOV 40, hand raised from below). The hand appears **only in the intro**.
- Intro = heavy breathing + close-up of the hand (turning wrist, flexing fingers).

## Assets
- Only licenses allowing commercial use: Sketchfab `by` / `cc0`, Poly Haven CC0, Freesound CC0.
- Every model/sound must be recorded in its `manifest.json` (author, license, URL) — Credits screen reads them.
- Sketchfab/Freesound API auth is injected by the environment proxy; plain `curl` works, no key needed.
- Optimise new GLBs before committing: `gltf-transform resize --width 1024 --height 1024`, `gltf-transform webp`,
  `simplify` for >150k faces, `metalrough` for spec-gloss materials. Keep each file small (repo has no LFS).
