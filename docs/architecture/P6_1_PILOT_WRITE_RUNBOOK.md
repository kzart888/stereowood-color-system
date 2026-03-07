# P6.1 Pilot Write Runbook (Local + Synology Rehearsal)

Date: 2026-03-07  
Status: Active

## Objective
Rehearse pilot dictionary write slice with safe feature-flag controls and rollback readiness.

## Required Environment
- `ENABLE_PILOT_UI=true`
- `PILOT_DICTIONARY_WRITE=true` (only for rehearsal/candidate write validation)
- `INTERNAL_ADMIN_KEY=<set>`
- `AUTH_ENFORCE_WRITES=true`
- `READ_ONLY_MODE=false`
- `DB_FILE=/data/color_management.db`

## Local Verification
1. `npm run phaseP6:pilot-write-smoke`
2. `npm run phaseP6:pilot-rollback-rehearsal`
3. `npm run phaseP6:pilot-write-docker-smoke`

## Local Docker One-shot
1. `docker build -t stereowood-color-system:p6-pilot-write .`
2. Run rehearsal container:
   - `docker run --name stereowood-p6-pilot -d -p 9399:9099 -e NODE_ENV=production -e PORT=9099 -e DB_FILE=/data/color_management.db -e ENABLE_PILOT_UI=true -e PILOT_DICTIONARY_WRITE=true -e AUTH_ENFORCE_WRITES=true -e READ_ONLY_MODE=false -e INTERNAL_ADMIN_KEY=<your-admin-key> -v stereowood-p6-data:/data -v stereowood-p6-uploads:/app/backend/uploads -v stereowood-p6-backups:/app/backend/backups stereowood-color-system:p6-pilot-write`
3. Verify manually:
   - `GET /health`
   - `GET /api/config` (`features.pilotDictionaryWrite=true`)
   - `GET /pilot`
   - pilot login + dictionary write panel flow
4. Stop and remove container:
   - `docker rm -f stereowood-p6-pilot`

## Synology Rehearsal
1. Pull candidate image.
2. Start candidate on temporary host port (for example `9199`) with same volume mapping as production and the required flags above.
3. Verify:
   - `/health`, `/api/config`, `/pilot`
   - login succeeds
   - supplier upsert/delete and purchase-link upsert work
   - `/api/history/feed?tab=mont-marte` contains related events
4. Stop rehearsal container.

## Rollback Drill
1. Set `PILOT_DICTIONARY_WRITE=false` and restart candidate.
2. Confirm pilot write endpoints are blocked (`404`).
3. Confirm legacy `/` and read APIs remain healthy.

## Production Recommendation
- Keep `PILOT_DICTIONARY_WRITE=false` until P6.2 decision package is explicitly approved.
