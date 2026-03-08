# U11.2 Review Gate (Scheme Mapping Table Regression Fix)

Date: 2026-03-08  
Scope: legacy artworks scheme dialog mapping-table regression fix on `codex/legacy-ui-related-assets`.

## Review Outcome

- Critical: 0
- High: 0
- Medium: 0 (new)
- Low: 0 (new)

No release-blocking findings were introduced in U11.2 scope.

## Verified Checks

- `npm run phaseU11:ui-smoke` -> PASS
  - layer-number input value visibility (no clipping)
  - layer-input top alignment with color-select input
  - mapping-table second-column width regression threshold
  - U11.1 related-assets download + preview flow unchanged
- `npm run phase0:verify` -> PASS
- `npm run phaseL:auth-v2:verify` -> PASS
- `npm run phaseP6:verify` -> PASS
- `npm run audit:docs-contract` -> PASS
- `npm run gate:full` -> PASS

## Notes

- U11.2 removes the negative-margin alignment strategy for layer-number input.
- Scheme mapping-table header-width hardcoding was removed from template and moved to CSS column policy.
- P6 smoke scripts were aligned to current auth policy:
  - self-register account login expects `must_change_password=false`.
