# Data Model: Phase 1

All schemas are TypeScript types in `src/data` (pure data) or the builders that consume them. Meters, Y up, -z is "up" on the owner's plan.

## Room (`data/layout.ts`)
`{ name, x0, x1, z0, z1, y0, h, dark?, skip?: ('n'|'s'|'e'|'w')[] }` - `skip` omits that auto-wall side.

| Room | x | z | y0 | h | Note |
|---|---|---|---|---|---|
| R1 | -1..1 | -3.5..3 | 0 | 3 | entrance leg 6.5 m, no south wall (`skip s`) |
| R2 | -1..3.4 | -5.5..-3.5 | 0 | 3 | corner, west windows |
| R6 | -1..1.6 | -6.6..-5.5 | 0 | 3 | alcove |
| RA | 3.4..7.2 | -5.5..-3.5 | 0 | 6 | atrium, fan at (5.1, 6, -4.5) |
| R8 | 5.6..6.8 | -9.6..-5.5 | 0 | 3 | passage to front doors |
| RE | 7.2..10 | -5.5..-3.5 | 0 | 3 | east hall, door 9 at x = 10 |
| RB | 1.24..3.16 | -3.26..-1.2 | 0 | 2.6 | bath, `dark` |
| RS | 3.4..4.6 | -3.5..0.4 | 0 | 6 | stairwell, flight 1 |
| RN | 4.6..6.4 | -3.5..-1.24 | 0 | 3 | nook |
| RF2 | 4.6..6.76 | -1..0.4 | 1.625 | 6 | flight 2 |
| RU | 6.76..7.6 | -1..0.4 | 3.25 | 6 | upper landing |

Other constants: `CORRIDOR {x -0.55..0.55, z 3.12..9, h 2.4}`, `ROOM_H` 3, `DIV_Z` 3, `DOOR {x -0.45..0.45, h 2.1}`, `WALL_T` 0.12, `STAIRS {riser 3.25/18, tread 0.27, perFlight 8, ...}`, `FAN (5.1, 6, -4.5)`, `PLAYER_START (0.05, 0, 8.45)`, `surfaceAt(p)`: concrete if `p.z > DIV_Z + 0.05` else wood.

## Opening (`data/layout.ts`)
`{ along: 'x'|'z', at, a0, a1, y0, y1 }`. Instances: `BATH_DOOR`, `EXIT_DOOR` (front, z -9.6), `STORE_DOOR` (x 10), `WIN_A`, `WIN_B` (x -1), `WIN_C` (z -5.5), `UPPER_DOOR` (x 7.6). `DOOR_OPENINGS` = those that get a frame (bath, exit, store, upper).

## Door (`world/Door.ts`, `world/HouseDoors.ts`)
`DoorLike { handle, isOpen, locked, handleWorld(), open(), close(), rattle(), update(dt) }`. `HouseDoors { basement, store (locked), bath (ajar, angle 0.6), front (GrandDoor, locked), all }`.

## Prop (`data/props.ts` -> `world/Props.ts` `PropSpec`)
`{ url, pos, rot?, pre?, h?|w?, scale?, floor?, collide?, shadow?, name?, only?, tint?, age? }`. Named props are looked up by `Furnished.props` (e.g. `clock`, `ceilingFan`, `cageLamp`). Model front = +Z; yaw convention in the file header.

## Lamp (`data/lights.ts` `LightSpec` -> `world/Furnish.ts` `Lamp`)
Spec: `{ id, color, intensity, dist, shadow, flicker?, tag?: 'corridor'|'leak'|'lamp', pos, onProp?, requires?, glow?, cord? }`; `glow` = `{bulb, r?}` or `{shade, rTop, rBot, h, dy?}`. Runtime `Lamp { id, light, base, flicker, tag, glow?, driver? }`; intensity each frame = `base * flicker factor * driver()`. 12 specs: sconceE, sconceP, floorLamp, lampL, lampR, sconce8a, sconce8b, nightLight, corridorBulb, doorLeak, eastBulb, fanLight.

## Sound (`data/audio.ts`)
`SOUNDS` (24 ids, `/audio/<id>.mp3`) -> `SoundId`; `FOOTSTEPS: Record<Surface, {sounds, volume}>` (concrete 4 @0.35, wood 5 @0.45); `DOOR_LOCKED`, `WATER_DRIP`; `EmitterSpec { sound, at: propName | [x,y,z], volume, ref, rate? }` x5 (fan_creak, clock_tick, light_buzz, wind_window x2).

## Roach group (`data/creatures.ts`)
`{ model: 'american'|'xcellf', count, box, climb: axes, length, starts? }`: 4 + 3 + 3 in the corridor, 2 in the R1 leg.

## Quality (`engine/Quality.ts`)
`QualitySettings { level, pixelRatio, shadows, shadowProxy, shadowMap, ao, aoQuality, dof, bloom, smaa, texDir, probeSize, anisotropy }`.

| | low | medium | high |
|---|---|---|---|
| pixelRatio | 0.75 | min(dpr,1.5) | min(dpr,2) |
| shadows / proxy | no / yes | yes / no | yes / no |
| shadowMap | 512 | 512 | 1024 |
| AO | off | Low | Medium |
| DOF / bloom / SMAA | off | on | on |
| textures | 1K | 2K | 2K |
| probe / aniso | 64 / 1 | 128 / 4 | 256 / 16 |

## Interactable / TriggerZone (`gameplay/`)
`Interactable { prompt, focusPoint(), use(), update?(dt) }`; `TriggerZone(contains, action, {once?, when?})`.
