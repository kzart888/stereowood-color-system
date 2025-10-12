# STEREOWOOD Color System

Simple color management system for factory production (3-5 users).

## What It Does

- **自配颜色管理** - Manage custom color formulas with duplicate detection
- **作品配色管理** - Map artwork layers to colors with multiple schemes
- **原料管理** - Track Mont-Marte base colors and suppliers
- **配方计算器** - Calculate formula ratios and quantities

## Quick Start

### Backend API (Express + SQLite)

```bash
# First-time setup (installs dependencies at repo root)
npm install

# If you are on Node >= 20 and sqlite3 native binding fails:
npm rebuild sqlite3

# Start the API server (http://localhost:9099 by default)
npm start

# If port 9099 is busy, choose a free port:
PORT=9199 npm start

# (Optional) Free an existing process on Linux/macOS:
fuser -k 9099/tcp
```

### Vue 3 Admin (Vite + Pinia)

```bash
cd frontend/apps/stereowood-admin
npm install           # first time only
npm run dev -- --host 127.0.0.1 --port 0
```

Vite will print the local dev URL (usually http://127.0.0.1:5173).  
The dev server is pre-configured to proxy `/api` and `/uploads` to the backend.

## Documentation

- **[OPERATIONS.md](docs/OPERATIONS.md)** - Daily operations, backup, troubleshooting
- **[CLAUDE.md](CLAUDE.md)** - Development guide for Claude Code maintenance

## System Requirements

- Node.js >=14.0.0
- Windows/Mac/Linux
- Port 9099 available (override with `PORT=xxxx` if needed)

## Version

Current: v0.8.2 (2025-01-03)

## License

MIT - Internal factory use
