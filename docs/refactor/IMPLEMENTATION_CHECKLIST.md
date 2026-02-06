# Refactor Implementation Checklist (Remaining Phases)

Last updated: 2026-02-06  
Baseline: Phase 0 stabilization completed. Phase 1 completed in commit `9bc5c5f` on branch `stabilize-legacy`.

## Working Rules
- [ ] Work in small batches (one logical change-set per commit).
- [ ] Run `npm run phase0:verify` after each risky batch.
- [ ] Run a code-review-agent pass at each phase gate.
- [ ] Do not delete user data paths in runtime (`/data`, `/app/backend/uploads`).

## Phase 1: Inventory and Safe Obsolete Cleanup

### Goal
Identify and remove obsolete code/files with low regression risk.

### Tasks
- [x] Generate an inventory of active runtime files vs historical/unused paths.
- [x] Classify candidates: `delete`, `archive`, `keep`, `needs-manual-check`.
- [x] Remove empty residual paths under `frontend/apps/stereowood-color-system/` if truly unused.
- [x] Remove stale references to deprecated UI flow (for example color-palette dialog wiring if no runtime path remains).
- [x] Clean stale docs/files that point to moved/archived paths.

### Verification
- [x] `npm run phase0:verify`
- [x] Start app and verify main tabs still render:
  - [x] `/` root page
  - [x] custom colors
  - [x] artworks
  - [x] mont-marte
  - [x] color dictionary

### Exit Gate
- [x] No high-severity review findings.
- [x] No broken script loads from `frontend/legacy/index.html`.

## Phase 2: Deduplicate Shared Logic

### Goal
Merge repeated logic into clear shared modules without behavior change.

### Tasks
- [x] Batch 2.1: Build duplication inventory and canonical contracts
  - [x] Map all call sites of `frontend/legacy/js/utils/color-converter.js` and `frontend/legacy/js/utils/colorConversion.js`.
  - [x] Map all call sites of `frontend/legacy/js/utils/formula-parser.js` and `frontend/legacy/js/utils/formula-utils.js`.
  - [x] Decide canonical module responsibilities and publish API list in `docs/refactor/PHASE2_1_INVENTORY.md`.
  - [x] Define rollback note: wrappers must remain for one phase after migration.
- [x] Batch 2.2: Color utility consolidation (no behavior change)
  - [x] Keep `frontend/legacy/js/utils/colorConversion.js` as canonical for RGB/HSL/LAB/HEX.
  - [x] Keep image extraction + Pantone matching capabilities available via compatibility wrapper in `frontend/legacy/js/utils/color-converter.js`.
  - [x] Remove duplicate implementations where function behavior overlaps exactly.
  - [x] Keep backward-compatible global surface (`window.ColorConverter` and existing global function names) until Phase 4.
- [x] Batch 2.3: Formula utility consolidation (frontend + backend contract alignment)
  - [x] Keep parsing/hash primitives in `frontend/legacy/js/utils/formula-parser.js`.
  - [x] Keep display helpers in `frontend/legacy/js/utils/formula-utils.js` and remove duplicated parsing branches.
  - [x] Align normalization assumptions with backend `backend/services/formula.js` (token format, unit handling, invalid tokens).
  - [x] Document agreed formula contract in `docs/development/backend-api.md`.
- [ ] Batch 2.4: Message/notification entrypoint normalization
  - [ ] Standardize component usage on `frontend/legacy/js/utils/message.js` wrapper.
  - [ ] Replace direct `ElementPlus.ElMessage.*` usage in high-traffic components first (`custom-colors.js`, `artworks.js`, `mont-marte.js`).
  - [ ] Keep compatibility for `this.$message` where changing behavior is risky.
- [ ] Batch 2.5: Cleanup + deprecation notes
  - [ ] Add deprecation comments to wrapper modules.
  - [ ] Archive or remove dead duplicate code paths only after verification gate passes.

### Verification
- [ ] `npm run phase0:verify`
- [ ] `node --check` for all `frontend/legacy/js/**/*.js`.
- [ ] Script load integrity check for `frontend/legacy/index.html`.
- [ ] Browser smoke:
  - [ ] root page render `/`
  - [ ] tab switch: custom colors, artworks, mont-marte, color dictionary
  - [ ] custom color add/edit dialog opens and saves without console errors
  - [ ] formula-related interactions render without parse regressions
  - [ ] color dictionary list/HSL/wheel/matcher views load
- [ ] Code-review-agent gate report saved as `docs/refactor/PHASE2_REVIEW_GATE.md`.

### Exit Gate
- [ ] Duplicate modules removed or downgraded to wrappers with deprecation notes.
- [ ] No regression in existing API payload handling.
- [ ] No high-severity review findings.
- [ ] Rollback path documented for each batch.

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
1. Execute Batch 2.4 (message/notification entrypoint normalization) on `custom-colors.js`, `artworks.js`, and `mont-marte.js`.
2. Execute Batch 2.5 cleanup (deprecation notes + dead duplicate branch removal).
3. Run full Phase 2 verification matrix and publish `docs/refactor/PHASE2_REVIEW_GATE.md`.
