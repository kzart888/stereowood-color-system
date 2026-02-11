# ADR-0001: Modernization Path After Legacy Stabilization

- Status: Approved
- Date: 2026-02-07
- Scope: Frontend modernization path while keeping current backend stable

## Context
- Current production mode uses `frontend/legacy` served by backend.
- Legacy stabilization phases have reduced major runtime risk.
- Team goal is full refactor toward cleaner modules, better maintainability, and lower future change cost.
- Deployment model is Docker image push/pull to Synology.

## Options
1. Continue hardening legacy UI only (no new frontend framework).
2. Full fresh frontend rebuild (Vue 3) with one-time cutover.
3. Parallel pilot migration: keep legacy in production, build new frontend slice-by-slice behind compatibility contract.

## Decision Criteria
- Delivery risk (weight: high): likelihood of breaking production behavior.
- Maintainability gain (weight: high): clarity of module boundaries and testability.
- Migration cost (weight: medium): engineering effort and timeline.
- Downtime/cutover risk (weight: high): risk during Synology rollout/rollback.
- Data and API compatibility risk (weight: high): risk of backend contract drift.

## A7 Suitability Matrix (2026-02-11 Update)

### Backend track
| Candidate | Delivery Risk | Maintainability Gain | Ops Fit (Synology) | Decision |
|---|---:|---:|---:|---|
| Keep Express JS (current) + stricter module boundaries | Low | Medium | High | Keep as baseline |
| Incremental TypeScript in new domain/adapters only | Low-Medium | High | High | Recommended |
| Full TS conversion in one cutover | High | High | Medium | Reject for now |

### Frontend track
| Candidate | Delivery Risk | Maintainability Gain | Ops Fit (Synology) | Decision |
|---|---:|---:|---:|---|
| Continue legacy-only hardening | Low | Low-Medium | High | Transitional only |
| Parallel Vue 3 + Vite pilot (read-only slice first) | Medium | High | High | Recommended |
| Full Vue 3 rewrite with one-time cutover | High | High | Medium | Reject for now |

### Data and runtime track
| Candidate | Delivery Risk | Maintainability Gain | Ops Fit (Synology) | Decision |
|---|---:|---:|---:|---|
| Keep SQLite + additive schema (current) | Low | Medium | High | Keep for Phase A |
| Move to PostgreSQL during Phase A | High | High | Medium | Defer to post-Phase A |

## A7 Constraints
1. Keep `frontend/legacy` as production UI in this phase.
2. Keep `/api` payload and `/health` behavior backward-compatible.
3. Pilot must be read-only and reversible by env toggle + container rollback.
4. Synology runtime contract stays unchanged (`/data`, uploads, backups mount paths).
5. No destructive DB migration in A7.

## Decision
- Recommended path: **Option 3 (parallel pilot migration)**.
- Rationale:
  - Preserves stable production while enabling incremental modernization.
  - Supports strict API compatibility and rollback safety.
  - Better fit for limited bandwidth and non-disruptive delivery.

## Go/No-Go Threshold
- Go for pilot only when all conditions are met:
  1. Phase 0 smoke and encoding checks are consistently green.
  2. Phase 5.2 dependency risks are either fixed or formally accepted with mitigations.
  3. API contract baseline is documented for the selected pilot slice.
  4. Synology cutover and rollback runbook is rehearsed at least once.
- No-Go if any single condition above is not satisfied.

## Sign-Off Owners
- Product/maintainer owner: repository owner.
- Backend owner: backend maintainer.
- Frontend owner: frontend maintainer.
- Release/operations owner: deployment maintainer for Synology.

## Sign-Off Record
- Approved by maintainer: `kzart`
- Approval date: 2026-02-08
- Decision: Proceed with Option 3 (parallel pilot migration) and architecture-upgrade branch planning.

## Consequences
- Legacy remains production UI during migration period.
- New frontend work must be constrained to one low-risk feature slice first.
- Additional documentation and gate checks become required before broad rollout.

## Next Actions
1. Define Phase 5.4 pilot slice and API compatibility contract.
2. Author Synology cutover + rollback runbook for pilot.
3. Add gate review report after first pilot rehearsal.

## A7 Execution Record
- Pilot UI implementation path: `frontend/pilot` served at `/pilot` only when `ENABLE_PILOT_UI=true`.
- Pilot contract and runbook:
  - `docs/architecture/PHASE_A7_PILOT_CONTRACT.md`
  - `docs/architecture/PHASE_A7_PILOT_RUNBOOK.md`
  - `docs/architecture/PHASE_A7_SYNOLOGY_REHEARSAL_EVIDENCE.md`
