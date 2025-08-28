# STEREOWOOD Color System - Maintenance Guide

## 🎯 Quick Reference for Small Team (2 maintainers, 3-5 users)

### System Overview
- **Purpose**: Factory color management system for STEREOWOOD production
- **Users**: 3-5 factory workers
- **Maintainers**: 2 people (You + AI Assistant)
- **Architecture**: Simple client-server with SQLite database

## 🚀 Daily Operations

### Starting the System
```bash
# Development (with auto-restart on changes)
npm run dev

# Production
npm start
```

### Accessing the System
- Open browser: `http://localhost:3000`
- All data is stored in `database.db`

## 🛠️ Common Maintenance Tasks

### 1. Database Backup
```bash
# Create backup
npm run backup

# Restore from backup
npm run restore
```
**Important**: Backups are stored in `backups/` folder with timestamps

### 2. Checking Logs
- Application logs: Check console output
- Debug info: All `console.log` statements are intentionally kept for troubleshooting
- Error tracking: Look for `[ERROR]` prefix in console

### 3. Clearing Cache
The system uses a simple cache that auto-expires after 5 minutes. To force clear:
1. Refresh the browser (F5)
2. Or restart the server

## 📁 Project Structure (Simplified)

```
STEREOWOOD Color System/
├── server.js              # Main server file
├── database.db           # SQLite database (all your data)
├── backups/             # Database backups
├── uploads/             # Uploaded images
├── frontend/
│   ├── index.html       # Main HTML file
│   ├── css/            # Styles (organized by component)
│   └── js/
│       ├── app.js      # Main application
│       ├── api/        # Server communication
│       ├── components/ # UI components
│       └── utils/      # Helper functions
└── docs/               # Documentation

```

## 🔧 Troubleshooting

### Problem: System won't start
1. Check if port 3000 is already in use
2. Run `npm install` to ensure dependencies are installed
3. Check `database.db` exists

### Problem: Images not displaying
1. Check `uploads/` folder permissions
2. Verify image files exist in `uploads/`
3. Check browser console for 404 errors

### Problem: Data not saving
1. Check database is not locked (restart server)
2. Verify `database.db` has write permissions
3. Look for error messages in console

### Problem: Slow performance
1. Clear browser cache
2. Restart the server
3. Check if database backup is running

## 💡 Key Features to Remember

### Color Management
- **自配色 (Custom Colors)**: Company's color formulas
- **作品 (Artworks)**: Products using the colors
- **原料 (Raw Materials)**: Mont-Marte color ingredients

### Important Business Logic
1. **Duplicate Detection**: System checks for duplicate color formulas
2. **Color Mapping**: Links layers in artwork to specific colors
3. **Formula Calculator**: Quick calculation tool for color mixing

## 🔍 Where to Find Things

### Adding New Features
- Components: `/frontend/js/components/`
- API endpoints: `/server.js` (search for `app.get` or `app.post`)
- Styles: `/frontend/css/components/`

### Modifying Existing Features
1. Use browser DevTools to identify component
2. Search for text/class names in VS Code
3. Components are named intuitively (e.g., `custom-colors.js` for 自配色)

## 📝 Debug Information

The system keeps helpful debug logs. Look for these prefixes:
- `[Cache HIT/MISS]` - Cache operations
- `[API]` - API calls
- `[Component]` - Component lifecycle
- `[ERROR]` - Error messages

### Useful Console Commands
```javascript
// In browser console:

// Check loaded components
console.log(app._instance.components);

// View current data
console.log(app._instance.data);

// Force refresh data
app._instance.proxy.loadCustomColors();
app._instance.proxy.loadArtworks();
```

## 🚨 Emergency Procedures

### Data Recovery
1. Stop the server immediately
2. Copy `database.db` to safe location
3. Use latest backup from `backups/` folder
4. Run `npm run restore`

### System Reset
1. Stop server
2. Delete `database.db`
3. Restore from backup OR
4. Start fresh (system will create new database)

## 📞 Getting Help

### From AI Assistant
When asking for help, provide:
1. Error messages from console
2. What you were trying to do
3. Any recent changes made

### Helpful Context for AI
- "Small factory system with 3-5 users"
- "Simple deployment, no complex optimization needed"
- "Maintainability over performance"

## 🔄 Regular Maintenance

### Weekly
- Create database backup
- Check uploads folder size
- Review console logs for errors

### Monthly
- Clear old backups (keep last 30 days)
- Update dependencies if needed: `npm update`
- Test backup restoration process

## 📌 Important Notes

1. **Keep it Simple**: This system is designed for simplicity, not scale
2. **Debug Logs**: All console.log statements are intentional - don't remove them
3. **Comments**: Chinese comments are kept for context
4. **No Minification**: Code is kept readable for easy maintenance
5. **Direct Editing**: You can edit files directly, no build process needed

---

Last Updated: Phase 6 Cleanup
Maintained by: STEREOWOOD Team (2 people)