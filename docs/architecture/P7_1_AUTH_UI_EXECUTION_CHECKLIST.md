# P7.1 Auth/Login/UI Execution Checklist (V2)

Last updated: 2026-03-08
Branch: `codex/legacy-ui-related-assets`

## Scope
- Align login/apply behavior with product rules.
- Align RBAC account-management behavior with role matrix.
- Preserve legacy production runtime (`/login` + `/app`) and keep rollout backward-safe.

## Completed Items

### R1 Backend auth semantics
- [x] `POST /api/auth/register-request` now stores pending accounts with `must_change_password=0`.
- [x] `POST /api/auth/login` now returns split error codes:
  - [x] `AUTH_ACCOUNT_NOT_FOUND` (`404`)
  - [x] `AUTH_PASSWORD_INCORRECT` (`401`)
- [x] Admin create/reset password policies locked:
  - [x] custom password input rejected
  - [x] default password fixed to `123456`
  - [x] `must_change_password=1` for admin-created/reset accounts
- [x] Migration backfill added for historical pending self-register rows:
  - [x] set `must_change_password=0` when still pending/unapproved.
- [x] Account list payload includes per-row permissions booleans.

### R2 Login page single-form flow
- [x] Removed legacy dual-zone register block.
- [x] Login and apply share one username/password input group.
- [x] Login error copy now maps by auth code:
  - [x] account missing
  - [x] password incorrect
  - [x] not approved/disabled
- [x] Apply behavior:
  - [x] existing account -> `账号已存在，可直接登录`
  - [x] non-existing + weak password -> blocked client-side (`>=8`)
  - [x] non-existing + strong password -> submit request
- [x] Forced change-password panel shows only when `must_change_password=true`.

### R3 Account-management permission-state UX
- [x] Top create-account row is operable and does not expose password input.
- [x] Batch reset only includes rows with `can_reset=true`.
- [x] Row action buttons render disabled state from backend `permissions`.
- [x] Self/super-admin/admin-role blocked operations are prevented in UI before request.

### U8/U9 targeted style consistency pass
- [x] Removed duplicate/conflicting toggle/button visuals from `header.css`.
- [x] Centralized dual-toggle active visual handling in `buttons.css`.
- [x] Reduced table action density conflicts in artworks scheme dialog (`artworks.css` + `artworks.js`).

## Verification
- [x] `npm run phaseL:auth-login-matrix:smoke`
- [x] `npm run phaseL:auth-login-ui-smoke`
- [x] `npm run phaseL:auth-v2:verify`
- [x] `npm run gate:full`

## Notes
- Runtime contract unchanged:
  - `/` and `/login` -> login page
  - `/app` -> legacy production shell
  - `/api` -> backend APIs
  - `/health` -> health endpoint
  - port `9099` default
  - DB path `/data/color_management.db` in container
