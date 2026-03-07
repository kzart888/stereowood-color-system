# Next Phase Execution Checklist (2026-03-07)

Purpose: practical execution plan after Phase A merge prep, with explicit infra and feature tracks.

## Track 1: Local Docker Remediation (Host)

### Goal
Restore local Docker daemon health to re-enable image rehearsal.

### Checklist
- [ ] Confirm BIOS virtualization is enabled (Intel VT-x / AMD-V).
- [ ] Enable required Windows features:
  - [ ] Virtual Machine Platform
  - [ ] Windows Subsystem for Linux
- [ ] Reboot Windows.
- [ ] Run `wsl --install --no-distribution` (if not already enabled).
- [ ] Confirm `wsl --status` reports WSL 2 support.
- [ ] Start Docker Desktop and verify:
  - [ ] `docker desktop status` => running
  - [ ] `docker info` => server section available

### Docker Rehearsal After Fix
- [ ] `docker build -t stereowood-color-system:premerge-check .`
- [ ] `docker run --rm -d --name sw-premerge -p 9199:9099 -e NODE_ENV=production -e PORT=9099 -e DB_FILE=/data/color_management.db -v <data>:/data -v <uploads>:/app/backend/uploads -v <backups>:/app/backend/backups stereowood-color-system:premerge-check`
- [ ] Verify endpoints:
  - [ ] `GET /health` = 200
  - [ ] `GET /api/config` = 200
  - [ ] `GET /api/custom-colors` = 200
  - [ ] `GET /` = 200

## Track 2: Branch Integration

### Goal
Promote checklist hardening and Phase A baseline to `main`.

### Checklist
- [ ] Merge `codex/checklist-kickoff` -> `architecture-upgrade`.
- [ ] Re-run full non-Docker gate on `architecture-upgrade`:
  - [ ] `npm run phase0:verify`
  - [ ] `npm run phaseA:a1:verify`
  - [ ] `npm run phaseA:a3:verify`
  - [ ] `npm run phaseA:a4:verify`
  - [ ] `npm run phaseA:a5:verify`
  - [ ] `npm run phaseA:a7:verify`
- [ ] Merge `architecture-upgrade` -> `main` (fast-forward expected).
- [ ] Re-run minimum gate on `main`:
  - [ ] `npm run phase0:verify`
- [ ] After Docker host remediation, run one Docker smoke on `main`.

## Track 3: Phase B Planning (Post-Merge)

### Goal
Start architecture follow-up implementation with product-facing value.

### Checklist
- [ ] Publish Phase B blueprint with scope/ownership.
- [ ] Prioritize three workstreams:
  - [ ] Admin UI (account approval/reset/disable)
  - [ ] Bottom timeline/audit panel UX
  - [ ] Legacy network path unification (`fetch/axios/window.api` -> adapter gateway)
- [ ] Define acceptance gate for each batch:
  - [ ] Contract compatibility
  - [ ] UTF-8 and smoke verification
  - [ ] Rollback notes
