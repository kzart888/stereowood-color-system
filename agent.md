# Agent Notes

- 2025-10-03: Artwork scheme formula-matching redesign plan drafted. See `docs/development/artwork-scheme-formula-plan.md` for phase details before modifying artwork-related flows.
- 2025-10-04: Vue 3 migration kicked off. Legacy frontend archived under `frontend/legacy/`; new Vite + Vue 3 app scaffolded at `frontend/apps/stereowood-admin/`.
- Current frontend progress:
  - Tooling: ESLint flat config, Prettier, Vitest, Playwright scripts, `.editorconfig`, baseline global styles.
  - Utilities: pure-colour computation (`src/features/pure-color/*`), Pantone datasets (basic + full) in `src/data`, swatch helpers, axios HTTP client (`src/services/http.ts`), Pantone data/matcher composables (`usePantone`, `usePureColor`).
  - Docs: `docs/development/vue3-migration-strategy.md` updated with status table and next actions; keep it in sync with `docs/development/artwork-scheme-formula-plan.md`.
- Near-term priorities:
  1. Finish Phase 0 by authoring `docs/development/backend-api.md` summarising Express endpoints/payloads.
  2. Phase 2: port remaining legacy utilities (helpers, validators, formula parser/utils, debounce/throttle, thumb preview) into typed modules.
  3. Phase 3: design typed API clients + Pinia stores (custom colours, artworks, materials, dictionary), then migrate feature views.

Refer to the migration strategy doc for the complete roadmap and cross-links to future tasks.
