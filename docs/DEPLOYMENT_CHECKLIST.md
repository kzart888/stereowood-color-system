# Deployment Checklist for Factory

## 🚀 Quick Deploy (First Time)

### 1. Prerequisites
- [ ] Node.js installed (version 14+)
- [ ] Port 3000 available
- [ ] Write permissions for database

### 2. Installation
```bash
# 1. Copy entire folder to factory computer
# 2. Open command prompt in folder
# 3. Install dependencies
npm install

# 4. Start the system
npm start
# OR double-click start.bat (Windows)
```

### 3. Verify Installation
- [ ] Open browser: http://localhost:3000
- [ ] Can see three tabs: 自配色, 作品配色, 颜色原料
- [ ] Can create a test color
- [ ] Can upload an image

## 📦 Daily Startup

### Windows
1. Double-click `start.bat`
2. Wait for "Server running" message
3. Open browser to http://localhost:3000

### Mac/Linux
1. Run `./start.sh` or `npm start`
2. Wait for "Server running" message
3. Open browser to http://localhost:3000

## 🔧 Common Issues

### "Port 3000 already in use"
- Another program is using port 3000
- Solution: Close other program or restart computer

### "Cannot find module"
- Dependencies not installed
- Solution: Run `npm install`

### "Permission denied"
- No write access to folder
- Solution: Run as administrator or fix folder permissions

## 📋 Pre-Production Checklist

### Data Preparation
- [ ] Backup existing Excel/paper records
- [ ] Prepare color formula list
- [ ] Collect color sample images
- [ ] List all current artworks

### System Configuration
- [ ] Set up automatic startup (optional)
- [ ] Create desktop shortcut to http://localhost:3000
- [ ] Test backup script: `npm run backup`
- [ ] Train users on basic operations

### Safety Measures
- [ ] Create initial backup after data entry
- [ ] Set up daily backup reminder
- [ ] Document factory-specific workflows
- [ ] Keep paper backup of critical formulas

## 👥 User Training Points

### Essential Operations
1. **Adding Colors**: 自配色 → 新自配色
2. **Creating Artworks**: 作品配色 → 新作品
3. **Mapping Colors**: Edit artwork → Add layers
4. **Using Calculator**: Click "算" button
5. **Finding Duplicates**: 自配色 → 查重

### Do's and Don'ts
✅ **DO**:
- Refresh page if something seems stuck
- Use Chinese or English for names
- Click Save after making changes
- Check for duplicates regularly

❌ **DON'T**:
- Delete colors that are in use
- Close terminal/command window while using
- Edit database.db directly
- Clear browser data without backup

## 📱 Browser Setup

### Recommended Browser
- Chrome or Edge (latest version)
- Firefox also works well

### Browser Settings
1. Bookmark http://localhost:3000
2. Allow popups from localhost
3. Set as homepage (optional)
4. Zoom level: 100% (adjust for screen size)

## 🔄 Update Procedure

When updating the system:
1. Backup current database: `npm run backup`
2. Copy new files (except database.db)
3. Run `npm install` (if package.json changed)
4. Start system and test
5. If issues, restore backup: `npm run restore`

## 📝 Factory-Specific Notes

Add your factory-specific information here:
- Special color codes: ___________
- Artwork naming convention: ___________
- Backup schedule: ___________
- IT contact: ___________
- System administrator: ___________

---
Remember: This is a simple system for 3-5 users. 
Keep it simple, make regular backups, and don't overthink it!