# Legacy Vue 2 Frontend Archive

The original CDN-based Vue 2 interface now lives under `legacy/frontend-vue2/`. Keep this directory intact for reference while the Vue 3 rewrite progresses.

## Local Development

```bash
npm install
npm run start
```

* The Express backend serves the legacy UI from `http://localhost:9099/legacy`.
* If no Vite build exists yet, the legacy UI is also available at `http://localhost:9099/`.
* Assets, uploads, and API endpoints behave exactly as before.

## Notes

* Do not modify files inside `legacy/frontend-vue2/` except for archival fixes (typos, documentation, etc.).
* The legacy directory is excluded from Docker build contexts to keep images lightweight.
* When comparing behavior with the new Vue 3 app, run the Vite dev server on port `3000` and leave the backend on port `9099`.
