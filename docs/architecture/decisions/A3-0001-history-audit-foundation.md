# A3-0001: Add Additive History and Audit Foundation

Date: 2026-02-08
Status: Accepted
Batch: A3

## Context
Phase A requires traceable write history across critical entities without breaking current `/api` payload contracts or Synology runtime behavior. Existing history support was partial (`custom_colors_history` only) and lacked actor/request metadata.

## Decision
1. Keep migrations additive in `backend/db/migrations.js`.
2. Add two cross-cutting tables:
   - `audit_events`
   - `entity_change_events`
3. Extend existing history tables with additive metadata columns:
   - `custom_colors_history`
   - `color_schemes_history`
4. Emit audit/change events from service write paths for:
   - custom colors
   - artworks/schemes
   - mont-marte colors
   - categories
   - dictionaries
5. Add a generic timeline read API:
   - `GET /api/history/:entityType/:entityId`
6. Keep audit writes best-effort (`recordEntityChangeSafe`) to avoid breaking legacy runtime during transition.

## Alternatives Considered
1. Delay all audit/history until A4 auth.
   - Rejected: loses early traceability and slows concurrency/auth rollout.
2. Use DB triggers for audit rows.
   - Rejected: higher migration risk and harder rollback/debug in current codebase.
3. Introduce one large replacement schema migration.
   - Rejected: violates additive-only safety for production DB reuse.

## Consequences
- Positive:
  - Cross-entity timeline foundation is available now.
  - Existing endpoints remain backward-compatible.
  - Production DB rehearsal can validate A3 migration safely.
- Negative:
  - Actor identity is still header-derived until A4 login/session rollout.
  - Write-path code has additional event emission points that must be kept consistent in future refactors.

## Rollback Strategy
1. Revert A3 code changes (routes/services/domain modules/scripts/docs).
2. Keep additive schema columns/tables in DB (do not drop in-place).
3. Continue runtime without timeline endpoint if rollback needed.

## Validation Evidence
- `npm run phaseA:a3:db-dryrun` -> PASS
- `npm run phaseA:a3:api-smoke` -> PASS
- `npm run phase0:verify` -> PASS
- Gate report: `docs/architecture/PHASE_A3_REVIEW_GATE.md`
- DB validation update: `docs/refactor/PRODUCTION_DB_VALIDATION_2026-02-08.md`
