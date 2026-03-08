# P8 Pre-Modernization Closure Gate (2026-03-08)

Branch: `codex/legacy-ui-related-assets`  
Purpose: final stabilization audit before creating modern frontend branch (`codex/modern-platform-v1`).

## Gate Summary

- Runtime contract: unchanged (`/`, `/login`, `/app`, `/api`, `/health`, `9099`, `/data/color_management.db`).
- Critical findings: 0
- High findings: 0
- Gate decision: **PASS (ready for modernization branch cut after merge/tag)**.

## Verification Evidence

- `npm run phase0:verify` -> PASS
- `npm run phaseU11:ui-smoke` -> PASS
- `npm run phaseL:auth-v2:verify` -> PASS
- `npm run phaseP6:verify` -> PASS
- `npm run audit:docs-contract` -> PASS
- `npm run gate:full` -> PASS
- `npm audit --omit=dev` -> completed, known dependency risk remains (tracked below).

## Findings (Severity Ordered)

### Medium

1. Large-file decomposition still needed for long-term maintainability.
   - Backend and legacy frontend still have >700-line modules, e.g.:
     - `backend/domains/auth/service.js` (861)
     - `backend/services/ArtworkService.js` (752)
     - `backend/db/migrations.js` (730)
     - `frontend/legacy/js/components/color-dictionary.js` (851)
     - `frontend/legacy/js/modules/custom-colors/component-options.js` (846)
     - `frontend/legacy/js/components/category-manager.js` (844)
     - `frontend/legacy/js/modules/artworks/ui/component-scheme-dialog-methods.js` (829)
2. Dependency security risk remains in production chain.
   - `npm audit --omit=dev` reports high issues in transitive `sqlite3` toolchain and `xlsx`.
   - `xlsx` currently has no upstream fixed version.
   - Keep risk-acceptance tracking and isolate parser usage in modern path.
3. `backend/db/migrations.js` contains mojibake comments.
   - Runtime behavior is not affected.
   - Should be cleaned before broader migration authoring in modern phase.

### Low

1. Version/doc freshness alignment can be tightened.
   - Root README version badge still shows historical `v0.9.8`.
   - Keep release tag and changelog version/date in one step during merge.

## Modernization Branch-Cut Checklist

1. Merge `codex/legacy-ui-related-assets` into `main`.
2. Tag stable legacy anchor (for rollback).
3. Freeze legacy contract and gate commands in roadmap.
4. Create `codex/modern-platform-v1` from updated `main`.
5. Start modern implementation with read-only slice first; keep `/app` as production default.

## Required Guardrails for P8

- Every modern slice must keep API contract parity with legacy.
- Keep pilot/flag strategy; do not switch production entry until cutover gate passes.
- Keep Docker + Synology rehearsal as mandatory release evidence.
