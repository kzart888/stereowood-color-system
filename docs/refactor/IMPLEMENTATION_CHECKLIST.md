# Refactor Implementation Checklist (Phase 3+)

Last updated: 2026-02-06  
Baseline:
- Phase 0 stabilization completed in `50954e8`
- Phase 1 obsolete cleanup completed in `9bc5c5f`
- Phase 2 dedup and consolidation completed in `eeaa444`
- Phase 2 final gate docs completed in `df54b63`

## Working Rules
- [ ] Work in small batches (one logical change-set per commit).
- [ ] Run `npm run phase0:verify` after each risky batch.
- [ ] Run a code-review-agent pass at each phase gate.
- [ ] Do not delete runtime data paths (`/data`, `/app/backend/uploads`).
- [ ] Keep `frontend/legacy` as production UI until Phase 5 decision is approved.

## Phase 1: Inventory and Safe Obsolete Cleanup (Completed)

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
- [x] Main tabs render from `/`:
  - [x] custom colors
  - [x] artworks
  - [x] mont-marte
  - [x] color dictionary

### Exit Gate
- [x] No high-severity review findings.
- [x] No broken script loads from `frontend/legacy/index.html`.

## Phase 2: Deduplicate Shared Logic (Completed)

### Goal
Merge repeated logic into clear shared modules without behavior change.

### Batches
- [x] Batch 2.1: duplication inventory and canonical contracts
- [x] Batch 2.2: color utility consolidation
- [x] Batch 2.3: formula utility consolidation
- [x] Batch 2.4: message/notification entrypoint normalization
- [x] Batch 2.5: cleanup and deprecation notes

### Verification
- [x] `npm run phase0:verify`
- [x] `node --check` for all `frontend/legacy/js/**/*.js`
- [x] Script load integrity check for `frontend/legacy/index.html`
- [x] Browser smoke:
  - [x] root page render `/`
  - [x] tab switches: custom colors, artworks, mont-marte, color dictionary
  - [x] custom color add/edit dialog open and save path smoke
  - [x] formula interactions render without parser regressions
  - [x] color dictionary list/HSL/wheel/matcher views load
- [x] Final gate report exists: `docs/refactor/PHASE2_REVIEW_GATE.md`

### Exit Gate
- [x] Duplicate code consolidated or downgraded to compatibility wrappers with deprecation notes.
- [x] No high-severity review findings.
- [x] Rollback path documented per batch.

## Phase 3: Backend Modular Boundary Cleanup (Next)

### Goal
Make backend layering explicit and maintainable: route -> service -> db/query.

### Batch 3.1: Backend Inventory and Contract Freeze
- [x] Map route-to-service-to-db flow for:
  - [x] `backend/routes/custom-colors.js`
  - [x] `backend/routes/artworks.js`
  - [x] `backend/routes/mont-marte-colors.js`
  - [x] `backend/routes/categories.js`
  - [x] `backend/routes/mont-marte-categories.js`
- [x] Identify duplicated validation and error handling patterns.
- [x] Create `docs/refactor/PHASE3_1_INVENTORY.md` with:
  - [x] canonical ownership map (route/service/db)
  - [x] migration-safe candidates (`migrate-now`, `wrap`, `defer`)
  - [x] rollback notes for each target area.

### Batch 3.2: Validation and Error Mapping Normalization
- [x] Standardize error response structure and status code policy in routes.
- [x] Keep response payload backward-compatible (`{ error: string }`) for legacy frontend.
- [x] Extract shared validation helpers where repetition is high.

### Batch 3.3: Category CRUD Dedup
- [x] Consolidate repeated category CRUD logic across color and mont-marte category routes.
- [x] Move shared logic into service layer with thin route handlers.
- [x] Preserve existing endpoint paths and request shapes.

### Batch 3.4: Query Boundary Cleanup
- [ ] Reduce direct SQL in route files where service abstraction is expected.
- [ ] Centralize write operations with transaction safety in service modules.
- [ ] Document any intentional route-level SQL exceptions.

