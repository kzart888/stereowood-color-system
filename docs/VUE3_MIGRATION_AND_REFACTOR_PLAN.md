# STEREOWOOD Color System — Vue 3 Migration & Refactoring Playbook

**Author:** ChatGPT Code Auditor  
**Date:** 2025-02-14 00:00 UTC
**Version:** 1.2.0
**Scope:** Frontend (legacy Vue 2-style CDN bundle) & Node/Express backend  
**Goal:** Provide an actionable, test-first roadmap to migrate the product UI to a modern Vue 3 + Vite stack while simplifying and consolidating the JavaScript/Express codebase.  

---

## 1. Current State Audit

### 1.1 Frontend Observations
- **Monolithic entry point:** `frontend/js/app.js` mixes global state management, tab coordination, search index logic, and service registration in a single 600+ line script, with extensive reliance on the Options API and global refs.【F:frontend/js/app.js†L1-L352】
- **Oversized single-file components:** `custom-colors.js`, `artworks.js`, `color-dictionary.js`, `color-palette-dialog.js`, and `mont-marte.js` each exceed ~1k lines of inline templates and logic, making reuse and testing impractical.【F:frontend/js/components/custom-colors.js†L1-L160】
- **Duplicated utilities:** Two color conversion modules (`utils/color-converter.js` vs `utils/colorConversion.js`) and multiple helper collections (`utils/helpers.js`, `utils/config-helper.js`, `utils/message.js`) overlap in responsibility.【F:frontend/js/utils/color-converter.js†L1-L80】【F:frontend/js/utils/helpers.js†L1-L120】
- **Legacy global modules:** Several scripts attach to `window` (e.g., `$formulaCalc`, `thumbPreview`, `api`) and are consumed via globals, complicating tree-shaking and dependency tracking.
- **Heavy static payloads:** `js/data/pantone-colors-full.js` (~1.1 MB) is bundled eagerly instead of lazily loading via HTTP requests.
- **Mixed styling sources:** Multiple CSS directories (`css/base`, `css/components`, `css/layout`) with global selectors, manual utility classes, and Element Plus CDN usage; no design tokens or PostCSS pipeline.
- **Diagnostics debt:** Debug comments and console logging scattered throughout components; `modules/version-guard.js` is a zero-byte placeholder that should be archived.【F:frontend/js/modules/version-guard.js†L1-L1】

### 1.2 Backend Observations
- **Single Express entry:** `backend/server.js` combines environment config, static file serving, migrations, and request lifecycle wiring without separation for dev/prod or modular middleware stacks.【F:backend/server.js†L1-L118】
- **Fat routes:** Route files under `backend/routes/` still embed validation, response shaping, and DB access (e.g., `custom-colors.js`), despite a partial `services/` layer (`ColorService`, `ArtworkService`).
- **Services need consolidation:** Validation logic (RGB/CMYK/HEX) and archive handling lives inside `ColorService`, but similar patterns appear in other services/routes without reuse.
- **Testing gap:** No automated tests exist (`package.json` lacks test scripts), no linting/formatting pipelines, and Docker setup only targets the legacy bundle.

### 1.3 DevOps & Tooling
- **No build tooling:** Frontend assets are handcrafted and served statically; no bundler, no module resolution, no TypeScript support.
- **Mixed runtime ports:** Backend runs on `9099`; previous experiments ran frontend dev servers on `3000`. Need a structured two-app workflow during migration.
- **Archival need:** Legacy frontend must remain available for comparison, but excluded from deployment artifacts (.gitignore / .dockerignore updates required).

---

## 2. Target Architecture Snapshot

