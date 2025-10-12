# Vue 3 Migration & Rebuild Strategy

_Last updated: 2025-10-05_

## 1. Why We Are Migrating

- **Legacy architecture**: the current frontend is a single `index.html` that wires Vue components through global `<script>` tags. Business logic, state, and templates are intermingled, creating tight coupling and making regression fixes expensive.
- **Encoding corruption**: every historical revision we inspected (including `7d0225886d26d6e889c038f65d8a509c9df8143b`) stores Chinese copy in the wrong encoding. Reusing the existing files means continuing to fight mojibake.
- **Maintainability gaps**: no module bundler, no linting, duplicated helper logic, and ad-hoc global state (`window.*`). The new pure-color modules and the artwork formula roadmap (see `docs/development/artwork-scheme-formula-plan.md`) are already pushing against these limits.

## 2. Strategic Objectives

1. **Rebuild the frontend in a modern, modular stack** (Vue 3 + Vite + TypeScript + Pinia + Vue Router).
2. **Preserve backend API compatibility** so the existing Express/SQLite services continue to function.
3. **Restore and improve Chinese localisation** by reauthoring strings in UTF-8, enabling future i18n support.
4. **Absorb ongoing initiatives** (pure-color workflow, formula matcher, scheme dialog refactor) into the new architecture.
5. **Lay down automated quality checks** (lint/unit tests/Playwright smoke tests) to prevent regressions.

## 3. Target Architecture Overview

```
frontend/
  ├── apps/
  │   └── stereowood-admin/        # Vite-powered Vue 3 SPA (new)
  │       ├── src/
  │       │   ├── main.ts          # app entry
  │       │   ├── router/          # view-level routing
  │       │   ├── stores/          # Pinia stores (artworks, custom colors, auth)
  │       │   ├── components/      # reusable UI building blocks
  │       │   ├── features/        # domain modules (artworks, formulas, dictionary, etc.)
  │       │   ├── composables/     # cross-cutting logic (pure color helpers, swatch utils)
  │       │   ├── services/        # API clients (axios wrapper)
  │       │   └── assets/          # styles, icons, fonts
  │       ├── public/              # static assets, favicon, fonts
  │       ├── tests/               # Vitest + Playwright suites
  │       └── vite.config.ts
  └── legacy/                      # old files retained for reference during migration
backend/
  └── (unchanged Express server)
docs/
  └── development/
      ├── artwork-scheme-formula-plan.md  # Phase plan already authored
      └── vue3-migration-strategy.md      # this document
```

## 4. Foundational Decisions

- **Language & tooling**: TypeScript for Vue components and stores; ESLint + Prettier for consistency. Element Plus remains viable, but we can standardise around its Vue 3 tree-shakeable build via Vite.
- **State management**: Pinia stores for global state (artworks, custom colors, config, formula matcher). Existing `ArtworksStore` logic becomes a Pinia store module.
- **API layer**: migrate `frontend/js/api/api.js` into typed axios services (`src/services/api/*.ts`), enabling request/response typing and centralised error handling.
- **Internationalisation**: start with direct strings but structure components to allow future Vue I18n adoption. All strings authored in UTF-8.
- **Testing**: adopt Vitest for unit tests (utility modules, stores) and reuse Playwright MCP for E2E; add CI scripts.

## 5. Migration Phases & Status

| Phase                           | Status        | Key Work Completed                                                                                                                          | Remaining Scope                                                                                                                             |
| ------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **0. Preparation**              | ◐ In progress | Archived legacy assets into `frontend/legacy/`; created Vue 3 strategy; updated formula plan; established scaffolding repo notes.           | Author `docs/development/backend-api.md`; document additional legacy dependencies (e.g. colour datasets) for reference.                     |
| **1. Scaffold Modern Project**  | ✅ Complete   | Vite + Vue TS app created; toolchain (ESLint flat config, Prettier, Vitest, Playwright) configured; baseline layout/router/stores in place. | None.                                                                                                                                       |
| **2. Migrate Core Utilities**   | ◐ In progress | Ported pure colour utilities, Pantone datasets (basic + full), swatch helpers, axios HTTP client, Pantone composables, formula parser + hash helpers, general utility suite, validators, async debounce/throttle helpers, thumbnail preview overlay, formula matcher indexer, ingredient suggester, custom colour swatch resolver, duplicate detector, performance monitor, and message helpers with Vitest coverage. | Finalise utility usage patterns inside upcoming Pinia stores and feature modules. |
| **3. Domain Stores & Services** | ◐ In progress | Custom colour, artworks, and materials API clients with Pinia stores scaffolded (CRUD, history caching, scheme/material mutations) covered by unit tests; color dictionary view now backed by shared custom-colour data plus a dedicated view state store. | Flesh out dictionary (suppliers/links) APIs & stores; expand color dictionary features (HSL/色轮/配方匹配) and integrate shared error-handling patterns. |
| **4. Feature Views Migration**  | ▢ Not started | —                                                                                                                                           | Rebuild SFCs for custom colours, colour dictionary (list/HSL/wheel/matcher), artworks (scheme dialog), materials. Ensure UX parity.         |
| **5. Workflow Integrations**    | ▢ Not started | —                                                                                                                                           | Reconnect pure colour + Pantone flow, formula matcher, thumbnail handling across new views; honour 色精 exceptions.                         |
| **6. QA & Tooling**             | ▢ Not started | —                                                                                                                                           | Add Vitest coverage, Playwright smoke suites, lint scripts in CI; validate UTF-8, accessibility, performance budgets.                       |
| **7. Cut-over & Clean-up**      | ▢ Not started | —                                                                                                                                           | Wire Express to serve Vite build; remove unused legacy code after sign-off; update deployment docs.                                         |

