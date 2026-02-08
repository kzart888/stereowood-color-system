# Audit Domain

Purpose:
- Persist additive audit events for write operations.
- Capture actor/request metadata without changing existing API payload contracts.

Entry point:
- `backend/domains/audit/service.js`
