# LOOP — architecture reference

Moved out of CLAUDE.md to keep it short. Read on demand; keep it current when the structure changes.

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
- Staged loading: stage 1 (geometry, early props, `EARLY_SOUNDS`) sets `window.__ready` and enables Start; stage 2 (`loadLate`: props with
  `late: true` via `furnishLate`, `LATE_SOUNDS`) runs in the background and sets `window.__loaded`; the basement door stays locked until then.
- Production: `vite.config.ts` emits a versioned service worker (`sw.js`, cache-first for assets/models/textures/audio) and splits vendor chunks
  (three, postfx, rapier). `tools/prune-models.mjs` strips unused meshes/textures from GLBs (idempotent, `--dry`).
- `src/data` — pure data, no logic: `layout` (rooms, openings, `DIV_Z`, `PLAYER_START`, `surfaceAt`), `props` (`PropSpec[]`, yaw convention),
  `lights` (`LightSpec[]`: anchor prop, glow, tag, flicker; order seeds flicker), `audio` (`SOUNDS` → `SoundId` type for every call,
  footstep sets, looping `EMITTERS`), `creatures` (roach groups).
- `src/core` — `System` (`update(dt)`), `timeline` (`ease`, `seg`, `crossed`) for scripted sequences.
- `src/engine` — Renderer (post stack), Physics, Assets (cache, missing file → null), Input, Audio (typed `SoundId`), Quality (profiles + flags), FrameGovernor (fps cap, adaptive scale).
- `src/world` — builders: `Level` (geometry, trims, window frames + glass, stains; `mergeStatic` merges opaque meshes by material), `Materials` (wet/grime fbm masks baked once to textures on desktop; `wetLite` path on mobile), `Window`, `Door` (`DoorLike`, `Door`, `GrandDoor`),
  `HouseDoors` (named door leaves: basement/store/bath/front), `Props` (auto-fit loader), `Furnish` (props + lamps from data → `Lamp[]`
  with mutable `base` and optional `driver`), `fixtures` (fan, digital clock, planter, pipes, bulbs), `Probes`, `Cockroaches`, `Atmosphere` (drips).
- `src/gameplay` — `Interactable` (look-at + E), `DoorInteraction` (open sequence / locked rattle, `shutAndLock`, `onOpen` link), `TriggerZone`, `loops` (per-loop events).
- `src/systems` — `InteractionSystem`, `TriggerSystem`, `LightingSystem` (flicker, drivers, shadow cache + per-frame budget, low-quality shadow proxy, mobile light pool), `FanSystem`, `AmbienceSystem`,
  `PortalSystem` (render-target doorway + `Player.transport`), `ZoneVisibility` (hides what is behind the shut basement door), `PendantSystem` (swaying bulbs), `WaterSystem` (scrolling water normals), `LoopDirector`,
  `BrokenLightsSystem` (failing wiring via `Lamp.driver`).
- `src/sequences` — `MenuScene` (live 3D menu backdrop: R6 alcove, slow camera drift; Start → floor lamp flickers, blackout, intro), `IntroSequence` (wake-up timeline; `start/seek/stop`), `BathDoorSequence` (loop 2: camera turns, door slams shut in 0.8 s, locks), `ToiletKnockSequence` (loop 3: rattling until E, then 5 violent knocks).
- `src/ui` — `UI` (lids, prompt, hint, crosshair), `Stats` (`?stats`), `TouchControls` (mobile: left stick → `Input.moveX/Y`, drag → `Input.look`, E → `Input.press`, pause).
- `src/player` — `Player` (Rapier kinematic capsule, keys + analog stick, no auto-slide below 0.9 rad slopes, footsteps by `surfaceAt`), `Hands` (runtime auto-rig of a photogrammetry hand scan).
- Dev/test hooks: `game.debugHold()`, `debugAdvance(sec)`, `debugRender()`, `debugPress(code)`, `debugTeleport(x, z, yaw, y?)` (keeps sequences intact),
  `debugView(x, z, yaw, pitch, eye?, y?)` (also resets camera/control), `debugIntro(t)`; `game.door`, `game.doors`, `game.director`, `game.portal`, `game.knockScene`.

### The loop (Phase 2)
- Pass: door 9 → stairwell (door 9 shuts + locks behind on the stair) → stair-bottom door (opens together with the real basement door)
  → portal → basement doorway (the stair-bottom door snaps shut again right after the crossing) → basement door shuts + locks (trigger re-arms
  every pass) → `LoopDirector.enteredHouse()` → next loop.
- Per-loop content lives only in `src/gameplay/loops.ts` (`loopEvents`), acting through named handles (`HouseDoors`, `furn.props`,
  `TriggerSystem`, sequences, `AudioSys`). Loop 2: radio static on the `radio` prop; R2 trigger → `BathDoorSequence`; door 9 unlocked again.
  Loop 3: radio silent; house lamps stutter then die (`BrokenLightsSystem`), one dim R1 sconce left, door-9 + stair bulbs lit; door 9 wide open → slams + locks
  when the player comes within 2 m; then `ToiletKnockSequence` (handle rattles nonstop until E on the bathroom door → 5 violent knocks in 1.5 s, silence).
  Door 9 stays locked: end of Phase 3.
- New interactions = an `Interactable` in `InteractionSystem`; position events = a `TriggerZone`; timed scripts = a `System` with `seg`/`crossed`.
- Specs: `specs/002-phase2-loop-two/`, `specs/004-phase3-loop-three/`, `specs/005-fast-e2e/`, `specs/006-performance/`, `specs/007-perf-round2/`.
