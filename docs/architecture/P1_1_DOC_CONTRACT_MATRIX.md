# P1.1 Doc Contract Alignment Matrix

Date: 2026-03-07  
Scope: verify active docs align to runtime/deploy contract.

## Runtime/Deploy Truth

| Contract Item | Canonical Value |
|---|---|
| Production frontend | `frontend/legacy` served at `/` |
| API base | `/api` |
| Health endpoint | `/health` |
| Default runtime port | `9099` |
| Docker DB file | `/data/color_management.db` |
| Local start | `npm start` then open `http://localhost:9099` |
| Deploy model | build image -> push registry -> pull/run on Synology |
| Write guard defaults | `AUTH_ENFORCE_WRITES=false`, `READ_ONLY_MODE=false` |
| Pilot UI flag | `ENABLE_PILOT_UI=false` default |
| Backup/restore scripts | `npm run backup`, `npm run restore` |

## Active Docs Alignment

| Doc | Port | Health | DB path | Legacy at `/` | Auth flags | Backup/Restore | Status |
|---|---|---|---|---|---|---|---|
| `README.md` | `9099` | yes | indirect (ops/deploy docs) | yes | n/a | yes | aligned |
| `docs/OPERATIONS.md` | `9099` | yes | `/data/color_management.db` | yes | yes | yes | aligned |
| `DEPLOYMENT_CHECKLIST.md` | `9099` | yes | `/data/color_management.db` | yes | pilot + envs | yes | aligned |
| `docs/development/backend-api.md` | API contract | yes | n/a | yes (runtime section) | yes | n/a | aligned |
| `docs/architecture/LATEST_ROADMAP_P0_P6.md` | `9099` | yes | `/data/color_management.db` | yes | rollout defaults | yes | aligned |

## P1.1 Outcome

- No contradictions found on:
  - `9099`
  - `/health`
  - `/data/color_management.db`
  - legacy-at-root runtime contract
- Historical top-level plan docs were moved to archive and removed from active guidance set.
