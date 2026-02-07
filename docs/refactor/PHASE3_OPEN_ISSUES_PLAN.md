# Phase 3 Open Issues Plan

Date: 2026-02-07  
Source: unresolved items from `docs/refactor/PHASE3_REVIEW_GATE.md`
Status: completed in Batch 3.6 (see `docs/refactor/PHASE3_FOLLOWUP_REVIEW_GATE.md`)

## Scope
- Resolve 3 medium issues:
  - custom-colors message-text-driven error mapping
  - custom-colors optimistic lock contract gap
  - mont-marte rename/cascade atomicity gap
- Resolve 1 low issue:
  - dictionaries route remains intentional route-level SQL

## Batch P3.6.1: Custom-Colors Error Code Normalization

### Target
- Replace message-text status inference with explicit service error codes.

### Implementation
- Add explicit typed errors in `backend/services/ColorService.js`.
- Return stable `error.code` values for:
  - not found
  - validation
  - duplicate conflict
  - in-use/reference conflict
  - version conflict
- Update `backend/routes/custom-colors.js` to map status by `error.code` only.

### Acceptance Criteria
- No status mapping depends on message substrings in `custom-colors` route.
- Response payload remains backward-compatible:
  - still includes `{ error: string }`
  - may include structured fields for version conflict as today.

### Verification
- `node --check backend/services/ColorService.js`
- `node --check backend/routes/custom-colors.js`
- API smoke:
  - create duplicate `color_code` returns `400`
  - invalid payload returns `400`
  - delete missing id returns `404`

### Rollback
- Restore previous route-level inference logic if error-code rollout causes unexpected status changes.

## Batch P3.6.2: Custom-Colors Optimistic Lock Completion

### Target
- Make `version` on `PUT /api/custom-colors/:id` fully enforced at service/query boundary.

### Implementation
- Update `ColorService.updateColor` signature to consume expected version.
- Add query-layer conditional update:
  - `WHERE id = ? AND version = ?`
  - increment version on successful update
- On mismatch:
  - fetch latest row
  - throw `VERSION_CONFLICT` with expected/actual/latestData.

### Acceptance Criteria
- Stale updates reliably return `409` with current conflict payload.
- Non-stale updates continue to succeed without payload regressions.

### Verification
- `node --check backend/services/ColorService.js`
- `node --check backend/db/queries/colors.js`
- conflict smoke:
  - update with stale version => `409`
  - update with current version => `200`

### Rollback
- Revert query conditional update and preserve route parsing if conflict handling breaks existing flows.

## Batch P3.6.3: Mont-Marte Rename/Cascade Consistency

### Target
- Remove partial-update risk when rename succeeds but cascade fails.

### Implementation Options
- Preferred:
  - execute rename + cascade in one coordinated transaction boundary.
- Fallback:
  - keep current behavior but mark as explicit eventual consistency and enqueue retry mechanism.

### Recommended Direction
- Implement transactional boundary in service/query path:
  - update color row
  - cascade formula rename
  - commit only when both succeed
  - rollback on cascade failure

### Acceptance Criteria
- No state where name update commits while cascade fails silently.
- API still returns same main payload fields.

### Verification
- `node --check backend/services/MontMarteColorService.js`
- integration smoke with forced cascade failure path in disposable dataset.

### Rollback
- Revert to current warning behavior (`warn`) if transaction integration causes instability.

## Batch P3.6.4: Dictionaries Layering Decision (Low)

### Target
- Resolve whether dictionaries route remains an intentional SQL exception or moves to service/query layering.

### Decision Options
- Option A (recommended for consistency): extract to `DictionaryService` + `db/queries/dictionaries.js`.
- Option B (acceptable): keep route-local SQL and document as permanent exception with rationale.

### Acceptance Criteria
- One explicit decision recorded in backend contract docs.
- If Option A chosen, route becomes thin and behavior unchanged.
- If Option B chosen, exception is documented in Phase 3 follow-up and API docs.

### Verification
- `node --check` on touched dictionary files
- API smoke:
  - suppliers upsert/list/delete conflict behavior
  - purchase-links upsert/list

### Rollback
- For Option A, revert to route-local SQL if behavior deviates.

## Execution Order
1. P3.6.1 error-code normalization  
2. P3.6.2 optimistic lock completion  
3. P3.6.3 rename/cascade consistency  
4. P3.6.4 dictionaries decision  

## Phase Exit Gate (Follow-Up)
- Add `docs/refactor/PHASE3_FOLLOWUP_REVIEW_GATE.md`.
- Require code-review-agent pass:
  - no high-severity findings
  - medium findings from `PHASE3_REVIEW_GATE.md` closed or explicitly accepted.
