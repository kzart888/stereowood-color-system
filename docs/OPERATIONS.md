# STEREOWOOD Color System - Operations Manual

## Quick Start

### Start the system
```bash
npm start
```

Default runtime:
- URL: `http://localhost:9099`
- Legacy UI root: `/` (served from `frontend/legacy`)
- API root: `/api`
- Healthcheck: `/health`

Use another port if needed:
```bash
# Linux/macOS
PORT=9199 npm start

# PowerShell
$env:PORT=9199; npm start
```

Database path:
- Local default: `backend/color_management.db`
- Docker/Synology: `/data/color_management.db`

## Daily Operations

### Backup / Restore
```bash
npm run backup
npm run restore
```

### Common tasks

#### Add custom color
1. Open tab `自配色管理`.
2. Click `新自配色`.
3. Fill category, color code, formula, and optional image.
4. Save.

#### Add artwork scheme
1. Open tab `作品配色管理`.
2. Create/select artwork.
3. Click `新增配色方案`.
4. Fill scheme name, layer mapping, optional thumbnails.
5. Save.

#### Add Mont-Marte raw material
1. Open tab `颜色原料管理`.
2. Click `新原料`.
3. Fill name, category, supplier/purchase-link, optional image.
4. Save.

## API Smoke Commands

```bash
curl http://localhost:9099/health
curl http://localhost:9099/api/custom-colors
curl http://localhost:9099/api/artworks
curl http://localhost:9099/api/mont-marte-colors
curl http://localhost:9099/api/categories
```

## Docker / Synology

### Build
```bash
docker build -t stereowood-color-system .
```

### Run
```bash
docker run -d \
  --name stereowood \
  -p 9099:9099 \
  -e NODE_ENV=production \
  -e DB_FILE=/data/color_management.db \
  -v ~/stereowood-data:/data \
  -v ~/stereowood-uploads:/app/backend/uploads \
  --restart unless-stopped \
  stereowood-color-system:latest
```

### Verify
```bash
docker ps
docker logs stereowood
curl http://localhost:9099/health
```

### Rollback (Docker)
1. Redeploy last known-good image tag.
2. Keep existing `/data` volume.
3. Verify `/health` and root UI `/`.

## Troubleshooting

### Server cannot start
1. Check if port `9099` is occupied.
2. Use another port temporarily.
3. Reinstall dependencies if needed: `npm install`.
4. Confirm local DB file exists (or allow auto-create on start).

### Upload issues
1. Confirm `backend/uploads/` exists and writable.
2. Confirm file type is valid (`jpg/jpeg/png/gif/webp`).

### Reset local database (danger)
```bash
# Windows
Remove-Item backend\color_management.db

# Linux/macOS
rm backend/color_management.db

npm start
```

## Current Runtime Notes
- Version: `0.9.8`
- Default port: `9099`
- Legacy-first production stack (`frontend/legacy` + Node/Express + SQLite)
- No authentication (internal trusted network only)
- Deletes are permanent (no soft delete)
