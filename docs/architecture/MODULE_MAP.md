# Module Map: Current vs Target Architecture (Replanned)

Date: 2026-02-08  
Scope: runtime modules for `backend/` and `frontend/legacy/js/`

## 1) Current Runtime Map

### Backend (Current)
- Entry:
  - `backend/server.js`
- Route layer:
  - `backend/routes/*.js`
- Service layer:
  - `backend/services/*.js`
- Query/DB layer:
  - `backend/db/queries/*.js`
  - `backend/db/index.js`
  - `backend/db/migrations.js`

Current dependency shape:
- Target shape mostly exists (`routes -> services -> queries`), but migration, validation, and conflict policies are still distributed.
- A3 baseline is implemented:
  - additive audit/change-event tables are active
  - service write paths emit timeline events with optional actor/request metadata
  - generic timeline API exists at `GET /api/history/:entityType/:entityId`

### Frontend (Current)
- Shell:
  - `frontend/legacy/js/app.js`
- API layer:
  - `frontend/legacy/js/api/api.js`
- Hotspot components:
  - `frontend/legacy/js/components/custom-colors.js` (~2344)
  - `frontend/legacy/js/components/artworks.js` (~1718)
  - `frontend/legacy/js/components/mont-marte.js` (~1001)
- Extracted modules:
  - `frontend/legacy/js/modules/artworks/*`
  - `frontend/legacy/js/modules/custom-colors/*`
  - `frontend/legacy/js/modules/mont-marte/*`
  - `frontend/legacy/js/modules/ui/*`
  - `frontend/legacy/js/modules/*/component-options.js`

Current coupling hotspots:
- Mixed network stack (`axios`, `fetch`, `window.api`) in same features.
- Global coupling through `window.*` and wide `globalData` access.
- Repeated conflict and fallback handling in feature components.

## 2) Target Runtime Map (Phase A)

### Backend Target Domains

Public modules:
- `backend/routes/` (HTTP adapter only)
- `backend/domains/<domain>/service.js` (use-cases)
- `backend/domains/<domain>/contract.js` (DTO validation, error mapping)

Private modules:
- `backend/db/queries/<domain>.js` (SQL ownership)
- `backend/db/tx.js` (transaction boundary helper)
- `backend/db/migrations/` (versioned migration scripts)

New cross-cutting domains:
- `backend/domains/auth/` (accounts, sessions, approvals)
- `backend/domains/audit/` (behavior events)
- `backend/domains/history/` (entity change timeline)
- `backend/domains/concurrency/` (optimistic lock policy helpers)
- `backend/domains/shared/` (errors, validators, mappers)

Target dependency rules:
1. `routes` import only domain `service` and `contract`.
2. domain `service` imports `queries`, `tx`, and shared helpers.
3. `queries` import only `db/index`.
4. No route direct imports from `db/*`.
5. No domain-to-domain circular imports; shared behavior goes to `domains/shared` or dedicated cross-cutting domain.

### Frontend Target Modules

Public modules:
- `frontend/legacy/js/shell/` (app bootstrap, routing/tab orchestration)
- `frontend/legacy/js/adapters/api-gateway.js` (single API entrypoint)
- `frontend/legacy/js/features/<feature>/component.js` (UI orchestration only)

Private modules:
- `frontend/legacy/js/features/<feature>/domain/*.js` (pure logic)
- `frontend/legacy/js/features/<feature>/state/*.js` (local state reducers/selectors)
- `frontend/legacy/js/shared/ui/*.js` (dialogs, list state, validation UI)
- `frontend/legacy/js/shared/design-tokens/*.js` (consistent UI constants)
- `frontend/legacy/js/compat/*.js` (temporary `window.*` compatibility shims)

New frontend contracts:
- `frontend/legacy/js/adapters/conflict-adapter.js` (normalized 409 handling)
- `frontend/legacy/js/adapters/audit-context.js` (request actor metadata)
- `frontend/legacy/js/shared/auth/*` (internal login/session helper)

Target dependency rules:
1. Feature components call adapters; no raw `fetch`/`axios` in components.
2. Domain modules are side-effect minimal and testable.
3. Global access is isolated in `compat` and shell modules.
4. Shared UI and token modules are framework-agnostic where possible.

## 3) Data Module Map (History, Audit, Concurrency)

Existing tables:
- `custom_colors_history`
- `color_schemes_history`
- `custom_colors.version`
- `color_schemes.version`
- `mont_marte_colors.version`

Target additive schema (A3 implemented, A4+ extends):
- `user_accounts` (internal users, status, approval state)
- `user_sessions` or token/session storage (simple internal auth)
- `audit_events` (actor, action, entity, request metadata) [implemented]
- `entity_change_events` (before/after payload or diff metadata) [implemented]
- optional `entity_locks` only if optimistic-lock UX is insufficient

Migration policy:
1. Additive-only in Phase A (no destructive schema changes).
2. All schema changes rehearsed on copied production DB trio (`.db/.db-wal/.db-shm`).
3. Every migration has rollback note in batch gate doc.

## 4) Public vs Private Contract Table

Backend:
- Public:
  - REST endpoints under `/api/*`
  - `/health`
  - error contract `{ error: string }` plus conflict metadata
- Private:
  - SQL, transaction internals, migration internals, helper names

Frontend:
- Public:
  - visible behavior and interaction contracts
  - required legacy globals during migration window
- Private:
  - module file structure, internal helper implementations

## 5) Ownership and Hotspot Priority

Backend owners:
- `custom-colors`, `artworks`, `materials`, `categories`, `dictionaries`
- cross-cutting owners: `auth`, `audit`, `history`, `concurrency`

Frontend owners:
- feature owners: `custom-colors`, `artworks`, `mont-marte`, `color-dictionary`
- shared owners: `ui`, `color`, `design-tokens`, `adapters`, `compat`

Hotspot priority:
1. `frontend/legacy/js/components/custom-colors.js`
2. `frontend/legacy/js/components/artworks.js`
3. `frontend/legacy/js/components/mont-marte.js`
4. `backend/db/migrations.js` (split into versioned migration files)
5. `frontend/legacy/js/app.js` (globalData boundary hardening)

## 6) Guardrails
- Keep `frontend/legacy` as production UI during Phase A.
- Keep Synology runtime contract unchanged:
  - `/data`, `/app/backend/uploads`, `/app/backend/backups`
  - `DB_FILE=/data/color_management.db`
- Preserve SQLite WAL backup rule: always keep `.db`, `.db-wal`, `.db-shm` together.
