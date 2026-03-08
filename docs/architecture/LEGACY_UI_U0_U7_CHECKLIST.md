# Legacy UI Deep Optimization Checklist (U0-U7)

Last updated: 2026-03-08
Branch: `codex/legacy-ui-related-assets`

This checklist tracks the legacy-production-safe UI enhancement batch requested for:
- pagination default 24
- category manager interaction cleanup
- artworks "related assets" model + UI
- dialog/layout/button consistency cleanup
- thumbnail clarity improvement with generated sidecar thumbnails

## Locked Decisions
- Keep `frontend/legacy` as production entry.
- Keep runtime contract unchanged (`/`, `/login`, `/app`, `/api`, `/health`, `9099`, `/data/color_management.db`).
- Related documents use lightweight details + open-file flow (no heavy Office parsing).
- Related assets limit per scheme: `6`.
- Keep compatibility field `initial_thumbnail_path` during transition period.

## Batch Progress

| Batch | Goal | Status | Evidence |
|---|---|---|---|
| U0 | Baseline and gate check | Completed | `npm run phase0:verify`, `npm run gate:full` |
| U1 | Pagination default to 24 | Completed | `frontend/legacy/js/utils/config-helper.js` |
| U2 | Category manager drag/alignment polish | Completed | `frontend/legacy/js/components/category-manager.js`, `frontend/legacy/css/components/category-manager.css` |
| U3 | Backend related-assets model + migration + API | Completed | `backend/db/migrations.js`, `backend/db/queries/artworks.js`, `backend/routes/artworks.js`, `backend/services/ArtworkService.js` |
| U4 | Artworks page + scheme dialog related-assets UX | Completed | `frontend/legacy/js/components/artworks.js`, `frontend/legacy/js/modules/artworks/ui/component-scheme-dialog-methods.js` |
| U5 | Dialog/button/layout consistency cleanup | Completed | `frontend/legacy/css/components/artworks.css`, `frontend/legacy/css/components/buttons.css`, `frontend/legacy/css/layout/header.css` |
| U6 | Thumbnail clarity and sidecar generation | Completed | `backend/services/upload-image-service.js`, `backend/routes/*`, `backend/services/*`, `frontend/legacy/js/utils/custom-color-swatch.js` |
| U7 | Docs + full gate evidence | Completed | this file + API doc update + roadmap update + changelog update |

## U3 Data/API Delta

### New table
`color_scheme_assets`:
- `id`
- `scheme_id`
- `asset_type` (`image` / `document`)
- `original_name`
- `file_path`
- `mime_type`
- `file_size`
- `sort_order`
- `created_at`
- `updated_at`

Indexes:
- `(scheme_id, sort_order)`
- unique `(scheme_id, file_path)`

Backfill:
- Existing `color_schemes.initial_thumbnail_path` is backfilled into first `color_scheme_assets` image record (idempotent).

### New APIs
- `GET /api/artworks/:artworkId/schemes/:schemeId/assets`
- `POST /api/artworks/:artworkId/schemes/:schemeId/assets`
- `DELETE /api/artworks/:artworkId/schemes/:schemeId/assets/:assetId`
- `PUT /api/artworks/:artworkId/schemes/:schemeId/assets/reorder`

Compatibility:
- `/api/artworks` scheme payload appends `related_assets`.
- Legacy field `initial_thumbnail_path` remains during transition.

## Verification Snapshot (2026-03-08)

- `npm run phase0:verify` -> PASS
- `npm run gate:full` -> PASS
- `npm run phaseP5:network-scan` -> PASS
- `npm run phaseA:a3:db-dryrun:strict` -> PASS
- `npm run phaseP4:verify` -> PASS
- Additional related-asset API smoke (create/list/delete) on temp DB -> PASS

## Rollback Notes
- Code rollback: revert branch commit range for U0-U7.
- Data rollback:
  - table `color_scheme_assets` is additive and does not remove legacy columns.
  - if required, stop writing related assets in UI and keep legacy thumbnail path only.

## U11/U11.1 Follow-Up (2026-03-08)

Scope:
- U11.1: related-assets download button + backend download endpoint.
- U11: scheme dialog layout refinement + related-asset metadata rows + source file time + in-app document preview + mapping-table alignment/button consistency.

Completed:
- Added `GET /api/artworks/:artworkId/schemes/:schemeId/assets/:assetId/download`.
- Added `GET /api/artworks/:artworkId/schemes/:schemeId/assets/:assetId/preview`.
- Added `source_modified_at` for `color_scheme_assets` and migration backfill from file `mtime`.
- Added upload field `asset_last_modified` (optional).
- Added related-asset metadata rendering (name / source file time / type label).
- Added in-dialog preview for `txt/md/docx/xlsx/xls` (with fallback warning path for unsupported parse cases).
- Reworked scheme name row spacing and mapping-table visual alignment.
- Unified related-asset and mapping action button sizing.

Verification:
- `npm run phaseU11:ui-smoke` -> PASS
- `npm run phase0:verify` -> PASS
- `npm run gate:full` -> PASS
