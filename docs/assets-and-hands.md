# LOOP — assets and hand rig reference

Moved out of CLAUDE.md to keep it short. Read on demand.

## Hands
- Model: `public/models/hands_bugs/male_hand_scan.glb` (photoscan, unrigged). Rig built in code from landmarks in `Hands.ts`.
- Finger fixes in `Hands.ts`: distal segments of index/middle/ring scaled 0.78, little finger ×1.5, tucked in and curled less.
- **Show the hand only as long as the model is.** No sleeve, no procedural forearm extension.
- The scan's wrist cut must never be on screen → the hand is shown only in framed close-ups
  (intro: FOV 40, hand raised from below). The hand appears **only in the intro**.
- Intro = heavy breathing + close-up of the hand (turning wrist, flexing fingers).


## Assets
- Only licenses allowing commercial use: Sketchfab `by` / `cc0`, Poly Haven CC0, Freesound CC0.
- Every model/sound must be recorded in its `manifest.json` (author, license, URL) — Credits screen reads them.
- Sketchfab/Freesound API auth is injected by the environment proxy; plain `curl` works, no key needed.
- Optimise new GLBs before committing: `gltf-transform resize --width 1024 --height 1024`, `gltf-transform webp`,
  `simplify` for >150k faces, `metalrough` for spec-gloss materials. Keep each file small (repo has no LFS).
