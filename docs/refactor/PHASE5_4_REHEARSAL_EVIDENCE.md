# Phase 5.4 Rehearsal Evidence (Interim)

- Date: 2026-02-07
- Operator: Codex
- Environment: local Windows host (Docker CLI unavailable in this environment)
- Rehearsal type: production-like local server rehearsal on temporary port
- Candidate commit: `4648c3a`

## Execution
- Server booted on temporary port `19199` with:
  - `NODE_ENV=production`
  - `PORT=19199`
  - `DB_FILE=backend/color_management.db`
- Endpoint checks executed:
  - `GET /health`
  - `GET /api/config`
  - `GET /api/custom-colors`
  - `GET /api/categories`
  - `GET /api/suppliers`
  - `GET /api/purchase-links`
  - `GET /`

## Results
- `/health`: `200`, JSON key `status`
- `/api/config`: `200`, keys `mode`, `testModeItemsPerPage`, `features`
- `/api/custom-colors`: `200`, JSON array
- `/api/categories`: `200`, JSON array
- `/api/suppliers`: `200`, JSON array
- `/api/purchase-links`: `200`, JSON array
- `/`: `200`, HTML content returned
- Content-Type checks:
  - API responses returned `application/json; charset=utf-8`
  - Root page returned `text/html; charset=utf-8`

## Conclusion
- Pilot API compatibility contract checks passed in local rehearsal.
- This is **not** a Synology Docker cutover rehearsal.

## Remaining Required Evidence for Final Closure
1. Run the same rehearsal on Synology with Docker image pull/run on temporary port.
2. Record cutover + rollback steps using `PHASE5_4_SYNOLOGY_CUTOVER_ROLLBACK_RUNBOOK.md`.
3. Attach operator/date/image-tag evidence for Synology run.

---

## Update: Local Docker Rehearsal on Windows

- Date: 2026-02-08
- Operator: Codex
- Environment: Windows 10 + Docker Desktop (`docker 29.2.0`)
- Rehearsal type: Docker container rehearsal (Synology-equivalent flow on local host)
- Image: `stereowood-color-system:rehearsal`
- Container: `stereowood-rehearsal-temp`
- Port mapping: `9199:9099`
- Runtime env:
  - `NODE_ENV=production`
  - `PORT=9099`
  - `DB_FILE=/data/color_management.db`
- Volumes:
  - `stereowood-rehearsal-data:/data`
  - `stereowood-rehearsal-uploads:/app/backend/uploads`

### Results
- `GET /health` -> `200`
- `GET /api/config` -> `200` (keys: `mode`, `testModeItemsPerPage`, `features`)
- `GET /api/custom-colors` -> `200` (array)
- `GET /api/categories` -> `200` (array)
- `GET /api/suppliers` -> `200` (array)
- `GET /api/purchase-links` -> `200` (array)
- `GET /` -> `200`
- Response charset checks passed:
  - API: `application/json; charset=utf-8`
  - Root page: `text/html; charset=utf-8`

### Interpretation
- Docker-based rehearsal flow passes on local Windows host.
- Synology host cutover/rollback rehearsal is still required for final Phase 5 closure.
