# Backend API Overview

Last updated: 2026-03-07

This document describes the current Express + SQLite contract served by `backend/server.js`.

## Runtime Contract
- API base path: `/api`
- Health endpoint: `/health`
- System config endpoint: `/api/config`
- Legacy UI static root: `/` served from `frontend/legacy`
- Upload static root: `/uploads` served from `backend/uploads`

## Common Behavior
- Success responses return JSON objects or arrays.
- Error responses return JSON with shape `{ "error": "<message>" }`.
- API routes are unauthenticated by default, but write routes can be protected by `AUTH_ENFORCE_WRITES=true`.
- File upload endpoints expect `multipart/form-data`.

## Endpoint Groups

### Custom Colors
Source: `backend/routes/custom-colors.js` -> `backend/services/ColorService.js` -> `backend/db/queries/colors.js`

- `GET /api/custom-colors`
- `POST /api/custom-colors`
- `GET /api/custom-colors/:id/history`
- `PUT /api/custom-colors/:id`
- `DELETE /api/custom-colors/:id`
- `POST /api/custom-colors/force-merge`

Key request details:
- `POST` and `PUT` accept upload field `image`.
- `POST` requires `color_code`.
- `category_id` accepts positive integer or null-like (`""`, `null`, `other`).
- Numeric color fields are normalized server-side (`rgb_*`, `cmyk_*`, `pure_rgb_*`).
- `clear_pure_color` accepts `true/false` style values and clears pure color metadata when true.
- `PUT` accepts optional `version` for optimistic locking.

Error mapping behavior:
- Service uses stable error codes:
  - `VALIDATION_ERROR` -> `400`
  - `DUPLICATE_COLOR_CODE` -> `400`
  - `COLOR_IN_USE` -> `400`
  - `MERGE_INVALID` -> `400`
  - `NOT_FOUND` -> `404`
  - `VERSION_CONFLICT` -> `409` (includes `entityType`, `expectedVersion`, `actualVersion`, `latestData`)
- Route maps status by error code, not by message substrings.

### Artworks and Schemes
Source: `backend/routes/artworks.js` -> `backend/services/ArtworkService.js` -> `backend/db/queries/artworks.js`

- `GET /api/artworks`
- `POST /api/artworks`
- `DELETE /api/artworks/:id`
- `POST /api/artworks/:artworkId/schemes`
- `PUT /api/artworks/:artworkId/schemes/:schemeId`
- `DELETE /api/artworks/:artworkId/schemes/:schemeId`

Key request details:
- Scheme create/update use upload fields:
  - `thumbnail`
  - `initialThumbnail`
- Scheme create/update require `name`.
- `layers` accepts array JSON or JSON-stringified array.
- Scheme update (`PUT`) accepts optional `version` for optimistic locking.

Conflict behavior:
- `VERSION_CONFLICT` -> `409` with payload keys:
  - `error`
  - `code`
  - `entityType` (`color_scheme`)
  - `expectedVersion`
  - `actualVersion`
  - `latestData`

