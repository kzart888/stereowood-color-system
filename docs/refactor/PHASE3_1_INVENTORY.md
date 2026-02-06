# Phase 3.1 Backend Inventory and Contract Freeze

Date: 2026-02-06  
Scope: inventory and contract freeze for backend layering in:
- `backend/routes/custom-colors.js`
- `backend/routes/artworks.js`
- `backend/routes/mont-marte-colors.js`
- `backend/routes/categories.js`
- `backend/routes/mont-marte-categories.js`

## Runtime Contract Snapshot
- API mount is `/api` (`backend/server.js:75`, `backend/routes/index.js:17`).
- Health endpoint is `/health` (`backend/server.js:68`).
- Legacy frontend remains production runtime served from `frontend/legacy`.

## Canonical Ownership Freeze (Phase 3 Baseline)
- `route` layer (public): HTTP parsing, response code mapping, backward-compatible response shape.
- `service` layer (public-to-private seam): validation, orchestration, business rules, transactional write workflow ownership.
- `db/query` layer (private): SQL construction and persistence primitives only.

### Freeze Rule
- New write-path business logic should not be added directly in route files.
- Route files with direct SQL are designated migration candidates in Phase 3.2 to 3.4.

## Route to Service to DB Ownership Map

| Area | Endpoints | Current flow | Drift / notes | Classification |
|---|---|---|---|---|
| Custom colors | `/custom-colors*` | route -> `ColorService` -> `db/queries/colors` | Strongest layering alignment among current routes; local parse helpers + upload config still duplicated in route. | `migrate-now` (for validation/error normalization only) |
| Artworks | `/artworks*` | route -> `ArtworkService` -> `db/queries/artworks` | Layering exists, but route still owns repeated multipart/layer parsing and cleanup branching. | `migrate-now` |
| Mont-Marte colors | `/mont-marte-colors*` | route -> raw `db` SQL (+ formula cascade helper) | Route owns SQL, validation, file lifecycle, and response mapping together. | `migrate-now` |
| Color categories | `/categories*` | route -> raw `db` SQL | Full CRUD + reorder logic in route; no shared service abstraction. | `migrate-now` |
| Mont-Marte categories | `/mont-marte-categories*` | route -> raw `db` SQL | Near-duplicate of color categories route with table/field name differences. | `migrate-now` |

## Duplicate / Repeated Patterns

### 1) Upload configuration duplication
- Same multer disk-storage shape is repeated in:
  - `backend/routes/custom-colors.js`
  - `backend/routes/artworks.js`
  - `backend/routes/mont-marte-colors.js`
- Action in later batches: extract shared upload factory under backend module boundary.

### 2) Category CRUD duplication
- `backend/routes/categories.js` and `backend/routes/mont-marte-categories.js` duplicate:
  - create/list/update/delete/reorder flow
  - uniqueness error mapping
  - protection checks before delete
- Action in later batches: shared category service + thin route adapters.

### 3) Validation and parsing duplication in routes
- Repeated request parsing logic exists in route handlers (optional number parsing, JSON parse of layers, required field checks).
- Action in Batch 3.2: introduce common validation/parsing helpers and standard error mapping.

### 4) Error mapping inconsistency
- Similar classes of errors map differently across routes (400/404/500 mismatch, string-matching by message text).
- Action in Batch 3.2: normalize status policy and keep response payload backward-compatible as `{ error: string }`.

### 5) Transaction flow style inconsistency
- Query modules use callback transaction orchestration with repeated `BEGIN/COMMIT/ROLLBACK` patterns.
- Action in Batch 3.4: centralize write boundaries through service-level orchestration and standardized db helpers.

## Known Risks Captured for Phase 3 Execution

### Risk A: Scheme deletion image cleanup gap
- In `ArtworkService.deleteScheme`, service calls `getArtworkSchemes(null)` and then searches for scheme id.
- Query function filters by `WHERE cs.artwork_id = ?`, so `null` returns no rows, making thumbnail cleanup unreachable before delete.
- Evidence:
  - `backend/services/ArtworkService.js:203`
  - `backend/db/queries/artworks.js:108`
- Batch target: Batch 3.2.

### Risk B: Route-level SQL concentration
- `mont-marte-colors` and both category route modules perform direct SQL + business logic in route.
- Impact: weak testability and inconsistent behavior as features evolve.
- Batch target: Batch 3.3 to 3.4.

### Risk C: Message-text-driven error branching
- String comparison against localized text is used for status decisions.
- Impact: brittle behavior during text cleanup/encoding restoration.
- Batch target: Batch 3.2.

## Migration-Safe Candidate Groups

### `migrate-now`
- `backend/routes/mont-marte-colors.js`
- `backend/routes/categories.js`
- `backend/routes/mont-marte-categories.js`
- Cross-route validation + error mapper extraction
- Upload config extraction

### `wrap`
- Existing `ColorService` and `ArtworkService` public method signatures used by legacy runtime.
- Existing route response contract shape `{ error: string }`.

### `defer`
- DB schema redesign or payload shape redesign (outside Phase 3).
- Endpoint path redesign (outside current compatibility scope).

## Rollback Notes Per Target Area

### Custom colors
- Keep route paths and response payload unchanged.
- If new validators regress requests, revert to route-local parsing for affected endpoint only.

### Artworks
- Keep request body aliases (`name` vs `scheme_name`, `layer` vs `layer_number`) stable.
- If service extraction breaks uploads, restore old route parsing and retain service-only data operations.

### Mont-Marte colors
- Extract service in adapter mode first; retain original SQL query text and response fields.
- Rollback by re-mounting original route handlers in place.

### Categories and Mont-Marte categories
- Consolidate through shared service with table config, not endpoint merge.
- Rollback by restoring per-route CRUD handlers from previous commit.

## Batch 3.2 Entry Constraints
- Preserve external API paths and payload keys.
- Preserve error payload contract `{ error: string }`.
- Treat UTF-8 text restoration as separate concern from behavior changes.
