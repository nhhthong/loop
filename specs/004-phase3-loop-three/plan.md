# Implementation Plan: Phase 3 - Loop 3

**Spec**: [spec.md](spec.md) · **Date**: 2026-11-26

| Part | Implementation |
|---|---|
| Loop table | `gameplay/loops.ts`: loop 2 also unlocks door 9; loop 3 stops the radio (handle kept from loop 2), starts broken lights, opens door 9, adds the R2 slam trigger and a light-pool focus on door 9 until the slam |
| Failing lights | `systems/BrokenLightsSystem.ts`: per-lamp random schedule (on 0.8–4 s · blackout 0.2–0.4 / 0.6–1 s · stutter 0.5–0.9 s) written through `Lamp.driver`; `electric_crackle` from lamps within 5 m (≤ 1 per 0.5 s) |
| Door 9 slam | `Door.swingShut(0.18)` (renamed from `closeSlowly`), `locked = true`, `door_slam` (ref 3 m so it carries down the hall) |
| Bathroom | `sequences/ToiletKnockSequence.ts`: rattle → pause → 5 knocks → done; `Door.knock()` jolts the leaf |
| Light pool | `LightingSystem.extraFocus` is now a list (portal view + event spots) |
| Stair trigger | door-9 shut-on-stair trigger re-arms every pass (was once) |
| Sounds | `door_slam` (395653, trimmed to the first slam), `door_knock` (144943, single knock), `electric_crackle` (582631) — Freesound CC0 |

## Constitution Check

Ask-first: all open points answered by the owner. Simplicity: reuses TriggerZone, Lamp.driver, Door rattle; two small new
systems. Mobile checklist: pool focus on door 9, scare does not rely on shadows. Assets: CC0 with manifest entries.
