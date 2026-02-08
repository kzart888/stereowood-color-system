# Phase A4 Review Gate

Date: 2026-02-08
Reviewer: code-review-agent workflow
Scope: Batch A4 implementation (`internal auth + approval + behavior audit`)

## Findings

### Critical
- None.

### High
- None.

### Medium
1. Admin approval actions are protected by shared admin key (`INTERNAL_ADMIN_KEY`) rather than authenticated admin identity.
   - Files: `backend/routes/auth.js`, `backend/domains/auth/service.js`
   - Impact: operationally acceptable for current internal scope, but not sufficient for multi-admin traceability and principle-of-least-privilege.
   - Follow-up: replace with authenticated admin role in next auth hardening batch.

### Low
1. Session token storage is plain token in SQLite.
   - Files: `backend/db/queries/auth.js`
   - Impact: acceptable for local/internal deployment but should migrate to hashed token storage for defense-in-depth.
2. Error mapping in auth service is intentionally conservative and may report some unexpected backend errors as validation errors.
   - Files: `backend/domains/auth/service.js`
   - Impact: lower diagnostic precision for unanticipated failure modes.

## Open Questions / Assumptions
- Assumes A4 scope permits admin key bootstrap approach before admin-account RBAC exists.
- Assumes session lifetime (`SESSION_TTL_HOURS`, default 12) is acceptable for current internal workflow.

## Test Evidence
1. A4 auth flow and protected write
   - `npm run phaseA:a4:auth-smoke` -> PASS
   - Verified: register -> approve -> login -> protected write
2. Audit actor binding
   - `npm run phaseA:a4:auth-smoke` -> PASS
   - Verified timeline write event includes authenticated actor id
3. Read-only fallback
   - `npm run phaseA:a4:readonly-smoke` -> PASS
   - Verified reads remain available, writes blocked with `503`
4. Baseline regression
   - `npm run phaseA:a4:verify` -> PASS
   - `npm run phase0:verify` -> PASS
5. Dependency risk scan
   - `npm audit --omit=dev` -> 5 high (unchanged sqlite3 transitive chain; previously risk-accepted)

## Gate Decision
- PASS with no open Critical/High findings.
- Batch A4 is complete and ready to proceed to Batch A5.
