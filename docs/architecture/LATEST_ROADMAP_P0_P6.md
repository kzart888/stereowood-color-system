# Latest Roadmap and Checklist (P0-P6 + Auth/RBAC/UI Refresh)

Last updated: 2026-03-08  
Scope: legacy production continuity + auth/RBAC/login UX alignment + modernization preparation.

This file remains the architecture execution source of truth.

## Current Position

- Runtime contract remains:
  - production frontend source: `frontend/legacy`
  - legacy app shell: `/app`
  - login entry: `/` and `/login`
  - APIs: `/api`
  - health: `/health`
  - default port: `9099`
  - container DB path: `/data/color_management.db`
- Branch fact correction:
  - `main` is ahead of `architecture-upgrade`; they are not aligned.
- Docker baseline is green again:
  - Windows junction copy blocker was fixed in Docker build path.
- Auth mode is now upgraded:
  - HttpOnly cookie session (30 days default)
  - role model: `super_admin`, `admin`, `user`
  - first-login forced password change only for bootstrap/admin-created/reset accounts
  - self-register (`register-request`) with strong password does not require first-login password change
  - single active session per account
  - account creation rule: create `user` first, then promote to `admin` if needed
  - separate login page and account-management page
  - login page uses single input group (login + apply account)
  - account-management row actions use backend-provided per-row permissions for disabled-state rendering
- Legacy UI deep optimization (U0-U7) is now completed on the working branch:
  - default pagination moved to 24
  - category-manager drag/alignment polish
  - artworks related-assets model + API + UI
  - dialog/button consistency pass
  - thumbnail sidecar generation and thumbnail-first rendering
  - execution checklist: `docs/architecture/LEGACY_UI_U0_U7_CHECKLIST.md`
  - review gate: `docs/architecture/U7_REVIEW_GATE.md`

## Phase Status Overview

| Phase | Title | Status | Notes |
|---|---|---|---|
| P0 | Branch and baseline decision | Completed | Baseline verification and branch posture clarified. |
| P1 | Ops/document alignment | Completed | Contract matrix and docs alignment published. |
| P2 | Test system hardening | Completed | Full gate + Docker smoke + predeploy checks are in place. |
| P3 | Internal auth completion (initial) | Completed | Initial auth/admin panel was shipped in previous cycle. |
| P4 | History/audit UX | Completed | Feed API + bottom timeline panel shipped. |
| P5 | Obsolete/duplicate cleanup | Completed | Network unification + decomposition + docs cleanup completed. |
| P6 | Modernization pilot (Vue path) | Completed (gate-ready) | Pilot write slice, parity, and rollback rehearsal completed. |
| P7 | Auth/RBAC hardening refresh | Completed | Login split, role-based admin, forced password change, cookie session completed. |
| P7.1 | Login/RBAC interaction alignment (V2) | Completed | Login/apply semantics + password policy split + account permission disabled states + new smoke gates completed. |
| P8 | Modern platform build-out | Pending | Start new modern frontend branch after stable merge/tag. |
| U0-U7 | Legacy UI deep optimization | Completed | Related-assets + visual consistency + thumbnail quality pass on legacy runtime. |
| U8-U10 | UI continuity governance | In progress | Header/button conflict cleanup done; dialog-wide consistency and runtime Chinese copy cleanup continue by module. |

## P7 Completion Checklist (This Iteration)

- [x] Fixed Docker smoke blocker caused by Windows junction in `backend/uploads`.
- [x] Added role + password-policy auth model:
  - [x] `role`
  - [x] `must_change_password`
  - [x] `password_changed_at`
- [x] Added bootstrap super admin:
  - [x] default account `admin/admin` when no `super_admin` exists
  - [x] first login requires password change
- [x] Added `POST /api/auth/change-password`.
- [x] Added role-based admin APIs:
  - [x] batch reset password
  - [x] promote/demote admin
  - [x] role-guarded account operations
- [x] Upgraded session handling to HttpOnly cookie with 30-day TTL default.
- [x] Frontend auth path is cookie-first (no localStorage token persistence).
- [x] Legacy `x-admin-key` fallback is compatibility-only and disabled by default.
- [x] Implemented separate login page and protected app route.
- [x] Added account-management page with:
  - [x] pending approvals
  - [x] account list + role tags
  - [x] create/delete/disable/enable
  - [x] batch reset with secondary confirmation
  - [x] promote/demote (super admin only)
