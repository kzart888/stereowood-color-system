# P7 Auth/RBAC Review Gate

Date: 2026-03-07  
Scope: Login split + cookie session + role-based account management hardening.

## Gate Verdict
- `PASS` for release candidate.
- No open Critical/High regressions found in runtime contract, auth flow, or Docker rehearsal path.

## code-review-agent Findings (Full Repo Gate)
- Critical: none.
- High: none in application/runtime code.
- High (tracked dependency risk): `npm audit --omit=dev` still reports transitive high findings in `sqlite3` toolchain path (`node-gyp`/`tar` chain). This is pre-existing and unchanged by P7.
- Medium: none blocking rollout.
- Low: legacy compatibility hooks (`Bearer` and `x-session-token`) remain intentionally for smoke tooling/transitional clients.

## Verified Runtime Contract
- Login entry: `/` and `/login`.
- Legacy business shell: `/app`.
- API base: `/api`.
- Health: `/health`.
- Default port: `9099`.
- Container DB path: `/data/color_management.db`.

## Auth/RBAC Contract Confirmed
- Session medium: `HttpOnly` cookie (`sw_session`), default TTL `30 days`.
- Role model: `super_admin`, `admin`, `user`.
- First-login forced password change for:
  - bootstrap super admin `admin/admin`
  - admin-created accounts
  - reset-password accounts
- Single active session per account (new login revokes old sessions).
- Account creation rule:
  - create `user` only
  - promote to `admin` via dedicated endpoint.

## Evidence (Commands)
- `npm run phase0:verify`
- `npm run phaseP3:verify`
- `npm run phaseP4:verify`
- `npm run phaseL:auth-rbac:smoke`
- `npm run gate:full`
- `npm run audit:docs-contract`

## Security/Dependency Note
- `npm audit --omit=dev` still reports transitive high issues mainly in the `sqlite3` toolchain path.
- This remains a tracked risk; not introduced by P7 changes.

## Residual Risks (Non-Blocking)
- Legacy fallback `x-admin-key` path exists for compatibility but is disabled by default; enable only for controlled automation.
- Legacy token compatibility hooks (`Bearer`/`x-session-token`) still exist for smoke tooling and transitional clients.

## Open Questions / Assumptions
- Assumption: internal automation that still needs `x-admin-key` can explicitly set `ALLOW_LEGACY_ADMIN_KEY=true`.
- Assumption: production rollout keeps `ALLOW_LEGACY_ADMIN_KEY=false` unless a controlled temporary exception is approved.

## Test Gaps
- UI-level Playwright E2E for account-management page is still recommended before final production cutover.

## Recommended Next Step
- Start P8 (`codex/modern-platform-v1`) with legacy `/app` kept as stable fallback until parity + rollback gates pass.
