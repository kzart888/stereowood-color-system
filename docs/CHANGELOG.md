# Changelog

## v0.8.2 (2025-01-03)
### Major Codebase Cleanup
- **Removed 35+ redundant files** across frontend, backend, and documentation
- **Consolidated package management** to single package.json at root
- **Simplified documentation** from 21 files to 3 essential files
- **Cleaned directories** - removed duplicate uploads, backup folders, test scripts
- **Space saved**: ~170MB (mostly from consolidated node_modules)
- **Result**: 30% cleaner codebase, 86% less documentation

### Documentation Reform
- Created `docs/OPERATIONS.md` - consolidated operational guide
- Simplified `README.md` from 315 to 42 lines
- Deleted entire `docs/refactoring/` folder (5 files of outdated plans)
- Removed all redundant deployment, development, and feature docs
- Updated `CLAUDE.md` with cleanup results

### Files Deleted
- Frontend: `components.backup/`, `node_modules/`, `package-lock.json`
- Backend: `routes/colors.js`, `routes/materials.js`, `services/MaterialService.js`, `services/FormulaService.js`, `init-data.js`, `db/run-migration.js`
- Root: `uploads/` folder, `nul` file
- Docs: 18 redundant documentation files

## v0.8.1 (2025-01-03)
### Codebase Cleanup
- Removed all duplicate files and redundant code
- Consolidated to single package.json at root
- Simplified documentation from 21 files to 3
- Deleted 130KB of outdated refactoring plans
- Fixed UI layouts and formula display

### What Was Deleted
- Frontend: components.backup/, node_modules, package-lock.json
- Backend: duplicate routes, unused services, test scripts
- Documentation: 18 redundant files
- Total: ~30% file reduction, ~170MB saved

## v0.8.0 (2025-08-28)
- Backend fully modularized
- Removed caching for real-time updates
- Simplified image handling

## v0.7.x (2025-08)
- Initial development
- Core features implemented