- [x] Added dedicated RBAC smoke:
  - [x] `npm run phaseL:auth-rbac:smoke`
- [x] Published P7 gate:
  - [x] `docs/architecture/P7_AUTH_RBAC_REVIEW_GATE.md`

## P7.1 Completion Checklist (This Iteration)

- [x] Login/API semantics aligned:
  - [x] `AUTH_ACCOUNT_NOT_FOUND` and `AUTH_PASSWORD_INCORRECT` are split on login.
  - [x] `register-request` creates pending users with `must_change_password=0`.
  - [x] Admin create/reset flows are fixed to default password `123456` and `must_change_password=1`.
- [x] Added account-level action permissions in admin list payload:
  - [x] `can_reset`
  - [x] `can_revoke`
  - [x] `can_disable`
  - [x] `can_enable`
  - [x] `can_delete`
  - [x] `can_promote`
  - [x] `can_demote`
- [x] Login page refactor:
  - [x] removed split register section
  - [x] single username/password area with `登录` and `申请账号`
  - [x] apply-on-existing-account copy aligned to `账号已存在，可直接登录`
- [x] Account-management UX alignment:
  - [x] top create-account row is operable without password input
  - [x] row action buttons disabled by backend permissions (no avoidable backend-error popups)
  - [x] batch reset only targets rows with `can_reset=true`
- [x] Added V2 smoke gates:
  - [x] `npm run phaseL:auth-login-matrix:smoke`
  - [x] `npm run phaseL:auth-login-ui-smoke`
  - [x] `npm run phaseL:auth-v2:verify`
- [x] Published V2 execution checklist and review gate:
  - [x] `docs/architecture/P7_1_AUTH_UI_EXECUTION_CHECKLIST.md`
  - [x] `docs/architecture/P7_1_REVIEW_GATE.md`

## Verification Snapshot (2026-03-08)

- [x] `npm run phase0:verify`
- [x] `npm run phaseA:a0:verify`
- [x] `npm run phaseA:a4:verify`
- [x] `npm run phaseP3:verify`
- [x] `npm run phaseP6:verify`
- [x] `npm run phaseL:auth-rbac:smoke`
- [x] `npm run phaseL:auth-login-matrix:smoke`
- [x] `npm run phaseL:auth-login-ui-smoke`
- [x] `npm run phaseL:auth-v2:verify`
- [x] `npm run gate:full`

## Remaining Work (P8 Modernization)

Target: keep legacy always available while delivering a modern frontend in controlled slices.

Checklist:
- [ ] Create branch `codex/modern-platform-v1` from latest stable `main`.
- [x] Publish modernization blueprint: `docs/architecture/P8_MODERN_PLATFORM_BLUEPRINT.md`.
- [ ] Scaffold `frontend/modern` (`Vue 3 + TypeScript + Vite + Pinia + Vue Router + Element Plus`).
- [ ] Define shared API contract adapter and parity tests between legacy and modern slices.
- [ ] Start with one read-only slice, then one controlled write slice.
- [ ] Keep `/app` (legacy) as production default until cutover gate is approved.
- [ ] Define go/no-go and rollback playbook for modern cutover.

## Standard Routines (Current)

Local run:
1. `npm ci`
2. `npm start`
3. Open `http://localhost:9099` (login page)
4. Login success redirects to `/app`

Local Docker rehearsal:
1. `docker build -t stereowood-color-system:<tag> .`
2. `docker run --rm -d --name sw-test -p 9199:9099 -e NODE_ENV=production -e PORT=9099 -e DB_FILE=/data/color_management.db -v <data>:/data -v <uploads>:/app/backend/uploads -v <backups>:/app/backend/backups stereowood-color-system:<tag>`
3. Verify:
   - `http://localhost:9199/health`
   - `http://localhost:9199/api/config`
   - `http://localhost:9199/`
   - login -> `/app`

Synology deployment routine:
1. Build and push image tag to registry.
2. Pull tag in Synology Container Manager.
3. Start candidate on temporary host port.
4. Verify login, `/app`, key APIs, and `/health`.
5. Cut over production port `9099`.
6. Keep previous stable image tag for rollback.
