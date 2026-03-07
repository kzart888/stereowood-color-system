# P6.1 Pilot Dictionary Write Contract

Date: 2026-03-07  
Status: Active (extends A7 read-only pilot)

## Purpose
Extend pilot from read-only to one controlled write slice while keeping legacy production path unchanged.

## Pilot Write Slice
- Entity scope:
  - Supplier dictionary: upsert + delete
  - Purchase-link dictionary: upsert
- Legacy production UI at `/` remains unchanged.
- Pilot UI remains isolated at `/pilot`.

## Feature Flags
1. `ENABLE_PILOT_UI`
   - Enables `/pilot` static page.
2. `PILOT_DICTIONARY_WRITE` (new, default `false`)
   - When `false`: pilot write endpoints are blocked (`404`).
   - When `true`: pilot write endpoints are available (still auth/write-guarded).

## API Contract Additions
Under `/api/pilot/dictionaries/*`:
1. `POST /api/pilot/dictionaries/suppliers/upsert`
2. `DELETE /api/pilot/dictionaries/suppliers/:id`
3. `POST /api/pilot/dictionaries/purchase-links/upsert`

## Access and Safety Rules
1. Pilot write endpoints require authenticated session.
2. Runtime write guard still applies:
   - `readOnlyMode=true` -> write returns `503`
3. Existing legacy dictionary endpoints remain unchanged.
4. Audit/history must record pilot write operations (`supplier`, `purchase_link`).

## `/api/config` Extension
- `features.pilotDictionaryWrite` added.
- Value is `ENABLE_PILOT_UI && PILOT_DICTIONARY_WRITE`.

## Non-Goals
1. No change to legacy `/` flow.
2. No forced production cutover.
3. No backend schema redesign in this step.

## Verification Matrix
1. Flag OFF:
   - `/api/config.features.pilotDictionaryWrite=false`
   - pilot write endpoints return `404`
2. Flag ON:
   - unauthenticated write -> `401`
   - authenticated write -> `200`
   - history feed includes dictionary write events
3. Docker rehearsal:
   - same checks pass in disposable container run.
