# Implementation Plan: Performance phase

**Spec**: [spec.md](spec.md) · **Budgets**: [budget.md](budget.md) · **Date**: 2026-11-27

## Order (one PR, committed in steps; each step re-runs bench + typecheck + e2e, image diff where "unchanged")

1. **E — bench**: `e2e/bench.mjs` (`npm run bench -- --q=low|mobile [--update-baseline]`): renders each standard view once (software GPU), reads
   `renderer.info`, counts lights / shadow-updating lights, compares with `budget.md` numbers (kept in `e2e/budgets.json`); also
   `--shots` + diff against stored baseline PNGs (mean diff ≤ 1/255). Record the baseline.
2. **B — shadows/light**: shadow cache in `LightingSystem` (per light: `needsUpdate` only when an animated caster in range moved — doors,
   pendant bulbs — or on first frame); cap updating shadow lights; desktop light pool flag (`Q.lightPool` for medium/high, default off until measured);
   wet mask bake (texture generated at load, shader samples it).
3. **C — geometry**: static merge pass in `Level` (merge by material per area; keep colliders as they are); instancing for balusters/flanges/water strips;
   area culling groups (corridor, R6, R8, house stair — like `stairwell`); `gltf-transform simplify`/LOD for heavy props; atlas only if still needed.
4. **A — loading**: KTX2 trial (3 materials) → owner decision → convert; `gltf-transform meshopt` (+ `etc1s/uastc` inside GLBs if the trial passes);
   staged loading (basement + R1 first); service worker; opus audio; Vite manual chunks + Rapier wasm file; `KHR_parallel_shader_compile` + warm-up in the menu.
5. **D — render**: desktop adaptive scale via `FrameGovernor` (`Q.scaleRange` for medium/high), merge post passes, cheaper AO on medium, portal scale flag for desktop.

## Constitution Check

Ask-first: decisions recorded. Simplicity: each item behind a profile flag where it can hurt the look; no new libraries except
build-time tools. Verification: bench + e2e + image diff. Assets: converted files keep their manifest entries (format change only).

## Risks

Merge/instancing can break colliders or culling → e2e + bench. KTX2 colour shifts → trial + SSIM. Service worker caching stale builds
→ versioned cache keyed by build hash.
