# Phase A Blueprint: Architecture Upgrade (Replanned)

Date: 2026-02-08  
Branch baseline: `architecture-upgrade`  
Precondition: Phase 5 stabilization gate passed (`docs/refactor/PHASE5_REVIEW_GATE.md`)

## Skill Used
- `refactor-planner`: replanned with legacy-first safety and phased gates.

## Goal Assessment
1. Delete obsolete/useless code: reasonable and high-value.
   - Adjustment: continue only after feature ownership is explicit to avoid deleting hidden runtime dependencies.
2. Combine repeated logic: reasonable and already partially completed in Phase 2.
   - Adjustment: finish dedup inside module boundaries, not as global search/replace.
3. Full modular refactor with clean public/private boundaries: reasonable.
   - Adjustment: execute as layered modular-monolith first, then framework migration slices.
4. Upgrade to latest suitable stack: reasonable if driven by risk and team capacity.
   - Adjustment: prefer "stable + supportable" over "latest by version number".
5. New requirements (history, login/audit, conflict control, unified UI): reasonable and should be planned now.
   - Adjustment: split into additive schema and compatibility-first batches.

## Current State Summary
- Production runtime is still `frontend/legacy` + Express + SQLite.
- Deployment is Docker image push/pull to Synology with `DB_FILE=/data/color_management.db`.
- Existing history support exists for custom colors/schemes, but actor/audit metadata is incomplete.
- Existing optimistic locking exists on key entities, but conflict UX/policies are not fully unified.
- Frontend hotspot file sizes still indicate high maintenance risk:
  - `frontend/legacy/js/components/custom-colors.js` (~2344 lines)
  - `frontend/legacy/js/components/artworks.js` (~1718 lines)
  - `frontend/legacy/js/components/mont-marte.js` (~1001 lines)

## Scope
- Define module boundaries for backend domains and frontend feature modules.
- Introduce additive data governance for history + audit + conflict handling.
- Add minimal internal auth with approval workflow and behavior audit trail.
- Unify UI design system for consistent UX and lower change cost.

## Non-Goals
- No one-shot full rewrite cutover.
- No endpoint path/payload breaking changes in this phase.
- No destructive DB migration without rehearsal and rollback playbook.

## Architecture Principles
1. Keep runtime contract stable (`/api`, `/health`, legacy payload keys).
2. Refactor behind compatibility adapters first, then remove wrappers.
3. Enforce ownership chain: route -> domain service -> query/tx.
4. Make data change traceable: who changed what, when, and why.
5. Keep each batch revertable by one commit group + one gate report.

## Batch Plan

### A0: Contract Baseline and Harness Hardening (Completed)
Deliverables:
- API smoke and frontend runtime contract checks are active.
- Architecture decision log structure established in `docs/architecture/decisions/`.

Acceptance:
- `npm run phaseA:a0:verify` and `npm run phase0:verify` are green.

Rollback:
- Additive only, no runtime contract changes.

### A1: Module Boundary Enforcement (Completed)
Deliverables:
- Backend domain package boundaries (`custom-colors`, `artworks`, `materials`, `categories`, `dictionaries`, `shared`).
- Frontend adapter boundary (`api-gateway`) and explicit compat shims for `window.*`.
- Dependency rules documented and lint-checked where feasible.

Verification:
- `node --check backend/**/*.js`
- `node --check frontend/legacy/js/**/*.js`
- existing API and tab smoke.

Rollback:
- Keep route/component compatibility wrappers until parity confirmed.

### A2: Large-File Decomposition and Dedup Completion (Completed)
Deliverables:
- Decompose hotspot components into feature modules (state/domain/ui actions).
- File-length target: orchestration files <= 700 lines.
- Remove duplicate fallback logic that persists after Phase 2/4.

Verification:
- create/edit/delete smoke on custom colors, artworks, mont-marte.
- regression check for filters, pagination, formula rendering, category flows.

Rollback:
- Preserve old function signatures through adapters for one batch before deletion.

### A3: Data History and Audit Foundation (Completed)
Deliverables:
- Additive schema plan and migration scripts for durable history/audit:
  - extend existing history rows with actor/context metadata
  - introduce unified change-event/audit table for all critical writes
- Service-level write hooks to emit audit events for:
  - custom colors (`自配色`)
  - schemes (`配色方案`)
  - mont-marte colors
  - dictionaries/categories

Verification:
- migration dry-run on copied production DB set (`.db/.db-wal/.db-shm`).
- read/write smoke confirms no payload breakage.

Rollback:
- keep migration additive and backward-compatible; no table drops in A3.

Status:
- Completed on 2026-02-08.
- Verification artifacts:
  - `docs/architecture/PHASE_A3_HISTORY_AUDIT_INVENTORY.md`
  - `docs/architecture/decisions/A3-0001-history-audit-foundation.md`
  - `docs/architecture/PHASE_A3_REVIEW_GATE.md`

