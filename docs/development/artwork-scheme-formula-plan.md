# Artwork Scheme Formula-Matching Redesign Plan

_Last updated: 2025-10-08_

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
  - Align implementation with the new Vue 3 migration (see `docs/development/vue3-migration-strategy.md`).

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
  - Encoding corruption throughout legacy scripts—another motivator for the Vue 3 rebuild.

## 3. Proposed Architecture
### 3.1 Module Decomposition (Vue 3)
1. **`src/stores/artworks.ts`** (Pinia): holds artworks, schemes, formula match cache.
2. **`src/features/artworks/useSchemeDialog.ts`**: encapsulates dialog state, maps directly from legacy `scheme-dialog.js`.
3. **`src/features/formula/FormulaMatcher.ts`** and **`IngredientSuggester.ts`**: reusable across features.
4. **`src/components/artworks/SchemeDialog.vue`**: Vue SFC using the composable + Element Plus dialog.
5. **`src/components/formula/FormulaInput.vue`**: chip-based ingredient entry.
6. **`src/components/artworks/SchemeTableByLayer.vue` / `SchemeTableByColor.vue`**: display logic consuming Pinia store + composables.

### 3.2 Data Flow Enhancements
- In Vue 3, use reactive store watchers to rebuild hash maps whenever `customColors` change.
- Dialog emits `formulaChanged` events so stores trigger candidate lookups.
- Manual formulas stored per layer (Pinia state) and persisted via backend API (`scheme_layers.manual_formula`).

### 3.3 UI/UX Redesign Highlights
*(Same as previously planned; now framed for Vue 3 components.)*

## 4. Implementation Roadmap (Aligned with Vue 3 Migration)
1. **Phase A – Foundation** *(Status: Done)*
   - Port `FormulaMatcher` & `IngredientSuggester` into new `src/features/formula/` modules.
   - Add unit tests ensuring hash consistency and suggestion coverage.

2. **Phase B – Artworks Module Refactor** *(Done – Vue 3 port)*
   - `useArtworkStore` Pinia 模块已接通 CRUD / 历史记录 API。
   - 新增 `useSchemeDialog` 组合式函数与 `SchemeDialog.vue` 骨架，可在 Vue 3 中编辑并保存手写配方。
   - 数据层新增 `scheme_layers.manual_formula` 列，并为对话状态与保存流程补充 Vitest 覆盖。

3. **Phase C – Formula Input Component** *(Done)*
   - `FormulaInput.vue` delivers chip化展示、textarea 编辑与建议面板（基于自配色 + 原料索引）。
   - 组件在输入时输出标准化 tokens/hash/segment/unit，SchemeDialog 现可感知手写配方结构。
   - 新增单元测试覆盖基本输入与建议交互，确保后续复用稳定。

4. **Phase D – Candidate Selection Flow** *(Pending)*
   - Integrate store-driven candidate list; support auto-select or manual leave-blank.
   - Ensure grey swatch + disabled calculator when formula only.

5. **Phase E – Table & UX Polish** *(Pending)*
   - Update by-layer / by-color tables to use new composables.
   - Add highlight badges for duplicate layers and formula mismatch.

6. **Phase F – Backend API Updates** *(Pending)*
   - 视需要新增公式哈希查询 / 手写配方审计接口。
   - 巩固 optimistic locking 与历史记录，以支持公式输入组件落地。

7. **Phase G – QA & Documentation** *(Pending)*
   - Update docs, Playwright tests verifying formula input / scheme dialog flows.
   - Ensure Chinese localisation reads correctly.

## 5. Updated Risks & Mitigations
*(Same as before, but note that the Vue 3 migration addresses many of these by design.)*

## 6. Immediate Next Steps (Post-migration kick-off)
1. Phase D：落地候选自配色列表与留白逻辑，确保与手写配方共存。
2. Phase E：刷新分层/按色展示表格，加入重复/配方异常标记。
3. Phase F：根据需要扩展后端 API（公式哈希查询、手写配方校验）并补充 Playwright 回归用例。

## 7. Status Snapshot (2025-10-06)
- Phase A - [Done].
- Phase B - [Done] (SchemeDialog scaffolding + manual formula persistence landed in Vue 3 app).
- Phase C - [Pending].
- Phase D - [Pending].
- Phase E - [Pending].
- Phase F - [Pending].
- Phase G - [Pending].

---

_Authored by: Codex Agent_
