# STEREOWOOD Color System - Operations Manual

## Local Start (Hand Test)
1. Open terminal in project root.
2. Run `npm start`.
3. Open `http://localhost:9099`.
4. If `9099` is occupied, backend auto-increments to next port. Use the printed port in terminal.

## Runtime Endpoints
- Health: `/health`
- API root: `/api`
- Legacy UI root: `/`
- Pilot UI root: `/pilot` (only when `ENABLE_PILOT_UI=true`)

## Local Database
- Default local file: `backend/color_management.db`
- Override with env:
  - PowerShell: `$env:DB_FILE='backend/color_management.db'; npm start`

## Docker / Synology Runtime
- Production DB path in container: `/data/color_management.db`
- Production env:
  - `NODE_ENV=production`
  - `PORT=9099`
  - `DB_FILE=/data/color_management.db`
  - `TZ=Asia/Shanghai`
  - `AUTH_ENFORCE_WRITES=false` (legacy compatibility default)
  - `READ_ONLY_MODE=false`
  - `SESSION_TTL_HOURS=12`
  - `INTERNAL_ADMIN_KEY=<set-strong-secret-before-using-admin-approval>`
  - `ENABLE_PILOT_UI=false` (default off, A7 pilot feature flag)

## Auth Mode Notes (A4)
- If `AUTH_ENFORCE_WRITES=true`:
  - write APIs require login session token
  - read APIs stay available
- If `READ_ONLY_MODE=true`:
  - write APIs return `503`
  - read APIs remain available (maintenance fallback)

## Synology Volume Mapping (Current)
- `/volume1/docker/stereowood-color-system/data:/data:rw`
- `/volume1/docker/stereowood-color-system/uploads:/app/backend/uploads:rw`
- `/volume1/docker/stereowood-color-system/backups:/app/backend/backups:rw`

## API Smoke Commands
```bash
curl http://localhost:9099/health
curl http://localhost:9099/api/config
curl http://localhost:9099/api/custom-colors
curl http://localhost:9099/api/artworks
curl http://localhost:9099/api/mont-marte-colors
curl http://localhost:9099/api/categories
```

## SQLite Backup Rule (Important)
When service is running with WAL mode, back up all three files together:
- `color_management.db`
- `color_management.db-wal`
- `color_management.db-shm`

Do not back up only `color_management.db` from a live container.

## Backup / Restore Scripts
```bash
npm run backup
npm run restore
```

## Troubleshooting
1. If server fails to start, check whether port `9099` is already in use.
2. If UI loads but data fails, check `DB_FILE` and mounted `/data` path.
3. If images fail, check write access to `/app/backend/uploads`.
