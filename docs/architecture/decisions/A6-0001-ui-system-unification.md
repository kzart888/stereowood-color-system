# A6-0001: UI System Unification Baseline

Date: 2026-02-08
Status: Accepted
Batch: A6

## Context
Batch A6 targets a consistent UI baseline across legacy tabs while keeping `frontend/legacy` as production runtime. Before this batch:
1. Multiple CSS variables were referenced but not defined, causing style drift and fragile overrides.
2. Notification behavior was inconsistent (`ElementPlus.ElMessage` calls were scattered).
3. Mont-Marte tab still contained garbled runtime copy and mixed Chinese/English operator messages.

## Decision
1. Expand and standardize design tokens in `frontend/legacy/css/base/variables.css`:
   - typography (`--sw-font-*`, `--sw-line-height-*`)
   - color/state aliases required by existing components (`--sw-bg-*`, `--sw-border-*`, `--sw-text-tertiary`, `--sw-*-light`, `--sw-primary-rgb`, `--sw-primary-dark`)
   - interaction shadow token (`--sw-shadow-hover`)
2. Add shared UI primitive stylesheet `frontend/legacy/css/components/primitives.css` and import it in `frontend/legacy/css/index.css`.
3. Upgrade notification primitive in `frontend/legacy/js/utils/message.js`:
   - unified default options (`duration`, `showClose`, `grouping`, `offset`)
   - consistent wrapper API (`msg.success/error/warning/info`)
4. Restore and normalize Mont-Marte operator-facing copy in `frontend/legacy/js/modules/mont-marte/component-options.js`:
   - remove mojibake text
   - align success/failure/confirm messages to readable Chinese
   - keep existing behavior and API contract unchanged

## Alternatives Considered
1. Delay UI unification until full frontend framework migration.
   - Rejected: current legacy runtime still active in production; drift would continue.
2. Hard-rewrite all component CSS in A6.
   - Rejected: too risky for one batch and unnecessary for baseline token/primitives alignment.
3. Keep inline `ElMessage` calls in each module.
   - Rejected: duplicates behavior and increases copy inconsistency.

## Consequences
- Positive:
  - Existing tabs now resolve all `--sw-*` references from a single token source.
  - Shared primitives for dialog/list/form/notification are explicit and reusable.
  - Mont-Marte runtime copy no longer shows garbled Chinese in active flows.
  - Notification UX behavior is consistent across features.
- Tradeoff:
  - Some legacy CSS still uses feature-specific selectors and will need deeper consolidation in A7/A8.
  - Backend historical mojibake in non-A6 scope (for example old service comments/messages) remains technical debt.

## Rollback Strategy
1. Revert A6 CSS token/primitives changes and restore prior `index.css` import order.
2. Revert `frontend/legacy/js/utils/message.js` to thin passthrough wrapper.
3. Revert Mont-Marte copy changes if operator wording needs to match prior language.
4. Re-run `npm run phase0:verify` after rollback.

## Validation Evidence
- `npm run audit:encoding` -> PASS
- `npm run phase0:verify` -> PASS
- Playwright interaction smoke on `http://127.0.0.1:9099`:
  - main tabs switch successfully (`custom-colors`, `color-dictionary`, `artworks`, `mont-marte`)
  - color-dictionary sub-tab `智能匹配` click path works
  - browser console errors: none
- Gate report: `docs/architecture/PHASE_A6_REVIEW_GATE.md`
