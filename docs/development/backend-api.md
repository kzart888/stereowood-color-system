# Backend API Overview

_Last updated: 2025-10-05_

This document summarises the current Express/SQLite REST endpoints served from `backend/routes`. All routes are mounted under `/api` (see `backend/routes/index.js`). Authentication is not required yet; every request is trusted.

Common behaviours:

- Successful responses return JSON objects or arrays.
- Errors are reported as `4xx/5xx` with `{ "error": "<message>" }`.
- File uploads use `multipart/form-data` and store files in `backend/uploads/`.

## Custom Colours

Path prefix: `/custom-colors` (`backend/routes/custom-colors.js`). Uses `ColorService` for DB access and handles image uploads.

| Method & Path | Purpose | Notes |
| ------------- | ------- | ----- |
| `GET /custom-colors` | List all custom colours. | Returns array with colour metadata, image paths, formula, etc. |
| `POST /custom-colors` | Create a custom colour. | `multipart/form-data` payload; image field `image`. Body fields include `category_id`, `color_code`, `formula`, `applicable_layers`, colour model components (`rgb_*`, `cmyk_*`, `hex_color`, `pure_rgb_*`, `pure_hex_color`), and Pantone columns (`pantone_coated`, `pantone_uncoated`). Optional values are normalised server-side. |
| `GET /custom-colors/:id/history` | Fetch change history. | Returns array of audit entries (structure determined by `ColorService`). |
| `PUT /custom-colors/:id` | Update an existing colour. | `multipart/form-data`; image field `image`. Include `existingImagePath` if retaining the current image or `null` to clear. Supports partial updates for numeric channels and Pantone codes. Optional `version` enforces optimistic concurrency in `ColorService`. Flag `clear_pure_color` (`"true"/"1"`) clears pure colour metadata. |
| `DELETE /custom-colors/:id` | Remove a colour. | Returns 404 if the colour is missing, 400 if referenced by schemes, otherwise deletion metadata. |

## Colour Categories

Path prefix: `/categories` (`backend/routes/categories.js`). Interacts with the `color_categories` table directly.

| Method & Path | Purpose | Notes |
| ------------- | ------- | ----- |
| `GET /categories` | List categories with colour counts. | Orders by `display_order`, then `id`. |
| `POST /categories` | Create category. | Body `{ code?, name, display_order? }`. Generates a code from the name if omitted. |
| `PUT /categories/reorder` | Batch update display order. | Body is an array of `{ id, display_order }`. Uses a transaction; returns partial failure details if any updates fail. |
| `PUT /categories/:id` | Update category name/code. | Body `{ name, code? }`. Upper-cases `code` if provided. |
| `DELETE /categories/:id` | Delete category. | Rejects removal if custom colours still reference the category. |

## Mont Marte Raw Materials

### Categories

Path prefix: `/mont-marte-categories` (`backend/routes/mont-marte-categories.js`).

Endpoints mirror the colour categories API, but respond with `material_count` instead of `color_count`. Codes default to the first two letters of the name (or `MC`).

### Materials (Colours)

Path prefix: `/mont-marte-colors` (`backend/routes/mont-marte-colors.js`).

| Method & Path | Purpose | Notes |
| ------------- | ------- | ----- |
| `GET /mont-marte-colors` | List raw materials. | Returns supplier, purchase link, and category metadata. |
| `POST /mont-marte-colors` | Create material. | `multipart/form-data`. Body fields: `name`, `category` (legacy string), `category_id` (preferred), `supplier_id`, `purchase_link_id`. Upload image using `image`. |
| `PUT /mont-marte-colors/:id` | Update material. | `multipart/form-data`. Accepts `existingImagePath` to retain image. Cascades name changes into custom colour formulas via `cascadeRenameInFormulas`. |
| `DELETE /mont-marte-colors/:id` | Delete material. | Only allowed if not referenced by other tables. Deletes stored image when present. |

## Dictionaries (Suppliers & Purchase Links)

Path prefix: `/suppliers`, `/purchase-links` (`backend/routes/dictionaries.js`).

| Method & Path | Purpose | Notes |
| ------------- | ------- | ----- |
| `GET /suppliers` | List suppliers. | Sorted alphabetically. |
| `POST /suppliers/upsert` | Ensure supplier exists. | Body `{ name }`. Returns existing record if found (case-insensitive). |
| `DELETE /suppliers/:id` | Delete supplier. | Fails with `409` if referenced by `mont_marte_colors`. |
| `GET /purchase-links` | List purchase links. | Sorted alphabetically. |
| `POST /purchase-links/upsert` | Ensure link exists. | Body `{ url }`. Case-insensitive duplicate check. |

## Artworks & Schemes

Path prefix: `/artworks` (`backend/routes/artworks.js`). Uses `ArtworkService` for business logic and manages scheme thumbnails via `multer`.

| Method & Path | Purpose | Notes |
| ------------- | ------- | ----- |
| `GET /artworks` | List artworks and schemes. | Returns enriched data from `ArtworkService.getAllArtworks()`. |
| `POST /artworks` | Create artwork. | Body `{ code, name }`. Duplicate codes throw a 400 with a descriptive message. |
| `DELETE /artworks/:id` | Remove artwork. | Returns deletion status. |
| `POST /artworks/:artworkId/schemes` | Create scheme. | `multipart/form-data`. Upload fields: `thumbnail`, `initialThumbnail`. Body contains `name` and `layers` (JSON or stringified JSON array). |
| `PUT /artworks/:artworkId/schemes/:schemeId` | Update scheme. | Same upload fields as create. Include `existingThumbnailPath` and/or `existingInitialThumbnailPath` to retain files. |
| `DELETE /artworks/:artworkId/schemes/:schemeId` | Delete scheme. | Removes scheme and associated images. |

## Supporting Behaviour

- **Uploads**: all image uploads land in `backend/uploads/`. Update routes remove superseded files.
- **Services**: `ColorService` and `ArtworkService` enforce extra invariants (optimistic locking, formula cascade updates, etc.). When designing frontend calls, check their method signatures for optional fields (`backend/services/*.js`).
- **Formula utilities**: duplicate detection and ingredient cascade updates rely on the new TypeScript ports; ensure frontend data stays in sync with hashes/tokens exposed via `src/features/formula/*`.

## Next Steps (Legacy Production)

1. Keep this document updated as endpoints evolve.
2. Verify upload handling in the legacy UI (forms must send `multipart/form-data` with matching field names).
3. Capture any new endpoints introduced during maintenance back in this document to keep the backend contract visible to the team.
