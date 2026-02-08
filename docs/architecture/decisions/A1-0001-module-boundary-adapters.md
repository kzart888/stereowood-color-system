# A1-0001: Module Boundary Adapters for Legacy-First Runtime

Date: 2026-02-08  
Batch: A1

## Context
- Routes were importing `backend/services/*` directly.
- Legacy frontend mixed direct `fetch`, `axios`, and `window.api` access.
- Phase A requires explicit route/domain boundaries and a stable frontend API entrypoint before deeper decomposition.

## Decision
1. Introduce backend domain service entrypoints under `backend/domains/*/service.js`.
2. Update all route imports to domain entrypoints instead of `backend/services/*`.
3. Introduce frontend boundary layers:
   - `frontend/legacy/js/adapters/http-client.js`
   - `frontend/legacy/js/adapters/api-gateway.js`
   - `frontend/legacy/js/compat/runtime-bridge.js`
4. Keep legacy compatibility by retaining `window.api` facade in `frontend/legacy/js/api/api.js`.
5. Add boundary verification script `scripts/check-architecture-boundaries.js`.

## Alternatives Considered
1. Full migration of services into new domain folders in one batch.
   - Rejected: too risky for A1, high regression risk.
2. Keep current structure and only document boundaries.
   - Rejected: no enforceable guardrails.
3. Remove legacy `window.api` immediately.
   - Rejected: would break existing components before A2 decomposition.

## Consequences
- Positive:
  - Route-to-domain boundary is explicit and enforceable.
  - Frontend has a canonical adapter gateway for API access.
  - Compatibility remains intact for legacy components.
- Tradeoff:
  - Temporary dual-layer (`api-gateway` + `window.api` facade) remains until later cleanup.

## Rollback Strategy
- Revert route import changes back to `backend/services/*`.
- Remove adapter scripts from `frontend/legacy/index.html`.
- Restore previous `frontend/legacy/js/api/api.js` implementation.

## Validation Evidence
- `npm run phaseA:a1:verify`
- `node --check backend/**/*.js`
- `node --check frontend/legacy/js/**/*.js`
- A1 code-review-agent gate report
