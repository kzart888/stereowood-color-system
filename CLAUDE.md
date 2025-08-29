# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

STEREOWOOD Color Management System - A simplified web application for managing color formulas and artwork schemes in a small factory setting (3-5 users). Built for easy maintenance by a 2-person team.

## Development Commands

### Local Development
```bash
# Install dependencies (first time only)
npm install

# Start development server (port 9099)
npm start

# Development mode with auto-reload
npm run dev

# Data backup/restore
npm run backup
npm run restore

# Windows users can also use
start.bat
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
```

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

### Current System State (v0.8.0)

- **Backend**: Fully modularized into db/, services/, and routes/ layers
- **Frontend**: Large component files retained for stability (custom-colors.js: 1269 lines, artworks.js: 1024 lines)
- **Performance**: Real-time data fetching without caching for immediate UI updates
- **Images**: Direct storage without compression for quality preservation

### Security Considerations

- CORS enabled for local development
- File uploads restricted to images only
- SQLite with proper PRAGMA settings for data integrity
- No authentication (internal factory use only)

### File Structure Overview

```
STEREOWOOD Color System/
├── backend/
│   ├── server.js           # Main entry, Express setup
│   ├── db/                 # Database layer
│   │   ├── index.js        # DB connection with PRAGMA settings
│   │   ├── migrations.js   # Schema initialization
│   │   └── queries/        # SQL query modules
│   ├── routes/             # API routes (modularized)
│   │   ├── custom-colors.js
│   │   ├── artworks.js
│   │   ├── mont-marte-colors.js
│   │   └── categories.js
│   ├── services/           # Business logic layer
│   └── uploads/            # Image storage directory
├── frontend/
│   ├── index.html          # Single-page app entry
│   ├── js/
│   │   ├── app.js          # Vue app initialization
│   │   ├── components/     # Vue components (large stable files)
│   │   └── api/api.js      # Centralized API client
│   └── css/                # Fully modularized styles
│       ├── base/           # Variables and resets
│       ├── components/     # Component-specific styles
│       └── layout/         # Layout styles
└── docs/                   # Comprehensive documentation
```

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