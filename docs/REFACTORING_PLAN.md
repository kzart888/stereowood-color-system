# Component Refactoring Plan

## Executive Summary
This document outlines the refactoring plan for two large Vue components in the STEREOWOOD Color System to improve maintainability while following the principle of minimal changes (最小改动原则).

## Current State Analysis

### Large Files Identified
| File | Current Lines | Target Lines | Complexity |
|------|--------------|--------------|------------|
| `frontend/js/components/custom-colors.js` | 1,599 | ~800 | High - 50+ methods |
| `frontend/js/components/artworks.js` | 1,107 | ~700 | Medium - 35+ methods |

### Why Refactor?
- **Maintainability**: Files over 800 lines are difficult to navigate and maintain
- **Code Reusability**: Many utility functions could be shared across components
- **Testing**: Smaller modules are easier to unit test
- **Team Collaboration**: Smaller files reduce merge conflicts

## Refactoring Strategy

### Core Principles
1. **最小改动原则 (Minimal Change Principle)**: Make the smallest changes necessary
2. **No Breaking Changes**: All existing APIs must continue to work
3. **Preserve Functionality**: No features should be lost or changed
4. **Maintain Performance**: No negative impact on runtime performance

### Approach
- Extract pure utility functions that don't need component state
- Create service classes for complex business logic
- Keep component templates and core reactive logic intact
- Use ES6 modules for clean imports/exports

---

## Part 1: Custom Colors Component Refactoring

### Current Structure Analysis
```
custom-colors.js (1,599 lines)
├── Template (383 lines)
├── Props & Inject (5 lines)
├── Data (60 lines)
├── Computed Properties (226 lines) - 25 properties
├── Methods (914 lines) - 52 methods
└── Mounted & Watch (11 lines)
```

### Proposed New Structure

#### 1. **Main Component File**: `custom-colors.js` (~800 lines)
Retain:
- Complete template (383 lines)
- Component registration and props
- data() function
- Core computed properties (10 essential ones)
- Core methods that directly manipulate component state (20 methods)
- Lifecycle hooks (mounted, watch)

#### 2. **New File**: `frontend/js/utils/custom-colors-helpers.js` (~200 lines)
Extract pure utility functions:
```javascript
// Formula utilities
export const formulaUtils = {
  segments(formula) {
    return formula ? formula.split(/\s+/) : [];
  },
  
  parseFormula(formula) {
    // Extract material names and quantities
    // Move logic from existing component
  },
  
  validateFormula(formula, montMarteColors) {
    // Validate formula against available materials
  },
  
  normalizeFormula(formula) {
    // Standardize formula format
  }
};

// Color code generation
export const colorCodeGenerator = {
  generateCode(categoryId, categories, existingCodes) {
    // Logic from generateColorCode method
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '';
    
    const prefix = category.code;
    const usedNumbers = existingCodes
      .filter(code => code.startsWith(prefix))
      .map(code => parseInt(code.substring(prefix.length)) || 0);
    
    let nextNumber = 1;
    while (usedNumbers.includes(nextNumber)) nextNumber++;
    
    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  },
  
  validateCode(code, existingCodes, editingId = null) {
    // Check for duplicates excluding current editing item
    return !existingCodes.some(c => 
      c.color_code === code && c.id !== editingId
    );
  }
};

// Color conversion utilities
export const colorConverters = {
  getCMYKColor(c, m, y, k) {
    // CMYK to RGB conversion for display
    const r = Math.round(255 * (1 - c/100) * (1 - k/100));
    const g = Math.round(255 * (1 - m/100) * (1 - k/100));
    const b = Math.round(255 * (1 - y/100) * (1 - k/100));
    return `rgb(${r}, ${g}, ${b})`;
  },
  
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  },
  
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
};

// Pantone helper utilities
export const pantoneUtils = {
  getSwatchStyle(pantoneCode, pantoneHelper) {
    if (!pantoneCode || !pantoneHelper) {
      return { 
        backgroundColor: '#f5f5f5', 
        border: '1px dashed #ccc' 
      };
    }
    
    const color = pantoneHelper.getColorByName(pantoneCode);
    if (color) {
      return {
        backgroundColor: `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`,
        border: '1px solid rgba(0, 0, 0, 0.15)'
      };
    }
    
    return { 
      backgroundColor: '#f5f5f5', 
      border: '1px dashed #ccc' 
    };
  }
};
```

