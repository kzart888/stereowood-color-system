# Phase 5.4 Synology Cutover and Rollback Runbook

- Date: 2026-02-07
- Status: Draft for rehearsal
- Deployment model: Docker image push/pull, Synology as runtime host

## Variables
- `APP_NAME=stereowood-color-system`
- `CANDIDATE_TAG=<new-tag>`
- `PREV_TAG=<last-known-good-tag>`
- `PORT=9099`
- `DB_FILE=/data/color_management.db`

## Preconditions
1. Candidate image was built with `npm ci --omit=dev`.
2. `npm run phase0:verify` passed on candidate commit.
3. DB backup exists before cutover.
4. Previous image tag is retained in registry (rollback target).

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

## Cutover Procedure
1. Pull candidate image tag on Synology.
2. Stop existing production container.
3. Start new container with:
   - same DB volume (`/data`)
   - same uploads volume (`/app/backend/uploads`)
   - same port mapping (`9099:9099`)
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
