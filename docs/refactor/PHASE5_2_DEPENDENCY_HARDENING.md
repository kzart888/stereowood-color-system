# Phase 5.2 Dependency Hardening Report

## Scope
- Runtime dependency hardening for the current legacy production stack.
- Target environment: Docker image deployed to Synology.

## Results Summary
- `express` upgraded from `^4.18.2` to `^5.2.1`.
- Direct `body-parser` dependency removed (handled transitively by Express 5).
- `npm audit --omit=dev` improved from `8 high` to `5 high`.
- Remaining highs are all tied to `sqlite3@5.1.7` transitive build-tool chain:
  - `sqlite3 -> node-gyp@8.4.1 -> make-fetch-happen@9.1.0 -> cacache@15.3.0 -> tar@6.2.1`

## Why High Findings Remain
- `sqlite3@5.1.7` is the latest published version.
- The advisory chain is in install/build tooling dependencies used by `node-gyp`.
- `npm audit` only suggests `sqlite3@5.0.2` as a fix, which is older and not an actual hardening upgrade path.

## Risk Decision
- Decision: **Formally risk-accept current remaining 5 high findings temporarily**.
- Reason:
  - Findings are in package install toolchain dependency path, not app request-handling code.
  - Production deployment uses prebuilt Docker image pull on Synology (no package installation on runtime host).
  - Forced transitive overrides here are high-risk for native module build stability.

## Mandatory Mitigations
1. Build and publish only from controlled environment with trusted npm registry.
2. Use deterministic install in image build: `npm ci --omit=dev` (never `npm install` in CI/CD for prod build).
3. Do not run `npm install` on Synology production host; deploy image only.
4. Keep `package-lock.json` committed and review lockfile changes in PR/commit review.
5. Run `npm audit --omit=dev` on each release candidate and block release on new direct runtime highs.
6. Plan migration off `sqlite3` in pilot phase (Phase 5.4) to remove this toolchain class of risk.

## Validation
- `npm run phase0:verify` passed after dependency changes.
- Backend syntax checks remained clean.

## Owner and Review Cadence
- Owner: project maintainer.
- Review cadence: at least monthly, and mandatory before each production image push.