### 2.1 Vue 3 + Vite Frontend
- **Vite workspace:** `frontend-vue3/` with `src/main.ts`, `App.vue`, and `vite.config.ts` configured for Element Plus (component auto-import + global styles) and aliasing existing API endpoints.
- **State management:** Adopt Pinia stores for `app`, `customColors`, `artworks`, `materials`, and `dictionary` data. Encapsulate async fetch logic and caching in composables (e.g., `useCustomColors`, `useSearchIndex`).
- **Component design:** Break features into view-level containers (`views/`) and small presentational components (`components/`), leveraging `<script setup>` and Composition API.
- **Routing & layout:** Vue Router for tab navigation instead of manual `activeTab` watchers; layout skeleton with persistent header/search and view slotting.
- **Styling:** Use PostCSS + CSS variables for theme tokens. Convert ad-hoc utilities into atomic classes or Element Plus components; gradually migrate to scoped styles per component.
- **Data loading:** Replace global `window.api` with Axios-based service modules; lazy-load large reference data (Pantone) via dynamic import or HTTP fetch.
- **Testing:** Configure Vitest for unit tests, Vue Test Utils for component tests, Playwright (or Cypress) for smoke E2E flows, ESLint + Prettier + Stylelint for consistency.

### 2.2 Express Backend Enhancements
- **Layered structure:** Introduce `controllers/`, `validators/`, `repositories/` to isolate HTTP, validation, and persistence concerns; unify error handling middleware.
- **API versioning:** Expose existing routes under `/api/v1/` with typed response contracts shared with the Vue 3 client.
- **Test harness:** Add Jest (or Vitest in Node mode) with Supertest for API routes; configure coverage thresholds.
- **Build scripts:** `npm run dev:frontend`, `npm run dev:backend`, `npm run test`, `npm run lint`, `npm run e2e`. Consider pnpm or npm workspaces for shared dependencies.

### 2.3 Dual-run Strategy
- **Legacy archive:** Move current `frontend/` into `legacy/frontend-legacy/` and `frontend/js` global libs into `legacy/shared/`. Wire Express static hosting for legacy UI under `/legacy` or dedicated port.
- **New app porting:** Run Vite dev server on `3000` (proxy API to `9099`). Production build served from `frontend-vue3/dist` via Express static middleware or separate CDN bucket.
- **Docker:** Update `Dockerfile` / `docker-compose.yml` to build both images or multi-stage build with toggled target. Add `.dockerignore` + `.gitignore` entries for archived bundles and build artifacts.

---

## 3. Refactoring & Migration Plan

The roadmap is divided into sequential phases; each phase concludes with specific validation commands to satisfy requirement (6). Phases may be iterated feature-by-feature to control risk.

### Phase 0 — Project Preparation (Week 0)
1. **Baseline branch & tagging:** Create a `legacy-v0.9.x` Git tag. Snapshot database schema via `scripts/backup.js`.
2. **Inventory tooling:** Document npm/node versions, Element Plus CDN dependencies, and Pantone data source.
3. **Set up lint/test scaffolding for legacy code** (ESLint + Prettier configs) purely for diagnostic reporting without enforcing yet.
4. **Archive directories:**
   - Move `frontend/` -> `legacy/frontend-vue2/`.
   - Move shared global scripts (`frontend/js/utils/*.js`, `frontend/js/modules/*.js`, etc.) into `legacy/shared/`.
   - Update `.gitignore` and `.dockerignore` to exclude `legacy/**` from build contexts while keeping them in source control.
5. **Docs:** Record legacy usage guide (`docs/LEGACY_FRONTEND.md`) including start command and port `9099` mapping.
6. **Validation:**
   - `npm run start` (backend) + manual sanity check on http://localhost:9099.
   - `npx eslint legacy/**/*.js` (non-blocking) to capture issues for later fixes.

### Phase 1 — New Tooling & Skeleton (Week 1)
1. **Initialize Vite project:** `npm create vite@latest frontend-vue3 -- --template vue-ts`.
2. **Install dependencies:** `element-plus`, `pinia`, `vue-router`, `axios`, `@vueuse/core`, `sass`, `vitest`, `@testing-library/vue`, `playwright`, `eslint`, `prettier`, `stylelint`.
3. **Configure Vite:**
   - Aliases for `@/`.
   - Proxy `/api` to `http://localhost:9099`.
   - Auto-import Element Plus components (unplugin-vue-components).
4. **Project scripts:** Update root `package.json` with workspace or npm scripts: `dev`, `dev:frontend`, `dev:backend`, `build`, `test:unit`, `test:e2e`, `lint`.
5. **CI placeholder:** Add GitHub Actions workflow stub (lint + unit tests) to enforce future consistency.
6. **Validation:**
   - `npm run dev:frontend` (ensures Vite compiles & hot reload works).
   - `npm run test:unit` (Vitest sample test).
   - `npm run lint` (ESLint + Stylelint + Prettier check).

