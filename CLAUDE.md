# CLAUDE.md

Repository guidance for coding agents working on this project.

## Current Refactor State

- Active production UI: `frontend/legacy`.
- Backend entry: `backend/server.js`.
- API base: `/api`.
- Health endpoint: `/health`.
- Default port: `9099`.
- Current plan source of truth: `docs/refactor/IMPLEMENTATION_CHECKLIST.md`.
- Historical legacy plan is archived at `archives/phase1-legacy-cleanup-2026-02-06/REFACTORING_PLAN.md`.

## Working Rules

1. Keep legacy runtime stable first; avoid behavior changes without verification.
2. Commit after each logical step with clear messages.
3. Run verification after risky changes:
   - `npm run phase0:verify`
   - `node --check backend/**/*.js`
   - `node --check frontend/legacy/js/**/*.js`
4. Do not push unless explicitly asked.

## Local Development

```bash
npm install
npm start
npm run dev
```

## Maintenance Commands

```bash
npm run backup
npm run restore
npm run phase0:verify
```

## Docker Deployment (reference)

```bash
docker build -t stereowood-color-system .
docker run -d --name stereowood -p 9099:9099 -e NODE_ENV=production -e DB_FILE=/data/color_management.db -v ~/stereowood-data:/data -v ~/stereowood-uploads:/app/backend/uploads --restart unless-stopped stereowood-color-system:latest
```

## Notes

- SQLite DB should remain untracked.
- Legacy component extraction work is phased and documented in `docs/refactor/`.
- Vue3 migration remains deferred until Phase 5 decision is approved.
