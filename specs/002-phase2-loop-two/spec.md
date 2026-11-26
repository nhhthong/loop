# Feature Specification: Phase 2 - The Loop (Loop 2: radio, bathroom door)

**Feature Branch**: `002-phase2-loop-two` (no branch created; work lands on main via PR)

**Created**: 2026-11-26

**Status**: Implemented

**Input**: Owner: "At door 9, E opens it and the player steps into the intro corridor, then opens the door again to return to the start, beginning Phase 2. At the start of Phase 2 an old radio crackles; when the player reaches the bathroom door, the camera turns toward it and the bathroom door slowly closes."

## Owner decisions (2026-11-26)

| Topic | Decision |
|---|---|
| Where door 9 leads | A new scene: a straight stair going down (12 risers), dark grey wet concrete walls and treads, water running down the treads and seeping down the walls, a small bulb swaying on its cord. The door at the bottom opens onto R1 seen from the basement doorway (portal, real scene); crossing it puts the player in the basement doorway, the door shuts behind and loop 2 starts. The intro corridor is unchanged and not revisited. |
| Radio | A static prop in every loop. Silent in loop 1, crackles from loop 2. Placed on the console table next to the rotary phone. |
| Radio timing | Starts when the basement door shuts behind the player in loop 2 and loops for the rest of the loop (positional: louder when near). |
| Bathroom door scene | Short loss of control (~4 s): camera turns to the door (~1 s), holds while the door slowly closes and latches (~3 s), control returns. The door is then locked (E rattles). |
| After loop 2 | Door 9 is locked in loop 2 (end of Phase 2 content). |
| Mobile | Same behaviour; touch controls are hidden during the bathroom-door scene. |

## User Scenarios & Testing

### User Story 1 - Door 9 leads down a wet stair and back into the house (Priority: P1)

In loop 1, door 9 (east hall end) opens with E onto a straight concrete stair going down. Once the player is on the
stair, door 9 shuts and locks behind them. At the bottom, a door like the basement door opens with E; through it the
player sees R1 from the basement doorway. Walking through puts them in the basement doorway with no visible cut; the
basement door shuts and locks behind them and loop 2 begins.

**Independent Test**: Stand at door 9, press E, go down, press E at the bottom door, walk through; confirm loop = 2.

**Acceptance Scenarios**:

1. **Given** loop 1, **When** the player presses E at door 9, **Then** it opens (handle click, latch, creak) onto the stairwell.
2. **Given** the player steps onto the stair, **Then** door 9 shuts and locks behind them.
3. **Given** the stairwell, **Then** walls and treads are dark grey wet concrete, water runs down the treads and the walls, a puddle lies at the foot, and a small bare bulb sways gently (its shadows move); the trickle is audible.
4. **Given** the player presses E at the bottom door, **Then** it opens and R1 is visible through it (real scene); **When** they walk through, **Then** they stand in the basement doorway facing R1, view continuous, and the basement door shuts and locks behind them; loop 2 begins.
5. **Given** loop 2, **When** the player presses E at door 9, **Then** it only rattles (locked).

### User Story 2 - The radio crackles in loop 2 (Priority: P1)

An old radio stands on the console next to the phone in every loop. In loop 2 it starts crackling (old-radio static) when the basement door shuts behind the player and keeps playing.

**Acceptance Scenarios**:

1. **Given** loop 1, **Then** the radio is present and silent.
2. **Given** loop 2 starts, **Then** static plays from the radio's position, looping, louder when closer.

### User Story 3 - The bathroom door closes by itself (Priority: P1)

In loop 2, when the player walks along R2 past the ajar bathroom door, control is taken away, the camera turns toward the bathroom door, and the door slowly swings shut with a creak and a latch click. Control returns; the door is locked from then on.

**Acceptance Scenarios**:

1. **Given** loop 2 and the bathroom door ajar, **When** the player enters the R2 zone in front of it, **Then** movement and look are disabled, and the view turns smoothly (~1 s) to the door.
2. **Given** the camera faces the door, **Then** the door closes over ~3 s (creak), ends with a latch click, and control returns.
3. **Given** the scene has played, **When** the player presses E at the bathroom door, **Then** it rattles (locked). The scene never plays twice.
4. **Given** loop 1, **Then** nothing happens at the bathroom door.

### Edge Cases

- Player sprints past the bathroom trigger zone: the zone spans the R2 width so it cannot be skipped.
- Player backs out of door 9 before stepping onto the stair: door 9 stays open; it shuts only once the player is on the stair.
- Pause during the bathroom scene: the scene resumes from where it stopped.
- Looking back right after crossing: the basement door is still open and shows the corridor, not the stair; it shuts as the player walks on (1.4 m), as in loop 1.

## Requirements

- **FR-001**: The game MUST track a loop index (1 at start). Loop changes MUST happen only when the basement door shuts behind the player after a pass through door 9.
- **FR-002**: Door 9 MUST open with E in loop 1 and be locked in loop 2.
- **FR-003**: Behind door 9 MUST be a straight wet-concrete stair down (12 risers of 0.17 m, treads 0.28 m, 1.1 m wide) with running water, wall seepage and a swaying bulb; door 9 MUST shut and lock behind the player on the stair.
- **FR-004**: The bottom door MUST show R1 from the basement doorway while open (portal render of the real scene) and crossing it MUST move the player there seamlessly (no fade, no cut).
- **FR-005**: The basement door MUST open together with the bottom door and shut + lock behind the player after the crossing.
- **FR-006**: A radio prop MUST stand on the console next to the phone in all loops; from loop 2 it MUST play looping positional static.
- **FR-007**: In loop 2 the bathroom-door scene MUST play once: input disabled ~4 s, camera eases to the door, door closes slowly with creak + latch, then the door is locked.
- **FR-008**: Per-loop events MUST be declared as data/config in one place (`LoopDirector`), acting only through named handles (doors, props, emitters, lights).
- **FR-009**: New assets (radio model, radio static sound) MUST have commercial-use licences and be recorded in their `manifest.json`.

## Key Entities

- **Loop**: index + list of events armed when the loop starts.
- **Loop event**: start an emitter, arm a trigger zone running a sequence, lock/unlock a door.
- **Portal pair**: stair-bottom door ↔ basement doorway; a rigid transform (rotate +90° about Y, translate) maps one side to the other.

## Success Criteria

- **SC-001**: A full pass door 9 → corridor → basement door → R1 shows no visible cut in a frame-by-frame capture (position/yaw continuous within 1 cm / 0.01 rad after mapping).
- **SC-002**: The bathroom scene plays exactly once in loop 2 and never in loop 1 (e2e).
- **SC-003**: Radio is silent in loop 1 and audible in loop 2 (e2e checks the audio source state).
- **SC-004**: `npm run typecheck` and the e2e suite pass; desktop and mobile both complete the loop.

## Out of Scope

- Loop 3 and later, any other per-loop variation, endings.
- Interacting with the radio (it cannot be switched off).
- Replaying the wake-up intro in loop 2; revisiting the intro corridor.

## Assumptions

- The radio sound is old-radio static/hiss without speech or music (no dialogue rule).
