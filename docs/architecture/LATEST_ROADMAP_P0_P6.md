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
| P1 | Ops/document alignment | In progress | Most contract fixes exist; final doc cleanup/indexing still needed. |
| P2 | Test system hardening | In progress | Core verify scripts exist; full one-command local+docker gate still missing. |
| P3 | Internal auth completion | Partially complete | Backend foundation exists; admin workflow UI and ops toggles need completion. |
| P4 | History/audit UX | Partially complete | Backend audit/history events exist; bottom timeline panel UX not finished. |
| P5 | Obsolete/duplicate cleanup | In progress | Major split done; mixed network paths and residual dead docs/code still remain. |
| P6 | Modernization (Vue3 path) | Planned | Pilot path exists; expand only when compatibility gates pass. |

## Phase-by-Phase Execution Checklist

## P1: Ops and Documentation Alignment

Target outcome:
- One consistent operator story across local, Docker, and Synology.

Checklist:
- [ ] Confirm all operational docs point to `PORT=9099` and `DB_FILE=/data/color_management.db`.
- [ ] Confirm backup/restore docs match current scripts (`npm run backup`, `npm run restore`).
- [x] Remove or archive stale docs that describe superseded branch flows or blocked Docker states.
- [x] Add a single docs entry index (`docs/architecture/README.md`) and keep it updated.
- [x] Update `docs/CHANGELOG.md` with a docs/status refresh entry.

Gate:
- [ ] No contradictory runtime/deploy instructions across `README.md`, `docs/OPERATIONS.md`, `DEPLOYMENT_CHECKLIST.md`, and architecture docs.

## P2: Test System Hardening

Target outcome:
- One command that proves release readiness for local and Docker rehearse path.

Checklist:
- [ ] Add a one-command gate script (example: `npm run gate:full`) covering:
  - [ ] encoding audit
  - [ ] phase0 smoke
  - [ ] key phase A contract checks
  - [ ] Docker smoke on temporary port
- [ ] Add explicit DB dry-run verification for copied trio:
  - [ ] `color_management.db`
  - [ ] `color_management.db-wal`
  - [ ] `color_management.db-shm`
- [ ] Add pre-deploy checklist script/doc for operator handoff.

Gate:
- [ ] Gate command passes on developer machine and a clean Docker rehearsal.

## P3: Internal Auth Completion

Target outcome:
- Lightweight internal account system with approval and safe admin operations.

Checklist:
- [ ] Build/finish admin page for:
  - [ ] pending approvals
  - [ ] manual user add
  - [ ] password reset
  - [ ] disable/delete account
- [ ] Enforce single active session policy (old session invalidated on re-login).
- [ ] Add simple emergency switches:
  - [ ] temporary auth bypass (maintenance only)
  - [ ] read-only mode
- [ ] Add audit visibility for auth actions (who approved/disabled/reset).

Gate:
- [ ] Register -> approve -> login -> protected write -> audit log flow passes.

## P4: History and Audit UX

Target outcome:
- Every primary screen shows a simple, readable operation timeline panel.

Checklist:
- [ ] Add bottom scrollable audit panel to main screens (`custom colors`, `artworks`, `mont-marte`).
- [ ] Show `who / when / what` summary lines in plain text style.
- [ ] Add basic filter + pagination for audit timeline.
- [ ] Keep UTF-8 safety for Chinese labels/content.

Gate:
- [ ] Timeline API + UI consistency confirmed on all major write flows.

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
