# Phase 3.4 Review Gate (code-review-agent)

Date: 2026-02-07  
Scope: query boundary cleanup for mont-marte colors in:
- `backend/routes/mont-marte-colors.js`
- `backend/services/MontMarteColorService.js`
- `backend/db/queries/mont-marte-colors.js`

## Findings

### Critical
- None.

### High
- None.

### Medium
- Mont-marte rename flow is not fully atomic across color-row update and formula cascade.
  - Evidence:
    - primary color update path: `backend/services/MontMarteColorService.js:108`
    - formula cascade step executes afterward: `backend/services/MontMarteColorService.js:151`
  - Impact:
    - if cascade fails, color rename persists and formula updates are only partially consistent (service returns `warn`).
  - Recommendation:
    - in Batch 3.5/3.6, move both operations under a coordinated transaction strategy or make eventual-consistency behavior explicit in API contract docs.

### Low
- Intentional remaining route-level SQL exception: `dictionaries` route.
  - Evidence: `backend/routes/dictionaries.js:13`
  - Scope details:
    - direct dictionary reads/writes remain route-local (`backend/routes/dictionaries.js:18`, `backend/routes/dictionaries.js:31`, `backend/routes/dictionaries.js:67`).
  - Rationale:
    - not in the current `mont-marte-colors` service extraction scope; explicitly deferred for next backend contract batch decision.

## Open Questions / Assumptions
- Assumes dictionary endpoints are acceptable as intentionally thin SQL handlers for now.
- Assumes API consumers rely on status + payload shape, not internal layering location.

## Test Evidence
- Syntax checks passed:
  - `node --check backend/db/queries/mont-marte-colors.js`
  - `node --check backend/services/MontMarteColorService.js`
  - `node --check backend/routes/mont-marte-colors.js`
- `npm run phase0:verify` passed:
  - `ENCODING_AUDIT=PASS`
  - `PHASE0_SMOKE=PASS`
- Additional API smoke passed:
  - `GET /api/mont-marte-colors` => `200`
  - `POST /api/mont-marte-colors` => `200`
  - `PUT /api/mont-marte-colors/:id` => `200`
  - invalid id delete (`/api/mont-marte-colors/abc`) => `400`
  - `DELETE /api/mont-marte-colors/:id` => `200`

## Gate Decision
- Batch 3.4 checkpoint **passes** (`no high-severity findings`), with one medium follow-up on transaction consistency.
