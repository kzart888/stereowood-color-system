# Changelog

## Unreleased (2026-03-08, U0-U7 + legacy UI pass)
### U11.2 Scheme Mapping Table Regression Fix + Closure Audit
- Standardized legacy list default page-size to `24`:
  - removed dev-only `2` page-size option from `custom-colors` / `artworks` / `mont-marte`
  - normalized legacy saved `2` page-size preferences to `24`
  - updated fallback defaults in legacy state paths
- Fixed scheme dialog mapping-table regression:
  - removed negative-margin alignment on layer-number input
  - removed header inline width hardcoding in mapping table
  - rebalanced fixed/flexible columns for compact layout
- Extended UI smoke coverage:
  - added layer-number visibility/no-clipping assertion
  - added mapping column-width regression assertion
- Aligned P6 smoke scripts with current auth policy:
  - self-register login now expects `must_change_password=false`
  - updated:
    - `scripts/phaseP6-pilot-write-smoke.js`
    - `scripts/phaseP6-pilot-rollback-rehearsal.js`
    - `scripts/phaseP6-pilot-write-docker-smoke.js`
- Added review/closure artifacts:
  - `docs/architecture/U11_2_REVIEW_GATE.md`
  - `docs/architecture/P8_PREMODERNIZATION_CLOSURE_GATE_2026-03-08.md`
- Updated deployment runbook with current Synology profile and build/push/pull routine:
  - `DEPLOYMENT_CHECKLIST.md`

### U11/U11.1 Scheme Dialog and Related Assets Completion
- Added related-asset download flow in scheme dialog:
  - UI action buttons `下载 + 删除` on existing assets
  - backend download route with UTF-8 filename-safe `Content-Disposition`
  - endpoint: `GET /api/artworks/:artworkId/schemes/:schemeId/assets/:assetId/download`
- Added related-asset source file time support:
  - DB column `color_scheme_assets.source_modified_at`
  - upload field `asset_last_modified` (optional)
  - migration backfill from upload file `mtime` (best effort)
- Added related-asset preview route + dialog rendering:
  - endpoint: `GET /api/artworks/:artworkId/schemes/:schemeId/assets/:assetId/preview`
  - supported preview kinds: `txt/md/docx/xlsx/xls` + fallback warning path
- Refined scheme dialog layout:
  - compact scheme-name row spacing
  - related-asset metadata block (name/time/type)
  - mapping table layer-input alignment and duplicate indicator positioning
  - unified mapping action button size/style
- Added verification script:
  - `npm run phaseU11:ui-smoke`

### P7.1 Login/RBAC/UI Alignment (V2)
- Aligned login error semantics:
  - `AUTH_ACCOUNT_NOT_FOUND` (404)
  - `AUTH_PASSWORD_INCORRECT` (401)
- Changed self-register policy:
  - pending self-register accounts now default to `must_change_password=false`
  - admin-created/reset accounts remain default password `123456` + forced first-login change
- Added actor-aware account permissions in admin list payload:
  - `can_reset/can_revoke/can_disable/can_enable/can_delete/can_promote/can_demote`
- Refactored login page into single credential block:
  - removed separate legacy register section
  - same username/password inputs drive both `登录` and `申请账号`
- Updated account-management UX:
  - operable top create-account bar (no password input)
  - disabled-state action buttons follow backend permissions
  - batch reset applies only to permitted rows
- Added/updated verification scripts:
  - `npm run phaseL:auth-login-matrix:smoke`
  - `npm run phaseL:auth-login-ui-smoke`
  - `npm run phaseL:auth-v2:verify`
- Updated gate compatibility check:
  - `scripts/phaseA-a4-auth-smoke.js` now reflects self-register no-force-change policy.

### Legacy UI Deep Optimization (U0-U7)
- Changed legacy pagination defaults to `24` for custom-colors / artworks / mont-marte (while preserving existing local preference values).
- Polished category manager drag interaction and top input-row alignment.
- Added artworks related-assets backend model and APIs:
  - `color_scheme_assets` migration + idempotent backfill from `initial_thumbnail_path`
  - list/add/delete/reorder endpoints for scheme assets.
- Updated artworks legacy UI:
  - renamed scheme-side section to `相关资料`
  - added quick-add plus-card and multi-asset editor in add/edit dialog
  - mixed image/document asset support with lightweight details + open-file flow.
