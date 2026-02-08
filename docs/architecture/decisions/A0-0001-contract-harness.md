# A0-0001: Add Contract Harness as Refactor Safety Baseline

Date: 2026-02-08  
Status: Accepted  
Batch: A0

## Context
Phase A introduces structural refactors across backend and legacy frontend.  
Without an executable contract harness, architecture changes risk silent runtime drift.

## Decision
Add two baseline contract checks and one aggregate verifier:

1. API contract smoke:
   - `scripts/api-contract-smoke.js`
   - boots backend with disposable DB and validates read/write lifecycle for core domains.
2. Frontend runtime contract audit:
   - `scripts/frontend-runtime-contract.js`
   - validates script-load integrity and key global exports required by legacy runtime.
3. Aggregate command:
   - `npm run phaseA:a0:verify`

## Alternatives Considered
1. Manual checklist only:
   - Rejected: too easy to miss regressions during iterative refactor batches.
2. Full browser E2E first:
   - Deferred: higher setup cost for A0; smoke-level contract checks provide faster baseline.

## Consequences
- Positive:
  - Faster detection of contract drift before code-review gates.
  - Safer decomposition of large modules in A1 to A3.
- Tradeoff:
  - Additional script maintenance when public contracts intentionally change.

## Rollback Strategy
- If scripts become noisy/blocking, keep `phase0:verify` as hard gate and run A0 checks in advisory mode temporarily.
- Revert script changes in isolated commit if needed.

## Validation Evidence
- `npm run phaseA:a0:verify` passes on `architecture-upgrade` baseline.
