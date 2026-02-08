# Phase 5.4 Synology Cutover and Rollback Runbook

- Date: 2026-02-07
- Status: Rehearsed and ready for production cutover execution
- Deployment model: Docker image push/pull, Synology as runtime host

## Variables
- `APP_NAME=stereowood-color-system`
- `CANDIDATE_TAG=<new-tag>`
- `PREV_TAG=<last-known-good-tag>`
- `PORT=9099`
- `DB_FILE=/data/color_management.db`
- `TZ=Asia/Shanghai`
- `SYNOLOGY_DATA_ROOT=/volume1/docker/stereowood-color-system`

## Preconditions
1. Candidate image was built with `npm ci --omit=dev`.
2. `npm run phase0:verify` passed on candidate commit.
3. DB backup exists before cutover.
4. Previous image tag is retained in registry (rollback target).
5. SQLite backup includes `color_management.db`, `color_management.db-wal`, and `color_management.db-shm`.

## Rehearsal Procedure (No Production Cutover)
1. Pull candidate image on Synology.
2. Start candidate container on temporary port (example `9199`) with copied env/volumes.
3. Run smoke checks on temporary port:
   - `GET /health`
   - `GET /api/config`
   - `GET /api/custom-colors`
   - Load root page and check browser console for new errors.
4. Stop and remove temporary container.
5. Record rehearsal evidence (timestamp, image tag, smoke result, operator).

### Synology volume mapping reference
- `${SYNOLOGY_DATA_ROOT}/data:/data:rw`
- `${SYNOLOGY_DATA_ROOT}/uploads:/app/backend/uploads:rw`
- `${SYNOLOGY_DATA_ROOT}/backups:/app/backend/backups:rw`

## Cutover Procedure
1. Pull candidate image tag on Synology.
2. Stop existing production container.
3. Start new container with:
   - same DB volume (`/data`)
   - same uploads volume (`/app/backend/uploads`)
   - same backups volume (`/app/backend/backups`)
   - same port mapping (`9099:9099`)
   - same timezone (`TZ=Asia/Shanghai`)
4. Run immediate post-cutover checks:
   - `GET /health` returns `200`
   - root `/` loads
   - pilot read-only endpoints return expected JSON
5. Observe logs for 5-10 minutes.

## Rollback Triggers
1. `GET /health` non-200 after cutover.
2. Root page fails to render or major tab blank-screen.
3. Reproducible API 5xx on pilot endpoints.
4. Data-write anomalies in production operations.

## Rollback Procedure
1. Stop candidate container.
2. Start previous image tag (`PREV_TAG`) with unchanged env and volumes.
3. Re-run health + root smoke checks.
4. Confirm data files unchanged and service stable.
5. Mark candidate as failed and open follow-up issue.

## Evidence Template
- Date/time:
- Operator:
- Candidate image tag:
- Previous image tag:
- Rehearsal pass/fail:
- Cutover pass/fail:
- Rollback needed (Y/N):
- Notes:
