# Category Management UI Implementation Plan

## Overview
Add a settings button after category tabs in both custom colors (自配色) and raw materials (颜色原料) pages. Clicking opens a dialog for managing categories with add/delete/rename/reorder operations, following existing UI patterns and responsive design.

## Phase 1: Backend Verification & Enhancement
✅ **Already Complete** - All necessary API endpoints exist:
- `/api/categories` - Full CRUD for custom color categories
- `/api/mont-marte-categories` - Full CRUD for material categories
- Protection against deleting categories with existing items
- Reorder endpoint for batch display_order updates

## Phase 2: Create Reusable Category Manager Component

### 2.1 Create `frontend/js/components/category-manager.js`
**Features:**
- Reusable Vue component for both custom colors and Mont-Marte categories
- Props: `categoryType` ('colors' | 'materials'), `categories` array
- El-dialog with responsive width (max-width: min(90vw, 800px))
- Four main operations: Add, Delete, Rename, Reorder

**Dialog Structure:**
```
[Settings Icon] → Opens Dialog
├── Header: "管理分类"
├── Body:
│   ├── Add New Category Section
│   │   └── Input + Add Button
│   └── Category List Table
│       ├── Drag Handle | Name | Item Count | Actions
│       └── Each row: [≡] 分类名 (12) [Rename][Delete]
└── Footer: [Close Button]
```

### 2.2 Component Methods
- `addCategory()` - Create new category with auto-generated code
- `renameCategory(id, newName)` - Update category name
- `deleteCategory(id)` - Delete if no items, show error if has items
- `reorderCategories()` - Save new display_order after drag-drop
- `handleDragStart/End()` - Native HTML5 drag-drop

## Phase 3: Integrate into Custom Colors Page

### 3.1 Update Template (`custom-colors.js`)
Add settings button after category tabs:
```html
<div class="category-switch-group">
  <button>全部</button>
  <button v-for="cat in categories">{{cat.name}}</button>
  <button class="category-settings-btn" @click="showCategoryManager = true">
    <el-icon><Setting /></el-icon>
  </button>
</div>
```

### 3.2 Add Category Manager Dialog
```html
<category-manager 
  v-if="showCategoryManager"
  :visible.sync="showCategoryManager"
  :categories="categories"
  category-type="colors"
  @updated="loadCategories"
/>
```

## Phase 4: Integrate into Mont-Marte Page

### 4.1 Update Template (`mont-marte.js`)
Same pattern as custom colors:
- Add settings button after category tabs
- Include category manager component
- Pass `category-type="materials"`

## Phase 5: Styling & Responsive Design

### 5.1 Create `frontend/css/components/category-manager.css`
**Desktop (>960px):**
- Full table layout with all columns visible
- Drag handles on left, actions on right
- Comfortable spacing

**Tablet (600-960px):**
- Compact table, reduce padding
- Icons only for actions (no text)

**Mobile (<600px):**
- Card-based layout instead of table
- Stack elements vertically
- Full-width buttons

### 5.2 Style Guidelines
- Follow existing dialog patterns (border-radius: var(--sw-radius-lg))
- Use system colors (--sw-primary, --sw-border-light, etc.)
- Maintain 8px/16px spacing rhythm
- Hover effects on draggable items
- Visual feedback during drag operations

## Phase 6: Drag & Drop Implementation (Native HTML5 - Recommended)

### 6.1 Implementation Details
**HTML Structure:**
```html
<tr v-for="(cat, index) in sortableCategories" 
    :key="cat.id"
    :draggable="!isSystemCategory(cat)"
    @dragstart="handleDragStart(index, $event)"
    @dragover="handleDragOver(index, $event)"
    @drop="handleDrop(index, $event)"
    @dragend="handleDragEnd">
  <td class="drag-handle">≡</td>
  <td>{{ cat.name }}</td>
  <td>{{ cat.color_count || cat.material_count }}</td>
  <td>Actions</td>
</tr>
```

**JavaScript Methods:**
```javascript
handleDragStart(index, event) {
  this.draggedIndex = index;
  event.dataTransfer.effectAllowed = 'move';
  event.target.classList.add('dragging');
},

handleDragOver(index, event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  // Visual feedback for drop zone
},

handleDrop(index, event) {
  event.preventDefault();
  if (this.draggedIndex !== null && this.draggedIndex !== index) {
    // Reorder array
    const draggedItem = this.sortableCategories[this.draggedIndex];
    this.sortableCategories.splice(this.draggedIndex, 1);
    this.sortableCategories.splice(index, 0, draggedItem);
    // Update display_order
    this.updateDisplayOrder();
  }
},

handleDragEnd(event) {
  event.target.classList.remove('dragging');
  this.draggedIndex = null;
}
```

### 6.2 Visual Feedback
- Cursor: move on hover over drag handle
- Opacity: 0.5 during drag
- Drop zone highlight with border
- Smooth transitions after reorder

## Phase 7: Error Handling & UX

