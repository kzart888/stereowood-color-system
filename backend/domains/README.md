# Backend Domain Boundaries

This directory defines stable domain entrypoints for the route layer.

Target dependency contract:
1. `backend/routes/*` imports only from `backend/domains/*`.
2. Domain services delegate to existing service/query implementations.
3. Route files must not import `backend/services/*` or `backend/db/*` directly.

Phase A1 starts by adding compatibility domain adapters. Later batches can
move implementation details from `backend/services/*` into domain-local files.

Phase A3 adds cross-cutting domains:
- `backend/domains/audit/` for additive write audit events.
- `backend/domains/history/` for timeline read APIs.
