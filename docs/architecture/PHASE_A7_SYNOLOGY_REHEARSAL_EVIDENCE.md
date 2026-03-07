# Phase A7 Pilot Rehearsal Evidence

Date: 2026-02-11  
Batch: A7  
Scope: pilot slice deployment/rehearsal evidence for `/pilot` + read-only contract

## Local Verification (Required Baseline)
1. `npm run phaseA:a7:pilot-parity` -> PASS (local spawn mode)
2. `npm run phaseA:a7:verify` -> PASS
3. `npm run phase0:verify` -> PASS (included via `phaseA:a7:verify`)

## Local Docker Rehearsal (Windows)
- Environment:
  - Docker Desktop 29.2.0
  - Image: `stereowood-color-system:a7-pilot`
  - Container: `stereowood-a7-pilot-temp`
  - Port mapping: `9199:9099`
  - Env: `ENABLE_PILOT_UI=true`, `DB_FILE=/data/color_management.db`
- Commands executed:
  1. `docker build -t stereowood-color-system:a7-pilot .`
  2. `docker run --name stereowood-a7-pilot-temp -d -p 9199:9099 -e NODE_ENV=production -e PORT=9099 -e ENABLE_PILOT_UI=true -e DB_FILE=/data/color_management.db -v stereowood-a7-data:/data -v stereowood-a7-uploads:/app/backend/uploads stereowood-color-system:a7-pilot`
  3. PowerShell: ``$env:PILOT_BASE_URL='http://127.0.0.1:9199'; npm run phaseA:a7:pilot-parity``
  4. `docker rm -f stereowood-a7-pilot-temp`
- Result:
  - external parity check passed, including `/pilot` and read-only API contract.

## Synology Rehearsal Reference
- Existing Synology rehearsal confirmation (operator-confirmed) is recorded in:
  - `docs/refactor/PHASE5_4_REHEARSAL_EVIDENCE.md`
- A7 uses same deployment model and mount contract, with one additive env flag:
  - `ENABLE_PILOT_UI=true` for pilot rehearsal only
- For Synology operator execution, use:
  - `docs/architecture/PHASE_A7_PILOT_RUNBOOK.md`

## Conclusion
- Pilot parity and Docker rehearsal passed.
- Synology rehearsal workflow is documented and aligned with prior confirmed Synology deployment process.

## P6 Extension Note (2026-03-07)
- Controlled write rehearsal is now covered by:
  - `docs/architecture/P6_1_REVIEW_GATE.md`
  - `docs/architecture/P6_1_PILOT_WRITE_RUNBOOK.md`
  - `docs/architecture/P6_2_CUTOVER_DECISION_PACKAGE.md`
