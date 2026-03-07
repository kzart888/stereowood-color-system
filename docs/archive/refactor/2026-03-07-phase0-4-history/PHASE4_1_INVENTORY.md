# Phase 4.1 Inventory: Legacy Frontend Seam Map

Date: 2026-02-07  
Scope: `frontend/legacy/js/components/custom-colors.js`, `frontend/legacy/js/components/artworks.js`, `frontend/legacy/js/components/mont-marte.js`

## Runtime Guardrails
- Keep `frontend/legacy/index.html` script order unchanged during Phase 4 extraction.
- Keep endpoint paths and payload compatibility with current backend contracts.
- Keep `window.*` compatibility facades until each extracted module is proven in smoke checks.
- Keep production behavior centered on legacy UI (`/`).

## Component Size Snapshot
- `frontend/legacy/js/components/custom-colors.js`: 2211 lines, heavy mixed concerns.
- `frontend/legacy/js/components/artworks.js`: 1695 lines, partially modularized but still monolithic orchestration.
- `frontend/legacy/js/components/mont-marte.js`: 981 lines, mixed CRUD + dictionary + usage analysis.

## Seam Map

### Custom Colors
- Component state + pagination + selection are mixed with business behavior.
  - refs: `frontend/legacy/js/components/custom-colors.js:463`, `frontend/legacy/js/components/custom-colors.js:821`, `frontend/legacy/js/components/custom-colors.js:891`
- Dialog/form lifecycle is mixed with API payload building and conflict handling.
  - refs: `frontend/legacy/js/components/custom-colors.js:1410`, `frontend/legacy/js/components/custom-colors.js:1490`, `frontend/legacy/js/components/custom-colors.js:1635`, `frontend/legacy/js/components/custom-colors.js:1819`
- Swatch resolution, pure-color derivation, pantone matching, and image extraction are mixed in one file.
  - refs: `frontend/legacy/js/components/custom-colors.js:995`, `frontend/legacy/js/components/custom-colors.js:1166`, `frontend/legacy/js/components/custom-colors.js:1226`, `frontend/legacy/js/components/custom-colors.js:1330`, `frontend/legacy/js/components/custom-colors.js:1353`
- Duplicate detection and force-merge workflow is tightly coupled to UI state.
  - refs: `frontend/legacy/js/components/custom-colors.js:1855`, `frontend/legacy/js/components/custom-colors.js:1903`, `frontend/legacy/js/components/custom-colors.js:1946`

### Artworks
- Component already consumes partial modules (`ArtworksStore`, `ArtworkSchemeUtils`, `ArtworkSchemeDialog`) but still contains fallback duplicates and orchestration overload.
  - refs: `frontend/legacy/js/components/artworks.js:611`, `frontend/legacy/js/components/artworks.js:911`, `frontend/legacy/js/components/artworks.js:1153`
- API save/delete flows are split between `window.api` and direct `axios` calls.
  - refs: `frontend/legacy/js/components/artworks.js:1105`, `frontend/legacy/js/components/artworks.js:1445`, `frontend/legacy/js/components/artworks.js:1496`, `frontend/legacy/js/components/artworks.js:1525`
- Dialog dirty-check/ESC logic is duplicated across artwork and scheme dialogs.
  - refs: `frontend/legacy/js/components/artworks.js:1093`, `frontend/legacy/js/components/artworks.js:1229`, `frontend/legacy/js/components/artworks.js:1241`
- Pagination/config/localStorage logic duplicates patterns used in other components.
  - refs: `frontend/legacy/js/components/artworks.js:1556`, `frontend/legacy/js/components/artworks.js:1587`, `frontend/legacy/js/components/artworks.js:1606`

### Mont-Marte
- CRUD flow, dictionary upsert/delete, and form lifecycle are mixed in one component.
  - refs: `frontend/legacy/js/components/mont-marte.js:664`, `frontend/legacy/js/components/mont-marte.js:744`, `frontend/legacy/js/components/mont-marte.js:842`, `frontend/legacy/js/components/mont-marte.js:894`
