# STEREOWOOD Color System - Operations Manual

Last updated: 2026-03-08

## Local Start (Hand Test)
1. Open terminal in repo root.
2. Run `npm ci` (first time) then `npm start`.
3. Open `http://localhost:9099`.
4. You will see login page (`/`), then enter app at `/app`.

Prerequisite:
- Node.js 20.x LTS.

## Runtime Endpoints
- Health: `/health`
- API root: `/api`
- Login page: `/` and `/login`
- Legacy app shell: `/app`
- Account management page: `/account-management` (admin/super admin)
- Pilot UI root: `/pilot` (only when `ENABLE_PILOT_UI=true`)

## Local Database
- Default local file: `backend/color_management.db`
- Override with env:
  - PowerShell: `$env:DB_FILE='backend/color_management.db'; npm start`

## Docker / Synology Runtime
- Production DB path in container: `/data/color_management.db`
- Production env baseline:
  - `NODE_ENV=production`
  - `PORT=9099`
  - `DB_FILE=/data/color_management.db`
  - `TZ=Asia/Shanghai`
  - `AUTH_ENFORCE_WRITES=true` (recommended)
  - `READ_ONLY_MODE=false`
  - `SESSION_TTL_HOURS=720` (30 days)
  - `COOKIE_SECURE=false` for local HTTP; set `true` behind HTTPS reverse proxy
  - `ENABLE_PILOT_UI=false` (default off)
  - `PILOT_DICTIONARY_WRITE=false` (default off)

Compatibility note:
- `INTERNAL_ADMIN_KEY` + `x-admin-key` fallback is disabled by default.
- Enable only when needed: `ALLOW_LEGACY_ADMIN_KEY=true`.
- New UI/admin flow uses authenticated role-based session and should be treated as primary path.

## Auth/RBAC Notes
- Role model:
  - `super_admin`
  - `admin`
  - `user`
- Bootstrap:
  - When no super admin exists, system seeds `admin/admin`.
  - First login requires password change.
- New account and reset policy:
  - Default temporary password is `123456`.
  - Admin-created and reset accounts require first login password change (>=8).
  - Self-register accounts use user-defined strong passwords and do not require forced first-login password change.
  - Account creation is `user` first; super admin can later promote user to admin.
- Session:
  - HttpOnly cookie
  - one account = one active session (new login revokes old session)
  - frontend does not persist auth token in `localStorage`

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
When service runs with WAL mode, backup all three files together:
- `color_management.db`
- `color_management.db-wal`
- `color_management.db-shm`

Do not back up only `color_management.db` from a live container.

## Verification Commands
```bash
npm run phase0:verify
npm run phaseA:a4:verify
npm run phaseP3:verify
npm run phaseP4:verify
npm run phaseP5:verify
npm run phaseP6:verify
npm run phaseL:auth-rbac:smoke
npm run phaseU11:ui-smoke
npm run phaseL:auth-v2:verify
npm run gate:full
```

## Troubleshooting
1. If server fails to start, check whether port `9099` is occupied.
2. If UI cannot enter `/app`, check login state (`/api/auth/me`) and forced password-change status.
3. If images fail, check write access to `/app/backend/uploads`.
4. If Docker build fails on Windows, ensure `backend/uploads` junction is excluded by `.dockerignore`.
5. If list thumbnails are missing, check whether `sharp` installed successfully (`npm ci` / image build logs) and confirm both original files and `*.thumb256.jpg` sidecars exist in `/app/backend/uploads`.