### Testing & Tooling Notes

- Vitest on WSL/Node 22 requires the optional native Rollup binary (`npm install --no-save @rollup/rollup-linux-x64-gnu`); without it, the test runner stalls at startup while waiting for Rollup to load. Alternatively, run the suite on Node 20 where the prebuilt binary is bundled.
- `npm run build` now completes (vue-tsc + Vite). For local UI tests start the dev server with `npm run dev -- --host`, which serves the Vue 3 SPA at `http://localhost:5173`.

## 6. Utility & Module Mapping

_(unchanged from earlier draft; keep as reference while porting)_

| Legacy Module                            | Vue 3 Destination                                    | Notes                                            |
| ---------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| `frontend/index.html`                    | `apps/stereowood-admin/index.html` + Vite dev server | Replace static script tags with bundler output   |
| `js/utils/helpers.js`                    | `src/utils/general.ts`, `src/utils/async.ts`         | General helpers + debounce/throttle utilities    |
| `js/utils/formula-parser.js`             | `src/features/formula/parser.ts`                     | Align with formula plan (Phase A)                |
| `js/modules/formula-matcher.js`          | `src/features/formula/matcher.ts`                    | Formula hash index + matching helpers            |
| `js/modules/ingredient-suggester.js`     | `src/features/formula/ingredientSuggester.ts`        | Ingredient search index with transliteration     |
| `js/modules/duplicate-detector.js`       | `src/features/formula/duplicateDetector.ts`          | Ratio-based formula deduplication                |
| `js/utils/pure-color-utils.js`           | `src/features/pure-color/pureColor.ts`               | Provide composable for average color computation |
| `js/utils/performance-monitor.js`        | `src/utils/performanceMonitor.ts`                    | Browser performance sampling + logging           |
| `js/utils/message.js`                    | `src/utils/message.ts`                               | Element Plus message wrappers                    |
| `js/components/app-header-bar.js`        | `src/components/layout/HeaderBar.vue`                | Router-based nav                                 |
| `js/components/custom-colors.js`         | `src/features/custom-colors/` (Pinia store + SFCs)   | Dialog logic as composition functions            |
| `js/components/artworks.js`              | `src/features/artworks/`                             | Use Pinia store and `SchemeDialog` composable    |
| `js/components/color-dictionary/**/*.js` | `src/features/color-dictionary/`                     | Each view as Vue SFC                             |
| `js/components/mont-marte.js`            | `src/features/materials/`                            | Clean up uploader, swatch handling               |
| `js/modules/artworks/artworks-store.js`  | `src/stores/artworks.ts`                             | Central Pinia store                              |
| `js/modules/artworks/scheme-dialog.js`   | `src/features/artworks/useSchemeDialog.ts`           | Composition function for dialog state            |
| `js/modules/artworks/scheme-utils.js`    | `src/features/artworks/schemeUtils.ts`               | Shared utilities                                 |
| `js/api/api.js`                          | `src/services/api/*.ts`                              | Separate typed clients                           |

## 7. Integration with Formula Workflow Plan

`docs/development/artwork-scheme-formula-plan.md` tracks the artwork scheme enhancements. During the migration we will:

- **Phase A (FormulaMatcher & IngredientSuggester)**: re-implement as Pinia/composables before porting scheme dialogs.
- **Phases B–E**: delivered via new Vue components once stores are ready.
- Keep the status snapshot in that plan updated as each migration milestone lands.

## 8. Risks & Mitigations

| Risk                                    | Impact          | Mitigation                                                                  |
| --------------------------------------- | --------------- | --------------------------------------------------------------------------- |
| Scope creep during rewrite              | Delays delivery | Prioritise feature parity; time-box enhancements for post-migration sprints |
| Backend API quirks surface              | UI blockers     | Draft backend API reference (`backend-api.md`); add integration tests       |
| Team unfamiliarity with Vite/Pinia      | Learning curve  | Provide onboarding doc/cheat sheet; leverage Vite defaults                  |
| Pure color image processing performance | UX regressions  | Monitor performance, offload heavy work to workers if needed                |
| Encoding issues reappear                | Broken UI       | Enforce UTF-8 via `.editorconfig`; lint for non-UTF-8 inputs                |

## 9. Immediate Next Actions

1. Draft `docs/development/backend-api.md` capturing current Express endpoints & payloads (Phase 0 remaining work).
2. Phase 2 utilities complete: integrate the new helpers into Pinia stores/composables as they are authored.
3. Begin designing Pinia store contracts for custom colours & artworks (pre-work for Phase 3).
4. Decide testing scaffolding (Vitest config for stores/composables) and document in repo README once stores land.

## 10. Done Definition for Migration

- All primary views (custom colors, dictionary, artworks, materials) live in the new app with functional parity.
- Pure color workflow, scheme dialog, and formula matcher operate in the new components.
- Legacy `frontend/index.html` is retired; Express serves the Vite build.
- Automated tests and linting run clean in CI.
- Documentation (this strategy and the formula plan) reflects the new architecture.

---

_Authored by: Codex Agent_