#### 3. **New File**: `frontend/js/services/duplicate-detector.js` (~150 lines)
Extract duplicate detection as a service:
```javascript
export class DuplicateDetector {
  constructor(threshold = 0.95) {
    this.threshold = threshold;
  }
  
  checkForDuplicates(colors) {
    const groups = {};
    
    colors.forEach(color => {
      if (!color.formula) return;
      
      const signature = this.getFormulaSignature(color.formula);
      if (!groups[signature]) {
        groups[signature] = [];
      }
      groups[signature].push(color);
    });
    
    // Filter out non-duplicate groups
    return Object.entries(groups)
      .filter(([_, colors]) => colors.length > 1)
      .map(([signature, colors]) => ({
        signature,
        records: colors,
        count: colors.length
      }));
  }
  
  getFormulaSignature(formula) {
    // Normalize and create signature for formula comparison
    const materials = this.parseFormulaMaterials(formula);
    const total = materials.reduce((sum, m) => sum + m.quantity, 0);
    
    // Create ratio-based signature
    const ratios = materials.map(m => ({
      name: m.name,
      ratio: (m.quantity / total).toFixed(4)
    }));
    
    return ratios
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(r => `${r.name}:${r.ratio}`)
      .join('|');
  }
  
  parseFormulaMaterials(formula) {
    // Parse formula into materials and quantities
    const segments = formula.split(/\s+/);
    const materials = [];
    
    for (let i = 0; i < segments.length; i += 2) {
      const name = segments[i];
      const quantityStr = segments[i + 1] || '';
      const quantity = parseFloat(quantityStr) || 0;
      
      if (name && quantity > 0) {
        materials.push({ name, quantity });
      }
    }
    
    return materials;
  }
  
  calculateSimilarity(formula1, formula2) {
    const sig1 = this.getFormulaSignature(formula1);
    const sig2 = this.getFormulaSignature(formula2);
    
    // Simple ratio comparison
    return sig1 === sig2 ? 1.0 : 0.0;
  }
}
```