- Category loading, raw usage parsing, and navigation side-effects are mixed with UI.
  - refs: `frontend/legacy/js/components/mont-marte.js:589`, `frontend/legacy/js/components/mont-marte.js:615`, `frontend/legacy/js/components/mont-marte.js:650`
- Pagination + card-selection/event handling duplicates custom-colors logic.
  - refs: `frontend/legacy/js/components/mont-marte.js:471`, `frontend/legacy/js/components/mont-marte.js:541`, `frontend/legacy/js/components/mont-marte.js:557`

## Cross-Component Duplicate Patterns
- Pagination persistence and config override:
  - `goToPage`, `onItemsPerPageChange`, `restorePaginationState`, `updatePaginationFromConfig`
  - refs: `frontend/legacy/js/components/custom-colors.js:821`, `frontend/legacy/js/components/artworks.js:1556`, `frontend/legacy/js/components/mont-marte.js:471`
- Card-selection + global click/ESC clearing:
  - refs: `frontend/legacy/js/components/custom-colors.js:891`, `frontend/legacy/js/components/mont-marte.js:541`
- Dialog dirty-check + ESC close guard:
  - refs: `frontend/legacy/js/components/custom-colors.js:1635`, `frontend/legacy/js/components/artworks.js:1093`, `frontend/legacy/js/components/mont-marte.js:711`
- Mixed service access style (`window.api`, `api`, `axios`, `fetch`) increases behavior drift risk.

## Extraction Candidates and Classification

| Area | Target | Classification | Why |
|---|---|---|---|
| Shared pagination + selection behaviors | `frontend/legacy/js/modules/ui/list-state.js` | migrate-now | Clear duplication across all 3 components, low domain risk. |
| Shared dialog guard (`snapshot`, `isDirty`, ESC binding) | `frontend/legacy/js/modules/ui/dialog-guard.js` | migrate-now | Repeated logic with near-identical semantics. |
| Custom-colors swatch + pure-color + pantone orchestration | `frontend/legacy/js/modules/custom-colors/color-presentation.js` | migrate-now | High complexity, mostly pure/isolatable logic. |
| Custom-colors duplicate merge workflow | `frontend/legacy/js/modules/custom-colors/duplicate-merge.js` | wrap | Needs UI state coordination, extract with compatibility wrapper first. |
| Artworks API orchestration | `frontend/legacy/js/modules/artworks/artworks-api.js` | migrate-now | Removes `window.api` + `axios` dual path drift. |
| Artworks formula line fallback (`parseFormulaLines`) | `frontend/legacy/js/modules/artworks/formula-view.js` | defer | Existing `formulaUtils` path works; low immediate risk/benefit ratio. |
| Mont-marte dictionaries operations | `frontend/legacy/js/modules/mont-marte/dictionaries.js` | migrate-now | Isolated supplier/purchase behaviors, now backed by stable backend service layer. |
| Mont-marte raw usage parser | `frontend/legacy/js/modules/mont-marte/raw-usage.js` | wrap | Sensitive for UX search/navigation expectations. |
| Print-window HTML builders | per-component `print-*` module | defer | Useful cleanup but not on critical stability path. |

## Proposed Execution Order for Phase 4
1. Batch 4.2: start with shared `ui/list-state` + `ui/dialog-guard`, then custom-colors extraction.
2. Batch 4.3: artworks API consolidation and fallback removal against existing `modules/artworks/*`.
3. Batch 4.4: mont-marte dictionary/raw-usage module extraction.
4. Batch 4.5: UTF-8/mojibake restoration on active runtime files and key docs.
5. Batch 4.6: full frontend gate and regression evidence.

## Rollback Notes
- Keep original component methods behind wrappers for one batch when moving each seam.
- Introduce module calls in component first, remove fallback code only after smoke checks pass.
- If regression appears, rollback by restoring previous component method body and keep new module file for next iteration.
- Do not change `frontend/legacy/index.html` script order until each extracted module has stable global registration.

## Batch 4.1 Exit Decision
- Seam map completed for all required components.
- Extraction candidates classified (`migrate-now`, `wrap`, `defer`) with rationale.
- Ready to start Batch 4.2 implementation.
