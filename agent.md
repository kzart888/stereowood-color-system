# Agent Notes

- 2025-10-03: Artwork scheme formula-matching redesign plan drafted. See `docs/development/artwork-scheme-formula-plan.md` for phase details before modifying artwork-related flows.
- 2025-10-04: Vue 3 migration kicked off. Legacy frontend archived under `frontend/legacy/`; new Vite + Vue 3 app scaffolded at `frontend/apps/stereowood-admin/`.
- 2025-10-05: Ported formula parser/hash helpers, general utility suite, validators, debounce/throttle helpers, thumbnail preview overlay, formula matcher indexer, ingredient suggester, custom-colour swatch resolver, duplicate detector, and performance monitor into typed modules with Vitest coverage. On WSL + Node 22 the tests require `npm install --no-save @rollup/rollup-linux-x64-gnu` to satisfy Rollup’s optional native dependency; Node 20 avoids the extra install. `npm run build` now passes (vue-tsc + Vite), and the dev server runs via `npm run dev -- --host`.
- 2025-10-06: Dev proxy added for `/api` + `/uploads`; Pinia stores hardened against malformed payloads; artworks Scheme dialog scaffolded with manual配方写入 (`scheme_layers.manual_formula` migration) and new Vitest coverage; color dictionary wheel/ matcher tabs now gated until feature parity.
- Current frontend progress:
  - Tooling: ESLint flat config, Prettier, Vitest, Playwright scripts, `.editorconfig`, baseline global styles.
  - Utilities & services: pure-colour computation (`src/features/pure-color/*`), Pantone datasets (basic + full) in `src/data`, swatch helpers, axios HTTP client (`src/services/http.ts`), Pantone data/matcher composables (`usePantone`, `usePureColor`), formula helpers (`src/utils/formula.ts`, `src/models/formula.ts`), general helpers (`src/utils/general.ts`), validators (`src/utils/validators.ts`), async helpers (`src/utils/async.ts`), thumbnail preview overlay (`src/utils/thumbPreview.ts`), formula matcher (`src/features/formula/matcher.ts`), ingredient suggester (`src/features/formula/ingredientSuggester.ts`), custom-colour swatch resolver (`src/features/pure-color/customColorSwatch.ts`), duplicate detector (`src/features/formula/duplicateDetector.ts`), performance monitor (`src/utils/performanceMonitor.ts`), message helpers (`src/utils/message.ts`), and API clients/stores for custom colours (`src/services/customColors.ts`, `src/stores/customColors.ts`), artworks (`src/services/artworks.ts`, `src/stores/artworks.ts`), and materials (`src/services/materials.ts`, `src/stores/materials.ts`) with unit coverage in `tests/unit`.
  - Features: `ArtworksView` exposes `SchemeDialog` scaffold + manual配方编辑；color dictionary list + HSL 导航到位，其余视图按钮禁用提示；new Vitest spec exercises dialog change tracking.
  - Docs: `docs/development/vue3-migration-strategy.md` updated with status table, tooling notes, and next actions; `docs/development/backend-api.md` documents Express endpoints. Keep both in sync with `docs/development/artwork-scheme-formula-plan.md`.
- Near-term priorities:
  1. 实装色轮 / 配方匹配视图，视图完成前保持前端标签禁用提示。
  2. Phase C：交付配方输入组件并嵌入 SchemeDialog（含候选与校验）。
  3. 补充手写配方流程的 Vitest + Playwright 验证，完善部署文档中的 `manual_formula` 迁移步骤。

Refer to the migration strategy doc for the complete roadmap and cross-links to future tasks.
