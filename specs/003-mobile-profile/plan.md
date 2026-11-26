# Implementation Plan: Mobile Profile

**Spec**: [spec.md](spec.md) · **Date**: 2026-11-26

## Principle

One switch, many readers: `Quality.ts` defines the `mobile` profile as data; each system reads only the flags it needs.
New mobile tweaks later = a new flag + one reader. Desktop presets get explicit "off" values, so their behaviour is unchanged.

## Profile flags (added to `QualitySettings`)

| Flag | low / medium / high (desktop, unchanged) | mobile |
|---|---|---|
| `shadows`, `shadowProxy` | as today | `false`, `false` |
| `ao`, `dof`, `bloom`, `smaa` | as today | all `false` |
| `texDir`, `probeSize`, `anisotropy` | as today | `/1k`, 64, 1 |
| `lightPool` | 0 (off: every lamp is a light) | 5 |
| `wetLite` | `false` | `true` (2 octaves) |
| `fpsCap` | 0 (uncapped) | 30 |
| `scaleRange` | `[pixelRatio, pixelRatio]` (fixed, as today) | `[0.6, 1.0] × min(dpr, 2)`, starts at 0.8 |
| `portalScale` | 1 | 0.5 |

## Components

| Component | Where | Notes |
|---|---|---|
| Profile selection | `engine/Quality.ts` | `IS_TOUCH` → `mobile` unless `?q=`; menu hides `#quality` when `Q.level === 'mobile'` (`main.ts`) |
| Light pool | `systems/LightingSystem.ts` (+ `Furnish` builds lamp lights detached when pooled) | Generalises the existing shadow proxy: score lamps, keep top-K with hysteresis, copy params into K pooled `PointLight`s; flicker/drivers still computed per lamp, then applied to the pooled copy |
| Wet lite | `world/Materials.ts` `makeWet` | fbm octave count from `Q.wetLite` (compile-time `#define`) |
| Frame cap + adaptive scale | new `engine/FrameGovernor.ts`, used by `Game.loop` | Skip rAF ticks until 1/fpsCap elapsed (dt accumulates); every 1 s compare mean frame time to budget: > 90% → scale −0.05, < 60% → +0.05, clamp to range, `renderer.setPixelRatio` + composer resize |
| Portal scale | `systems/PortalSystem.ts` | target size × `Q.portalScale`; plane UV unchanged (screen-space) |
| Stats overlay | new `ui/Stats.ts`, enabled by `?stats` | FPS, ms, `renderer.info` calls/triangles, lights, scale; updated 2×/s |

## Verification

1. Desktop: capture the 6 standard views + intro at `?q=low` **before** changes; after changes they must match.
2. Mobile headless (Pixel 7 emulation): draw calls / triangles / light count in worst views (SC-001); mobile e2e suite (controls) + loop suite still pass.
3. Owner: real phone with `?stats` in corridor, R1, atrium, stairwell, portal (SC-002).

## Risks

- Mobile looks flatter without shadows; lamp glows, wet gloss and the grade carry the mood.
- Pool swaps could pop if hysteresis is too low; intensities are faded over ~0.3 s when a lamp enters/leaves the pool.
- Adaptive scale on very weak phones bottoms out at 0.6× (softer image) rather than dropping frames.
