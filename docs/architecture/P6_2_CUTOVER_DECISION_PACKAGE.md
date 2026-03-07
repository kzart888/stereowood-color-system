# P6.2 Cutover Criteria and Rollback Decision Package

Date: 2026-03-07  
Status: Ready for operator decision (no automatic production cutover)

## Go / No-Go Checklist
All items must pass before enabling pilot write in production:

1. Quality gate
- [x] No open Critical/High findings in current review gate.
- [x] `npm run gate:full` passes on current candidate.

2. Pilot parity and write checks
- [x] `npm run phaseA:a7:verify` passes.
- [x] `npm run phaseP6:pilot-write-smoke` passes (flag OFF + flag ON matrix).
- [x] `npm run phaseP6:pilot-write-docker-smoke` passes.
- [x] `npm run phaseP6:pilot-rollback-rehearsal` passes.

3. Runtime contract
- [x] Legacy `/` remains production UI.
- [x] `/health`, `/api`, port `9099`, DB `/data/color_management.db` unchanged.
- [x] Pilot write remains behind `PILOT_DICTIONARY_WRITE`.

4. Ops readiness
- [x] Synology deployment runbook updated with pilot write flags.
- [x] Rollback procedure documented and rehearsed locally.

## Rollback Triggers
Trigger rollback immediately if any of the following occurs after pilot-write enablement:
1. `/health` not stable at `200`.
2. Legacy `/` workflow regression or blocking JS/runtime errors.
3. Pilot dictionary write returning unexpected non-2xx for known-good requests.
4. Unexpected data integrity issues in supplier/purchase-link writes.
5. Operator cannot validate audit/history write trace for pilot actions.

## Rollback Actions (Ordered)
1. Disable pilot write by setting `PILOT_DICTIONARY_WRITE=false` and restart candidate container.
2. Verify:
   - `GET /health` -> `200`
   - `GET /` -> legacy UI ok
   - `GET /api/suppliers` + `GET /api/purchase-links` -> `200`
3. If instability remains, revert to previous known-good image tag with same mounts/env baseline.
4. Re-run smoke:
   - `npm run phase0:verify` (or equivalent API checks on candidate endpoint)
5. Keep pilot write disabled until issue root cause is resolved and re-verified.

## Production Enablement Defaults
Recommended default for production:
- `ENABLE_PILOT_UI=true` (optional) with `PILOT_DICTIONARY_WRITE=false` until operator signs go-live.

## Approval Record
- Technical gate state: PASS
- Deployment decision owner: pending (operator/admin)
- Planned decision window: before next production image cutover
