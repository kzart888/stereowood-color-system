# Phase 2 Dedup Plan (Consolidated)

Date: 2026-02-06  
Status: Phase 2 completed; final gate passed

## Scope
- Deduplicate overlapping frontend utility logic without changing behavior.
- Align formula parsing expectations between legacy frontend and backend service.
- Standardize message entrypoints to reduce repeated direct ElementPlus calls.
- Keep `frontend/legacy` production-safe with wrappers and rollback notes.

## Non-Goals
- No full frontend rewrite.
- No large API contract changes.
- No data schema changes.

## Batch 2.1: Inventory and Contract Freeze
### Deliverables
- Caller map for:
  - `frontend/legacy/js/utils/color-converter.js`
  - `frontend/legacy/js/utils/colorConversion.js`
  - `frontend/legacy/js/utils/formula-parser.js`
  - `frontend/legacy/js/utils/formula-utils.js`
- Canonical API decision doc (what stays public vs compatibility-only).
- Rollback plan per module pair.
- Inventory output: `docs/refactor/PHASE2_1_INVENTORY.md`.

### Acceptance Criteria
- Every call site is classified as `migrate-now`, `wrap`, or `defer`.
- Canonical signatures are documented before code edits.
- Status: completed.

### Risks
- Missing hidden global consumers in legacy scripts.

### Rollback
- Keep legacy files untouched in this batch (analysis/docs only).

## Batch 2.2: Color Utility Consolidation
### Deliverables
- `colorConversion.js` designated canonical for RGB/HSL/LAB/HEX.
- `color-converter.js` reduced to compatibility wrapper for legacy callers and image-related helpers.
- Duplicate conversion implementations removed or forwarded.

### Acceptance Criteria
- Existing runtime callers still work without import-order regressions.
- No color-render regressions in custom colors or color dictionary views.

### Risks
- Rounding differences can change nearest-color matching.

### Rollback
- Revert to wrapper-only mode; avoid hard deletion until phase gate passes.

## Batch 2.3: Formula Utility Consolidation
### Deliverables
- Clear boundary:
  - `formula-parser.js`: parsing/hash primitives
  - `formula-utils.js`: display and formatting helpers
- Unified token/unit assumptions aligned with `backend/services/formula.js`.
- Contract notes updated in `docs/development/backend-api.md`.

### Acceptance Criteria
- Frontend formula rendering remains stable in artworks/custom colors flows.
- Backend formula-related responses remain compatible with frontend assumptions.

### Risks
- Existing mojibake text in comments can hide semantic bugs during edits.

### Rollback
- Keep old helper entrypoints as wrappers for one phase.

## Batch 2.4: Message Entrypoint Normalization
### Deliverables
- Canonical usage through `frontend/legacy/js/utils/message.js` for high-traffic components:
  - `custom-colors.js`
  - `artworks.js`
  - `mont-marte.js`
- Compatibility path for `this.$message` where deep component coupling exists.

### Acceptance Criteria
- Success/error/warning/info behavior and wording stay unchanged.
- No console errors from missing message instance injection.

### Risks
- Mixed `this.$message` and wrapper usage can introduce inconsistent UX timing.

### Rollback
- Keep wrapper methods thin and map directly to ElementPlus calls.

## Batch 2.5: Cleanup and Gate
### Deliverables
- Remove clearly dead duplicate branches after wrapper migration.
- Add deprecation comments for remaining compatibility paths.
- Produce `docs/refactor/PHASE2_REVIEW_GATE.md`.

### Acceptance Criteria
- No high-severity findings from code-review-agent.
- Verification matrix passes.

### Rollback
- Restore deleted duplicate branches from previous commit if any breakage appears.

## Verification Matrix
- `npm run phase0:verify`
- `node --check` on all `frontend/legacy/js/**/*.js`
- Script load integrity check for `frontend/legacy/index.html`
- Browser smoke:
  - root page
  - tab switches (custom colors, artworks, mont-marte, color dictionary)
  - formula-related UI actions
  - dictionary list/HSL/wheel/matcher views
- Review gate report in `docs/refactor/PHASE2_REVIEW_GATE.md`

## Execution Order
1. Batch 2.1 (analysis/docs only)
2. code-review-agent pass on 2.1 contract
3. Batch 2.2
4. verify + review
5. Batch 2.3
6. verify + review
7. Batch 2.4 and 2.5
8. full gate verification and review
