# Refactor Implementation Checklist (Remaining Phases)

Last updated: 2026-02-06  
Baseline: Phase 0 stabilization completed on branch `stabilize-legacy`.

## Working Rules
- [ ] Work in small batches (one logical change-set per commit).
- [ ] Run `npm run phase0:verify` after each risky batch.
- [ ] Run a code-review-agent pass at each phase gate.
- [ ] Do not delete user data paths in runtime (`/data`, `/app/backend/uploads`).

## Phase 1: Inventory and Safe Obsolete Cleanup

### Goal
Identify and remove obsolete code/files with low regression risk.

### Tasks
- [ ] Generate an inventory of active runtime files vs historical/unused paths.
- [ ] Classify candidates: `delete`, `archive`, `keep`, `needs-manual-check`.
- [ ] Remove empty residual paths under `frontend/apps/stereowood-color-system/` if truly unused.
- [ ] Remove stale references to deprecated UI flow (for example color-palette dialog wiring if no runtime path remains).
- [ ] Clean stale docs that point to moved/archived files.

### Verification
- [ ] `npm run phase0:verify`
- [ ] Start app and verify main tabs still render:
  - [ ] `/` root page
  - [ ] custom colors
  - [ ] artworks
  - [ ] mont-marte
  - [ ] color dictionary

### Exit Gate
- [ ] No high-severity review findings.
- [ ] No broken script loads from `frontend/legacy/index.html`.

## Phase 2: Deduplicate Shared Logic

### Goal
Merge repeated logic into clear shared modules without behavior change.

### Tasks
- [ ] Consolidate color utility overlap:
  - [ ] `frontend/legacy/js/utils/color-converter.js`
  - [ ] `frontend/legacy/js/utils/colorConversion.js`
- [ ] Consolidate formula parsing/formatting boundaries:
  - [ ] `frontend/legacy/js/utils/formula-parser.js`
  - [ ] `frontend/legacy/js/utils/formula-utils.js`
  - [ ] backend `services/formula.js` contract alignment
- [ ] Keep one canonical message/notification entrypoint.
- [ ] Add lightweight compatibility wrappers where direct replacement is risky.

### Verification
- [ ] `npm run phase0:verify`
- [ ] Manual smoke of color conversion dependent flows:
  - [ ] custom color add/edit
  - [ ] dictionary views
  - [ ] formula-related UI interactions

### Exit Gate
- [ ] Duplicate modules removed or downgraded to wrappers with deprecation notes.
- [ ] No regression in existing API payload handling.

## Phase 3: Backend Modular Boundary Cleanup

### Goal
Make backend layering explicit and maintainable: route -> service -> db/query.

### Tasks
- [ ] Normalize validation and error mapping across route files.
- [ ] Extract repeated category CRUD patterns into shared service logic.
- [ ] Reduce direct SQL in routes where service abstraction is expected.
- [ ] Document request/response contracts in `docs/development/backend-api.md`.

### Verification
- [ ] `npm run phase0:verify`
- [ ] API smoke:
  - [ ] `GET /api/custom-colors`
  - [ ] `GET /api/artworks`
  - [ ] `GET /api/mont-marte-colors`
  - [ ] `GET /api/categories`
- [ ] Docker smoke:
  - [ ] build image
  - [ ] container `/health` 200

### Exit Gate
- [ ] Routes are thin and consistent.
- [ ] No high-severity backend review findings.

## Phase 4: Legacy Frontend Modular Boundary Cleanup

### Goal
Split monoliths into clear modules with reusable public helpers.

### Tasks
- [ ] Define public shared surfaces:
  - [ ] api client
  - [ ] shared utils
  - [ ] shared modules used across components
- [ ] Split large components incrementally (feature-first, not full rewrite):
  - [ ] `custom-colors.js`
  - [ ] `artworks.js`
  - [ ] `mont-marte.js`
- [ ] Remove stale global coupling where safe (`window.*` paths with wrappers first).
- [ ] Continue garbled text cleanup in active runtime files.

### Verification
- [ ] `npm run phase0:verify`
- [ ] Manual UX smoke for all tab routes and key dialogs.

### Exit Gate
- [ ] Reduced file complexity with no runtime break.
- [ ] No new encoding regressions in active UI files.

## Phase 5: Tech Stack Upgrade Decision and Preparation

### Goal
Choose a suitable modernization path with low operational risk.

### Tasks
- [ ] Create decision record: legacy-hardening vs fresh Vue 3 rebuild.
- [ ] Quantify migration scope by feature area and data/API dependencies.
- [ ] Freeze compatibility contract for backend APIs before frontend migration.
- [ ] Define cutover strategy and rollback steps for Synology deployment.

### Verification
- [ ] Architecture decision document approved.
- [ ] Pilot migration plan validated on one low-risk feature slice.

### Exit Gate
- [ ] Approved migration RFC with timeline and risk controls.

## Cross-Phase Security and Operations
- [ ] Track `npm audit` findings and prioritize high severity production-impacting items.
- [ ] Keep deterministic Docker builds (`npm ci --omit=dev` + lockfile in git).
- [ ] Ensure runtime DB files remain untracked.

## Current Next Actions
1. Start Phase 1 inventory and classify obsolete candidates.
2. Run code-review-agent on Phase 1 candidate list before deletion batch.
3. Execute first low-risk cleanup batch and re-run verification.
