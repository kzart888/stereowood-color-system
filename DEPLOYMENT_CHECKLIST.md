# Deployment Checklist for STEREOWOOD Color System

## Scope

Use this checklist for Docker/Synology production deployment and local environment consistency.

## Runtime Contract (must match code)

- Backend entry: `backend/server.js`
- Legacy UI root: `frontend/legacy` served at `/`
- API base: `/api`
- Health endpoint: `/health`
- Default port: `9099`
- Docker DB path: `/data/color_management.db`

## Configuration Model (current)

Pagination mode is no longer controlled by manual source edits.

- Server endpoint: `GET /api/config`
- Server behavior:
  - `NODE_ENV=development` -> mode `test`
  - `NODE_ENV=production` -> mode `production`
- Frontend behavior:
  - Uses `window.ConfigHelper.getItemsPerPage(...)`
  - Reads app config + localStorage preference

Reference: `frontend/legacy/js/utils/config-helper.js`

## Pre-Deployment Checklist

1. Confirm image build uses lockfile-based install (`npm ci --omit=dev`).
2. Confirm environment values:
   - `NODE_ENV=production`
   - `PORT=9099`
   - `DB_FILE=/data/color_management.db`
3. Confirm volume mappings:
   - `/data`
   - `/app/backend/uploads`
4. Confirm healthcheck target:
   - `http://127.0.0.1:9099/health`
5. Confirm no runtime DB files are tracked by git.

## Deployment (Docker)

```bash
docker build -t stereowood-color-system .

docker run -d \
  --name stereowood-color-system \
  -p 9099:9099 \
  -e NODE_ENV=production \
  -e PORT=9099 \
  -e DB_FILE=/data/color_management.db \
  -v stereowood-data:/data \
  -v stereowood-uploads:/app/backend/uploads \
  --restart unless-stopped \
  stereowood-color-system:latest
```

## Post-Deployment Verification

1. `GET /health` returns `200`.
2. Root page `/` loads legacy UI.
3. Tab smoke:
   - custom-colors
   - artworks
   - mont-marte
   - color-dictionary
4. Open/close add dialogs on each major tab.
5. Confirm no new browser console errors.

## Rollback

1. Redeploy previous known-good image tag.
2. Keep existing `/data` and uploads volume.
3. Re-verify `/health` and root UI.

## Notes

- Do not use old workflow that manually edits `itemsPerPage` in component files.
- For test-mode pagination, use development config (`NODE_ENV=development`) or explicit app-config settings.