- Unified key dialog/button styles and reduced dual-toggle selected-state visual artifacts.
- Added thumbnail sidecar generation (`*.thumb256.jpg`) and thumbnail-first rendering in list views.
- Added `docs/architecture/LEGACY_UI_U0_U7_CHECKLIST.md` and linked docs index/roadmap updates.

### Earlier Unreleased Entries (2026-03-07 cycle)
### P1/P2 Execution: Docs Alignment + Test Hardening
- Added docs/runtime contract audit matrix and P1 review gate.
- Archived obsolete top-level legacy plan docs under `docs/archive/legacy-plans/2026-03-top-level/`.
- Added automated docs contract checker: `npm run audit:docs-contract`.
- Added one-command full gate: `npm run gate:full`.
- Added Docker smoke automation: `npm run smoke:docker`.
- Added predeploy checklist automation: `npm run predeploy:check`.
- Added strict DB dry-run mode support: `npm run phaseA:a3:db-dryrun:strict`.
- Published P2 gate report: `docs/architecture/P2_REVIEW_GATE.md`.

### P3 Execution: Internal Auth Completion
- Added admin account-management APIs under `/api/auth/admin/*` (list/add/reset/disable/enable/delete/revoke sessions).
- Enforced per-user single-session login policy.
- Added runtime write-mode switches (`authEnforceWrites`, `readOnlyMode`) with admin API control.
- Added legacy internal auth/admin panel (`frontend/legacy/js/components/admin-auth-panel.js`).
- Added P3 verification command: `npm run phaseP3:verify`.
- Published P3 gate report: `docs/architecture/P3_REVIEW_GATE.md`.

### P4 Execution: History and Audit UX
- Added paginated/filterable feed API: `GET /api/history/feed`.
- Added legacy bottom audit timeline panel for active tabs with `who / when / what` lines.
- Added P4 verification command: `npm run phaseP4:verify`.
- Published P4 gate report: `docs/architecture/P4_REVIEW_GATE.md`.

### P5.1 Execution: Network Path Unification
- Removed direct `/api` `axios/fetch` calls from active legacy feature modules.
- Removed active `window.api` fallback usage in feature modules/bridge and standardized on `window.apiGateway`.
- Added static regression scan: `npm run phaseP5:network-scan`.
- Added P5 verification command: `npm run phaseP5:verify`.
- Published P5.1 gate report: `docs/architecture/P5_1_REVIEW_GATE.md`.

### P5.2/P5.3 Execution: Modular Decomposition + Conservative Archive
- Split `custom-colors` options into orchestrator/domain/state/ui modules and reduced orchestrator size substantially.
- Split `artworks` options into orchestrator + scheme domain/state/dialog modules and reduced orchestrator size substantially.
- Updated legacy script load order for extracted module files.
- Archived completed Phase 0-4 refactor logs to `docs/archive/refactor/2026-03-07-phase0-4-history/`.
- Archived stale one-time architecture refresh log to `docs/archive/architecture/2026-03-phase-a-closure/`.
- Published:
  - `docs/architecture/P5_2_REVIEW_GATE.md`
  - `docs/architecture/P5_3_REVIEW_GATE.md`

### P6.1/P6.2 Execution: Pilot Write Expansion + Decision Package
- Added pilot-only dictionary write endpoints under `/api/pilot/dictionaries/*` with auth-session requirement.
- Added new pilot feature flag: `PILOT_DICTIONARY_WRITE` (default off) and config surface `features.pilotDictionaryWrite`.
- Extended pilot UI with internal login and controlled dictionary write panel.
- Added verification scripts:
  - `npm run phaseP6:pilot-write-smoke`
  - `npm run phaseP6:pilot-rollback-rehearsal`
  - `npm run phaseP6:pilot-write-docker-smoke`
  - `npm run phaseP6:verify`
- Published:
  - `docs/architecture/P6_1_PILOT_DICTIONARY_WRITE_CONTRACT.md`
  - `docs/architecture/P6_1_PILOT_WRITE_RUNBOOK.md`
  - `docs/architecture/P6_1_REVIEW_GATE.md`
  - `docs/architecture/P6_2_CUTOVER_DECISION_PACKAGE.md`
  - `docs/architecture/P6_FULL_REVIEW_GATE.md`

