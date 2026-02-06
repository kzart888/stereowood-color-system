# Phase 0 Execution Checklist (Stabilization Gate)

Last updated: 2026-02-06
Scope: stabilize runtime/deploy/encoding contract before deletion or modular refactor.

## Acceptance Gate
- [x] `npm run phase0:verify` passes locally.
- [x] Docker healthcheck contract matches runtime (`/health`, `9099`, `/data/color_management.db`).
- [x] No critical config/doc drift for active runtime.
- [x] Code review pass completed for Phase 0 batch.

## Task List

### P0-01 Runtime Contract Baseline
- [ ] Owner: refactor agent
- [ ] Action: freeze canonical runtime contract values:
  - Backend entry: `backend/server.js`
  - UI static root: `frontend/legacy`
  - API base: `/api`
  - Health: `/health`
  - Default port: `9099`
  - Docker DB file: `/data/color_management.db`
- [ ] Verify: contract is documented in this checklist and matched by code/config.

### P0-02 Config Drift Fixes
- [x] Owner: refactor agent
- [x] Action: align `.env.example` DB path to `/data/color_management.db`.
- [x] Verify command: `rg -n "DB_FILE" .env .env.example docker-compose.yml Dockerfile`

### P0-03 Refactor Plan Pointer Update
- [x] Owner: refactor agent
- [x] Action: update `CLAUDE.md` to reference archived master plan plus this Phase 0 checklist.
- [x] Verify command: `rg -n "REFACTORING_PLAN|PHASE0_EXECUTION_CHECKLIST" CLAUDE.md`

### P0-04 Add Repeatable Smoke Test
- [x] Owner: refactor agent
- [x] Action: add `scripts/phase0-smoke.js`.
- [x] Action: add npm script `smoke:phase0`.
- [x] Verify command: `npm run smoke:phase0`
- [x] Pass criteria:
  - `/health` returns 200
  - `/` returns 200
  - root HTML includes UTF-8 charset meta tag

### P0-05 Add Repeatable Encoding Audit
- [x] Owner: refactor agent
- [x] Action: add `scripts/encoding-audit.js`.
- [x] Action: add npm script `audit:encoding`.
- [x] Verify command: `npm run audit:encoding`
- [x] Pass criteria:
  - no invalid UTF-8 in active runtime/docs scope
  - no replacement char `U+FFFD` in active scope

### P0-06 Combine Phase 0 Verification Command
- [x] Owner: refactor agent
- [x] Action: add npm script `phase0:verify`.
- [x] Verify command: `npm run phase0:verify`

### P0-06A Native SQLite Binding Prerequisite
- [x] Owner: refactor agent
- [x] Action: document and fix local sqlite3 native-binding prerequisite for smoke boot.
- [x] Fix applied in this run: extracted `sqlite3-binary.tar.gz` to `node_modules/sqlite3/build/Release/node_sqlite3.node`.
- [ ] Follow-up: standardize this in environment setup so rebuild/install is deterministic.

### P0-07 Phase 0 Review Gate
- [x] Owner: code-review agent
- [x] Action: run full Phase 0 review after P0-01..P0-06 verification.
- [x] Output: severity-ordered findings and required fixes.

### P0-08 Docker Verification
- [x] Owner: refactor agent
- [x] Action: build and run Docker image locally and verify runtime contract.
- [x] Verify evidence:
  - `docker build -t stereowood-color-system:phase0-smoke .`
  - `docker run -d --rm --name sw-phase0-smoke -p 19199:9099 -e NODE_ENV=production -e DB_FILE=/data/color_management.db stereowood-color-system:phase0-smoke`
  - `GET http://127.0.0.1:19199/health` -> 200
  - `GET http://127.0.0.1:19199/` -> 200 with UTF-8 meta
  - `docker exec sw-phase0-smoke ls -la /data` shows `color_management.db` and WAL files

### P0-09 Untrack Runtime Database Artifacts
- [x] Owner: refactor agent
- [x] Action: remove tracked SQLite runtime files from git index (`backend/color_management.db*`).
- [x] Verify:
  - `git ls-files backend | rg "color_management\\.db"` returns no results
  - `git check-ignore -v backend/color_management.db*` matches `.gitignore` rules

### P0-10 Deterministic Dependency Contract
- [x] Owner: refactor agent
- [x] Action: adopt lockfile-based install path for repo and Docker.
- [x] Changes:
  - remove `package-lock.json` ignore from `.gitignore`
  - remove `package-lock.json` ignore from `.dockerignore`
  - switch Docker dependency install to `npm ci --omit=dev`
- [x] Verify: Docker build succeeds with lockfile context and `npm ci`.

### P0-11 Garbled Chinese Text Cleanup (Active Entry)
- [x] Owner: refactor agent
- [x] Action: clean garbled/question-mark Chinese markers in `frontend/legacy/index.html`.
- [x] Verify:
  - `rg -nP "[\\p{Han}]\\?" frontend/legacy/index.html` returns no results
  - `npm run audit:encoding` passes

## Current Batch Status
- Started Batch A (contract alignment + tooling setup): in progress
- Completed in this run: P0-02, P0-03, P0-04, P0-05, P0-06, P0-06A, P0-08, P0-09, P0-10, P0-11
- Next immediate step: follow `docs/refactor/IMPLEMENTATION_CHECKLIST.md` and start Phase 1 inventory/cleanup batches
