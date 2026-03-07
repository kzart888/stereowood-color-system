# Latest Roadmap and Checklist (P0-P6)

Last updated: 2026-03-07  
Scope: legacy-first production stabilization complete, then staged architecture modernization.

This document is the current execution source of truth for future work.

## Current Position

- Runtime contract stays: backend serves `frontend/legacy` at `/`, APIs at `/api`, health at `/health`, port `9099`.
- Branch state is aligned: `main` and `architecture-upgrade` are at the same commit.
- Local Docker rehearsal is now passing again on Windows after host restart.
- UTF-8 runtime baseline is stable (`text/html; charset=utf-8`, frontend UTF-8 meta present).

## Goal Alignment

Your goals are reasonable and are preserved in this roadmap:
- Remove obsolete/useless code and docs.
- Remove duplicated logic and unify gateways/contracts.
- Improve maintainability with clear module boundaries.
- Add internal auth/admin workflow with simple operations.
- Add visible history/audit UX for daily operations.
- Keep production safe during modernization (no big-bang rewrite).

## Phase Status Overview

| Phase | Title | Status | Notes |
|---|---|---|---|
| P0 | Branch and baseline decision | Completed | Phase A merged posture confirmed; Docker rehearsal recovered and passing. |
| P1 | Ops/document alignment | Completed | Contract matrix, archive cleanup, and P1 gate are published. |
| P2 | Test system hardening | Completed | Full one-command gate, Docker smoke automation, strict dry-run mode, and predeploy checker are published. |
| P3 | Internal auth completion | Completed | Admin account workflows, single-session policy, runtime switches, and P3 gate are passing. |
| P4 | History/audit UX | Completed | Feed API + bottom timeline panel shipped with filters/pagination and UTF-8 label checks. |
| P5 | Obsolete/duplicate cleanup | In progress | Major split done; mixed network paths and residual dead docs/code still remain. |
| P6 | Modernization (Vue3 path) | Planned | Pilot path exists; expand only when compatibility gates pass. |

## Phase-by-Phase Execution Checklist

## P1: Ops and Documentation Alignment

Target outcome:
- One consistent operator story across local, Docker, and Synology.

Checklist:
- [x] Confirm all operational docs point to `PORT=9099` and `DB_FILE=/data/color_management.db`.
- [x] Confirm backup/restore docs match current scripts (`npm run backup`, `npm run restore`).
- [x] Remove or archive stale docs that describe superseded branch flows or blocked Docker states.
- [x] Add a single docs entry index (`docs/architecture/README.md`) and keep it updated.
- [x] Update `docs/CHANGELOG.md` with a docs/status refresh entry.

Gate:
- [x] No contradictory runtime/deploy instructions across `README.md`, `docs/OPERATIONS.md`, `DEPLOYMENT_CHECKLIST.md`, and architecture docs.

Evidence:
- `docs/architecture/P1_1_DOC_CONTRACT_MATRIX.md`
- `docs/architecture/P1_REVIEW_GATE.md`

## P2: Test System Hardening

Target outcome:
- One command that proves release readiness for local and Docker rehearse path.

Checklist:
- [x] Add a one-command gate script (`npm run gate:full`) covering:
  - [x] encoding audit
  - [x] phase0 smoke
  - [x] key phase A contract checks
  - [x] Docker smoke on temporary port
- [x] Add explicit DB dry-run verification support for copied trio:
  - [x] `color_management.db`
  - [x] `color_management.db-wal`
  - [x] `color_management.db-shm`
- [x] Add pre-deploy checklist script/doc for operator handoff.

Gate:
- [x] Gate command passes on developer machine and a clean Docker rehearsal.

Evidence:
- `docs/architecture/P2_REVIEW_GATE.md`

## P3: Internal Auth Completion

Target outcome:
- Lightweight internal account system with approval and safe admin operations.

Checklist:
- [ ] Build/finish admin page for:
  - [x] pending approvals
  - [x] manual user add
  - [x] password reset
  - [x] disable/delete account
- [x] Enforce single active session policy (old session invalidated on re-login).
- [x] Add simple emergency switches:
  - [x] temporary auth bypass (maintenance only)
  - [x] read-only mode
- [x] Add audit visibility for auth actions (who approved/disabled/reset).

Gate:
- [x] Register -> approve -> login -> protected write -> audit log flow passes.

Evidence:
- `docs/architecture/P3_REVIEW_GATE.md`

## P4: History and Audit UX

Target outcome:
- Every primary screen shows a simple, readable operation timeline panel.

Checklist:
- [x] Add bottom scrollable audit panel to main screens (`custom colors`, `artworks`, `mont-marte`).
- [x] Show `who / when / what` summary lines in plain text style.
- [x] Add basic filter + pagination for audit timeline.
- [x] Keep UTF-8 safety for Chinese labels/content.

Gate:
- [x] Timeline API + UI consistency confirmed on all major write flows.

Evidence:
- `docs/architecture/P4_REVIEW_GATE.md`

## P5: Obsolete and Duplicate Cleanup

Target outcome:
- Clean, predictable module boundaries with reduced tech debt.

Checklist:
- [ ] Standardize frontend data access to one adapter gateway path.
- [ ] Remove mixed direct network styles (`fetch`, `axios`, `window.api`) from active features.
- [ ] Continue splitting oversized legacy files into orchestrator/domain/ui modules.
- [ ] Archive or delete dead docs and dead code paths with references updated.
- [ ] Keep behavior unchanged while reducing complexity.

Gate:
- [ ] No Critical/High regressions in full `code-review-agent` gate.

## P6: Modernization (Vue3 Path)

Target outcome:
- Controlled modernization with clear rollback and objective cutover criteria.

Checklist:
- [ ] Keep legacy as production until pilot parity is proven.
- [ ] Expand pilot from read-only slice to one controlled write slice.
- [ ] Define explicit cutover criteria:
  - [ ] API contract parity
  - [ ] critical user flow parity
  - [ ] performance and stability checks
- [ ] Define rollback triggers and rollback routine before cutover.

Gate:
- [ ] Pilot write slice passes parity and rollback rehearsal before any production cutover decision.

## Standard Routines (Current Baseline)

Local run:
1. `npm ci`
2. `npm start`
3. Open `http://localhost:9099`

Local Docker rehearsal:
1. `docker build -t stereowood-color-system:<tag> .`
2. `docker run --rm -d --name sw-test -p 9199:9099 -e NODE_ENV=production -e PORT=9099 -e DB_FILE=/data/color_management.db -v <data>:/data -v <uploads>:/app/backend/uploads -v <backups>:/app/backend/backups stereowood-color-system:<tag>`
3. Check:
   - `http://localhost:9199/health`
   - `http://localhost:9199/api/config`
   - `http://localhost:9199/`

Synology deployment routine:
1. Build and push image tag to your registry.
2. Pull tag in Synology Container Manager.
3. Start candidate container on temporary host port (for smoke).
4. Verify health/API/root.
5. Cut over production port `9099`.
6. Keep previous known-good tag for rollback.
