# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔄 ACTIVE REFACTORING PROCESS (Started: 2025-01-13)

### CRITICAL: Follow These Rules During Refactoring
1. **Always refer to REFACTORING_PLAN.md** for each phase and step
2. **Commit after each completed step** with descriptive messages
3. **Test with Playwright MCP** when functionality changes
4. **Archive old code** - never delete, move to `/archives/` directory
5. **Update this file** when major milestones are reached

### Current Phase: Phase 0 - Safety & Foundation
- [ ] Archive system setup
- [ ] Testing infrastructure
- [ ] Performance baseline

## Project Overview

STEREOWOOD Color Management System - A web application for managing color formulas and artwork schemes in a factory setting (3-5 users).

## Work Routine & Git Practices

### IMPORTANT: After Each Completed Task
1. **Summarize the work done** in a clear, concise manner
2. **Create a git commit** with descriptive message following this format:
   ```bash
   git add -A
   git commit -m "feat/fix/docs: Brief description of changes
   
   - Detail 1
   - Detail 2
   
   🤖 Generated with Claude Code
   
   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```
3. **Commit frequently** - After each logical unit of work (feature, bug fix, refactor)
4. **Never push unless explicitly requested** by the user

### Commit Message Format
- `feat:` New feature or enhancement
- `fix:` Bug fix
- `refactor:` Code restructuring without changing functionality
- `docs:` Documentation changes
- `style:` Formatting, missing semicolons, etc.
- `test:` Adding or updating tests
- `chore:` Maintenance tasks, dependency updates

## Development Commands

### Local Development
```bash
# Install dependencies (first time only)
npm install

# Start development server (port 9099)
npm start

# Development mode with auto-reload (requires nodemon)
npm run dev

# Data backup/restore
npm run backup    # Creates timestamped backup in /backups directory
npm run restore   # Restores from latest backup

# Windows users can also use
start.bat
```

### Testing & Code Quality
```bash
# Currently no automated tests or linting configured
# Consider running manual tests by:
# 1. Testing all CRUD operations for custom colors
# 2. Verifying artwork scheme management
# 3. Testing formula calculator calculations
# 4. Checking duplicate detection algorithm
```

### Docker Deployment
```bash
# Build Docker image
docker build -t stereowood-color-system .

# Run container (production)
docker run -d \
  --name stereowood \
  -p 9099:9099 \
  -e NODE_ENV=production \
  -e DB_FILE=/data/color_management.db \
  -v ~/stereowood-data:/data \
  -v ~/stereowood-uploads:/app/backend/uploads \
  --restart unless-stopped \
  stereowood-color-system:latest

# Check container health
docker ps
docker logs stereowood
```

## Current State (v0.8.2)

- **Backend**: Modularized with routes/, db/, services/ layers
- **Frontend**: Monolithic components (1800+ lines each) to be refactored
- **Database**: SQLite with WAL mode, proper indexes needed
- **Testing**: 0% coverage - to be implemented in Phase 0

## Architecture Overview

### Three-Tier Architecture
1. **Frontend (Vue 3 + Element Plus)** - Located in `/frontend`
   - Single-page application with component-based architecture
   - Main entry: `frontend/index.html`
   - Components in `frontend/js/components/` (large files kept intact for stability)
   - API client in `frontend/js/api/api.js` (centralized API calls)
   - CSS modules in `frontend/css/` (fully modularized)

2. **Backend (Node.js + Express)** - Located in `/backend`
   - RESTful API server on port 9099
   - Main entry: `backend/server.js`
   - Routes in `backend/routes/` (modularized)
   - Database layer in `backend/db/` (index.js, migrations.js, queries/)
   - Services in `backend/services/` (business logic)

3. **Database (SQLite)** - File-based database
   - Location: `backend/color_management.db`
   - Uses WAL mode for better concurrency
   - Main tables: custom_colors, artworks, mont_marte_colors, categories, color_history

### Key API Endpoints

Base URL: `http://localhost:9099/api`

- **Custom Colors**: `/api/custom-colors` - CRUD operations for custom color formulas
- **Artworks**: `/api/artworks` - Manage artwork color schemes
- **Mont-Marte Colors**: `/api/mont-marte-colors` - Raw material management
- **Categories**: `/api/categories` - Color category management
- **File Uploads**: Handled via multipart/form-data with multer

