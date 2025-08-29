# STEREOWOOD Color Management System

## 🎯 Purpose
Simple, reliable color management system for STEREOWOOD factory production (3-5 users).

## 🚀 Quick Start

### Local Development
#### Windows Users
1. Double-click `start.bat`
2. Open browser: http://localhost:9099

#### Mac/Linux Users
```bash
npm install  # First time only
npm start    # Start the system
```

### 🐳 Docker Deployment (Synology NAS)
See [Synology Deployment Guide](docs/deployment/SYNOLOGY_DEPLOYMENT.md) for detailed instructions.

Quick steps:
1. Push code to GitHub
2. Auto-build on Docker Hub
3. Pull image in Synology Container Manager
4. Run container with proper volumes

## 📁 System Features

### Core Modules
- **自配色管理** - Custom color formulas with duplicate detection
- **作品配色管理** - Artwork layer-to-color mapping
- **颜色原料管理** - Mont-Marte raw material colors
- **配方计算器** - Quick formula calculations
- **查重功能** - Automatic duplicate formula detection

## 🛠️ Maintenance

### For Maintainers (2 people)
- See `docs/MAINTENANCE_GUIDE.md` for detailed instructions
- All debug logs are kept intentionally for troubleshooting
- No build process needed - edit files directly

### Daily Operations
```bash
npm start          # Start system
npm run backup     # Backup database
npm run restore    # Restore from backup
```

## 📋 Documentation

- [Maintenance Guide](docs/MAINTENANCE_GUIDE.md) - Day-to-day maintenance
- [API Endpoints](docs/API_ENDPOINTS.md) - Server API reference
- [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md) - Factory deployment
- [Database Schema](docs/DATABASE_SCHEMA.md) - Database structure

## 🔧 Technical Stack (Kept Simple)

- **Frontend**: Vue 3 + Element Plus (via CDN, no build)
- **Backend**: Node.js + Express
- **Database**: SQLite (single file, easy backup)
- **Images**: Local storage in uploads/

## 📊 System Requirements

- Node.js 14+
- 1GB RAM
- 100MB disk space (plus image storage)
- Modern browser (Chrome/Edge/Firefox)

## 🎨 Version History

- **v0.8.0** - System optimization: Real-time updates, image processing simplified (current)
- **v0.7.6** - Backend modularization completed
- **v0.7.5** - Component optimization and formula calculator
- **v0.7.0** - Frontend architecture improvements
- **v0.6.0** - CSS modularization
- **v0.5.0** - Backend refactoring
- **v0.1.0** - Initial working version

## 📝 Important Notes

1. **Designed for 3-5 users** - Not for large scale deployment
2. **Maintainability first** - Code is readable, not minified
3. **Debug logs included** - All console.log kept for troubleshooting
4. **No complex build** - Direct file editing, instant updates
5. **Simple is better** - Removed unnecessary optimizations

## 🆘 Getting Help

When asking for help from AI assistant, mention:
- "Small factory system with 3-5 users"
- "Simple deployment, maintainability over performance"
- Include error messages from console

## 📄 License

MIT License - Internal use for STEREOWOOD factory

---
*Last updated: Phase 6 - Simplified for factory use*