### A4: Internal Auth + Approval + Behavior Audit (Completed)
Deliverables:
- Minimal internal account system:
  - account registration request
  - admin approval/reject
  - disable/delete account
- Session/token strategy for internal use (simple and supportable).
- Behavior audit linkage (`actor_id`) to write operations.
- Role model supports future expansion (RBAC-ready, simple initially).

Verification:
- auth flow smoke: register -> approve -> login -> protected write.
- audit log smoke: operation records actor and action.

Rollback:
- feature flag or bypass mode for local single-user fallback.

Status:
- Completed on 2026-02-08.
- Verification artifacts:
  - `docs/architecture/decisions/A4-0001-auth-approval-write-guard.md`
  - `docs/architecture/PHASE_A4_REVIEW_GATE.md`

### A5: Concurrency Conflict Strategy Unification
Deliverables:
- Standardize optimistic-lock behavior and response contract across mutable entities.
- Introduce unified conflict resolver helpers (server + frontend adapter).
- Ensure conflict metadata is actionable in UI (latest snapshot, expected/actual version).

Verification:
- dual-client stale update tests for custom color / scheme / material edits.
- conflict response contract snapshot tests.

Rollback:
- preserve legacy write path wrappers until conflict path is proven stable.

Status:
- Completed on 2026-02-08.
- Verification artifacts:
  - `docs/architecture/decisions/A5-0001-concurrency-conflict-contract.md`
  - `docs/architecture/PHASE_A5_REVIEW_GATE.md`

### A6: UI System Unification
Deliverables:
- Design tokens (`color`, `spacing`, `typography`, `state`) and shared component rules.
- Shared UI primitives for dialog/list/form/notification semantics.
- Consistent interaction and text guidelines (including Chinese text and encoding rules).

Verification:
- visual and behavior smoke for four main tabs.
- no new UTF-8 audit failures.

Rollback:
- incremental opt-in: old styles/components can coexist during migration.

Status:
- Completed on 2026-02-08.
- Verification artifacts:
  - `docs/architecture/decisions/A6-0001-ui-system-unification.md`
  - `docs/architecture/PHASE_A6_REVIEW_GATE.md`

### A7: Suitable Tech-Stack Upgrade Decision and Pilot
Deliverables:
- Technology suitability matrix and ADR update:
  - backend: keep Express JS vs gradual TypeScript introduction
  - frontend: pilot modern stack slice (Vue 3 + Vite candidate) behind stable API
- one low-risk feature pilot with cutover and rollback runbook.

Verification:
- pilot parity checks pass against current API contract.
- Synology rehearsal completed with rollback evidence.

Rollback:
- pilot isolated from main legacy runtime path.

Status:
- Completed on 2026-02-11.
- Verification artifacts:
  - `docs/refactor/ADR-0001-modernization-path.md`
  - `docs/architecture/PHASE_A7_PILOT_CONTRACT.md`
  - `docs/architecture/PHASE_A7_PILOT_RUNBOOK.md`
  - `docs/architecture/PHASE_A7_SYNOLOGY_REHEARSAL_EVIDENCE.md`
  - `docs/architecture/PHASE_A7_REVIEW_GATE.md`
  - `docs/architecture/decisions/A7-0001-modernization-pilot-suitability.md`

### A8: Phase A Final Gate
Deliverables:
- `docs/architecture/PHASE_A_REVIEW_GATE.md` with full code-review-agent findings and resolutions.
- updated runbooks, ownership map, and dependency graph.

Acceptance:
- no open Critical/High findings.
- production deployment docs remain aligned with Synology contract.

Status:
- Completed on 2026-02-11.
- Verification artifacts:
  - `docs/architecture/PHASE_A_REVIEW_GATE.md`

## Dependencies and Open Questions
- Confirm initial admin bootstrap method for first account approval.
- Confirm audit retention policy (for example 180 days vs permanent).
- Confirm whether conflict policy needs hard lock in any specific workflow.
- Confirm whether `pantone-colors-full.js` remains static asset or should move to build-time data source.

## Risks and Controls
- Risk: hidden coupling in legacy globals.
  - Control: compatibility shims + batch smoke + explicit dependency map.
- Risk: DB migration mistakes on production data.
  - Control: copy-based rehearsal with WAL trio and rollback snapshot.
- Risk: over-engineering auth for current team size.
  - Control: minimal internal auth first, future RBAC hooks only.

## Phase A Exit Criteria
- Clear and enforceable module boundaries are implemented.
- History + audit + conflict strategy is operational for critical entities.
- UI system baseline is consistent and reusable.
- Suitable modernization pilot path is validated without production disruption.
