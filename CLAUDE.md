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
```
- Deployed by `.github/workflows/pages.yml` on every push to main → https://nhhthong.github.io/loop/ (Vite `base: './'`;
  load assets via root paths `/models/...` — `assetUrl()` / the LoadingManager URL modifier map them under the base). `ci.yml` = typecheck + build.

## Verification policy
- Default check = `npm run typecheck`. Do **not** run e2e / headless full-game runs unless truly needed or asked.
  The cloud container has no GPU: only `?q=low` (no shadows/AO/DOF/bloom, 1K textures) is viable for headless screenshots.
- Graphics presets live in `src/engine/Quality.ts` (`Q` singleton, read at boot; changing level reloads the page): `low|medium|high` (desktop) + `mobile`.
- For isolated visual checks use the light dev pages instead: `inspect.html?f=group/model,...` (model orientation/scale),
  `handtest.html?fov=&tx=&ty=&tz=&roll=&curl=` (hand pose), `scanprobe.html` (hand-scan landmarks).
- Scene-level look (lighting, prop placement) is verified by the owner on real hardware — ask for screenshots.

## Layout (meters, Y up) — rooms/openings are data in `src/data/layout.ts` (`ROOMS`, `*_DOOR`, `WIN_*`)
- Based on the owner's floor plan; walkway 2 m wide, ceilings 3 m; the void around the fan (atrium RA + stairwell RS + gallery RG) is 6 m.
- Corridor (wet, dark basement concrete `concrete_wall_005`): x∈[-0.55, 0.55], z∈[3.12, 9], h 2.4 (`CORRIDOR`). Player wakes at z≈8.45 facing −z; door at z=3 (`DIV_Z`) into R1.
- R1 entrance leg, 6.5 m (owner asked +3 m): first thing seen is a small wooden cabinet with a digital clock frozen at **23:59** + plant (east wall),
  then planter + plants + sconce east, dresser/mirror west → R2 corner with west windows → R6 alcove (rug, armchair + teddy, floor lamp).
- Flat north wall (owner: too many recesses looked unnatural): grandfather clock, window `WIN_C`, credenza (two lamps, rotary phone, painting).
  Bathroom RB south of R2 (ajar, pitch black).
- RA atrium (ceiling fan, creaking) → R8 narrow passage north to the **front entrance: locked grand double doors** (plan no. 8).
- L-shaped stair (owner chose option A): flight 1 (8 treads, riser 18 cm, tread 27 cm) rises +z in RS from the atrium, open east side
  with dark balustrade + newels → mid landing (y 1.63) turns 90° → flight 2 rises +x between walls (RF2) → dark upper landing RU (y 3.25)
  with a doorway onto black. From the atrium, looking up shows mostly walls, the fan and one dark corner of railing.
  RN nook beside flight 1 (coat rack, cabinet).
- RE east hall → **door 9** (same door type as the basement door): opens in loop 1 onto the **stairwell** (`STAIRWELL`): straight wet dark-grey
  concrete stair down +x (12 risers 17 cm, treads 28 cm, 1.1 m wide), water running down the treads + seeping down the walls, puddle, small bulb
  swaying on its cord. The bottom door is a **portal** (`PORTAL`, `portalMatrix`): R1 is seen through it from the basement doorway; crossing moves the player there.
- Walls are generated from room edges; heights differ per room (`roomEdge`). Prop yaw convention is in `data/props.ts`.

## Code map
Data-driven: content lives in `src/data`, builders in `src/world`, behaviour in `src/systems` / `src/gameplay` / `src/sequences`;
`src/game/Game.ts` is only the composition root (load → `wire()` → ordered `System[]` loop).
- `src/data` — pure data, no logic: `layout` (rooms, openings, `DIV_Z`, `PLAYER_START`, `surfaceAt`), `props` (`PropSpec[]`, yaw convention),
  `lights` (`LightSpec[]`: anchor prop, glow, tag, flicker; order seeds flicker), `audio` (`SOUNDS` → `SoundId` type for every call,
  footstep sets, looping `EMITTERS`), `creatures` (roach groups).
- `src/core` — `System` (`update(dt)`), `timeline` (`ease`, `seg`, `crossed`) for scripted sequences.
- `src/engine` — Renderer (post stack), Physics, Assets (cache, missing file → null), Input, Audio (typed `SoundId`), Quality (profiles + flags), FrameGovernor (fps cap, adaptive scale).
- `src/world` — builders: `Level` (geometry, trims, window frames + glass, stains), `Materials`, `Window`, `Door` (`DoorLike`, `Door`, `GrandDoor`),
  `HouseDoors` (named door leaves: basement/store/bath/front), `Props` (auto-fit loader), `Furnish` (props + lamps from data → `Lamp[]`
  with mutable `base` and optional `driver`), `fixtures` (fan, digital clock, planter, pipes, bulbs), `Probes`, `Cockroaches`, `Atmosphere` (drips).
- `src/gameplay` — `Interactable` (look-at + E), `DoorInteraction` (open sequence / locked rattle, `shutAndLock`, `onOpen` link), `TriggerZone`, `loops` (per-loop events).
- `src/systems` — `InteractionSystem`, `TriggerSystem`, `LightingSystem` (flicker, drivers, shadow gating, low-quality shadow proxy), `FanSystem`, `AmbienceSystem`,
  `PortalSystem` (render-target doorway + `Player.transport`), `PendantSystem` (swaying bulbs), `WaterSystem` (scrolling water normals), `LoopDirector`,
  `BrokenLightsSystem` (failing wiring via `Lamp.driver`).
- `src/sequences` — `MenuScene` (live 3D menu backdrop: R6 alcove, slow camera drift; Start → floor lamp flickers, blackout, intro), `IntroSequence` (wake-up timeline; `start/seek/stop`), `BathDoorSequence` (loop 2: camera turns, door closes slowly, locks), `ToiletKnockSequence` (loop 3: rattling, 5 knocks).
- `src/ui` — `UI` (lids, prompt, hint, crosshair), `Stats` (`?stats`), `TouchControls` (mobile: left stick → `Input.moveX/Y`, drag → `Input.look`, E → `Input.press`, pause).
- `src/player` — `Player` (Rapier kinematic capsule, keys + analog stick, footsteps by `surfaceAt`), `Hands` (runtime auto-rig of a photogrammetry hand scan).
- Dev hooks used by screenshot scripts: `game.debugView(x, z, yaw, pitch, eye?, y?)`, `game.debugIntro(t)`, `game.door` (basement door), `game.director`, `game.portal`, `game.knockScene`.

### The loop (Phase 2)
- Pass: door 9 → stairwell (door 9 shuts + locks behind on the stair) → stair-bottom door (opens together with the real basement door)
  → portal → basement doorway → basement door shuts + locks (trigger re-arms every pass) → `LoopDirector.enteredHouse()` → next loop.
- Per-loop content lives only in `src/gameplay/loops.ts` (`loopEvents`), acting through named handles (`HouseDoors`, `furn.props`,
  `TriggerSystem`, sequences, `AudioSys`). Loop 2: radio static on the `radio` prop; R2 trigger → `BathDoorSequence`; door 9 unlocked again.
  Loop 3: radio silent; all house lamps failing (`BrokenLightsSystem`); door 9 wide open → slams + locks when the player passes the bathroom
  door; then `ToiletKnockSequence` (handle rattles; after walking away ≥ 3.5 m and coming back within 1.6 m: 5 knocks, silence). Door 9 stays locked: end of Phase 3.
- New interactions = an `Interactable` in `InteractionSystem`; position events = a `TriggerZone`; timed scripts = a `System` with `seg`/`crossed`.
- Specs: `specs/002-phase2-loop-two/`, `specs/004-phase3-loop-three/`.

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
  Desktop presets keep the flags at their "off" values (behaviour unchanged). `?stats` shows fps / calls / tris / lights / scale on any device.
- **Checklist for every new phase**: (1) lights used by an event must be pool-relevant (near the player or via `LightingSystem.extraFocus.push(...)`);
  (2) never rely only on shadows for a scare (mobile has none); (3) check mobile budget before merging (headless `?q=mobile`: ≤ ~1,100 calls,
  ≤ 0.6 M tris; owner's phone at 30 FPS with `?stats`); (4) any new heavy effect gets a profile flag.
- Landscape required: portrait shows a "Rotate your device" overlay; Start requests fullscreen + landscape lock (best effort).
- Pause: pause button or app/tab hidden; tap the overlay to resume. Desktop keeps pointer-lock pause.

## Hands
- Model: `public/models/hands_bugs/male_hand_scan.glb` (photoscan, unrigged). Rig built in code from landmarks in `Hands.ts`.
- Finger fixes in `Hands.ts`: distal segments of index/middle/ring scaled 0.78, little finger ×1.5, tucked in and curled less.
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