### Batch 3.5: Backend Contract Docs and Gate
- [ ] Update `docs/development/backend-api.md` with normalized contracts and error behavior.
- [ ] Produce `docs/refactor/PHASE3_REVIEW_GATE.md`.

### Verification
- [ ] `npm run phase0:verify`
- [ ] `node --check backend/**/*.js`
- [ ] API smoke:
  - [ ] `GET /api/custom-colors`
  - [ ] `GET /api/artworks`
  - [ ] `GET /api/mont-marte-colors`
  - [ ] `GET /api/categories`
  - [ ] `GET /health`
- [ ] Controlled write-path smoke in disposable data set:
  - [ ] create/update/delete one temporary record
  - [ ] verify no regression in legacy UI reads

### Exit Gate
- [ ] Routes are thin and consistent.
- [ ] No high-severity backend review findings.
- [ ] Backend contract doc reflects implementation.

## Phase 4: Legacy Frontend Modular Boundary Cleanup

### Goal
Split monolith components into reusable modules while keeping runtime stable.

### Batch 4.1: Frontend Seam Inventory
- [ ] Produce module seam map for:
  - [ ] `frontend/legacy/js/components/custom-colors.js`
  - [ ] `frontend/legacy/js/components/artworks.js`
  - [ ] `frontend/legacy/js/components/mont-marte.js`
- [ ] Classify extraction candidates: state, API calls, formatters, UI actions.
- [ ] Create `docs/refactor/PHASE4_1_INVENTORY.md`.

### Batch 4.2: Custom Colors Extraction
- [ ] Extract non-UI logic into focused modules under `frontend/legacy/js/modules/custom-colors/`.
- [ ] Keep compatibility wrappers for global access during migration.
- [ ] Remove dead branches only after smoke verification.

### Batch 4.3: Artworks Extraction
- [ ] Extract mapping, formula display helpers, and dialog state logic into modules.
- [ ] Keep calculator integration behavior unchanged.

### Batch 4.4: Mont-Marte Extraction
- [ ] Extract dictionary management and form-save workflows into modules.
- [ ] Keep supplier/purchase-link behavior unchanged.

### Batch 4.5: UTF-8 and Text Cleanup
- [ ] Restore garbled Chinese text in active runtime files and key docs.
- [ ] Verify no encoding regressions using `npm run audit:encoding`.
- [ ] Keep copy text reviewable and consistent with current UX.

### Batch 4.6: Frontend Gate
- [ ] Produce `docs/refactor/PHASE4_REVIEW_GATE.md`.

### Verification
- [ ] `npm run phase0:verify`
- [ ] `node --check frontend/legacy/js/**/*.js`
- [ ] Browser smoke on all major tabs and dialogs
- [ ] Console clean (no new warnings/errors)

### Exit Gate
- [ ] Reduced component complexity with no runtime breakage.
- [ ] No new encoding regressions in active UI files.

## Phase 5: Tech Stack Decision and Migration Preparation

### Goal
Choose a suitable modernization path after legacy stabilization.

### Tasks
- [ ] Write architecture decision doc: legacy-hardening vs fresh Vue rebuild.
- [ ] Quantify migration scope by feature area and dependency.
- [ ] Freeze backend API compatibility contract.
- [ ] Define Synology cutover and rollback strategy.
- [ ] Create phased migration pilot plan for one low-risk feature slice.

### Verification
- [ ] Decision doc reviewed and approved.
- [ ] Pilot slice plan validated by smoke and rollback rehearsal.

### Exit Gate
- [ ] Approved migration RFC with timeline and risk controls.

## Cross-Phase Security and Operations
- [ ] Track `npm audit` findings and prioritize production-impacting issues.
- [ ] Keep deterministic Docker builds (`npm ci --omit=dev` + lockfile in git).
- [ ] Ensure runtime DB files remain untracked.

## Current Next Actions
1. Start Batch 3.4 by moving `mont-marte-colors` write orchestration into service boundary.
2. Evaluate introducing db query helpers for category service to prepare full route->service->query layering.
3. Carry forward medium findings from `docs/refactor/PHASE3_2_REVIEW_GATE.md` into Batch 3.4.
