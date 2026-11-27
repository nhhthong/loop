# Plan: Performance round 2

**Spec**: [spec.md](spec.md) · **Date**: 2026-11-27

## Work split (parallel, disjoint files; sub-agents work in separate git worktrees, the lead merges)

| Track | Owner | Files | Items |
|---|---|---|---|
| L — staged loading | lead | `src/game/Game.ts`, `src/world/Furnish.ts`, `src/data/props.ts`, `e2e/*` | FR-001 |
| W — web delivery | sub-agent 1 (Sonnet) | `src/sw.ts` / `public/sw.js`, `src/main.ts` (registration only), `vite.config.ts`, `tools/prune-models.mjs`, `public/models/**` (pruned GLBs) | FR-002, FR-003, FR-004 |
| K — KTX2 trial | sub-agent 2 (Sonnet) | none in `src/`; `specs/007-perf-round2/ktx2-trial.md`, images in scratch | FR-005 |
| F — desktop FPS | sub-agent 3 (Sonnet) | `src/world/Materials.ts`, `src/engine/Quality.ts`, `src/engine/Renderer.ts` | FR-006 – FR-009 |

Each track: typecheck + build; own dev server port (lead 5173, W 5174, F 5175); one headless browser at a time. Final
verification after merging all tracks: bench (low/mobile, image diff vs `e2e/.baseline`), e2e low/mobile/touch, then PR/CI/merge.

## Constitution Check
Ask-first ✓ (decisions above). Simplicity ✓ (no new runtime deps; build-time tools only). Verification ✓ (bench + e2e + diff).
Assets ✓ (pruned GLBs keep manifests; format unchanged).
