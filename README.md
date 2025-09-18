# STEREOWOOD Color System

Simple color management system for factory production (3-5 users).

## What It Does

- **自配颜色管理** - Manage custom color formulas with duplicate detection
- **作品配色管理** - Map artwork layers to colors with multiple schemes
- **原料管理** - Track Mont-Marte base colors and suppliers
- **配方计算器** - Calculate formula ratios and quantities

## Quick Start

```bash
npm install
npm --prefix frontend-vue3 install

# Start backend API + legacy UI
npm run dev:backend

# In a second terminal, launch the Vue 3 workspace
npm run dev:frontend
```

- Legacy Vue 2 interface: http://localhost:9099/legacy
- Vue 3 development workspace: http://localhost:3000

## Documentation

- **[OPERATIONS.md](docs/OPERATIONS.md)** - Daily operations, backup, troubleshooting
- **[CLAUDE.md](CLAUDE.md)** - Development guide for Claude Code maintenance
- **[LEGACY_FRONTEND.md](docs/LEGACY_FRONTEND.md)** - How to serve the archived Vue 2 bundle

## System Requirements

- Node.js >=14.0.0
- Windows/Mac/Linux
- Port 9099 available

## Version

Current: v0.9.8 (2025-02-14)

## License

MIT - Internal factory use
