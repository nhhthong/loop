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

## Layout (meters, Y up) — see diagram in `src/world/Level.ts`
- Corridor: x∈[-0.55, 0.55], z∈[0.12, 6], height 2.4. Player wakes at z≈5.45 facing −z.
- Door wall at z=0, door x∈[-0.45, 0.45], h 2.1, hinged left, swings into the room (−z).
- L-hallway of a contemporary house, height 3: leg A x∈[-1, 1], z∈[-5, 0]; leg B x∈[1, 5], z∈[-5, -3]. Two dark windows on back wall z=−5.
- End of the L: locked door in the x=5 wall (never opens, nothing behind it). One side door (bathroom) in the z=−3 wall,
  left ajar, pitch-black room behind (`BATH` in `Level.ts`).
- Prop wall yaw convention (model front = +Z): left wall 90 · right wall −90 · z=−3 wall 180 · back wall 0 · x=5 wall −90.

## Code map
- `src/engine` — Renderer (post stack), Physics, Assets (cache, missing file → null), Input, Audio (`/audio/<name>.mp3`).
- `src/world` — `Level` (geometry, trims, stains), `Materials` (world-UV boxes, wet-surface shader injection, decals),
  `Window`, `Door`, `Props` (`PropSpec` auto-fit loader), `Furnish` (prop list + lamps), `Cockroaches` (box-surface crawler),
  `Atmosphere` (drips, dust).
- `src/player` — `Player` (Rapier kinematic capsule), `Hands` (runtime auto-rig of a photogrammetry hand scan).
- `src/game/Game.ts` — wake-up cinematic, interactions, scripted events, light flicker, ambience.

## Owner decisions (do not change without asking)
- **Phase 1 = layout of the house only.** No gameplay beyond walking and opening the first door with E.
- No telephone interaction/ringing (the phone is a static prop). No scripted scares.
- House is **tidy but deserted**: no damage, debris, stains or mold in the house. The entry corridor stays wet concrete with roaches.
- Outside the intro there is no visible hand/body: only camera movement + footstep sounds.
- Style: **Contemporary American house** — warm-white painted drywall, light wide-plank oak floor, plain white baseboards
  (no wainscot/crown), flat white slab doors with matte-black levers, slim black window frames with half-lowered venetian blinds,
  recessed downlights (some dead, one flickering) + warm lamps. Heirlooms kept on purpose: grandfather clock, oil portrait, rotary phone.

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
