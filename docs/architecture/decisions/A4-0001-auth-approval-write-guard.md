# A4-0001: Internal Auth, Approval Flow, and Write Access Guard

Date: 2026-02-08
Status: Accepted
Batch: A4

## Context
Phase A3 introduced cross-entity audit/timeline. A4 requires lightweight internal auth so write operations can be attributable to authenticated users, while keeping legacy runtime compatibility and maintenance fallback behavior.

## Decision
1. Add additive auth/session schema:
   - `user_accounts` (`pending`, `approved`, `disabled`)
   - `user_sessions`
2. Add internal auth APIs:
   - registration request
   - admin pending list + approve/reject (guarded by `INTERNAL_ADMIN_KEY`)
   - login/logout/me
3. Add write-access guard middleware:
   - `AUTH_ENFORCE_WRITES=true` -> write APIs require valid session token
   - `READ_ONLY_MODE=true` -> write APIs return `503`, reads remain available
4. Bind write actor metadata from authenticated session by default:
   - `extractAuditContext` prefers `req.authUser` over free headers
5. Keep read endpoints public for legacy-first transition.

## Alternatives Considered
1. Full RBAC implementation in A4.
   - Rejected: too large for this batch; defer to later phases.
2. JWT/stateless token model immediately.
   - Rejected: unnecessary complexity for internal small-team workflow.
3. Enforce auth writes unconditionally.
   - Rejected: would break legacy runtime contract and rollout safety.

## Consequences
- Positive:
  - Write operations can be bound to authenticated internal actors.
  - Approval lifecycle supports simple internal onboarding.
  - Maintenance/read-only mode is explicit and testable.
- Tradeoff:
  - Admin approval currently uses shared admin key instead of user-based admin identity.
  - Session and account controls are intentionally minimal (no RBAC yet).

## Rollback Strategy
1. Revert A4 route/middleware/domain/query/script changes.
2. Keep additive auth tables in DB (no destructive rollback migration).
3. Set `AUTH_ENFORCE_WRITES=false` and `READ_ONLY_MODE=false` to restore legacy open-write behavior immediately.

## Validation Evidence
- `npm run phaseA:a4:auth-smoke` -> PASS
- `npm run phaseA:a4:readonly-smoke` -> PASS
- `npm run phaseA:a4:verify` -> PASS
- `npm run phase0:verify` -> PASS
- Gate report: `docs/architecture/PHASE_A4_REVIEW_GATE.md`
