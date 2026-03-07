# Changelog

## Unreleased (2026-03-07, P1/P2)
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
