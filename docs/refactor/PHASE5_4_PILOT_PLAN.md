# Phase 5.4 Pilot Plan

- Date: 2026-02-07
- Status: Draft
- Pilot strategy: Parallel pilot migration (legacy remains production UI)

## Pilot Slice
- Name: `Color Dictionary Read-Only Explorer`
- Scope:
  - New frontend slice reads existing data from:
    - `/api/config`
    - `/api/custom-colors`
    - `/api/categories`
    - `/api/suppliers`
    - `/api/purchase-links`
- Exclusions:
  - No create/update/delete APIs in pilot.
  - No DB schema changes in pilot.

## Execution Phases
1. Contract freeze
   - Lock pilot endpoint behavior using `PHASE5_4_API_COMPATIBILITY_CONTRACT.md`.
2. Pilot implementation
   - Build read-only slice against frozen endpoints.
3. Rehearsal deployment
   - Execute Synology temporary-port rehearsal from runbook.
4. Controlled cutover decision
   - Decide go/no-go from measured metrics.

## Success Metrics
1. API compatibility: 100% pass on pilot endpoint checks.
2. Stability: no new backend 5xx events during pilot rehearsal window.
3. Frontend runtime: no new blocking browser console errors for pilot page.
4. Operations: cutover + rollback rehearsal completed with documented evidence.

## Rollback Triggers
1. Any pilot endpoint contract break (missing key, wrong status pattern, invalid JSON).
2. Reproducible blank screen or blocking JS error in pilot UI.
3. Production health regression after pilot deployment.

## Go/No-Go Decision
- Go only if all success metrics pass and no rollback trigger is hit.
- Otherwise no-go, rollback, and create remediation tasks before retry.

## Deliverables
1. Pilot slice source PR.
2. Rehearsal evidence record.
3. Phase 5 final review gate update with decision and outcomes.
