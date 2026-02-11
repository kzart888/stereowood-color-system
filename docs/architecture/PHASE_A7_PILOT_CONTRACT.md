# Phase A7 Pilot Contract

Date: 2026-02-11  
Status: Active for Batch A7  
Pilot slice: `Color Dictionary Read-Only Explorer` (`/pilot`)

## Purpose
Keep legacy production runtime stable while validating a modernized, read-only pilot slice behind the same API contract.

## Scope
1. Pilot UI path: `GET /pilot` (only enabled when `ENABLE_PILOT_UI=true`).
2. Read-only API usage:
   - `GET /health`
   - `GET /api/config`
   - `GET /api/custom-colors`
   - `GET /api/categories`
   - `GET /api/suppliers`
   - `GET /api/purchase-links`

## Compatibility Rules
1. Legacy UI remains served at `/` and is still production.
2. Existing API endpoint paths/methods remain unchanged.
3. API success responses remain JSON UTF-8 payloads.
4. Error payloads keep `{ error: string }` compatibility.
5. Pilot route failure must not affect `/` or `/api` availability.

## Feature Flag Contract
1. `ENABLE_PILOT_UI=false`:
   - `/pilot` not enabled.
   - legacy runtime behavior unchanged.
2. `ENABLE_PILOT_UI=true`:
   - `/pilot` returns pilot HTML.
   - No write APIs are introduced by pilot.

## Non-Goals
1. No create/update/delete behavior changes.
2. No DB schema changes.
3. No auth model change in A7.

## Verification
1. `npm run phaseA:a7:pilot-parity`
2. `npm run phaseA:a7:verify`
3. Docker/Synology rehearsal evidence in `docs/architecture/PHASE_A7_SYNOLOGY_REHEARSAL_EVIDENCE.md`
