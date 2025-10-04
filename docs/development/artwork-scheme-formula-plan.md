# Artwork Scheme Formula-Matching Redesign Plan

_Last updated: 2025-10-03_

## 1. Background & Goals
- **Primary pain point**: assigning custom color codes to artwork layers requires memorising codes even when the formula (e.g. `朱红 1g 钛白 1g`) is known. The current dialog shows formula as read-only chips once a code is selected, offering no reverse lookup.
- **User goals**:
  1. Enter a formula (Chinese name or pinyin + optional amount/unit) and have the system surface matching custom colors automatically.
  2. Allow leaving a layer without an assigned custom color while still retaining the typed formula for documentation.
  3. Provide fast, intuitive ingredient entry with suggestions and reusable across other modules in future.
  4. Keep the overall workflow compact and easy to scan even with artworks containing many layers.
- **Engineering goals**:
  - Modularise the oversized `artworks.js` (currently ≥1000 LOC) to isolate dialog logic, shared utilities, and view rendering.
  - Establish reusable services for formula parsing, hashing, and lookup to support future extensions (e.g. ingredient editors).
  - Ensure backwards compatibility with existing data (legacy formulas, duplicate colors).

## 2. Current-State Analysis
- **Data model**:
  - Artwork schemes (`artworks.js`) store `mappings` array with `{ layer, colorCode }`. Formula only visible indirectly via selected custom color.
  - Custom colors carry `formula` string; duplicate detection uses `formulaUtils` (`structured`, `segments`) and the global `FormulaParser` (`parse`, `hash`).
  - No existing API to query custom colors by formula hash; duplicate dialog builds indexes client-side.
- **UI flow**:
  - Dialog uses `<el-select>` listing codes. Formula displayed as static chips around line 460.
  - When no color is chosen the table cell shows `-`, and swatch fallback is blank but still clickable; calculator button remains visible though it has nothing to operate on.
- **Helper utilities**:
  - `formulaUtils` built for display. `FormulaParser.parse()` already normalises tokens to `{ name, base, unit }` and generates hash via `FormulaParser.hash()` (used in duplicate detector).
  - No shared ingredient autocomplete component; ingredient vocabulary implicitly exists in mont marte materials list and existing formulas.
- **Technical debt**:
  - `artworks.js` lumps state, computed, watchers, methods (UI + business logic mixed).
  - No dedicated store/service for artwork-specific lookups (custom color map, formula index).

## 3. Proposed Architecture
### 3.1 Module Decomposition
1. **`frontend/js/modules/artworks/` (new directory)**
   - `artworks-store.js`: reactive state + derived maps (color map, formula index).
   - `artworks-services.js`: async operations (load/save artwork, scheme CRUD, pure-color support reuse) and helper APIs (formula search).
   - `artworks-dialog.vue.js` (or `.js` component chunk): handles Add/Edit scheme dialog UI, uses composition functions for formula entry.
   - `artworks-table.js`: presentational logic for scheme table (by layer/by color views).
   - Core `artworks.js` becomes orchestrator: imports store, registers components, handles view switching.

2. **Formula support modules**
   - `modules/formula-matcher.js`: wraps `FormulaParser` to produce canonical hash, caches mapping `hash -> [customColorIds]`, exposes search API to dialogs.
   - `components/shared/formula-input.js`: new reusable ingredient input with chips, autocomplete list.
   - `modules/ingredient-suggester.js`: builds suggestion index (from mont marte materials, existing formulas, optional user-defined), supports Chinese+Pinyin lookup.

3. **Backend extension** (optional but recommended for scalability)
   - `GET /api/custom-colors?formula_hash=...` to return matches directly. Initially can stay client-side using `globalData.customColors` cache; keep open for future when dataset grows.

### 3.2 Data Flow Enhancements
- On dialog init, load scheme mappings into new structure `{ layer, colorCode, formulaTokens, formulaHash, manualFormula }`.
- Whenever user edits formula chips:
  1. Normalise tokens via `FormulaParser.parse()` (ensures consistent hash even with spacing/pinyin variations once mapped to chosen ingredient).
  2. Generate hash and query `FormulaMatcher.findByHash(hash)` for candidate custom colors.
  3. Present candidates in dropdown tied to color code input (auto-select if exactly one match & user opts-in).
- When user selects a candidate color:
  - Display its formula chips (read-only) but keep manual input accessible for overrides.
- When user clears color selection:
  - Keep manual formula chips (used for documentation) and mark mapping as formula-only so table renders grey swatch + disabled calculator.

### 3.3 UI/UX Redesign Highlights
- **Ingredient input bar**
  - Single line control with chip composer: user types ingredient; suggestion dropdown supports fuzzy match on Chinese & pinyin (using combined index, accent-insensitive).
  - After selecting ingredient, prompt for amount/unit optionally in-line (`15 g`). If left blank, stored as ingredient-only chip.
  - Chips show `名称 | 数量单位` with close icon for quick remove.
