# ADR-0001: Modernization Path After Legacy Stabilization

- Status: Draft
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

## Consequences
- Legacy remains production UI during migration period.
- New frontend work must be constrained to one low-risk feature slice first.
- Additional documentation and gate checks become required before broad rollout.

## Next Actions
1. Define Phase 5.4 pilot slice and API compatibility contract.
2. Author Synology cutover + rollback runbook for pilot.
3. Add gate review report after first pilot rehearsal.
