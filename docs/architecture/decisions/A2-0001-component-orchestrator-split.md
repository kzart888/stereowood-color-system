# A2-0001: Component Orchestrator Split for Legacy Hotspots

Date: 2026-02-08  
Batch: A2

## Context
- Three legacy runtime components remained too large for safe maintenance:
  - `frontend/legacy/js/components/custom-colors.js`
  - `frontend/legacy/js/components/artworks.js`
  - `frontend/legacy/js/components/mont-marte.js`
- A2 requires splitting hotspots into orchestrator files and extracted modules while preserving runtime behavior.

## Decision
1. Keep each feature component file as orchestration shell (`props/template/inject/data` + module spread).
2. Move heavy lifecycle and behavior blocks into feature modules:
  - `frontend/legacy/js/modules/custom-colors/component-options.js`
  - `frontend/legacy/js/modules/artworks/component-options.js`
  - `frontend/legacy/js/modules/mont-marte/component-options.js`
3. Load `component-options.js` files before component files in `frontend/legacy/index.html`.
4. Preserve existing global component contracts (`window.CustomColorsComponent`, `window.ArtworksComponent`, `window.MontMarteComponent`).
5. Remove duplicated direct fallback branches in artworks scheme save flow, keeping one canonical API module path.

## Alternatives Considered
1. Full rewrite of each component into new framework modules in A2.
   - Rejected: too risky and too large for this batch.
2. Keep monolith files and only add comments.
   - Rejected: no meaningful maintainability improvement.
3. Split only templates and keep all logic in component files.
   - Rejected: file size/complexity targets would still fail for custom-colors and artworks.

## Consequences
- Positive:
  - Component orchestrator files are now under the A2 size threshold.
  - Behavior logic is extracted into dedicated feature modules and easier to refactor incrementally in A3+.
  - Existing runtime contracts remain unchanged.
- Tradeoff:
  - Uses global module registration (`window.*`) for compatibility, which will need further cleanup in later phases.

## Rollback Strategy
1. Revert component files and remove `component-options.js` references from `frontend/legacy/index.html`.
2. Delete new `component-options.js` files under `frontend/legacy/js/modules/*`.
3. Re-run `npm run phase0:verify` and tab smoke before reattempting with smaller steps.

## Validation Evidence
- `node --check backend/**/*.js`
- `node --check frontend/legacy/js/**/*.js`
- `npm run phaseA:a1:verify`
- Browser smoke: all four tabs render and core add-dialog paths open/close.
