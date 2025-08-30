# STEREOWOOD Color System - Operations Manual

## Quick Start

### Start the System
```bash
# Windows
start.bat

# Mac/Linux  
npm start
```
- System runs on: http://localhost:9099
- Database location: `backend/color_management.db`

## Daily Operations

### Data Backup & Restore
```bash
# Create backup (saves to /backups folder with timestamp)
npm run backup

# Restore from latest backup
npm run restore
```

### Common Tasks

#### Add New Custom Color
1. Go to "自配颜色管理" tab
2. Click "添加颜色" button
3. Enter color code, name, and formula
4. Select category (蓝/黄/红/绿/紫/色精)
5. Upload image if available
6. Click "确定" to save

#### Add New Artwork Scheme
1. Go to "作品配色管理" tab
2. Click "添加作品" for new artwork
3. Enter artwork name and layers
4. Add color schemes with layer-to-color mappings
5. Upload thumbnail if available

#### Check for Duplicate Formulas
- System automatically detects duplicates when adding new colors
- Similarity threshold: 95%
- Shows warning dialog with existing similar formulas
- Option to force save or cancel

## API Testing

### Test Endpoints
```bash
# Get all custom colors
curl http://localhost:9099/api/custom-colors

# Get all artworks
curl http://localhost:9099/api/artworks

# Get Mont-Marte colors
curl http://localhost:9099/api/mont-marte-colors

# Get categories
curl http://localhost:9099/api/categories
```

## Docker Deployment (Optional)

### Build and Run
```bash
# Build image
docker build -t stereowood-color-system .

# Run container
docker run -d \
  --name stereowood \
  -p 9099:9099 \
  -e NODE_ENV=production \
  -e DB_FILE=/data/color_management.db \
  -v ~/stereowood-data:/data \
  -v ~/stereowood-uploads:/app/backend/uploads \
  --restart unless-stopped \
  stereowood-color-system:latest

# Check status
docker ps
docker logs stereowood
```

## Database Structure

### Main Tables
- **custom_colors**: Custom color formulas
- **artworks**: Artwork information
- **artwork_schemes**: Color schemes for artworks
- **mont_marte_colors**: Raw material colors
- **categories**: Color categories (1=蓝, 2=黄, 3=红, 4=绿, 5=紫, 6=色精)
- **color_history**: Modification history

### Database Settings
- Type: SQLite3
- Mode: WAL (Write-Ahead Logging)
- Location: `backend/color_management.db`

## Troubleshooting

### Server Won't Start
1. Check if port 9099 is already in use
2. Kill any existing node processes: `taskkill /F /IM node.exe` (Windows)
3. Try `npm install` to reinstall dependencies
4. Check database file exists at `backend/color_management.db`

### Images Not Uploading
1. Check `backend/uploads/` folder exists
2. Verify write permissions on uploads folder
3. Supported formats: jpg, jpeg, png, gif, webp
4. No file size limit by default

### Database Issues
```bash
# Reset database (WARNING: Deletes all data!)
del backend\color_management.db
npm start  # Will auto-create new database
```

### Formula Format
- Format: `颜色名 数量单位 颜色名 数量单位`
- Example: `朱红 10g 钛白 5g 柠檬黄 2g`
- Space-separated, supports Chinese characters

## System Information

- **Version**: 0.8.1
- **Port**: 9099 (hardcoded)
- **Users**: Designed for 3-5 factory users
- **Maintenance**: By Claude Code and system owner
- **Dependencies**: Node.js >=14.0.0

## Important Notes

1. **No Authentication**: System designed for internal factory use only
2. **Real-time Updates**: No caching, all data fetched in real-time
3. **Image Storage**: Original images stored without compression
4. **Cascade Updates**: When Mont-Marte colors renamed, formulas auto-update
5. **No Soft Deletes**: All deletions are permanent

## Need Help?

- Check `CLAUDE.md` for development/maintenance tasks
- Use Claude Code (claude.ai/code) for system modifications
- All code is well-commented for easy understanding