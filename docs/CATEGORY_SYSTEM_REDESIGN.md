# Category System Redesign Documentation

## Overview
This document outlines the comprehensive redesign of the category system for the STEREOWOOD Color Management System. The redesign addresses critical issues with the current implementation and prepares the system for future extensibility.

## Current Issues

### 1. "其他" (Other) Category Bug
- **Problem**: "其他" doesn't exist in the database, it's only a frontend illusion
- **Symptom**: Colors saved as "其他" actually get saved to the first category (usually "蓝色系")
- **Impact**: Users see their "其他" colors appearing in wrong categories in the palette dialog

### 2. Inconsistent Category Codes
- Current codes use Chinese pinyin abbreviations (LS, HS, RS, etc.)
- Should use English abbreviations for consistency
- "色精" currently uses "SJ" which doesn't follow English naming

### 3. Mont-Marte Categories
- Categories stored as plain text strings, not normalized
- No category management system
- Hardcoded options in frontend

### 4. Missing Features
- No ability to rename categories
- No display order control
- No proper category management UI
- Categories tied to their codes, making renaming difficult

## Design Principles

1. **Data Integrity**: No orphaned records, foreign key constraints
2. **No Soft Deletes**: Clean deletion with protection against data loss
3. **Extensibility**: Ready for future features (rename, reorder, add, delete)
4. **Consistency**: Same approach for both custom colors and Mont-Marte materials
5. **User Safety**: Can't delete categories that contain colors/materials

## Database Schema

### 1. Enhanced color_categories Table
```sql
ALTER TABLE color_categories ADD COLUMN display_order INTEGER DEFAULT 0;
ALTER TABLE color_categories ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
```

### 2. New mont_marte_categories Table
```sql
CREATE TABLE mont_marte_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Updated mont_marte_colors Table
```sql
ALTER TABLE mont_marte_colors ADD COLUMN category_id INTEGER;
ALTER TABLE mont_marte_colors ADD FOREIGN KEY (category_id) REFERENCES mont_marte_categories(id);
-- After migration: DROP COLUMN category;
```

## Category Definitions

### Custom Color Categories
| Code | Name    | English Meaning | Display Order |
|------|---------|----------------|---------------|
| BU   | 蓝色系   | Blue           | 1             |
| YE   | 黄色系   | Yellow         | 2             |
| RD   | 红色系   | Red            | 3             |
| GN   | 绿色系   | Green          | 4             |
| VT   | 紫色系   | Violet         | 5             |
| ES   | 色精     | Essence/Spirit | 6             |
| OT   | 其他     | Other          | 999           |

### Mont-Marte Categories
| Code | Name    | English Meaning | Display Order |
|------|---------|----------------|---------------|
| WB   | 水性漆   | Water-Based    | 1             |
| OB   | 油性漆   | Oil-Based      | 2             |
| OT   | 其他     | Other          | 999           |

## API Endpoints

### Custom Color Categories (`/api/categories`)

#### GET /api/categories
- Returns all categories ordered by display_order
- Response includes: id, code, name, display_order, color_count

#### POST /api/categories
- Create new category
- Auto-generates unique code if not provided
- Body: `{ name: string, code?: string, display_order?: number }`

#### PUT /api/categories/:id
- Rename category
- Automatic cascade to all related colors via foreign key
- Body: `{ name: string }`

#### PUT /api/categories/reorder
- Batch update display orders
- Body: `[{ id: number, display_order: number }, ...]`

#### DELETE /api/categories/:id
- Check for existing colors
- If has colors: Return 400 with error message
- If empty: Delete permanently
- Response: `{ success: true }` or `{ error: "该分类下有 X 个颜色，无法删除" }`

### Mont-Marte Categories (`/api/mont-marte-categories`)
- Same structure as custom color categories
- Same protection rules

## Implementation Phases

### Phase 1: Database Migration
1. Add columns to color_categories table
2. Create mont_marte_categories table  
3. Initialize all default categories with English codes
4. Add category_id to mont_marte_colors
5. Migrate existing data

### Phase 2: Backend API
1. Update existing category routes
2. Add new CRUD endpoints
3. Implement deletion protection
4. Add cascade update support

### Phase 3: Fix Current Bugs
1. Remove 'other' string handling in frontend
2. Use actual database IDs for all categories
3. Update color code prefix matching
4. Fix category assignment logic

### Phase 4: Mont-Marte Integration
1. Migrate text categories to IDs
2. Update frontend to use category_id
3. Update API to handle new structure

### Phase 5: Testing
1. Verify "其他" colors save correctly
2. Test category rename cascades
3. Test deletion protection
4. Test display order changes

## Frontend Changes Required

### Custom Colors Component (`custom-colors.js`)

#### Remove Problematic Code
```javascript