### Color Categories
Source: `backend/routes/categories.js` -> `backend/routes/helpers/category-route-factory.js` -> `backend/services/CategoryService.js`

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/reorder`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

Key request details:
- `POST` requires `name`; `code` optional.
- `display_order` optional and defaults to `999`.
- `reorder` accepts array of `{ id, display_order }`.

### Mont-Marte Categories
Source: `backend/routes/mont-marte-categories.js` -> `backend/routes/helpers/category-route-factory.js` -> `backend/services/CategoryService.js`

- `GET /api/mont-marte-categories`
- `POST /api/mont-marte-categories`
- `PUT /api/mont-marte-categories/reorder`
- `PUT /api/mont-marte-categories/:id`
- `DELETE /api/mont-marte-categories/:id`

Notes:
- Same contract style as `/api/categories`.
- List responses expose `material_count` instead of `color_count`.

### Mont-Marte Colors
Source: `backend/routes/mont-marte-colors.js` -> `backend/services/MontMarteColorService.js` -> `backend/db/queries/mont-marte-colors.js`

- `GET /api/mont-marte-colors`
- `POST /api/mont-marte-colors`
- `PUT /api/mont-marte-colors/:id`
- `DELETE /api/mont-marte-colors/:id`

Key request details:
- `POST` and `PUT` accept upload field `image`.
- `POST` requires `name` and either `category` or `category_id`.
- `PUT` requires `name`, but `category/category_id` may be omitted and existing values are preserved.
- `PUT` accepts optional `version` for optimistic locking.
- `PUT` returns additional fields:
  - `updatedReferences` (formula cascade count)

Consistency behavior:
- Rename update and formula cascade run in one transaction boundary.
- If cascade fails, the update is rolled back and API returns an error.
- `VERSION_CONFLICT` returns `409` with payload keys:
  - `error`
  - `code`
  - `entityType` (`mont_marte_color`)
  - `expectedVersion`
  - `actualVersion`
  - `latestData`

### Dictionaries
Source: `backend/routes/dictionaries.js` -> `backend/services/DictionaryService.js` -> `backend/db/queries/dictionaries.js`

- `GET /api/suppliers`
- `POST /api/suppliers/upsert`
- `DELETE /api/suppliers/:id`
- `GET /api/purchase-links`
- `POST /api/purchase-links/upsert`

Notes:
- Route handlers are thin; validation and conflict checks are in service/query layers.

### Pilot Dictionaries (P6 controlled write slice)
Source: `backend/routes/pilot-dictionaries.js` -> `backend/services/DictionaryService.js`

- `POST /api/pilot/dictionaries/suppliers/upsert`
- `DELETE /api/pilot/dictionaries/suppliers/:id`
- `POST /api/pilot/dictionaries/purchase-links/upsert`

Access rules:
- Endpoints are available only when both flags are on:
  - `ENABLE_PILOT_UI=true`
  - `PILOT_DICTIONARY_WRITE=true`
- Endpoints require authenticated session token.
- Runtime write guard still applies (`readOnlyMode` can block writes with `503`).
- When flag is off, endpoints return `404`.

### History Timeline (A3)
Source: `backend/routes/history.js` -> `backend/domains/history/service.js` -> `backend/db/queries/audit-events.js`

- `GET /api/history/feed?tab=<scope>&page=<n>&pageSize=<n>&actor=<q>&action=<q>&entityType=<type>&entityId=<id>`
- `GET /api/history/:entityType/:entityId?limit=<n>`

Allowed `entityType`:
- `custom_color`
- `artwork`
- `color_scheme`
- `mont_marte_color`
- `supplier`
- `purchase_link`
- `category`
- `mont_marte_category`
- `user_account`

Response shape:
- `{ entityType, entityId, events: [...] }`
- Feed endpoint returns:
  - `{ items: [...], pagination: { page, pageSize, total, totalPages }, filters: {...} }`

Notes:
- Timeline events are additive and do not change existing endpoint payloads.
- `limit` is optional (default `50`, max `200`).
- Feed `tab` supports `custom-colors`, `artworks`, `mont-marte`, `all`.

## Optional Audit Context Headers
- `x-actor-id`
- `x-actor-name`
- `x-request-id`
- `x-source`

If omitted, write flows still work and audit defaults are used.

### Internal Auth (A4)
Source: `backend/routes/auth.js` -> `backend/domains/auth/service.js` -> `backend/db/queries/auth.js`

- `POST /api/auth/register-request`
- `GET /api/auth/admin/pending` (requires `x-admin-key`)
- `GET /api/auth/admin/accounts` (requires `x-admin-key`)
- `POST /api/auth/admin/accounts` (requires `x-admin-key`)
- `POST /api/auth/admin/accounts/:id/reset-password` (requires `x-admin-key`)
- `POST /api/auth/admin/accounts/:id/disable` (requires `x-admin-key`)
- `POST /api/auth/admin/accounts/:id/enable` (requires `x-admin-key`)
- `DELETE /api/auth/admin/accounts/:id` (requires `x-admin-key`)
- `POST /api/auth/admin/accounts/:id/revoke-sessions` (requires `x-admin-key`)
- `GET /api/auth/admin/runtime-flags` (requires `x-admin-key`)
- `POST /api/auth/admin/runtime-flags` (requires `x-admin-key`)
- `POST /api/auth/admin/requests/:id/approve` (requires `x-admin-key`)
- `POST /api/auth/admin/requests/:id/reject` (requires `x-admin-key`)
- `POST /api/auth/login`
- `POST /api/auth/logout` (token required)
- `GET /api/auth/me` (token required)

Write-protection behavior:
- Runtime flags are initialized from env and can be changed at runtime by admin API:
  - `authEnforceWrites` (maps to initial `AUTH_ENFORCE_WRITES`)
  - `readOnlyMode` (maps to initial `READ_ONLY_MODE`)
- `authEnforceWrites=true`:
  - write routes require session token (`Authorization: Bearer <token>` or `x-session-token`)
- `readOnlyMode=true`:
  - write routes return `503`
  - read routes remain available

Session behavior:
- Login enforces one active session per user.
- When user logs in again, previous active sessions for that user are revoked immediately.

## Config Feature Flags
From `GET /api/config` -> `features`:
- `pilotExplorer`: pilot UI availability (`ENABLE_PILOT_UI`).
- `pilotDictionaryWrite`: pilot dictionary write availability (`ENABLE_PILOT_UI && PILOT_DICTIONARY_WRITE`).
- `authEnforceWrites`: runtime write auth enforcement.
- `readOnlyMode`: runtime read-only switch.

## Error Behavior Notes
- Validation issues generally return `400`.
- Missing records generally return `404`.
- Dictionary delete conflict (`supplier` in use) returns `409`.
- Unhandled failures return `500`.

## Upload Notes
- Uploaded files are persisted under `backend/uploads`.
- Update/delete flows attempt best-effort cleanup for replaced/orphaned files.

## Formula Rename Behavior
- Renaming a mont-marte color may cascade into custom color formulas.
- Cascade logic lives in `backend/services/formula.js`.
- Cascade is executed inside the mont-marte update transaction boundary.
