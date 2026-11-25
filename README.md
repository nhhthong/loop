# LOOP

First-person horror vignette — TypeScript · three.js · Rapier · Vite · postprocessing (N8AO, DOF, bloom, AgX).

You wake up gasping on the floor of a narrow, wet concrete corridor. Cockroaches crawl over walls and ceiling,
water drips from the ceiling. A door leads into the L-shaped hallway (3 m high, 2 m wide) of a contemporary American
house — tidy, deserted, lit by a few warm downlights and lamps — ending at a door that is shut tight.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build
```
Quality flags (URL): `?q=low` (lower res, no AO), `?noao`, `?nodof`.

Controls: WASD · mouse · E interact · Shift run · C crouch · Esc pause.

## Structure
- `src/engine` — renderer/post stack, Rapier physics, input, audio, asset cache
- `src/world` — level geometry (`Level.ts`, layout diagram inside), materials (wet-wall shader, decals), window, door, props, cockroach crawler AI, drips & dust
- `src/player` — kinematic capsule controller; `Hands.ts` auto-rigs an unrigged photogrammetry hand scan at runtime (21 bones, distance-based skin weights, procedural IK/curls)
- `src/game/Game.ts` — wake-up cinematic, interactions, scripted events, lights, ambience
- `src/tools` — dev pages (`inspect.html`, `handtest.html`, `scanprobe.html`)

## Assets
All third-party assets allow commercial use. Attribution is required for CC-BY models.
- Models: Sketchfab (CC-BY / CC0) — see `public/models/*/manifest.json` (in-game *Credits* lists them)
- Textures: Poly Haven (CC0)
- Sounds: Freesound (CC0) — `public/audio/manifest.json`
