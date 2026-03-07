# P8 Modern Platform Blueprint

Date: 2026-03-07  
Status: Planned (post-P7 stabilization)

## Goal
- Keep `frontend/legacy` continuously available in production.
- Build a new maintainable frontend in parallel (`frontend/modern`) with controlled cutover.

## Branch Strategy
- `main`: release-ready only.
- `codex/legacy-auth-rbac`: stabilization/auth hardening line (this cycle).
- `codex/modern-platform-v1`: modern frontend implementation line.

## Target Stack
- `Vue 3`
- `TypeScript`
- `Vite`
- `Pinia`
- `Vue Router`
- `Element Plus`
- `Vitest` + `Playwright`

## Module Boundaries (Modern)
- `app/`: app shell, routing, global providers.
- `features/`: domain features (custom-colors, artworks, mont-marte, auth-admin, history).
- `entities/`: typed entity models + adapters.
- `shared/`: UI kit, HTTP client, validation, utility primitives.
- `processes/`: cross-feature workflows (import/export, approval, conflict handling).

## Migration Sequence
1. Read-only slice parity:
   - Rebuild one read-only screen in modern app.
   - Compare API payload/render parity against legacy.
2. Controlled write slice parity:
   - Rebuild one low-risk write slice (dictionary write) with feature flag.
   - Keep legacy write path as fallback.
3. Core write modules:
   - Incrementally migrate custom-colors/artworks/mont-marte write flows.
   - Enforce per-slice parity and rollback rehearsals.

## Cutover Rules
- No open Critical/High review findings.
- `gate:full` and modern parity gates all pass.
- Docker and Synology rehearsal both pass on candidate image.
- Rollback drill is proven and timed.

## Rollback Rules
- Keep legacy `/app` route and bundle deployable until final cutover approval.
- Feature-flag disable modern entry on any functional/security regression.
- Roll back image tag and re-verify `/health`, `/api/config`, `/app`.

## Required Preparations Before P8 Coding
- Freeze P7 scope in release notes and tag a stable image.
- Confirm production env defaults:
  - `ALLOW_LEGACY_ADMIN_KEY=false`
  - cookie session path enabled
- Establish modern parity checklist + API contract fixtures.
