# Phase 2.1 Inventory and Contract Freeze

Date: 2026-02-06  
Scope: duplicate-logic inventory for color/formula utilities, canonical API freeze, and migration classification before Phase 2 code changes.

## Runtime Load Contract Snapshot
- `frontend/legacy/index.html:102` loads `js/utils/formula-parser.js`.
- `frontend/legacy/index.html:104` loads `js/utils/formula-utils.js`.
- `frontend/legacy/index.html:113` loads `js/utils/color-converter.js`.
- `frontend/legacy/index.html:117` loads `js/utils/colorConversion.js`.

This means current runtime depends on global-script side effects and ordering.

## Caller Map

### A) `frontend/legacy/js/utils/color-converter.js` (`window.ColorConverter`)
- `frontend/legacy/js/components/custom-colors.js` (15 refs)
  - Uses CMYK conversions, HEX formatting/conversion, RGB validation, Pantone matching.
  - Classification: `wrap` (high-traffic path, keep compatibility surface first).
- `frontend/legacy/js/utils/pure-color-utils.js` (3 refs)
  - Uses image color extraction entrypoint.
  - Classification: `wrap`.
- `frontend/legacy/js/components/color-dictionary/color-dictionary-matcher-view.js` (2 refs + mixed usage with global color functions)
  - Classification: `migrate-now` to canonical conversion entrypoint in Batch 2.2.

### B) `frontend/legacy/js/utils/colorConversion.js` (global functions)
- `frontend/legacy/js/components/color-dictionary/color-dictionary-service.js` (12 refs)
  - Uses `hexToRgb`, `rgbToHex`, `rgbToHsl`, `rgbToLab`.
  - Classification: `migrate-now` (already canonical style).
- `frontend/legacy/js/components/color-dictionary/color-dictionary-matcher-view.js` (15 refs, mixed with `ColorConverter`)
  - Uses `rgbToHsl`, `hslToRgb`, `rgbToLab` plus converter object methods.
  - Classification: `migrate-now` (reduce mixed model).
- `frontend/legacy/js/components/color-dictionary/color-dictionary-wheel-view.js` (2 refs)
  - Uses `hslToRgb`.
  - Classification: `defer` (stable, low-value churn).
- `frontend/legacy/js/utils/colorMapping.js` (2 refs)
  - Uses `hslToRgb`.
  - Classification: `defer` (stable utility dependency).
- `frontend/legacy/js/utils/color-converter.js` (internal duplicate refs)
  - Duplicate `rgbToHex`/`hexToRgb` logic exists here.
  - Classification: `migrate-now` (delegate or remove duplication in Batch 2.2).

### C) `frontend/legacy/js/utils/formula-parser.js` (`window.FormulaParser`)
- `frontend/legacy/js/modules/calc-store.js` (5 refs)
- `frontend/legacy/js/modules/formula-matcher.js` (3 refs)
- `frontend/legacy/js/modules/duplicate-detector.js` (2 refs)
- `frontend/legacy/js/modules/ingredient-suggester.js` (2 refs)
- `frontend/legacy/js/components/formula-calculator.js` (3 refs)
- `frontend/legacy/js/utils/formula-utils.js` (4 refs via wrapper functions)
- Classification:
  - runtime modules above: `defer` (already using canonical parser surface).
  - `formula-utils` wrappers: `migrate-now` (remove duplicated wrapper responsibility in Batch 2.3).

### D) `frontend/legacy/js/utils/formula-utils.js` (`window.formulaUtils`)
- `frontend/legacy/js/components/artworks.js` (9 refs)
  - Uses `structured`.
  - Classification: `defer` (stable view formatting path).
- `frontend/legacy/js/components/custom-colors.js` (3 refs)
  - Uses `segments`.
  - Classification: `defer` (stable display path).
- `frontend/legacy/js/modules/formula-matcher.js` (2 refs)
  - Uses `segments`.
  - Classification: `defer`.

## Canonical API Freeze (Batch 2 Contract)

### Color Domain
- Canonical conversion primitives: `frontend/legacy/js/utils/colorConversion.js`
  - Public functions: `rgbToHsl`, `hslToRgb`, `rgbToLab`, `labToRgb`, `hexToRgb`, `rgbToHex`, `parseColorString`.
- Compatibility facade: `frontend/legacy/js/utils/color-converter.js` (`window.ColorConverter`)
  - Keep as public facade for Phase 2 and Phase 3 compatibility.
  - Retained public methods: `rgbToCmyk`, `cmykToRgb`, `extractColorFromImage`, `extractDominantColors`, `findClosestPantone`, `findClosestPantones`, validation/format helpers.
  - Duplicate primitive conversions (`rgbToHex`, `hexToRgb`) should be delegated to canonical conversion layer while preserving facade behavior.

### Formula Domain
- Canonical parser/hash: `frontend/legacy/js/utils/formula-parser.js`
  - Public methods: `parse`, `hash`, `unitBuckets`.
- Canonical display formatting: `frontend/legacy/js/utils/formula-utils.js`
  - Public methods: `segments`, `structured`.
  - `formulaUtils.parse/hash` are deprecated wrappers and should be removed after migration window.

## Backend Alignment Notes (`backend/services/formula.js`)
- Current backend amount detection (`isAmountToken`) only handles single-token format like `10g`.
- Frontend parser supports:
  - single token amount (`10g`)
  - split token amount (`10 g`)
  - `%` in units.
- Contract decision for Batch 2.3:
  - align backend detection to frontend token rules for rename safety.
  - keep behavior stable for existing persisted formula strings.

## Public vs Private Boundary (Target)
- Public/stable (Phase 2-3):
  - `window.ColorConverter` facade
  - global conversion primitives from `colorConversion.js`
  - `window.FormulaParser`
  - `window.formulaUtils` (`segments`, `structured`)
- Private/deprecated (to remove after wrappers age out):
  - duplicate conversion implementations inside `color-converter.js`
  - `formulaUtils.parse`
  - `formulaUtils.hash`

## Rollback Notes (Required by Batch 2.1)
- Keep compatibility wrappers for at least one phase after migration.
- If any color conversion regression appears, restore wrapper-first behavior and postpone direct caller migration.
- If formula rendering or dedupe behavior diverges, revert to previous parser/wrapper boundary and re-run smoke before continuing.

## Batch 2.2 Ready Actions
1. Implement wrapper delegation in `color-converter.js` for shared primitive conversions.
2. Reduce mixed usage in `color-dictionary-matcher-view.js` to one canonical conversion path.
3. Keep `window.ColorConverter` API stable while removing duplicate internals.
