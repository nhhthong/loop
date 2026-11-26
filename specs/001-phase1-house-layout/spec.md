# Feature Specification: Phase 1 - House Layout, Wake-up and Doors

**Feature Branch**: `001-phase1-house-layout` (retroactive; no branch created)

**Created**: 2026-11-26

**Status**: Implemented

**Input**: User description: "Phase 1 = layout of the house only: a wet concrete basement corridor, a wake-up intro, a basement door that opens, swings shut and locks behind the player, and a furnished, lit, L-shaped house the player can walk through. No gameplay beyond walking and doors." (Retroactive documentation of the shipped behaviour; source: CLAUDE.md and the code.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Wake up in the wet basement (Priority: P1)

After pressing Start, the player wakes on the floor at the dead end of a dark, wet concrete corridor (feet at x 0.05, z 8.45, facing -z toward the door). The intro is heavy breathing plus an extreme close-up of the player's hand: eyes flutter open, focus pulls in, the wrist turns and the fingers flex, then the hand drops away, the view widens and the player stands. Control is then handed over.

**Why this priority**: It is the opening of the experience and the only place the hand is shown; without it the game has no start.

**Independent Test**: Start the game (`npm run dev`, `?q=low` is enough) and watch ~15 s: breathing, eyelids, blurred then focused hand, stand-up, crosshair and control hint appear.

**Acceptance Scenarios**:

1. **Given** the menu is loaded, **When** the player presses Start, **Then** the heartbeat plays, the view is zoomed (FOV 40) and blurred with eyelids closed, and movement is disabled.
2. **Given** the intro is running, **When** t is between ~2 s and ~11 s, **Then** the right hand is visible in a framed close-up (turning wrist, flexing fingers, fist, open) and the scan's wrist cut is never on screen.
3. **Given** the intro is running, **When** t reaches 15.2 s, **Then** the eye height has risen from 0.78 m to 1.62 m, FOV is 70, the crosshair is shown, the hint "WASD move · Mouse look · E interact · Shift run · C crouch" shows for 7 s, and the player can move and look.
4. **Given** the intro has finished, **When** the player looks around, **Then** no hand or body is visible.
5. **Given** the player is in the corridor, **Then** wet surfaces shine and reflect the caged bulb, water drips from the ceiling with ripples and plinks, and cockroaches crawl on the walls and floor.

---

### User Story 2 - Open the basement door and enter the house (Priority: P1)

The player walks the corridor (x -0.55..0.55, z 3.12..9, height 2.4), looks at the door at z = 3 and presses E. The handle clicks, the latch releases, the door creaks open. Once the player is inside the house, the door swings shut behind them and locks.

**Why this priority**: It is the one scripted gameplay beat of Phase 1 and the transition between the two environments.

**Independent Test**: After the intro, walk to the door, press E, walk through, and confirm it closes by itself and cannot be reopened.

**Acceptance Scenarios**:

1. **Given** the player is within 1.5 m of the basement door and aiming at its handle, **When** they press E, **Then** the prompt "[E]  Open door" was shown beforehand, a handle sound plays, and 0.25 s later the door opens with a creak.
2. **Given** the basement door is open and unlocked, **When** the player's z falls below 1.6 (DIV_Z - 1.4), **Then** the door swings shut with a creak, becomes locked, and a latch click plays 1.3 s later (once only).
3. **Given** the door is open, **Then** the light leaking under the door is off; **Given** it is closed, **Then** the leak is on.
4. **Given** the door has locked behind the player, **When** they press E on it, **Then** it only rattles (see Story 4).
5. **Given** the player crosses the threshold, **Then** footsteps change from concrete to wood and the ambience bed crossfades from corridor to house.

---

### User Story 3 - Explore the furnished L-shaped house (Priority: P2)

The player walks and looks through the house at their own pace. The route: the R1 entrance leg (6.5 m long) with a small wooden cabinet holding a digital clock frozen at 23:59 and a plant first in view; planter with plants, a sconce, dresser and mirror; the R2 corner with west windows; the R6 alcove (rug, armchair with a teddy bear, floor lamp); the flat north wall (grandfather clock, window, credenza with two lamps, rotary phone and painting); the bathroom south of R2, ajar and pitch black; the double-height atrium with a creaking ceiling fan; the L-shaped stair; the nook with coat rack and cabinet; the narrow passage to the locked front doors; the east hall with bookcase, oil portrait and photos, ending at door 9.

**Why this priority**: It is the core content of Phase 1 (the layout) but depends on Story 2 to be reachable.

**Independent Test**: Walk the whole route and compare against the room list in Key Entities; screenshots reviewed by the owner on real hardware.

**Acceptance Scenarios**:

1. **Given** the player stands in R1 just inside the door, **When** they look ahead and east, **Then** the clock cabinet with the 23:59 digital clock and the snake plant are the first prominent objects.
2. **Given** the player walks the house, **Then** collidable furniture (cabinets, armchair, floor lamp, clock, console, bookcase, coat rack, plants) blocks movement and walls/stairs are solid.
3. **Given** the player climbs flight 1 (8 treads, riser 18 cm, tread 27 cm), **When** they continue over the mid landing (y 1.63) and flight 2 (+x), **Then** they reach the dark upper landing RU (y 3.25) with a doorway onto black.
4. **Given** the player stands in the atrium and looks up, **Then** they see mostly walls, the slowly spinning, wobbling, creaking fan and one dark corner of railing.
5. **Given** the player is in the house, **Then** lights are warm-white pools with dark gaps (atrium, stairs and gallery mostly unlit), polished wood floor and semi-gloss walls show lamp streaks, and windows show pure black with a faint reflection.
6. **Given** the player is near the grandfather clock, the east-hall bulb, or the west windows, **Then** a ticking clock, a buzzing/unsteady bulb, and wind are heard positionally.

---

### User Story 4 - Locked doors rattle (Priority: P2)

Every closed door the player can interact with (door 9 to the store, the front grand double doors, and the basement door after it locked) only rattles with a locked sound on E.

**Why this priority**: It defines Phase 1's limit (no exit) and gives feedback that doors are interactive.

**Independent Test**: Press E at door 9 and at the front doors; each rattles with one of two locked sounds.

**Acceptance Scenarios**:

1. **Given** the player is within 1.5 m aiming at door 9 (east hall, x = 10) or the front double doors (north end of R8, z = -9.6), **When** they press E, **Then** the door rattles and `door_locked_1` or `door_locked_2` plays.
2. **Given** the bathroom door is ajar, **Then** it is part of the scene but offers no prompt and no interaction.

---

### User Story 5 - Graphics quality presets (Priority: P3)

From the menu the player picks Low, Medium or High; the choice reloads the page and is remembered. `?q=low|medium|high` overrides it.

**Why this priority**: Supports weak hardware and headless checks; not part of the horror experience itself.

**Independent Test**: Click each preset, confirm the page reloads with the selected button highlighted and the matching feature set.

**Acceptance Scenarios**:

1. **Given** no URL parameter and no stored choice, **When** the game loads, **Then** Medium is used.
2. **Given** Low, **Then** exactly one shadow is cast (a proxy light following the strongest lamp near the player) and there is no AO, DOF, bloom or SMAA, with 1K textures.
3. **Given** Medium or High, **Then** per-lamp shadows, AO, DOF (intro only), bloom and SMAA are enabled; High raises pixel ratio cap (2), shadow map (1024), AO quality and anisotropy (16).
4. **Given** storage is blocked, **Then** the game still loads with the URL choice or Medium.

---

### User Story 6 - Credits and pause (Priority: P3)

The menu has a Credits link listing every model (name, author, license, URL), every sound with a name, and the texture source. Releasing the pointer lock pauses the game with "Paused - click to resume".

**Why this priority**: Legal attribution for assets; basic usability.

**Independent Test**: Click Credits; confirm text lists models, sounds and Poly Haven; click closes it. Press Esc in game and click to resume.

**Acceptance Scenarios**:

1. **Given** the menu, **When** Credits is clicked, **Then** an overlay lists entries read from the `manifest.json` files and closes on click.
2. **Given** the game is running, **When** pointer lock is lost, **Then** simulation and render stop and the pause overlay shows; clicking resumes.

### Edge Cases

- The player moves back toward the door before it has been opened: it stays closed; the leak light stays on.
- The player opens the door but never passes z < 1.6: the door stays open until they do (trigger needs `isOpen` and not `locked`).
- The player runs toward walls or props: the Rapier capsule controller slides along them; autostep 0.22 m climbs stair treads (riser 0.18 m).
- A model or sound file is missing: the asset loader resolves to null, that prop/emitter is skipped, the game keeps running.
- Frame hitch: delta time is capped at 1/20 s.
- Storage unavailable: quality falls back to URL parameter or Medium.
- Credits manifests missing or unreadable: those entries are skipped silently.
- Pressing E while an open sequence runs or the door is open: no prompt, no effect.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST show a menu (title LOOP, loading bar, Start enabled only after load, quality buttons, tips, Credits link).
- **FR-002**: The system MUST start the player at x 0.05, z 8.45 facing -z and run the 15.2 s wake-up intro (heavy breathing gasps, eyelids, DOF focus pull, hand close-up at FOV 40, widen to FOV 70, stand from eye 0.78 m to 1.62 m) with player control disabled until it ends.
- **FR-003**: The hand MUST be visible only during the intro and only as a framed close-up; no sleeve or forearm extension.
- **FR-004**: Outside the intro the system MUST show no hand or body: camera movement and footstep sounds only (no floor creaks).
- **FR-005**: The player MUST be able to walk (WASD/arrows, 1.25 m/s), run forward (Shift, 2.3 m/s), crouch (C/Ctrl, speed halved, lower eye) and look with the mouse, with head bob, collisions and stair climbing.
- **FR-006**: Footsteps MUST use concrete sounds for z > 3.05 and wood sounds elsewhere.
- **FR-007**: The corridor MUST be wet dark concrete, x -0.55..0.55, z 3.12..9, height 2.4, with a caged unstable bulb (flicker drop-outs), pipes, ceiling drips with floor ripples and plinks, and cockroaches (10 in the corridor, 2 in the R1 entrance leg).
- **FR-008**: The system MUST provide a basement door at z = 3 that opens on E (prompt "[E]  Open door", reach 1.5 m, aim dot > 0.82), then shuts and locks once the player's z < 1.6 and never reopens.
- **FR-009**: Locked doors (store door 9, front grand double doors, basement after locking) MUST rattle with a locked sound on E.
- **FR-010**: The house MUST consist of rooms R1, R2, R6, RA, R8, RE, RB, RS, RN, RF2, RU as defined in `data/layout.ts` with openings for the bath door, front door, store door, windows A/B/C and the upper doorway.
- **FR-011**: R1 MUST be 6.5 m long with a small wooden cabinet holding a digital clock frozen at 23:59 and a plant as the first thing seen.
- **FR-012**: The stair MUST be L-shaped: flight 1 of 8 treads (riser 18 cm, tread 27 cm) rising +z with an open east side, dark balustrade and newels; mid landing at y 1.63; flight 2 rising +x between walls; dark upper landing at y 3.25 with a doorway onto black.
- **FR-013**: The north wall of R2/RA MUST be flat: grandfather clock, window WIN_C, credenza with two lamps, rotary phone and a painting.
- **FR-014**: The bathroom MUST be ajar and pitch black; the front entrance MUST be a locked grand double door at the end of R8; door 9 MUST be the same door type as the basement door, shut.
- **FR-015**: Props MUST be placed from `data/props.ts`, lights from `data/lights.ts` (warm, flickering, tagged `corridor`/`leak`/`lamp`); a lit-from-inside shade or bulb glow MUST be drawn at lamps.
- **FR-016**: The atrium ceiling fan MUST spin slowly and unevenly with a slight wobble and a looping creak sound.
- **FR-017**: Looping positional sounds (fan creak, clock tick, light buzz, window wind x2) MUST come from `EMITTERS` in `data/audio.ts`; ambience beds (corridor, house) MUST crossfade by the player's side of the basement door.
- **FR-018**: Outside the windows MUST be pure black (no sky, moon, rain); there MUST be no fog and no floating dust.
- **FR-019**: The visual style MUST follow the owner's decisions: muted warm-grey/olive grade (saturation ~0.42), semi-gloss ivory plaster walls with light matte grime, polished dark wood floor, stepped baseboards and crown molding, painted four-panel doors, white 6-over-6 sash windows, subtle grain/CA/vignette, bloom on bright sources only.
- **FR-020**: The system MUST offer Low/Medium/High presets selectable in the menu (persisted, reload on change) and by `?q=`; Low MUST keep exactly one shadow.
- **FR-021**: A Credits overlay MUST list models, sounds and textures from the manifests; pointer-lock loss MUST pause the game.
- **FR-022**: All in-game text MUST be English; there MUST be no dialogue or subtitles.
- **FR-023**: Every sound call MUST use an id from `SOUNDS`; every shipped model/sound MUST have a manifest entry.

### Key Entities

- **Room**: named axis-aligned box (x0, x1, z0, z1, floor y0, height h; optional `dark`, wall `skip`). R1 entrance leg, R2 corner, R6 alcove, RA atrium (6 m), R8 passage, RE east hall, RB bath (2.6 m, dark), RS stairwell (6 m), RN nook, RF2 second flight (floor 1.625), RU upper landing (floor 3.25).
- **Opening**: window or door gap in a wall (axis, wall line, span, y range): BATH_DOOR, EXIT_DOOR, STORE_DOOR, WIN_A/B/C, UPPER_DOOR.
- **Door**: leaf in an opening; `locked`, `isOpen`, handle, open/close/rattle. Kinds: basement door, store door 9 (locked), bath (ajar), front grand double door (locked).
- **Prop**: named placed model (position, yaw, size, collide, aging, only-node filter); heirlooms: grandfather clock, oil portrait, rotary phone (static).
- **Lamp**: point light (colour, intensity, distance, shadow, flicker, tag, anchor prop, glow, optional cord) with a mutable base intensity and optional per-frame driver.
- **Sound / Emitter**: typed sound id, footstep sets per surface, looping positional emitters.
- **Quality preset**: pixel ratio, shadows, shadow proxy, AO, DOF, bloom, SMAA, texture folder, probe size, anisotropy.
- **Roach group**: model, count, surface box, climb axes, length.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From pressing Start, the player has full control after exactly 15.2 s of intro.
- **SC-002**: From the basement door opening, the door is closed and locked within 2 s of the player passing z < 1.6, in 100% of runs.
- **SC-003**: All 11 rooms and 7 openings listed in `data/layout.ts` are reachable on foot except RU's doorway (opens onto black) and doors that are locked; no walkable route leaves the house.
- **SC-004**: `npm run typecheck` passes with 0 errors.
- **SC-005**: On Low quality the scene renders with exactly 1 shadow-casting light at any time and no post effects beyond tonemap/grade/vignette/grain.
- **SC-006**: 100% of the 24 sound ids in `SOUNDS` have a file in `public/audio`, and every model group has a `manifest.json`.
- **SC-007**: On real hardware (owner review) the image is judged crisp (no haze), wet surfaces visibly reflect lights, and the house reads as cosy lamp pools with dark gaps.
- **SC-008**: Crosshair prompt "[E]  Open door" appears only when a usable door is within 1.5 m and aimed at.

## Assumptions

- Target is a desktop browser with keyboard, mouse and pointer lock; no gamepad or touch.
- Owner verifies scene-level look on real hardware; automated visual tests do not exist (no test framework).
- No save state: every page load starts at the intro.
- The cloud container has no GPU, so only Low is usable for headless screenshots.
- All 3D models and sounds are third-party assets under permitted licenses with manifests.

## Out of Scope

- The loop itself (door 9 -> basement -> start of R1), `LoopDirector`, per-loop variations: not implemented, owner must define Phase 2 first.
- Telephone interaction or ringing (the phone is a static prop); any scripted scares; floating dust motes; floor creaks.
- Visible hand/body outside the intro; dialogue and subtitles.
- Damage, debris or trash in the house; fog, sky, moon or rain outside windows.
- Opening the bathroom door, going through the upper doorway, store or front doors (locked or inert).
- Inventory, pickups, saving, settings beyond graphics quality.

## Resolved Decisions (owner, 2026-11-26: "current gameplay is fine")

- The ajar bathroom door stays inert on E (no prompt, no rattle); "every closed door rattles" applies to closed doors only.
- Door 9 (store) and the front grand doors are locked from boot; only the basement door opens, then shuts and locks behind the player.
- No numeric fps target for Phase 1.
- Credits now reads all 7 model manifests, including `house` (ceiling fan, CC BY 4.0).