#### 4. **New File**: `frontend/js/services/print-service.js` (~150 lines)
Extract printing functionality:
```javascript
export class PrintService {
  constructor() {
    this.printWindow = null;
  }
  
  printColorPalette(colors, categories) {
    const printContent = this.generatePrintHTML(colors, categories);
    this.createPrintWindow(printContent);
  }
  
  generatePrintHTML(colors, categories) {
    const colorCount = colors.length;
    const timestamp = new Date().toLocaleString('zh-CN');
    
    const styles = this.getPrintStyles();
    const headerHTML = this.generateHeader(colorCount, timestamp);
    const tableHTML = this.generateColorTable(colors, categories);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>自配色列表 - 打印</title>
        <meta charset="utf-8">
        ${styles}
      </head>
      <body>
        ${headerHTML}
        ${tableHTML}
      </body>
      </html>
    `;
  }
  
  getPrintStyles() {
    return `
      <style>
        @media print {
          body { margin: 0; }
          .header { position: fixed; top: 0; }
          @page { margin: 1cm; }
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 10pt;
          line-height: 1.4;
        }
        .header {
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 4px 8px;
          text-align: left;
        }
        th {
          background: #f5f5f5;
          font-weight: bold;
        }
        .color-swatch {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 1px solid #000;
          vertical-align: middle;
          margin-right: 5px;
        }
      </style>
    `;
  }
  
  generateHeader(colorCount, timestamp) {
    return `
      <div class="header">
        <h2 style="margin: 0;">STEREOWOOD 自配色列表</h2>
        <p style="margin: 5px 0;">
          共 ${colorCount} 个颜色 | 打印时间: ${timestamp}
        </p>
      </div>
    `;
  }
  
  generateColorTable(colors, categories) {
    const rows = colors.map(color => {
      const category = categories.find(c => c.id === color.category_id);
      return this.generateColorRow(color, category);
    }).join('');
    
    return `
      <table>
        <thead>
          <tr>
            <th style="width: 80px;">编号</th>
            <th style="width: 60px;">分类</th>
            <th>配方</th>
            <th style="width: 150px;">颜色信息</th>
            <th style="width: 120px;">更新时间</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }
  
  generateColorRow(color, category) {
    const categoryName = category ? category.name : '其他';
    const formula = color.formula || '(未指定)';
    const updateTime = color.updated_at ? 
      new Date(color.updated_at).toLocaleDateString('zh-CN') : '-';
    
    const colorInfo = this.formatColorInfo(color);
    
    return `
      <tr>
        <td>${color.color_code}</td>
        <td>${categoryName}</td>
        <td>${formula}</td>
        <td>${colorInfo}</td>
        <td>${updateTime}</td>
      </tr>
    `;
  }
  
  formatColorInfo(color) {
    const info = [];
    
    if (color.rgb_r != null || color.rgb_g != null || color.rgb_b != null) {
      info.push(`RGB: ${color.rgb_r||0}, ${color.rgb_g||0}, ${color.rgb_b||0}`);
    }
    
    if (color.hex_color) {
      info.push(`HEX: ${color.hex_color}`);
    }
    
    if (color.pantone_coated) {
      info.push(`Pantone C: ${color.pantone_coated}`);
    }
    
    return info.join('<br>') || '-';
  }
  
  createPrintWindow(content) {
    if (this.printWindow && !this.printWindow.closed) {
      this.printWindow.close();
    }
    
    this.printWindow = window.open('', '_blank', 
      'width=800,height=600,toolbar=no,location=no,menubar=no'
    );
    
    if (this.printWindow) {
      this.printWindow.document.write(content);
      this.printWindow.document.close();
      
      setTimeout(() => {
        this.printWindow.print();
      }, 500);
    }
  }
}
```

#### 5. **Integration in Component**
```javascript
// In custom-colors.js
import { formulaUtils, colorCodeGenerator, colorConverters, pantoneUtils } 
  from '../utils/custom-colors-helpers.js';
import { DuplicateDetector } from '../services/duplicate-detector.js';
import { PrintService } from '../services/print-service.js';

const CustomColorsComponent = {
  // ... existing props, inject, template ...
  
  data() {
    return {
      // ... existing data ...
      duplicateDetector: new DuplicateDetector(),
      printService: new PrintService()
    };
  },
  
  methods: {
    // Use imported utilities
    generateColorCode(categoryId) {
      return colorCodeGenerator.generateCode(
        categoryId, 
        this.categories, 
        this.customColors
      );
    },
    
    getCMYKColor(c, m, y, k) {
      return colorConverters.getCMYKColor(c, m, y, k);
    },
    
    runDuplicateCheck() {
      const duplicates = this.duplicateDetector.checkForDuplicates(
        this.customColors
      );
      this.duplicateGroups = duplicates;
    },
    
    printColorPalette() {
      this.printService.printColorPalette(
        this.customColors,
        this.categories
      );
    },
    
    // ... other methods remain but use extracted utilities ...
  }
};
```

---

## Part 2: Artworks Component Refactoring

### Current Structure Analysis
```
artworks.js (1,107 lines)
├── Template (439 lines)
├── Props & Inject (5 lines)
├── Data (45 lines)
├── Computed Properties (55 lines) - 11 properties
├── Methods (547 lines) - 36 methods
└── Mounted (16 lines)
```

### Proposed New Structure

#### 1. **Main Component File**: `artworks.js` (~700 lines)
Retain:
- Complete template (439 lines)
- Component registration and props
- data() function
- Core computed properties
- Core methods for UI interaction (15-20 methods)
- Lifecycle hooks

#### 2. **New File**: `frontend/js/utils/artwork-helpers.js` (~150 lines)
Extract utility functions:
```javascript
// Layer management utilities
export const layerUtils = {
  buildLayerPayload(mappings) {
    const arr = [];
    (mappings || []).forEach(m => {
      const layer = Number(m.layer);
      const code = String(m.colorCode || '').trim();
      if (Number.isFinite(layer) && layer > 0) {
        arr.push({ layer, colorCode: code });
      }
    });
    arr.sort((a, b) => a.layer - b.layer);
    return arr;
  },
  
  normalizedMappings(scheme) {
    const layers = scheme.layers || [];
    const map = {};
    
    layers.forEach(l => {
      const num = Number(l.layer_number);
      if (!Number.isFinite(num)) return;
      
      const code = l.color?.color_code || l.colorCode || '';
      if (!map[num]) map[num] = [];
      map[num].push(code);
    });
    
    const result = [];
    Object.keys(map)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(layer => {
        map[layer].forEach(code => {
          result.push({ layer, code });
        });
      });
    
    return result;
  },
  
  groupedByColor(scheme, colorMap) {
    const groups = {};
    const layers = scheme.layers || [];
    
    layers.forEach(l => {
      const code = l.color?.color_code || l.colorCode || '';
      const layer = Number(l.layer_number);
      
      if (!groups[code]) {
        groups[code] = {
          code,
          color: colorMap[code],
          layers: []
        };
      }
      
      groups[code].layers.push(layer);
    });
    
    return Object.values(groups).map(g => ({
      ...g,
      layers: g.layers.sort((a, b) => a - b),
      layerCount: g.layers.length
    }));
  },
  
  duplicateLayerSet(scheme) {
    const layerCounts = {};
    const layers = scheme.layers || [];
    
    layers.forEach(l => {
      const num = Number(l.layer_number);
      if (Number.isFinite(num)) {
        layerCounts[num] = (layerCounts[num] || 0) + 1;
      }
    });
    
    return new Set(
      Object.entries(layerCounts)
        .filter(([_, count]) => count > 1)
        .map(([layer, _]) => Number(layer))
    );
  }
};

// Artwork title utilities
export const titleParser = {
  parseArtworkTitle(str) {
    const trimmed = (str || '').trim();
    const match = trimmed.match(/^(\d+)[-\s]+(.+)$/);
    
    if (match) {
      return {
        code: match[1],
        name: match[2].trim()
      };
    }
    
    // Try to extract just numbers at the beginning
    const codeMatch = trimmed.match(/^(\d+)/);
    if (codeMatch) {
      const code = codeMatch[1];
      const name = trimmed.substring(code.length).replace(/^[-\s]+/, '').trim();
      return { code, name: name || '未命名' };
    }
    
    return null;
  },
  
  formatArtworkTitle(artwork) {
    const code = artwork.code || artwork.no || '';
    const name = artwork.name || artwork.title || '';
    
    if (code && name) {
      return `${code}-${name}`;
    }
    return code || name || '未命名作品';
  },
  
  validateTitle(title, existingArtworks, editingId = null) {
    const parsed = this.parseArtworkTitle(title);
    if (!parsed) return { valid: false, error: '格式错误' };
    
    const duplicate = existingArtworks.find(a => 
      a.code === parsed.code && a.id !== editingId
    );
    
    if (duplicate) {
      return { 
        valid: false, 
        error: `编号 ${parsed.code} 已存在` 
      };
    }
    
    return { valid: true, parsed };
  }
};

// Duplicate badge colors
export const dupBadgeColors = {
  palette: [
    '#E57373', '#64B5F6', '#81C784', '#FFD54F', 
    '#BA68C8', '#4DB6AC', '#FF8A65', '#A1887F',
    '#90A4AE', '#F06292', '#9575CD', '#4FC3F7', 
    '#AED581', '#FFB74D', '#7986CB', '#4DB6F3',
    '#DCE775', '#FFF176'
  ],
  
  getColor(layer) {
    const l = Number(layer);
    if (!Number.isFinite(l) || l <= 0) return '#999';
    return this.palette[(l - 1) % this.palette.length];
  }
};

// Scheme name utilities
export const schemeUtils = {
  displaySchemeName(artwork, scheme) {
    const schemeName = scheme.name || scheme.scheme_name || '默认';
    return `${schemeName}`;
  },
  
  validateSchemeName(name, artwork, editingSchemeId = null) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return { valid: false, error: '方案名称不能为空' };
    }
    
    const duplicate = (artwork.schemes || []).find(s => 
      s.name === trimmed && s.id !== editingSchemeId
    );
    
    if (duplicate) {
      return { 
        valid: false, 
        error: '该作品已存在同名配色方案' 
      };
    }
    
    return { valid: true };
  }
};
```

#### 3. **New File**: `frontend/js/services/scheme-manager.js` (~100 lines)
Extract scheme management logic:
```javascript
export class SchemeManager {
  constructor(api) {
    this.api = api;
  }
  
  async saveScheme(artworkId, schemeData, isEdit = false) {
    const formData = this.buildFormData(schemeData);
    
    if (isEdit && schemeData.id) {
      return await this.updateScheme(artworkId, schemeData.id, formData);
    } else {
      return await this.createScheme(artworkId, formData);
    }
  }
  
  buildFormData(schemeData) {
    const fd = new FormData();
    
    fd.append('name', schemeData.name.trim());
    fd.append('layers', JSON.stringify(schemeData.layers));
    
    if (schemeData.thumbnailFile) {
      fd.append('thumbnail', schemeData.thumbnailFile);
    } else if (schemeData.existingThumbnailPath) {
      fd.append('existingThumbnailPath', schemeData.existingThumbnailPath);
    }
    
    return fd;
  }
  
  async createScheme(artworkId, formData) {
    if (this.api?.artworks?.addScheme) {
      return await this.api.artworks.addScheme(artworkId, formData);
    } else {
      const url = `${window.location.origin}/api/artworks/${artworkId}/schemes`;
      return await axios.post(url, formData);
    }
  }
  
  async updateScheme(artworkId, schemeId, formData) {
    if (this.api?.artworks?.updateScheme) {
      return await this.api.artworks.updateScheme(artworkId, schemeId, formData);
    } else {
      const url = `${window.location.origin}/api/artworks/${artworkId}/schemes/${schemeId}`;
      return await axios.put(url, formData);
    }
  }
  
  async deleteScheme(artworkId, schemeId) {
    const url = `${window.location.origin}/api/artworks/${artworkId}/schemes/${schemeId}`;
    return await axios.delete(url);
  }
  
  validateSchemeData(schemeData, artwork) {
    const errors = [];
    
    // Validate name
    if (!schemeData.name?.trim()) {
      errors.push('方案名称不能为空');
    }
    
    // Check for duplicate names
    const isDuplicate = (artwork.schemes || []).some(s => 
      s.name === schemeData.name.trim() && s.id !== schemeData.id
    );
    
    if (isDuplicate) {
      errors.push('该作品已存在同名配色方案');
    }
    
    // Validate layers
    if (!schemeData.layers || schemeData.layers.length === 0) {
      errors.push('至少需要一个层配色');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

#### 4. **Integration in Component**
```javascript
// In artworks.js
import { layerUtils, titleParser, dupBadgeColors, schemeUtils } 
  from '../utils/artwork-helpers.js';
import { SchemeManager } from '../services/scheme-manager.js';

const ArtworksComponent = {
  // ... existing props, inject, template ...
  
  data() {
    return {
      // ... existing data ...
      schemeManager: new SchemeManager(window.api)
    };
  },
  
  computed: {
    // Use imported utilities in computed properties
    formDupCounts() {
      const duplicates = layerUtils.duplicateLayerSet({
        layers: this.schemeForm.mappings
      });
      return duplicates;
    }
  },
  
  methods: {
    // Simplified methods using utilities
    buildLayerPayload() {
      return layerUtils.buildLayerPayload(this.schemeForm.mappings);
    },
    
    dupBadgeColor(layer) {
      return dupBadgeColors.getColor(layer);
    },
    
    parseArtworkTitle(str) {
      return titleParser.parseArtworkTitle(str);
    },
    
    async saveScheme() {
      const valid = await this.$refs.schemeFormRef.validate().catch(() => false);
      if (!valid) return;
      
      const schemeData = {
        id: this.schemeForm.id,
        name: this.schemeForm.name,
        layers: this.buildLayerPayload(),
        thumbnailFile: this.schemeForm.thumbnailFile,
        existingThumbnailPath: this.schemeEditing?.scheme?.thumbnail_path
      };
      
      try {
        await this.schemeManager.saveScheme(
          this.editingArtId,
          schemeData,
          !!this.schemeForm.id
        );
        
        this.$message.success(
          this.schemeForm.id ? '已保存方案修改' : '已新增配色方案'
        );
        
        await this.refreshAll();
        this.showSchemeDialog = false;
      } catch (error) {
        this.$message.error('保存失败');
      }
    },
    
    // ... other methods simplified using utilities ...
  }
};
```

---

## Implementation Schedule

### Phase 1: Preparation (Day 1)
1. Create utility file structure
2. Set up ES6 module imports
3. Test module loading

### Phase 2: Extract Utilities (Day 2-3)
4. Create and test `custom-colors-helpers.js`
5. Create and test `artwork-helpers.js`
6. Verify utility functions work independently

### Phase 3: Extract Services (Day 4-5)
7. Implement `DuplicateDetector` class
8. Implement `PrintService` class
9. Implement `SchemeManager` class
10. Unit test service classes

### Phase 4: Component Integration (Day 6-7)
11. Update `custom-colors.js` to use utilities
12. Update `artworks.js` to use utilities
13. Test all functionality remains intact

### Phase 5: Testing & Validation (Day 8)
14. Full functional testing
15. Performance testing
16. Fix any issues found
17. Document changes

---

## Risk Assessment & Mitigation

### Risks
1. **Import Path Issues**: ES6 modules might have path resolution issues
   - Mitigation: Test imports early, use absolute paths if needed

2. **State Management**: Extracted functions losing access to component state
   - Mitigation: Pass required state as parameters

3. **Browser Compatibility**: Older browsers might not support ES6 modules
   - Mitigation: Use a bundler if needed (webpack/vite)

4. **Performance Impact**: Additional file loading might slow initial load
   - Mitigation: Measure performance, use lazy loading if needed

### Testing Strategy
1. **Unit Tests**: Test each extracted utility function
2. **Integration Tests**: Test components with new structure
3. **Regression Tests**: Ensure all existing features work
4. **Performance Tests**: Compare load times before/after

---

## Success Metrics

### Quantitative Metrics
- All files under 800 lines
- 30-40% reduction in component file sizes
- No increase in load time (< 100ms difference)
- Zero functional regressions

### Qualitative Metrics
- Improved code readability
- Easier navigation and maintenance
- Better separation of concerns
- Reusable utility functions

---

## Rollback Plan

If issues arise during implementation:

1. **Immediate Rollback**: Git revert to previous commit
2. **Partial Rollback**: Keep utility files but restore component structure
3. **Gradual Migration**: Implement changes one component at a time

---

## Conclusion

This refactoring plan will:
- Reduce file sizes by ~40% while maintaining all functionality
- Improve code organization and maintainability
- Create reusable utilities for future development
- Follow the principle of minimal changes (最小改动原则)

The modular approach ensures we can test each phase independently and rollback if needed, minimizing risk to the production system.