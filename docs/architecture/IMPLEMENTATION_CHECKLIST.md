# Architecture Upgrade Implementation Checklist (Phase A)

Last updated: 2026-02-08  
Scope: Execute replanned Phase A from `docs/architecture/PHASE_A_BLUEPRINT.md`

## Working Rules
- [ ] Keep `frontend/legacy` as production UI during Phase A.
- [ ] Keep `/api` payload compatibility and `/health` behavior unchanged.
- [ ] Keep Synology runtime contract unchanged (`/data`, `/app/backend/uploads`, `/app/backend/backups`).
- [ ] Run `npm run phase0:verify` after each risky change-set.
- [ ] Run `code-review-agent` gate after each completed batch.
- [ ] Keep DB migrations additive unless explicitly approved by gate decision.

## Batch A0: Contract Baseline and Harness Hardening (Completed)
- [x] Contract smoke scripts exist and pass.
- [x] Architecture decision log structure exists under `docs/architecture/decisions/`.
- [x] Verification command exists (`npm run phaseA:a0:verify`).

## Batch A1: Module Boundary Enforcement
- [x] Create backend domain folders with explicit ownership:
  - `backend/domains/custom-colors/`
  - `backend/domains/artworks/`
  - `backend/domains/materials/`
  - `backend/domains/categories/`
  - `backend/domains/dictionaries/`
  - `backend/domains/shared/`
- [x] Add or tighten route -> service -> query dependency constraints.
- [x] Standardize frontend API entry to adapter gateway pattern.
- [x] Isolate `window.*` usages into `frontend/legacy/js/compat/`.
- [x] Add/update decision record for A1.

Gate:
- [x] `node --check backend/**/*.js`
- [x] `node --check frontend/legacy/js/**/*.js`
- [x] `npm run phase0:verify`
- [x] `docs/architecture/decisions/A1-*.md`
- [x] `docs/architecture/PHASE_A1_REVIEW_GATE.md`

## Batch A2: Large-File Decomposition and Dedup Completion
- [x] Split `custom-colors.js` into orchestrator + domain/state/ui modules.
- [x] Split `artworks.js` into orchestrator + domain/state/ui modules.
- [x] Split `mont-marte.js` into orchestrator + domain/state/ui modules.
- [x] Remove duplicated fallback logic in extracted modules.
- [x] Keep orchestration files <= 700 lines each.
- [x] Add/update decision record for A2.

Gate:
- [x] Tab smoke: custom colors / artworks / mont-marte / color dictionary.
- [x] Dialog smoke: create/edit/delete and conflict message path.
- [x] `npm run phase0:verify`
- [x] `docs/architecture/decisions/A2-*.md`
- [x] `docs/architecture/PHASE_A2_REVIEW_GATE.md`

## Batch A3: Data History and Audit Foundation
- [x] Inventory existing history coverage and gaps per entity.
- [x] Design additive schema for history + audit metadata.
- [x] Add migration scripts with rollback notes.
- [x] Emit audit/history events from service write paths.
- [x] Add read API for timeline views if needed without breaking existing APIs.
- [x] Add/update decision record for A3.

Gate:
- [x] Migration dry-run on copied production DB trio.
- [x] API smoke on affected entities.
- [x] `docs/refactor/PRODUCTION_DB_VALIDATION_YYYY-MM-DD.md` update.
- [x] `docs/architecture/decisions/A3-*.md`
- [x] `docs/architecture/PHASE_A3_REVIEW_GATE.md`

## Batch A4: Internal Auth + Approval + Behavior Audit
- [x] Add minimal account model (pending, approved, disabled).
- [x] Add registration request + approval/reject flow.
- [x] Add login/session lifecycle for internal users.
- [x] Bind actor metadata to write operations and audit events.
- [x] Keep read-only flows available for maintenance mode fallback.
- [x] Add/update decision record for A4.

Gate:
- [x] Auth smoke: register -> approve -> login -> protected write.
- [x] Audit smoke: write action records actor.
- [x] `npm run phase0:verify`
- [x] `docs/architecture/decisions/A4-*.md`
- [x] `docs/architecture/PHASE_A4_REVIEW_GATE.md`

## Batch A5: Concurrency Conflict Strategy Unification
- [x] Standardize version-check policy across mutable entities.
- [x] Normalize `409` payload contract for all conflict responses.
- [x] Add frontend conflict adapter and merge/retry UX rules.
- [x] Add service-layer tests or smoke scripts for stale-write scenarios.
- [x] Add/update decision record for A5.

Gate:
- [x] Dual-client stale-write smoke for critical entities.
- [x] Contract snapshot check for conflict payload shape.
- [x] `npm run phase0:verify`
- [x] `docs/architecture/decisions/A5-*.md`

## Batch A6: UI System Unification
- [x] Define design tokens (typography, spacing, color, states).
- [x] Align shared UI primitives for dialog/list/form/notification.
- [x] Reduce style and interaction divergence across tabs.
- [x] Ensure Chinese copy and UTF-8 text remain correct.
- [x] Add/update decision record for A6.

Gate:
- [x] Visual smoke and interaction smoke for all major tabs.
- [x] `npm run audit:encoding`
- [x] `npm run phase0:verify`
- [x] `docs/architecture/decisions/A6-*.md`

## Batch A7: Suitable Tech-Stack Upgrade Decision and Pilot
- [x] Update modernization ADR with suitability matrix and constraints.
- [x] Confirm pilot slice and migration contract.
- [x] Implement pilot with rollback-ready deployment script/runbook.
- [x] Execute Synology rehearsal for pilot slice.
- [x] Add/update decision record for A7.

Gate:
- [x] Pilot parity checks pass.
- [x] Synology rehearsal evidence updated.
- [x] `docs/architecture/decisions/A7-*.md`

## Batch A8: Final Gate and Branch Readiness
- [x] Run full `code-review-agent` pass and resolve findings.
- [x] Publish `docs/architecture/PHASE_A_REVIEW_GATE.md`.
- [x] Confirm deployment/runbook docs stay aligned.
- [x] Freeze branch for merge decision.

Gate:
- [x] No open Critical/High findings.
- [x] `npm run phase0:verify` pass.
- [x] Merge recommendation documented.
