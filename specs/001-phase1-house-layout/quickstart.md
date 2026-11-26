# Quickstart: Phase 1

```bash
npm install
npm run dev          # http://localhost:5173  (?q=low|medium|high; also selectable in the menu)
npm run typecheck    # must pass before every commit
npm run build        # tsc --noEmit && vite build
```

Dev pages: `inspect.html?f=group/model,...`, `handtest.html?fov=&tx=&ty=&tz=&roll=&curl=`, `scanprobe.html`.
Dev hooks on `window.game`: `debugView(x, z, yaw, pitch, eye?)`, `debugIntro(t)`, `door`.

## Manual check (≈5 min, `?q=low` is enough for logic)
1. Start: 15.2 s intro, hand close-up, then crosshair + hint.
2. Walk to the door (z 3), press E: opens; walk to z < 1.6: it shuts, locks, latch clicks.
3. R1: cabinet with clock at 23:59 is first in view; continue R2, R6 alcove, north wall (clock, window, credenza), bath ajar and dark.
4. Atrium: fan spins and creaks; climb stairs to the dark upper landing (y 3.25).
5. R8: front double doors rattle on E. East hall: door 9 rattles on E.
6. Menu: Low/Medium/High reload and highlight; Credits lists models/sounds/textures; Esc pauses.
7. Look/feel on real hardware (owner): crisp, wet corridor reflections, lamp pools, no haze.
