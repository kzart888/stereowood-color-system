# Deployment Checklist for STEREOWOOD Color System

## Scope
- Production deployment on Synology Container Manager (Docker).
- Keep legacy UI (`frontend/legacy`) as production frontend.

## Runtime Contract
- Backend entry: `backend/server.js`
- UI root: `/`
- Pilot UI root: `/pilot` (enabled only when `ENABLE_PILOT_UI=true`)
- API base: `/api`
- Health endpoint: `/health`
- Default app port: `9099`
- DB file in container: `/data/color_management.db`

## Synology Current Production Profile (from running container)
- Image: `docker.xuanyuan.run/kzart888/stereowood-color-system:publish-preview`
- Port mapping: host `9099` -> container `9099`
- Environment:
  - `NODE_ENV=production`
  - `PORT=9099`
  - `DB_FILE=/data/color_management.db`
  - `ENABLE_PILOT_UI=false` (default)
  - `PILOT_DICTIONARY_WRITE=false` (default, enable only for pilot-write rehearsal/cutover candidate)
  - `TZ=Asia/Shanghai`
- Volume mappings:
  - `/volume1/docker/stereowood-color-system/data:/data:rw`
  - `/volume1/docker/stereowood-color-system/uploads:/app/backend/uploads:rw`
  - `/volume1/docker/stereowood-color-system/backups:/app/backend/backups:rw`

## Pre-Deployment Checklist
1. Confirm image build uses deterministic install: `npm ci --omit=dev`.
2. Confirm app healthcheck endpoint is `/health`.
3. Confirm runtime DB path is exactly `/data/color_management.db`.
4. Confirm all DB runtime files are ignored by git (`*.db`, `*.db-wal`, `*.db-shm`).
5. Confirm uploaded assets volume is mounted at `/app/backend/uploads`.
6. Confirm backups volume is mounted at `/app/backend/backups`.

## SQLite Data Safety (Critical)
1. Do not copy only `color_management.db` while container is running.
2. Backup all three files together:
   - `color_management.db`
   - `color_management.db-wal`
   - `color_management.db-shm`
3. Prefer rehearsal validation on copied data before production cutover.

## Deployment Steps (Synology)
1. Pull candidate image tag to Synology.
2. Start candidate container on temporary host port (for example `9199`) with the same env and volume mappings.
3. Verify candidate:
   - `GET /health` -> `200`
   - `GET /api/config` -> `200`
   - `GET /api/custom-colors` -> `200`
   - `GET /api/artworks` -> `200`
   - root `/` loads correctly
   - if pilot enabled: `GET /pilot` -> `200`
   - if pilot write enabled:
     - `GET /api/config` has `features.pilotDictionaryWrite=true`
     - `npm run phaseP6:pilot-write-smoke` passes against candidate-equivalent config
4. Stop candidate container.
5. Cut over production container to candidate image using unchanged env and volumes.

## Post-Deployment Verification
1. `GET /health` returns `200`.
2. Root page `/` renders legacy UI.
3. API smoke:
   - `/api/custom-colors`
   - `/api/artworks`
   - `/api/mont-marte-colors`
   - `/api/categories`
4. No new browser console blocking errors.
5. If pilot was enabled for rehearsal/cutover, verify `/pilot` is functional.
6. If pilot write was enabled, verify dictionary writes and audit feed with operator account.

## Rollback
1. Start previous known-good image tag with identical env and volumes.
2. Re-verify `/health` and `/`.
3. Keep existing `/data` and uploads/backups volumes unchanged.

## Notes
- Pagination behavior is config-driven via `/api/config` + `ConfigHelper`; no manual source edits.
- Current DB validation evidence is recorded in:
  - `docs/refactor/PRODUCTION_DB_VALIDATION_2026-02-08.md`
