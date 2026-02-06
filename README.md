# STEREOWOOD Color System

Simple color management system for factory production (3-5 users).

## What It Does

- **Custom Colors** - Manage custom color formulas with duplicate detection
- **Artwork Schemes** - Map artwork layers to colors with multiple schemes
- **Raw Materials** - Track Mont-Marte base colors and suppliers
- **Formula Calculator** - Calculate formula ratios and quantities

## Quick Start

### Backend API (Express + SQLite)

```bash
# First-time setup (installs dependencies at repo root)
npm install

# If you are on Node >= 20 and sqlite3 native binding fails:
# ensure npm lifecycle scripts are enabled, then rebuild sqlite3
npm config set ignore-scripts false
npm rebuild sqlite3

# Start the API server (http://localhost:9099 by default)
npm start

# If port 9099 is busy, choose a free port:
PORT=9199 npm start

# (Optional) Free an existing process on Linux/macOS:
fuser -k 9099/tcp
```

### Legacy Admin UI (Production)

The legacy UI is served by the backend at the root URL:

```
http://localhost:9099/
```

The Vue 3 app is archived under `archives/phase1-vue3-2026-02-06/` and is not part
of the current production flow.

Healthcheck endpoint:
```
http://localhost:9099/health
```

## Documentation

- **[OPERATIONS.md](docs/OPERATIONS.md)** - Daily operations, backup, troubleshooting
- **[CLAUDE.md](CLAUDE.md)** - Development guide for Claude Code maintenance

## System Requirements

- Node.js >=14.0.0
- Windows/Mac/Linux
- Port 9099 available (override with `PORT=xxxx` if needed)

## Version

Current: v0.9.8

## License

MIT - Internal factory use
