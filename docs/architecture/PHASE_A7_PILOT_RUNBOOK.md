# Phase A7 Pilot Runbook (Cutover and Rollback)

Date: 2026-02-11  
Status: Ready for rehearsal/cutover

> Update (2026-03-07): Controlled pilot write rehearsal is documented in
> `docs/architecture/P6_1_PILOT_WRITE_RUNBOOK.md`.

## Objective
Deploy pilot UI safely without changing legacy production behavior.

## Preconditions
1. Candidate commit passes:
   - `npm run phaseA:a7:verify`
   - `npm run phase0:verify`
2. Docker image built from candidate commit.
3. Production DB backup includes:
   - `color_management.db`
   - `color_management.db-wal`
   - `color_management.db-shm`
4. Rollback image/tag is available.

## Local Docker Rehearsal (Windows)
1. Build image:
   - `docker build -t stereowood-color-system:a7-pilot .`
2. Run temporary candidate container:
   - `docker run --name stereowood-a7-pilot-temp -d -p 9199:9099 -e NODE_ENV=production -e PORT=9099 -e ENABLE_PILOT_UI=true -e DB_FILE=/data/color_management.db -v stereowood-a7-data:/data -v stereowood-a7-uploads:/app/backend/uploads stereowood-color-system:a7-pilot`
3. Validate parity against running candidate:
   - PowerShell: ``$env:PILOT_BASE_URL='http://127.0.0.1:9199'; npm run phaseA:a7:pilot-parity``
4. Stop and remove temporary candidate:
   - `docker rm -f stereowood-a7-pilot-temp`
5. Clear temp env var:
   - PowerShell: `Remove-Item Env:PILOT_BASE_URL -ErrorAction SilentlyContinue`

## Synology Rehearsal
1. Pull candidate image/tag.
2. Run temporary container on non-production port (for example `9199`) with:
   - `ENABLE_PILOT_UI=true`
   - existing mount contract:
     - `/volume1/docker/stereowood-color-system/data:/data`
     - `/volume1/docker/stereowood-color-system/uploads:/app/backend/uploads`
     - `/volume1/docker/stereowood-color-system/backups:/app/backend/backups`
3. Verify:
   - `GET /health`
   - `GET /api/config`
   - `GET /pilot`
   - read-only pilot endpoints return arrays
4. Stop and remove rehearsal container.
5. Record evidence in `docs/architecture/PHASE_A7_SYNOLOGY_REHEARSAL_EVIDENCE.md`.

## Cutover
1. Set `ENABLE_PILOT_UI=true` for candidate only.
2. Deploy candidate image to production port (`9099`) with unchanged volume mappings.
3. Post-cutover checks:
   - legacy `/` works
   - `/health` is `200`
   - `/pilot` loads
   - no blocking console/runtime errors

## Rollback
1. Stop candidate container.
2. Start previous known-good image with `ENABLE_PILOT_UI=false`.
3. Verify `/health` and `/` first.
4. Keep pilot disabled until remediation is validated.