### 7.1 Validation
- Category name: Required, 2-20 characters
- Prevent duplicate names
- Show inline error messages
- Trim whitespace from input

### 7.2 User Feedback
- Loading states during API calls
- Success messages using Element Plus Message
- Confirm dialogs for deletion
- Clear error messages when deletion blocked

### 7.3 Protection Rules
- Cannot delete categories with items (show count)
- "其他" category cannot be deleted or reordered (system category)
- Categories auto-generate codes if not provided
- Display order starts at 1, increments by 1

## Phase 8: API Integration

### 8.1 Custom Colors Categories
```javascript
// Get all categories
async loadCategories() {
  const response = await fetch('/api/categories');
  this.categories = await response.json();
}

// Add new category
async addCategory(name) {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, display_order: this.getNextOrder() })
  });
  return await response.json();
}

// Rename category
async renameCategory(id, name) {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return await response.json();
}

// Delete category
async deleteCategory(id) {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'DELETE'
  });
  return await response.json();
}

// Reorder categories
async reorderCategories(updates) {
  const response = await fetch('/api/categories/reorder', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return await response.json();
}
```

### 8.2 Mont-Marte Categories
Same pattern but with `/api/mont-marte-categories` endpoints

## Phase 9: Testing & Verification ✅ COMPLETE

### 9.1 Functional Testing Checklist
- [x] Add new category → Appears in tabs immediately
- [x] Rename category → Updates everywhere (tabs, cards, dialogs)
- [x] Delete empty category → Success with confirmation
- [x] Delete category with items → Error message with count
- [x] Reorder → Persists after page refresh
- [x] All categories including 其他 → Can be renamed, deleted (if empty), and reordered

### 9.2 Responsive Testing
- [ ] Desktop (1920px) - Full table layout
- [ ] Laptop (1366px) - Normal spacing
- [ ] Tablet (768px) - Compact layout
- [ ] Mobile (375px) - Card-based layout
- [ ] Dialog scrollable on small screens
- [ ] Touch-friendly on mobile devices

### 9.3 Data Integrity
- [ ] Foreign key constraints enforced
- [ ] Category_id references remain valid after rename
- [ ] Display_order sequential and unique
- [ ] No orphaned colors after category operations

## Implementation Order
1. Create category-manager component with basic structure
2. Implement add and delete operations
3. Implement rename functionality with inline editing
4. Add drag-drop reordering with Native HTML5
5. Style component with responsive CSS
6. Integrate into custom-colors page
7. Integrate into mont-marte page
8. Test all operations thoroughly
9. Clean up debug code

## Files to Create/Modify

### New Files:
- `frontend/js/components/category-manager.js` - Main component
- `frontend/css/components/category-manager.css` - Styles

### Modified Files:
- `frontend/js/components/custom-colors.js` - Add settings button & dialog
- `frontend/js/components/mont-marte.js` - Add settings button & dialog
- `frontend/css/index.css` - Import category-manager.css
- `frontend/index.html` - Register category-manager component

## Component API

### Props
```javascript
props: {
  visible: Boolean,           // Dialog visibility
  categoryType: {            // 'colors' or 'materials'
    type: String,
    required: true
  },
  categories: {              // Current categories array
    type: Array,
    required: true
  }
}
```

### Events
```javascript
emits: [
  'update:visible',  // Dialog close
  'updated'          // Categories changed, parent should reload
]
```

### Data Structure
```javascript
data() {
  return {
    loading: false,
    saving: false,
    newCategoryName: '',
    editingId: null,
    editingName: '',
    draggedIndex: null,
    sortableCategories: [],
    errors: {}
  }
}
```

## Success Criteria
✅ Settings button visible and properly positioned  
✅ Dialog opens/closes smoothly with overlay  
✅ All CRUD operations work without page refresh  
✅ Drag-drop reordering intuitive and smooth  
✅ Responsive design works on all screen sizes  
✅ Protection rules properly enforced with clear messages  
✅ Real-time UI updates after all changes  
✅ Consistent with existing UI patterns and colors  
✅ Accessibility: Keyboard navigation, ARIA labels  
✅ Performance: Operations complete within 1 second  

## Notes for Future Enhancement
1. **Batch Operations**: Select multiple categories for bulk delete
2. **Category Colors**: Assign colors to categories for visual distinction
3. **Import/Export**: Save/load category configurations
4. **Category Icons**: Add icons to categories for better visual recognition
5. **Search/Filter**: Quick search within the dialog for many categories
6. **Undo/Redo**: Implement undo for accidental deletions
7. **Category Templates**: Predefined category sets for different use cases

## References
- Backend API: `/backend/routes/categories.js`
- Backend API: `/backend/routes/mont-marte-categories.js`
- Existing dialogs: `/frontend/js/components/custom-colors.js` (showAddDialog)
- Style patterns: `/frontend/css/components/duplicate-dialog.css`
- Responsive breakpoints: `/frontend/css/components/responsive-cards.css`