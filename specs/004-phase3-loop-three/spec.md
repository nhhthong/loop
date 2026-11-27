# Feature Specification: Phase 3 - Loop 3 (failing lights, door 9 slams, knocking)

**Feature Branch**: `004-phase3-loop-three` (no branch created; work lands on main via PR)

**Created**: 2026-11-26

**Status**: Implemented

**Input**: Owner: "Phase 3: (1) at the start the player sees the lights flickering off, as if broken. (2) The bathroom door stays shut. (3) Walking toward door 9 — which now stands wide open — once the player passes the bathroom, door 9 slams shut; E cannot open it. (4) The player turns back and sees the bathroom door rattling as if someone is opening it; if the player comes close, five knocks, then it stops. End of Phase 3."

## Owner decisions (2026-11-26)

| Topic | Decision |
|---|---|
| Reaching loop 3 | Door 9 opens again in loop 2; the same stairwell/portal pass leads into loop 3. |
| Failing lights | Every house lamp, for the whole of loop 3: irregular flicker, blackouts of 0.2–1 s, rapid on/off bursts, electric crackles nearby. |
| Door 9 | Wide open at the start of loop 3. Slams shut (loud slam) the moment the player walks past the bathroom door in R2; no camera takeover. Locked afterwards (E only rattles). |
| Bathroom door | Stays shut and locked from loop 2. After the slam its handle rattles every 1–2 s; once the player has walked away (≥ 3.5 m) and comes back within 1.6 m, the rattling stops, then 5 evenly spaced knocks (leaf jolts with each), then silence. (The slam happens right beside the bathroom, so 'coming close' must follow walking away; if the player lingers nearby, knocks start after 6 s of rattling.) |
| Radio | Silent in loop 3. |
| End | Door 9 stays locked: end of Phase 3 content. |

## User Scenarios & Testing

### User Story 1 - Loop 3 (Priority: P1)

**Acceptance Scenarios**:

1. **Given** loop 2, **When** the player presses E at door 9, **Then** it opens onto the stairwell; the pass leads into loop 3.
2. **Given** loop 3 starts, **Then** the radio is silent, every house lamp flickers and blacks out irregularly with crackles, the bathroom door is shut and locked, and door 9 stands wide open at the end of the east leg.
3. **Given** loop 3, **When** the player walks past the bathroom door in R2, **Then** door 9 slams shut with a loud bang and is locked; E at door 9 only rattles.
4. **Given** door 9 has slammed, **Then** the bathroom handle rattles every 1–2 s; **When** the player walks away and comes back within ~1.6 m, **Then** the rattling stops, five knocks follow (≈0.6 s apart), then nothing more happens.

### Edge Cases

- The player rushes to door 9 without slowing: the R2 trigger spans the hall width past the bathroom door, so the slam always happens before door 9 can be reached.
- The player is already close to the bathroom door when the rattling would start: rattling stops at once and the knocks follow.
- Mobile: the light pool keeps door 9's area lit until the slam (`LightingSystem.extraFocus`); blacked-out lamps drop out of the pool.

## Requirements

- **FR-001**: Loop 2 MUST unlock door 9; the door-9 shut trigger on the stair MUST re-arm every pass.
- **FR-002**: Loop 3 MUST stop the radio, start `BrokenLightsSystem` on all `lamp`-tagged house lamps, and open door 9.
- **FR-003**: Passing `BATH_DOOR.a1 + 0.15` in R2 in loop 3 MUST slam (`Door.swingShut(0.18)`) and lock door 9 with `door_slam`, once.
- **FR-004**: `ToiletKnockSequence`: rattle (handle + `door_locked_*`) every 1–2 s until the player, having been ≥ 3.5 m away, comes within 1.6 m of the bathroom handle (or 6 s of rattling with the player nearby); 0.7 s pause; 5 × (`door_knock` + `Door.knock()`), 0.62 s apart; then done.
- **FR-005**: New sounds (Freesound CC0) recorded in `public/audio/manifest.json`.

## Success Criteria

- **SC-001**: e2e: loop 2 door 9 unlocked; loop 3 radio silent, all house lamps broken with blackouts, bathroom locked, door 9 open → slammed + locked after passing the bathroom, E does not open it, handle rattles while far, exactly 5 knocks when close, then silence.
- **SC-002**: typecheck + build pass; mobile checklist respected (pool focus on door 9, no shadow-only scare).

## Out of Scope

Loop 4+, opening the bathroom, any visible entity.