- **Candidate list**
  - Display inline under color-code select; each candidate shows swatch, color code, match confidence (exact formula vs partial), and quick “Select” button.
  - Provide “no selection” option to keep formula-only record.
- **Layer table**
  - Swatch column: grey placeholder `无` when no color code; calculator button hidden/disabled. Tooltip indicates “无自配色，保留人工配方”。
  - Formula column: if formula-only, render chips from manual entry; if color selected, show color’s stored formula (ensuring clarity if user deviates).
- **Validation**
  - Duplicate layer detection stays (badge). New warnings: formula entered but no candidate match -> highlight in amber with tooltip.
  - Provide quick action “Create custom color from this formula” (future backlog) if no match.

### 3.4 Cross-Module Reuse Preparation
- Ingredient suggester exposed globally to support planned adoption in custom color editor and raw material forms.
- Formula matcher module to provide hashing utilities to duplicate detection and future analytics (dedupe, search).
- Ensure modules operate on Unicode safely; all strings treated as UTF-8; pinyin index stored lowercase ASCII for search.

## 4. Implementation Roadmap
1. **Phase A – Foundation**
   - Extract `FormulaMatcher` module with hashing, map-building from `globalData.customColors`.
   - Build `IngredientSuggester` that merges:
     - Mont Marte color names (`globalData.montMarteColors`),
     - Existing custom color formula tokens (dedupe + frequency ranking),
     - Optional manual seed list.
   - Unit test (browser-level) for hash equivalence and suggestion lookups (via `node --check` + manual cases).

2. **Phase B – Artworks Refactor**
   - Create `artworks-store.js` to hold state and derived maps; migrate watchers & computed from monolith.
   - Split dialog UI to separate component file that imports store/services.
   - Ensure regression coverage: open existing schemes, edit, save, delete.

3. **Phase C – Formula Input Component**
   - Implement chip-based input component using Element-Plus popper or custom dropdown; supports keyboard navigation and IME-friendly editing.
   - Add suggestion provider hooks (filter by pinyin via transliteration utility, fallback to substring).
   - Expose events: `update:modelValue`, `hash-change`, `candidates-change`.

4. **Phase D – Candidate Selection Flow**
   - Integrate component into dialog mappings table row.
   - Display candidate list with select + ability to keep blank.
   - Sync manual formula to scheme mapping (persist to backend as part of `schemeForm`). Requires backend change to store manual formula? (Assess existing schema; if none, we’ll extend `artwork_scheme_layers` table with `manual_formula` column.)

5. **Phase E – Table & UX polish**
   - Update scheme table renderers: grey swatch, disabled calc button, manual formula chips.
   - Add inline status icons (match exact, multiple options, no match).
   - Provide keyboard shortcuts for fast entry (e.g. `Enter` adds chip, `Ctrl+Space` opens suggestions).

6. **Phase F – Backend API Updates (if required)**
   - Add optional `manual_formula` persistence.
   - Add endpoints for formula hash lookup (if client caching insufficient).
   - Migrate existing data where necessary (set manual formula empty).

7. **Phase G – QA & Documentation**
   - Update docs: new workflow instructions, component usage.
   - Add Playwright scenarios: create scheme with manual formula only, verify grey swatch; confirm candidate auto-selection.
   - Regression on custom color + dictionary features (ensuring helper modules didn’t break them).

## 5. Open Questions & Risks
- **Data storage**: Do we store manual formulas per layer in backend? (Recommended to avoid losing info when reloading.)
- **Performance**: Formula matcher on large datasets – need memoised hash map and possibly background rebuild when custom colors reload; consider Web Worker if UI lags.
- **Ingredient normalisation**: Need strategy for mapping pinyin to Chinese (e.g. `zhuhong` → `朱红`). Possibly leverage existing dataset or add transliteration table.
- **Duplicate formulas**: When multiple custom colors share formula, provide deterministic ordering (e.g. prefer latest updated or explicit priority field).
- **User overrides**: If user modifies manual formula after selecting a custom color, should color auto-clear or stay linked? Proposed behaviour: prompt to clear or keep (document in UX spec).

## 6. Future Enhancements (Backlog)
- Allow saving “formula templates” per artwork to reuse across schemes.
- Provide quick action to create a new custom color from manual formula if no matches.
- Analytics on formula usage frequency to surface most common ingredients in suggestions.
- Backend cron to flag duplicate formulas for consolidation.

## 7. Immediate Next Steps (post-approval)
1. Confirm backend support for storing manual formula entries (migration plan).
2. Kick off Phase A implementation with dedicated formula matcher + ingredient suggester.
3. Schedule refactor of `artworks.js` once supporting modules ready (ensure incremental PRs).

---

_Authored by: Codex Agent_
