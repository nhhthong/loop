# Research: Phase 1 (retroactive)

Decisions already taken and implemented; sources are CLAUDE.md "Owner decisions" and the code.

## R1. Stair shape
- **Decision**: L-shaped, flight 1 (8 treads, riser 18 cm, tread 27 cm) in RS rising +z with open east side, mid landing y 1.63, flight 2 (+x) between walls, dark upper landing y 3.25 with a black doorway. Owner chose "option A".
- **Rationale**: from the atrium only walls, fan and one dark corner of railing show; keeps the void dark and the 6 m atrium mysterious.
- **Alternatives considered**: other stair options offered to the owner (not recorded in the repo).

## R2. North wall
- **Decision**: flat (grandfather clock, window WIN_C, credenza with two lamps, rotary phone, painting).
- **Rationale**: owner said too many recesses looked unnatural. Alternative: recessed alcoves (rejected). R6 alcove with rug/armchair remains.

## R3. R1 length
- **Decision**: 6.5 m (z -3.5..3), owner asked +3 m over the original.

## R4. Look
- **Decision**: muted near-neutral warm-grey grade with faint olive cast, lamps warm-white, semi-gloss walls (roughness ~0.32), polished wood floor (0.32), wet corridor via `makeWet`, no fog, DOF only in intro.
- **Rationale**: owner rejected monochrome and strongly amber; wants crisp AAA image; wet surfaces must shine.

## R5. Hand
- **Decision**: photoscan rigged at runtime; intro-only framed close-up at FOV 40; no sleeve/forearm.
- **Rationale**: the scan has a raw wrist cut that must never be visible.

## R6. Low quality shadows
- **Decision**: one proxy shadow light following the strongest nearby lamp.
- **Rationale**: software rendering in the cloud container (no GPU); constant light count avoids shader recompiles.

## R7. Verification
- **Decision**: typecheck only by default; owner checks scenes on real hardware. No test framework installed.

## R8. Gaps found while documenting (resolved)
- Credits omitted `public/models/house` (Old Ceiling Fan, CC BY 4.0) → fixed: `src/main.ts` now lists 7 groups.
- Bathroom door not interactive → intended (ajar, not closed); owner keeps current gameplay.
- No numeric performance target → none required for Phase 1.
