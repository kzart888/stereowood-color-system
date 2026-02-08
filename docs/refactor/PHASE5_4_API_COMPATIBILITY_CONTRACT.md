# Phase 5.4 API Compatibility Contract (Pilot Scope)

- Date: 2026-02-07
- Status: Draft for pilot execution
- Pilot slice: `Color Dictionary Read-Only Explorer`

## Contract Purpose
- Keep legacy production behavior stable while a new frontend pilot consumes the same backend APIs.
- Define immutable interface rules for pilot scope endpoints.

## Global Rules (Pilot Scope)
1. Base URL remains unchanged (`/` for legacy UI, `/api` for APIs).
2. Endpoint paths and HTTP methods are immutable during pilot.
3. Successful responses return JSON with current field names (no breaking rename/removal).
4. Error responses return JSON object with at least `error` field.
5. Existing status-code behavior stays unchanged for valid/invalid requests.
6. `charset=utf-8` JSON response behavior must remain enabled.

## Required Endpoints

### Runtime + health
- `GET /health`
  - Response: `200` with `{ "status": "ok" }`
- `GET /api/config`
  - Response fields (must exist): `mode`, `testModeItemsPerPage`, `features`
  - `features` object keys (must exist): `formulaCalculator`, `artworkManagement`, `montMarte`

### Pilot read-only dictionary endpoints
- `GET /api/custom-colors`
  - Returns array of custom color records used by dictionary list UI.
- `GET /api/categories`
  - Returns array of color category records.
- `GET /api/suppliers`
  - Returns array of supplier records.
- `GET /api/purchase-links`
  - Returns array of purchase-link records.

## Non-Goals (Out of Pilot Contract)
- Write-path endpoint redesign (`POST/PUT/DELETE`) is excluded from this pilot.
- AuthN/AuthZ introduction is excluded from this pilot.
- DB schema redesign is excluded from this pilot.

## Compatibility Test Checklist
1. `GET /health` returns `200`.
2. `GET /api/config` includes all required keys.
3. All pilot read-only endpoints return `200` and JSON arrays.
4. Legacy UI root (`/`) still renders and can read pilot endpoints.
5. Smoke run repeats on local container and Synology candidate deploy.
