# Implementation Plan: Phase 2 - The Loop (Loop 2)

**Spec**: [spec.md](spec.md) · **Date**: 2026-11-26

## Summary

Door 9 opens onto a new wet-concrete stairwell; its bottom door is a portal to the basement doorway. A `LoopDirector`
advances the loop when the basement door shuts behind the player after the crossing; loop 2 starts the radio and arms
the bathroom-door scene.

## Constitution Check

| Principle | Status |
|---|---|
| Ask, never guess | Pass: every open point answered by the owner (spec, Owner decisions) |
| Simplicity / surgical | Pass: reuses `TriggerZone`, `DoorInteraction`, timeline helpers; no new libraries |
| Owner decisions | Change: CLAUDE.md "No scripted scares" amended for the owner-requested bathroom-door scene |
| Data-driven architecture | Pass: stairwell/portal in `data/layout.ts`, bulb in `data/lights.ts`, per-loop events in `gameplay/loops.ts` |
| Licensed assets | Pass: radio (Sketchfab CC BY), radio static + water trickle (Freesound CC0), all in manifests |

## Design

| Part | Implementation |
|---|---|
| Stairwell | `Level.buildStairwell()`: landings, 11 treads + ramp collider, side walls, flat/sloped ceilings, bottom door wall + frame; materials = corridor wet concrete |
| Water | thin strips with scrolling procedural normal map (`waterNormalTexture`), stream on treads/risers, wall seepage, puddle; `WaterSystem` scrolls them |
| Swaying bulb | `stairBulb` in `LIGHTS` with `cord` + `swing`; `PendantSystem` moves light, glow and cord (shadows sweep) |
| Portal | `PortalSystem`: while the bottom door is open, renders the scene from `portalMatrix() × camera` into a target shown on a doorway plane (screen-space UV); when the eye crosses the plane, `Player.transport(map, +90°)` |
| Linked doors | the stair-bottom `Door` is the basement door mapped by the inverse portal transform; opening it opens the real basement door too |
| Loop | `LoopDirector` (`portalCrossed`, `enteredHouse`); door-9 shut trigger on the stair; basement shut trigger re-arms every pass |
| Loop 2 | `gameplay/loops.ts`: radio static on the `radio` prop; R2 trigger → `BathDoorSequence` (camera ease 1 s, `Door.swingShut(3 s)`, creak + latch, lock, control back; touch UI hidden) |

## Risks

- Portal costs one extra scene render only while the bottom door is open.
- Looking back just after crossing shows the corridor through the still-open basement door (shuts after 1.4 m).