### Phase 2 — Core Infrastructure Migration (Weeks 2-3)
1. **Global services to modules:**
   - Recreate `api` layer using Axios instance with interceptors, typed response models.
   - Port helper utilities into dedicated composables/util modules (`src/utils/`), deduplicating conflicting files (e.g., unify color conversion methods).
   - Replace global event bus usage with Pinia actions or composables (e.g., global search, scroll persistence).
2. **State scaffolding:** Implement Pinia stores for categories, custom colors, artworks, mont marte colors, search index.
3. **Routing & Layout:** Build `App.vue` with `<router-view>`, header component, and global search modal. Mirror existing tab names as routes.
4. **CSS baseline:** Introduce `src/assets/styles/base.scss`, `tokens.scss`, and adopt CSS variables for theme colors. Map existing `.category-switch` etc. to component-scoped styles.
5. **Validation:**
   - `npm run dev:frontend` + manual UI smoke (tabs switch, placeholder data displayed via mocked Pinia state).
   - `npm run test:unit` for stores/composables.
   - `npm run lint`.

### Phase 3 — Feature-by-Feature Port (Weeks 4-7)
Repeat the sequence below per major feature (Custom Colors → Artworks → Dictionary → Mont Marte → Formula Calculator & shared dialogs):
1. **Model extraction:** Define TypeScript interfaces for API payloads based on backend responses.
2. **Component breakdown:**
   - Convert legacy template into smaller Vue 3 components (e.g., `ColorCard.vue`, `ColorFilters.vue`, `ColorDetailsDrawer.vue`).
   - Encapsulate pagination, sorting, selection into composables (`usePagination`, `useSorting`).
3. **Service integration:** Replace `window.api` calls with typed API functions; reuse `useAsyncData` for caching.
4. **Accessibility & i18n cleanup:** Add ARIA roles, keyboard navigation (preserve existing functionality). Remove obsolete debug comments; rewrite documentation-level comments for maintainability.
5. **Testing per feature:**
   - Component unit tests verifying computed values, filtering, and event emissions.
   - Pinia store tests with mocked Axios responses.
   - Storybook (optional) or Chromatic for UI diffing.
   - Update Playwright spec to cover end-to-end flows (create/edit/delete color, search, view artworks, manage materials).
6. **Regression check vs legacy:** Run both apps concurrently (`npm run dev:backend` + `npm run dev:frontend`) and compare UI output; document any intentional changes.

### Phase 4 — Backend Modernization (Weeks 5-7, parallel with Phase 3)
1. **Controller layer:** Create controllers that consume services and handle request/response serialization.
2. **Validation middleware:** Introduce Zod or Joi schemas for payload validation; share field constraints with frontend via TypeScript definitions.
3. **Repository layer:** Abstract raw SQL queries into `db/queries/` modules; ensure consistent error handling.
4. **Testing:** Write Jest/Supertest specs for routes (CRUD operations, validation errors, duplicate detection). Add SQLite in-memory config for tests.
5. **Logging & monitoring:** Replace scattered `console.log` with Winston logger, configure log levels per environment.
6. **Performance:** Add indexes or caching where needed (Pantone lookups, search). Evaluate `compression`/`helmet` usage to ensure compatibility with dual frontend.
7. **Validation:**
   - `npm run test:backend` (new script) executing Jest suite.
   - `npm run lint` for backend.
   - Integration smoke via Playwright hitting `/api` endpoints.

### Phase 5 — Parallel Operation & Cutover (Week 8)
1. **Serve new build alongside legacy:**
   - Express serves `frontend-vue3/dist` at root (`/`) and legacy app under `/legacy` or separate port.
   - Confirm `.gitignore` + `.dockerignore` exclude `frontend-vue3/dist`, `legacy/` snapshots, Playwright artifacts.