### P7 Execution: Login/RBAC Hardening Refresh
- Switched web auth to cookie-first flow with independent login page:
  - `/` and `/login` for auth entry
  - `/app` for legacy business shell
  - `/account-management` for admin/super-admin account operations
- Added/confirmed first-login forced password change (`must_change_password`) for bootstrap, created, and reset accounts.
- Added role hardening rules:
  - create account as `user` first
  - promote/demote admin through dedicated APIs
- Changed auth token resolution to cookie-first and removed frontend localStorage token injection from active runtime path.
- Set legacy `x-admin-key` compatibility fallback to opt-in (`ALLOW_LEGACY_ADMIN_KEY=true`), default disabled.
- Added batch password reset API flow with secondary confirmation.
- Added dedicated RBAC smoke gate: `npm run phaseL:auth-rbac:smoke`.
- Updated phase P4 smoke to validate audit panel from authenticated `/app` route.
- Published P7 review gate: `docs/architecture/P7_AUTH_RBAC_REVIEW_GATE.md`.
- Published modernization planning baseline: `docs/architecture/P8_MODERN_PLATFORM_BLUEPRINT.md`.

## v0.9.9 (2026-03-07)
### Documentation and Execution Alignment Refresh
- Archived completed one-time architecture execution logs into `docs/archive/architecture/2026-03-phase-a-closure/`.
- Added architecture docs index: `docs/architecture/README.md`.
- Published consolidated future roadmap/checklist: `docs/architecture/LATEST_ROADMAP_P0_P6.md`.
- Updated Phase A implementation checklist to reflect recovered local Docker rehearsal status.

## v0.9.8 (2026-02-11)
### Legacy Stabilization Closure (Phase 0-5)
- Stabilized production contract on legacy UI + Express + SQLite.
- Standardized runtime contract (`/`, `/api`, `/health`, port `9099`, `DB_FILE=/data/color_management.db`).
- Completed phased cleanup/dedup/modular boundary work with review gates in `docs/refactor/`.
- Added encoding and smoke verification scripts (`npm run phase0:verify`).

### Architecture Upgrade Branch (Phase A Complete)
- Completed Phase A batches A0-A8 on `architecture-upgrade`.
- Added backend foundation for auth, audit, history timeline, and conflict contract unification.
- Added pilot UI slice (`/pilot`, feature-flagged by `ENABLE_PILOT_UI=true`).
- Published final gate with merge recommendation: `docs/architecture/PHASE_A_REVIEW_GATE.md`.

## v0.8.2 (2025-01-03)
### Major Codebase Cleanup
- **Removed 35+ redundant files** across frontend, backend, and documentation
- **Consolidated package management** to single package.json at root
- **Simplified documentation** from 21 files to 3 essential files
- **Cleaned directories** - removed duplicate uploads, backup folders, test scripts
- **Space saved**: ~170MB (mostly from consolidated node_modules)
- **Result**: 30% cleaner codebase, 86% less documentation

### Documentation Reform
- Created `docs/OPERATIONS.md` - consolidated operational guide
- Simplified `README.md` from 315 to 42 lines
- Deleted entire `docs/refactoring/` folder (5 files of outdated plans)
- Removed all redundant deployment, development, and feature docs
- Updated `CLAUDE.md` with cleanup results

### Files Deleted
- Frontend: `components.backup/`, `node_modules/`, `package-lock.json`
- Backend: `routes/colors.js`, `routes/materials.js`, `services/MaterialService.js`, `services/FormulaService.js`, `init-data.js`, `db/run-migration.js`
- Root: `uploads/` folder, `nul` file
- Docs: 18 redundant documentation files

## v0.8.1 (2025-01-03)
### Codebase Cleanup
- Removed all duplicate files and redundant code
- Consolidated to single package.json at root
- Simplified documentation from 21 files to 3
- Deleted 130KB of outdated refactoring plans
- Fixed UI layouts and formula display

### What Was Deleted
- Frontend: components.backup/, node_modules, package-lock.json
- Backend: duplicate routes, unused services, test scripts
- Documentation: 18 redundant files
- Total: ~30% file reduction, ~170MB saved

## v0.8.0 (2025-08-28)
- Backend fully modularized
- Removed caching for real-time updates
- Simplified image handling

## v0.7.x (2025-08)
- Initial development
- Core features implemented
