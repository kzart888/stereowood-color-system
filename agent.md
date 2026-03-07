# Agent Notes

- Last updated: 2026-03-07
- Active branch baseline for modernization work: `main` (Phase A merged and aligned).
- Current production baseline: legacy UI served by backend (`/` on port `9099`).

## Current Sources of Truth

1. Legacy stabilization history and gates:
   - `docs/refactor/README.md`
   - `docs/refactor/IMPLEMENTATION_CHECKLIST.md`
   - `docs/refactor/PHASE5_REVIEW_GATE.md`
2. Architecture upgrade plan and gates:
   - `docs/architecture/LATEST_ROADMAP_P0_P6.md`
   - `docs/architecture/README.md`
   - `docs/architecture/P5_2_REVIEW_GATE.md`
   - `docs/architecture/P5_3_REVIEW_GATE.md`
   - `docs/architecture/P6_1_REVIEW_GATE.md`
   - `docs/architecture/P6_2_CUTOVER_DECISION_PACKAGE.md`
3. Deployment and operations:
   - `DEPLOYMENT_CHECKLIST.md`
   - `docs/OPERATIONS.md`

## Operational Notes

- Runtime DB files must stay untracked (`*.db`, `*.db-wal`, `*.db-shm`).
- Backup/restore scripts are:
  - `npm run backup`
  - `npm run restore`
- Optional env for backup tooling:
  - `DB_FILE`
  - `BACKUP_DIR`

## Next Focus

1. Operator decision on pilot-write production enablement using `docs/architecture/P6_2_CUTOVER_DECISION_PACKAGE.md`.
2. Keep `PILOT_DICTIONARY_WRITE=false` by default until explicit go-live approval.
3. Prepare next modernization slice (post-P6) under legacy-safe parallel rollout rules.
