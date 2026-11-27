# Performance budgets

Single source of truth for performance numbers (CLAUDE.md only points here). Measured headless (`?q=…`, software GPU) at the
standard views; draw calls/triangles are renderer counts per frame. Real-device FPS is checked by the owner with `?stats`.

## Targets (owner-approved 2026-11-27)

| Preset | FPS | Draw calls (worst view) | Triangles | Scene point lights | Shadow lights updating per frame | First load |
|---|---|---|---|---|---|---|
| mobile | 30 (capped) | ≤ 600 | ≤ 0.5 M | ≤ 6 | 0 | ≤ 20 MB |
| low (desktop) | 60 | ≤ 600 | ≤ 0.8 M | all lamps | proxy only (1) | ≤ 25 MB |
| medium / high | 60 | ≤ 900 | ≤ 1.2 M | all lamps (or pool of 8) | ≤ 3 | texture set on demand |

"Image unchanged" changes: mean per-pixel diff ≤ 1/255 on the 8 standard views (`?q=low`).

## Baseline (before this phase; to be re-measured by `npm run bench` as the first task)

| Preset | Draw calls | Triangles | Lights | Notes |
|---|---|---|---|---|
| mobile | 211–1,131 | 0.17–0.63 M | 6 | worst view = basement corridor |
| low | 1,900–2,650 | 1.3–1.6 M | 16 | cube shadow proxy = 50–85 % of the frame |
| first load (low) | ~44 MB | | | textures 3.6 MB, models 30 MB, audio 6.7 MB, JS 3 MB |
| first load (medium/high) | ~80 MB | | | textures 40 MB (2K) |

## Standard views (x, z, yaw, pitch, y)

Intro 5.6 s · R1 from the door (0, 2.6, 0, 0) · R2 → hall (0.2, −4.6, −π/2, 0.05) · R8 → front doors (6.2, −6, 0, 0.05) ·
east hall (8, −4.5, −π/2, 0) · R1 looking back (0, 1.5, π, 0) · stairwell top (10.5, −4.5, −π/2, −0.38) · atrium (4.3, −4.4, 0, −0.15).

## Results after this phase (headless, worst view; `npm run bench -- --q=…`)

| Preset | Draw calls | Triangles | Shadow lights | First load | Budget met |
|---|---|---|---|---|---|
| mobile | 336 (was 1,104) | 0.26 M (was 0.63 M) | 0 | 19.9 MB (was ~44) | yes |
| low | 336 (was 2,675) | 0.26 M (was 1.72 M) | 0 in steady state (was 1 cube = 6 passes/frame) | 23.0 MB (was ~44) | yes |
| medium / high | not measurable in the cloud (software GPU runs out of memory with shadow maps) | | | texture set on demand (2K) | owner to verify |

Image diff vs the pre-change baseline (8 views, `?q=low`): ≤ 0.9/255 (budget 1). `?q=mobile` uses 512 px texture sets (deliberate
quality tier, −2.5 MB): 0.6–1.5/255 on wall-heavy views — the owner should confirm it looks acceptable on a phone.

What gave what: identical-material face arrays collapsed (mobile 1,104 → 809 calls, low 2,675 → 1,855), shadow cache (low 1,855 → 809: the cube
shadow proxy is no longer redrawn every frame), static level merge (809 → 428 calls), basement/house culling
(corridor/intro views 0.63 M → 0.03 M tris, 428 → 201 calls), prop simplification (phone/portrait/sconces/plants/radio/
lamp/console/mirror/clock + one roach, −0.3 M tris), model textures ≤ 512 px on small props (−6 MB), audio re-encode (−2.2 MB),
JS counted gzipped (served compressed). Not done (needs a tool or an owner decision): KTX2 (no `toktx` here), staged loading,
service worker, bundle split, instancing, LOD for the painting (simplify damaged it; kept original), desktop light pool / wet mask bake.

## Risk notes

- Most of the 30 MB in `public/models` is texture data inside the GLBs, not geometry: Meshopt alone will not reach the load budget;
  KTX2 inside GLBs (`gltf-transform`) is likely needed — measure first.
- `low` desktop target (≤ 600 calls) requires mesh merging; the corridor view is the worst case.
