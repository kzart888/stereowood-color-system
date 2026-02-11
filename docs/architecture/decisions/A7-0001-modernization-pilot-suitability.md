# A7-0001: Suitable Tech-Stack Upgrade and Pilot Decision

Date: 2026-02-11  
Status: Accepted  
Batch: A7

## Context
Phase A requires a modernization path that improves maintainability without disrupting legacy production runtime on Synology. The system is currently stable on `frontend/legacy` + Express + SQLite, and migration risk must stay low.

## Decision
1. Keep runtime baseline as:
   - backend: Express JS (current) with incremental modular hardening
   - frontend: `frontend/legacy` remains production
   - DB: SQLite with additive migration policy
2. Choose modernization approach:
   - parallel pilot migration (Vue 3 + Vite candidate) as the preferred track
   - reject one-shot full rewrite for this phase
3. Implement A7 pilot slice as:
   - read-only explorer served at `/pilot`
   - enabled only with `ENABLE_PILOT_UI=true`
   - contract locked to existing read endpoints (`/api/config`, `/api/custom-colors`, `/api/categories`, `/api/suppliers`, `/api/purchase-links`)
4. Add pilot parity automation:
   - `scripts/phaseA-a7-pilot-parity.js`
   - npm scripts `phaseA:a7:pilot-parity` and `phaseA:a7:verify`
5. Keep rollback simple:
   - disable pilot via env flag
   - container-level rollback to previous image tag

## Alternatives Considered
1. Continue legacy-only hardening without pilot.
   - Rejected: maintainability gains are too limited.
2. Full Vue 3 cutover in one release.
   - Rejected: unacceptable release risk for current team bandwidth.
3. Backend full TypeScript conversion in A7.
   - Rejected: too broad for pilot batch scope.

## Consequences
- Positive:
  - Pilot modernization path is now concrete and testable without touching legacy production path.
  - Upgrade suitability is documented with explicit constraints and decision criteria.
  - Rehearsal and rollback process remains compatible with Synology workflow.
- Tradeoff:
  - Pilot adds one optional UI surface (`/pilot`) that must stay contract-aligned.
  - Full framework migration remains deferred to post-A7 batches.

## Rollback Strategy
1. Set `ENABLE_PILOT_UI=false`.
2. Redeploy candidate or revert to previous image tag.
3. Re-run health and root smoke checks:
   - `/health`
   - `/`
4. Keep `/api` contract unchanged during rollback.

## Validation Evidence
- `npm run phaseA:a7:pilot-parity` -> PASS
- `npm run phaseA:a7:verify` -> PASS
- `npm run phase0:verify` -> PASS
- Docker rehearsal (Windows) parity against running container -> PASS
- Rehearsal evidence:
  - `docs/architecture/PHASE_A7_SYNOLOGY_REHEARSAL_EVIDENCE.md`
  - `docs/architecture/PHASE_A7_PILOT_RUNBOOK.md`
