# Phase A3 Inventory: History and Audit Coverage

Date: 2026-02-08
Scope: backend write paths and timeline-read capability for Phase A3

## Baseline (Before A3)
- `custom_colors_history` existed and stored partial snapshots, but lacked actor/request metadata.
- `color_schemes_history` existed in schema but was not emitted by current write paths.
- No unified audit/event table for cross-entity timeline.
- No generic timeline API for entities outside custom colors.

## Coverage Matrix

| Entity | Before A3 | A3 Implementation | Remaining Gaps |
|---|---|---|---|
| `custom_color` | History rows on selective updates/merge only; no actor metadata | Added metadata columns (`change_action`, `actor_id`, `actor_name`, `request_id`, `source`), emit audit + change events on create/update/delete/merge | Actor identity still header-based until A4 auth |
| `color_scheme` | `color_schemes_history` table existed but not written | Added archive writes on successful update/delete with metadata; emit audit + change events on create/update/delete | No dedicated scheme history read endpoint yet (covered by generic timeline) |
| `artwork` | No history/audit | Emit audit + change events on create/delete | No archive table required currently |
| `mont_marte_color` | No history/audit | Emit audit + change events on create/update/delete | No per-row snapshot table (timeline table acts as source) |
| `category` / `mont_marte_category` | No history/audit | Emit audit + change events on create/update/delete/reorder | Reorder represented as per-category events only |
| `supplier` / `purchase_link` | No history/audit | Emit audit + change events for create and supplier delete | Purchase-link delete API not present yet |

## New Tables (Additive)
- `audit_events`
- `entity_change_events`

## New Read Contract
- `GET /api/history/:entityType/:entityId?limit=<n>`
- Allowed `entityType` values:
  - `custom_color`
  - `artwork`
  - `color_scheme`
  - `mont_marte_color`
  - `supplier`
  - `purchase_link`
  - `category`
  - `mont_marte_category`

## Data Integrity Notes
- History rows are now emitted only after successful write completion to avoid false history on failed writes.
- A3 schema migration remains additive only (no table/column drops).
