# Production DB Validation Report (Synology Export)

- Date: 2026-02-08
- Scope: Validate downloaded Synology DB files under `backend/production_db/data`
- Validator: local read-only and copy-based checks (no writes to original files)

## Files Validated
- `backend/production_db/data/color_management.db`
- `backend/production_db/data/color_management.db-wal`
- `backend/production_db/data/color_management.db-shm`

## Key Findings
1. Structural integrity is healthy on copied production dataset:
   - `PRAGMA integrity_check` = `ok`
   - `PRAGMA quick_check` = `ok`
   - `PRAGMA foreign_key_check` = no violations
2. Original downloaded DB is older schema than current code:
   - Missing column: `scheme_layers.manual_formula`
3. Current backend startup migration handles this safely:
   - On first startup with copied DB, migration added `manual_formula`
   - API smoke then passed (`/api/artworks` included)
4. WAL-state warning confirmed:
   - Copying only `.db` produced different table counts than copying `.db + .db-wal + .db-shm`
   - Conclusion: **do not back up SQLite by copying `.db` alone while service is running**

## Safety Conclusion
- Your production data is reusable.
- No manual SQL patch is required before reuse.
- Let application startup migrations run once on deployment, with backup preserved.

## Best-Practice Migration Procedure (Recommended)
1. Backup all three SQLite files from Synology data volume:
   - `color_management.db`
   - `color_management.db-wal`
   - `color_management.db-shm`
2. Keep production container unchanged while validating on a separate rehearsal container.
3. Start rehearsal container with copied DB volume and same env (`DB_FILE=/data/color_management.db`).
4. Verify:
   - `/health` -> `200`
   - `/api/artworks` -> `200`
   - `/api/custom-colors` -> `200`
5. Only after successful rehearsal, perform production cutover.

## Optional Post-Cutover Check
- Confirm migrated column exists:
  - `PRAGMA table_info(scheme_layers);`
  - Expected column list includes `manual_formula`.

## A3 Additive Migration Rehearsal (History + Audit)
- Date: 2026-02-08
- Command: `npm run phaseA:a3:db-dryrun`
- Source DB set: `backend/production_db/data/color_management.db` + WAL + SHM
- Method:
  1. Copy trio into a temp rehearsal DB.
  2. Boot backend once against copied DB to run migrations.
  3. Verify schema and integrity after startup.
- Results:
  - `A3_DB_DRYRUN=PASS`
  - Added tables detected:
    - `audit_events`
    - `entity_change_events`
  - Added metadata columns detected:
    - `custom_colors_history`: `change_action`, `actor_id`, `actor_name`, `request_id`, `source`
    - `color_schemes_history`: `change_action`, `actor_id`, `actor_name`, `request_id`, `source`
  - `PRAGMA integrity_check` = `ok`
  - `PRAGMA quick_check` = `ok`
  - `PRAGMA foreign_key_check` = no violations
