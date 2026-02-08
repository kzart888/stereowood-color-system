# A5-0001: Concurrency Conflict Contract Unification

Date: 2026-02-08
Status: Accepted
Batch: A5

## Context
Phase A5 requires one optimistic-locking policy and one `409` response shape across key mutable entities. Before this batch, only custom colors had a structured version conflict contract. Mont-Marte colors and artwork schemes lacked a unified stale-write behavior.

## Decision
1. Enforce optimistic locking for three critical mutable entities:
   - `custom_color`
   - `mont_marte_color`
   - `color_scheme`
2. Standardize conflict payload shape for all stale-write failures:
   - `error`
   - `code` (`VERSION_CONFLICT`)
   - `entityType`
   - `expectedVersion`
   - `actualVersion`
   - `latestData`
3. Add frontend conflict adapter (`frontend/legacy/js/adapters/conflict-adapter.js`) and route all A5 conflict handling through it.
4. Add explicit stale-write and contract snapshot smoke scripts:
   - `scripts/phaseA-a5-stale-smoke.js`
   - `scripts/phaseA-a5-conflict-contract.js`
5. Add verify command:
   - `npm run phaseA:a5:verify`

## Alternatives Considered
1. Keep entity-specific conflict formats.
   - Rejected: increases frontend branching and future maintenance cost.
2. Move to hard locking for updates.
   - Rejected: too disruptive for current API contract and UI flows.
3. Delay scheme/material optimistic lock to later phases.
   - Rejected: leaves high-risk stale-write paths open in active workflows.

## Consequences
- Positive:
  - Stale writes are consistently detectable and recoverable in frontend flows.
  - Conflict payload is now contract-testable across key entities.
  - Existing API endpoints remain path-compatible.
- Tradeoff:
  - Clients that perform writes should carry `version` for full conflict protection.
  - Legacy non-versioned writes still work, but lose stale-write guarantees by design.

## Rollback Strategy
1. Revert A5 route/service/query/frontend adapter changes.
2. Keep additive DB schema (`version` columns already additive from prior migration step).
3. Keep A5 smoke scripts as non-runtime tooling or revert if needed.

## Validation Evidence
- `npm run phaseA:a5:stale-smoke` -> PASS
- `npm run phaseA:a5:contract-snapshot` -> PASS
- `npm run phaseA:a5:verify` -> PASS
- `npm run phase0:verify` -> PASS
- Gate report: `docs/architecture/PHASE_A5_REVIEW_GATE.md`