### Core Features

1. **Custom Color Management (自配色管理)**
   - Formula management with duplicate detection
   - Image upload and thumbnail generation
   - History tracking for modifications
   - Category-based organization (蓝/黄/红/绿/紫/色精)

2. **Artwork Color Schemes (作品配色)**
   - Layer-to-color mapping
   - Multiple color schemes per artwork
   - Layer priority view and color priority view
   - Scheme thumbnail support

3. **Formula Calculator (配方计算器)**
   - Real-time ratio calculations
   - Overflow handling and rebalancing
   - Persistent state across page refreshes
   - Floating UI component

4. **Raw Material Management (蒙马特颜色库)**
   - Basic pigment information
   - Supplier and purchase link management
   - Reference for custom color creation

### Database Schema Key Points

- **custom_colors**: Core table with color_code, name, formula, category_id, image_path
- **artworks**: Artwork information with support for multiple color schemes
- **artwork_schemes**: Many-to-many relationship between artworks and color schemes
- **mont_marte_colors**: Raw material reference data
- **color_history**: Tracks all modifications to custom colors

### Important Implementation Notes

1. **No Caching**: System uses real-time data fetching for all operations
2. **Image Handling**: Direct storage of original images without compression
3. **Duplicate Detection**: Algorithm based on formula ratio comparison
4. **Formula Parsing**: Custom parser for color formulas with material and quantity extraction
5. **Cascade Updates**: When Mont-Marte colors are renamed, formulas are automatically updated


### Security Considerations

- CORS enabled for local development
- File uploads restricted to images only
- SQLite with proper PRAGMA settings for data integrity
- No authentication (internal factory use only)


### Critical Implementation Details

1. **Formula Format**: `颜色名 数量单位 颜色名 数量单位` (space-separated)
2. **Duplicate Detection Threshold**: 0.95 similarity ratio for formula comparison
3. **Database Pragmas**: `journal_mode=WAL`, `busy_timeout=5000`, `foreign_keys=ON`
4. **Image Upload**: Uses multer, stores in `backend/uploads/`, no compression
5. **API Error Format**: Always return `{ error: "message" }` for errors
6. **Frontend State**: No global state management, components fetch data directly

### Deployment Notes

- **Port**: Always 9099 (hardcoded in multiple places)
- **Database**: SQLite file at `backend/color_management.db`
- **Volumes Required**: `/data` for database, `/app/backend/uploads` for images
- **Node Version**: >=14.0.0 required
- **Production ENV**: Set `NODE_ENV=production` and `DB_FILE=/data/color_management.db`


## Key Business Logic

### Duplicate Detection Algorithm
- Located in: `backend/services/custom-colors.js`
- Threshold: 0.95 similarity ratio
- Algorithm: Compares normalized formula ratios after extracting quantities
- Formula parsing: Extracts material names and quantities from space-separated format

### Formula Calculator Logic
- Frontend component: `frontend/js/components/formula-calculator.js`
- State persistence: Uses localStorage to maintain calculator state
- Overflow handling: Automatically rebalances ratios when quantities exceed limits
- Real-time updates: No server-side calculation, all done in browser

### Color Category Mapping
- Categories are hardcoded: 蓝(1), 黄(2), 红(3), 绿(4), 紫(5), 色精(6)
- Category changes cascade to all related colors
- No soft deletes - all deletions are permanent

---

## Quick Reference for Refactoring

### Key Files to Focus On
- **Monolithic Components**: `custom-colors.js` (1822 lines), `artworks.js` (1583 lines), `color-dictionary.js` (1891 lines)
- **Performance Issue**: `pantone-colors-full.js` (1.13 MB loaded on every page)
- **Duplicate Utils**: `color-converter.js` vs `colorConversion.js`

### Testing with Playwright MCP
```javascript
// Use mcp__playwright commands for testing
mcp__playwright__browser_navigate({ url: "http://localhost:9099" })
mcp__playwright__browser_snapshot()  // Get page state
mcp__playwright__browser_click({ element: "button", ref: "..." })
```

### Remember During Refactoring
1. Archive before changing: `cp -r frontend/js/components archives/v0.8.2-baseline/`
2. Test after each change: Run E2E tests with Playwright MCP
3. Commit frequently: Use descriptive messages with proper prefixes
4. Update this file: Mark completed phases and update current status