2. **Data validation:** Cross-check data rendering between apps (counts, pagination). Add automated snapshot comparison if feasible.
3. **User acceptance testing:** Provide stakeholders with instructions to validate functionality in new UI while referencing legacy app on port `9099` (or `/legacy`).
4. **Monitoring:** Add health endpoints, integrate lint/test pipelines into CI, configure Docker multi-stage build (build frontend -> copy into backend image).
5. **Validation:**
   - `npm run build` (Vite + backend packaging).
   - `npm run test` (aggregate of unit + backend + e2e).
   - `docker compose up` to verify both frontends accessible on configured ports (e.g., `3000` for Vite dev, `9099` for backend serving legacy/new build as needed).

### Phase 6 — Cleanup & Documentation (Week 9)
1. **Remove deprecated code paths:** Delete unused helpers, duplicate color conversion modules, and stray debug utilities from the new codebase (legacy archive retains originals for reference).
2. **Finalize comments:** Rewrite module-level documentation with clear responsibilities, example usage, and troubleshooting tips. Ensure no stale debug notes remain.
3. **Knowledge base:** Update `docs/` with:
   - `MIGRATION_STATUS.md` (feature parity tracker).
   - `TEST_STRATEGY.md` (unit/integration/e2e coverage expectations).
   - `ARCHITECTURE_DECISIONS/` ADRs for major choices (Pinia, Axios, lazy Pantone loading).
4. **Release checklist:** Expand `DEPLOYMENT_CHECKLIST.md` with Vue 3 build steps, test commands, rollback plan.
5. **Validation:**
   - `npm run lint` (should be clean).
   - `npm run test` (full suite green).
   - Manual smoke tests following checklist.

---

## 4. Risk Mitigation & Best Practices
- **Incremental commits:** Refactor feature by feature with preserved functionality and tests guarding behavior.
- **Feature flags:** Use backend config (`/api/config`) to toggle new UI portions gradually.
- **Performance budget:** Enforce bundle size checks via `vite-bundle-visualizer`; lazy-load Pantone data and heavy dialogs.
- **Accessibility:** Align components with WCAG 2.1 AA; add automated axe testing in Playwright.

---

## 5. Execution Log (v1.2.0 Kickoff)
- **2025-02-14 — Phase 0 wrap-up:** Archived legacy Vue 2 bundle under `legacy/frontend-vue2/`, updated Express static hosting to serve `/legacy`, and documented access patterns in `docs/LEGACY_FRONTEND.md`.
- **2025-02-14 — Phase 1 scaffolding:** Bootstrapped `frontend-vue3/` Vite workspace with Vue Router, Pinia store skeleton, Element Plus auto-imports, SCSS design tokens, and a migration progress dashboard.
- **Validation:**
  - `npm run start` (backend smoke, legacy UI available at `/legacy`).
  - `npm run test:unit` / `npm run lint` attempted; blocked because the container cannot download npm packages (403). Re-run once registry access is restored.
- **Code standards:** Adopt ESLint + Prettier + Stylelint with shared config across frontend/backend. Use commit hooks (`lint-staged`, `husky`) after CI stabilizes.
- **Documentation-first:** Keep refactoring notes alongside code (e.g., README updates, inline comments explaining complex formulas or data flows).

---

## 5. Deliverables Checklist
- [ ] Legacy frontend archived under `legacy/frontend-vue2/` with documentation.
- [ ] Vue 3 + Vite application scaffolded with routing, Pinia, and Element Plus integration.
- [ ] Modularized feature components and composables for each major domain (colors, artworks, dictionary, materials).
- [ ] Unified utility modules (color conversion, helpers, validators) with tests.
- [ ] Backend layered architecture with controllers, services, repositories, and validation middleware.
- [ ] Comprehensive automated test suites (Vitest, Jest/Supertest, Playwright) integrated into CI.
- [ ] Updated Docker and deployment scripts supporting dual-run and final cutover.
- [ ] Clean, descriptive comments and updated documentation supporting future maintenance.

---

## 6. Next Steps
1. Review and approve this plan with stakeholders.
2. Schedule kickoff for Phase 0 tasks; ensure resource allocation for parallel frontend/backend workstreams.
3. Set up tracking (Kanban board) with deliverables per phase, linking to automated test coverage goals.

Once Phase 0 is complete, the team can proceed confidently knowing the legacy system remains accessible while the Vue 3 rewrite advances with guardrails around quality, testing, and documentation.
