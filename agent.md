# Agent Notes

- Last updated: 2026-03-07
- Active branch baseline for modernization work: `main` (Phase A merged and aligned).
- Current production baseline: legacy UI served by backend (`/` on port `9099`).

## Current Sources of Truth

1. Legacy stabilization history and gates:
   - `docs/refactor/IMPLEMENTATION_CHECKLIST.md`
   - `docs/refactor/PHASE5_REVIEW_GATE.md`
2. Architecture upgrade plan and gates:
   - `docs/architecture/IMPLEMENTATION_CHECKLIST.md`
   - `docs/architecture/PHASE_A_REVIEW_GATE.md`
   - `docs/architecture/LATEST_ROADMAP_P0_P6.md`
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

## Next Focus (Phase B Planning)

1. Complete internal auth UX (admin page + approval/reset flows).
2. Add bottom timeline/audit panel UX for all key write surfaces.
3. Continue deletion/dedup pass for mixed network access and compatibility fallbacks.
4. Keep pilot modernization path gated and reversible.