// DELETE THIS:
if (actualCategoryId === 'other') {
    actualCategoryId = this.categories[0]?.id || 1;
}

// DELETE THIS:
result.push({ id: 'other', name: '其他', code: 'OTHER' });
```

#### Update Category Handling
```javascript
// Just use the actual category_id from database
formData.append('category_id', this.form.category_id);
```

#### Update Prefix Matching
```javascript
// Map new English codes
const categoryCodeMap = {
    'BU': '蓝色系',
    'YE': '黄色系', 
    'RD': '红色系',
    'GN': '绿色系',
    'VT': '紫色系',
    'ES': '色精',
    'OT': '其他'
};
```

### Mont-Marte Component (`mont-marte.js`)
- Replace hardcoded category dropdown with API call
- Change `category` field to `category_id`
- Update form validation

## Migration Scripts

### Initialize Categories
```sql
-- Update existing 色精 code if needed
UPDATE color_categories SET code = 'ES' WHERE name = '色精' AND code = 'SJ';

-- Insert all categories with correct codes
INSERT OR IGNORE INTO color_categories (code, name, display_order) VALUES
('BU', '蓝色系', 1),
('YE', '黄色系', 2),
('RD', '红色系', 3),
('GN', '绿色系', 4),
('VT', '紫色系', 5),
('ES', '色精', 6),
('OT', '其他', 999);

-- Initialize Mont-Marte categories
INSERT INTO mont_marte_categories (code, name, display_order) VALUES
('WB', '水性漆', 1),
('OB', '油性漆', 2),
('OT', '其他', 999);
```

### Fix Mis-categorized Colors
```sql
-- Find colors that don't match their category
SELECT cc.*, cat.code 
FROM custom_colors cc
JOIN color_categories cat ON cc.category_id = cat.id
WHERE UPPER(SUBSTR(cc.color_code, 1, 2)) != cat.code;

-- Update them to use "其他" category
UPDATE custom_colors 
SET category_id = (SELECT id FROM color_categories WHERE code = 'OT')
WHERE id IN (
    SELECT cc.id 
    FROM custom_colors cc
    JOIN color_categories cat ON cc.category_id = cat.id
    WHERE UPPER(SUBSTR(cc.color_code, 1, 2)) != cat.code
);
```

### Migrate Mont-Marte Categories
```sql
-- Map text to category_id
UPDATE mont_marte_colors 
SET category_id = (
    CASE category
        WHEN 'water' THEN (SELECT id FROM mont_marte_categories WHERE code = 'WB')
        WHEN 'oil' THEN (SELECT id FROM mont_marte_categories WHERE code = 'OB')
        ELSE (SELECT id FROM mont_marte_categories WHERE code = 'OT')
    END
);

-- After verification, drop old column
ALTER TABLE mont_marte_colors DROP COLUMN category;
```

## Testing Checklist

### Category Operations
- [ ] Create new category
- [ ] Rename category (verify cascade)
- [ ] Reorder categories
- [ ] Delete empty category (should succeed)
- [ ] Delete category with colors (should fail)

### Color Assignment
- [ ] Create color with "其他" category
- [ ] Verify it appears in correct category in palette dialog
- [ ] Create color with each category type
- [ ] Edit color and change category

### Mont-Marte Materials
- [ ] Create material with each category
- [ ] Edit material category
- [ ] Verify category display

### Data Integrity
- [ ] No orphaned colors after category operations
- [ ] Foreign key constraints working
- [ ] Display order respected in UI

## Future Enhancements

### Category Management UI
- Dedicated settings page for category management
- Drag-and-drop reordering
- Inline rename with confirmation
- Visual indication of category usage (color count)
- Bulk operations support

### Extended Features
- Category icons/colors
- Category descriptions
- Category-based filtering improvements
- Category statistics dashboard
- Import/export category definitions

## Rollback Plan

If issues arise during deployment:

1. **Database Rollback**
   ```sql
   -- Remove new columns
   ALTER TABLE color_categories DROP COLUMN display_order;
   ALTER TABLE color_categories DROP COLUMN updated_at;
   ALTER TABLE mont_marte_colors DROP COLUMN category_id;
   DROP TABLE mont_marte_categories;
   ```

2. **Code Rollback**
   - Revert git commits
   - Restore frontend 'other' handling
   - Restore original API endpoints

3. **Data Recovery**
   - Restore from database backup
   - Re-run original migrations

## Success Metrics

1. **Bug Resolution**
   - "其他" colors appear in correct category
   - No mis-categorized colors

2. **Performance**
   - Category operations < 100ms
   - No UI lag when switching categories

3. **Data Quality**
   - 100% colors have valid category_id
   - No orphaned records
   - All foreign keys valid

4. **User Experience**
   - Categories display in correct order
   - Rename operations work seamlessly
   - Clear error messages for protected deletions