# STEREOWOOD Color System — Comprehensive Refactoring Master Plan

**Document Version**: 3.0 (Combined and Enhanced)
**Date**: 2025-01-13
**System Version**: v0.8.2
**Estimated Timeline**: 9-10 weeks (2-person team)

---

## Executive Summary

This document provides a comprehensive, test-first refactoring strategy for the STEREOWOOD Color Management System. It combines detailed technical analysis with practical implementation steps to transform the current monolithic structure into a modern, maintainable, and scalable architecture while ensuring zero downtime and preserving all functionality.

### Key Objectives
- **Code Reduction**: 30-40% through modularization and deduplication
- **Performance**: <2s page load, <200ms API response times
- **Test Coverage**: >80% across unit, integration, and E2E tests
- **Maintainability**: Modern Vue 3 with TypeScript migration path
- **Zero Risk**: Archive-first approach, comprehensive testing, gradual rollout

---

## Current State Analysis

### Codebase Audit Results

#### Frontend Issues
**Monolithic Components** (Primary Targets):
- `color-dictionary.js`: 1891 lines, ~78 KB
- `custom-colors.js`: 1822 lines, ~82 KB
- `artworks.js`: 1583 lines, ~68 KB
- `color-palette-dialog.js`: 1544 lines, ~61 KB
- `mont-marte.js`: 977 lines, ~47 KB
- `formula-calculator.js`: 636 lines, ~27 KB

**Performance Bottlenecks**:
- `pantone-colors-full.js`: ~1.13 MB loaded on every page
- All components loaded globally via CDN
- No code splitting or lazy loading
- No build optimization

**Code Quality Issues**:
- 84+ console.log statements scattered throughout
- Consolidate new `color-tools.js` usage across components
- Multiple overlapping helpers: `helpers.js`, `message.js`
- Obsolete files: `version-guard.js` (0 bytes)
- Direct DOM manipulation mixed with Vue reactive patterns

#### Backend Observations
- Routes contain business logic (should be in services/controllers)
- Validation logic scattered across routes
- Services exist but underutilized (`ColorService.js`, `ArtworkService.js`)
- No centralized error handling patterns
- Missing database indexes for performance

### Technical Debt Summary
- **No automated testing** (0% coverage currently)
- **No build process** (raw JS files served)
- **Mixed patterns** (Vue 2 Options API, jQuery-style DOM manipulation)
- **No type safety** (pure JavaScript)
- **Inconsistent error handling**
- **No monitoring or logging strategy**

---

## Target Architecture

### Frontend Architecture (Vue 3 + Vite)
```
frontend/
├── src/
│   ├── app/
│   │   ├── App.vue              # Root component
│   │   ├── main.ts              # Entry point
│   │   └── router.ts            # Vue Router config
│   ├── components/
│   │   ├── shared/              # Reusable components
│   │   │   ├── BaseCard.vue
│   │   │   ├── BaseForm.vue
│   │   │   ├── BaseGrid.vue
│   │   │   ├── Pagination.vue
│   │   │   ├── SearchBar.vue
│   │   │   └── ImageUploader.vue
│   │   ├── custom-colors/       # Feature components
│   │   ├── artworks/
│   │   ├── dictionary/
│   │   └── materials/
│   ├── views/                   # Page components
│   │   ├── CustomColorsView.vue
│   │   ├── ArtworksView.vue
│   │   ├── DictionaryView.vue
│   │   └── MaterialsView.vue
│   ├── composables/             # Composition API hooks
│   │   ├── useColors.ts
│   │   ├── useArtworks.ts
│   │   ├── usePagination.ts
│   │   ├── useFilters.ts
│   │   ├── useAsyncData.ts
│   │   └── useDebounce.ts
│   ├── services/                # API layer
│   │   ├── http.ts              # Axios instance
│   │   ├── api/
│   │   │   ├── colors.ts
│   │   │   ├── artworks.ts
│   │   │   ├── materials.ts
│   │   │   └── categories.ts
│   │   └── pantone.ts           # Lazy-loaded data
│   ├── stores/                  # Pinia state management
│   │   ├── colors.ts
│   │   ├── artworks.ts
│   │   └── app.ts
│   ├── utils/                   # Utilities
│   │   ├── color.ts             # Color conversions
│   │   ├── formula.ts           # Formula parsing
│   │   ├── validators.ts        # Input validation
│   │   ├── formatters.ts        # Data formatting
│   │   └── notify.ts            # Toast notifications
│   └── assets/
│       ├── styles/
│       │   ├── variables.css    # Design tokens
│       │   ├── base.css         # Reset/normalize
│       │   └── utilities.css    # Helper classes
│       └── images/
├── public/
│   ├── index.html
│   ├── data/
│   │   └── pantone-colors.json  # Lazy-loaded
│   └── legacy.html              # CDN fallback
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── vite.config.ts
```

### Backend Architecture (Node.js + Express)
```
backend/
├── controllers/                 # Request orchestration
│   ├── ColorController.js
│   ├── ArtworkController.js
│   ├── MaterialController.js
│   └── CategoryController.js
├── services/                    # Business logic
│   ├── ColorService.js
│   ├── FormulaService.js
│   ├── DuplicateService.js
│   ├── ImageService.js
│   └── CacheService.js
├── routes/                      # Thin routing layer
│   ├── v1/                      # API versioning
│   │   ├── colors.js
│   │   ├── artworks.js
│   │   ├── materials.js
│   │   └── categories.js
│   └── index.js
├── middleware/
│   ├── validation.js            # Joi/Zod schemas
│   ├── errorHandler.js          # Centralized errors
│   ├── rateLimiter.js           # Rate limiting
│   └── logger.js                # Winston/Pino
├── db/
│   ├── index.js                 # Connection + PRAGMA
│   ├── migrations.js            # Schema management
│   └── queries/                 # SQL modules
├── validation/                  # Schema definitions
│   ├── color.schema.js
│   ├── artwork.schema.js
│   └── common.schema.js
└── utils/
    ├── constants.js
    └── logger.js
```

---

## Implementation Phases

### Phase 0: Safety & Foundation (Week 1)

#### 0.1 Archive System Setup
**Priority**: CRITICAL - Must complete before any changes

```bash
# Archive structure
archives/
├── v0.8.2-baseline/             # Complete snapshot
│   ├── frontend/
│   │   ├── components/          # All original components
│   │   ├── utils/               # All utilities
│   │   └── index.html           # Original entry
│   ├── backend/
│   │   └── services/            # Original services
│   └── css/                     # Original styles
├── deprecated/                  # Files replaced during refactor
└── README.md                    # Archive documentation
```

**Actions**:
1. Create archive script:
```javascript
// scripts/archive.js
const fs = require('fs-extra');
const path = require('path');

const ARCHIVE_VERSION = 'v0.8.2-baseline';
const FILES_TO_ARCHIVE = [
  'frontend/js/components/*.js',
  'frontend/js/utils/*.js',
  'frontend/index.html',
  'frontend/css/**/*.css',
  'backend/services/*.js'
];

async function createArchive() {
  const timestamp = new Date().toISOString().split('T')[0];
  const archivePath = `archives/${ARCHIVE_VERSION}-${timestamp}`;

  for (const pattern of FILES_TO_ARCHIVE) {
    // Copy files matching pattern
    await fs.copy(pattern, path.join(archivePath, pattern));
  }

  // Create documentation
  await fs.writeFile(
    path.join(archivePath, 'README.md'),
    `# Archive: ${ARCHIVE_VERSION}
    Date: ${timestamp}
    Purpose: Baseline before refactoring
    Restoration: npm run archive:restore ${ARCHIVE_VERSION}`
  );
}
```

2. Update .gitignore and .dockerignore:
```gitignore
# Archives
/archives/
/archives/**/*
/deprecated/
```

#### 0.2 Testing Infrastructure
**Goal**: Establish comprehensive test coverage baseline

```json
// package.json additions
{
  "scripts": {
    "test": "npm run test:unit && npm run test:api && npm run test:e2e",
    "test:unit": "jest --coverage",
    "test:api": "jest --testPathPattern=api --runInBand",
    "test:e2e": "playwright test",
    "test:watch": "jest --watch",
    "lint": "eslint . --ext .js,.vue,.ts",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@vue/test-utils": "^2.4.0",
    "jest": "^29.7.0",
    "@vue/vue3-jest": "^29.2.0",
    "supertest": "^6.3.0",
    "eslint": "^8.56.0",
    "eslint-plugin-vue": "^9.19.0",
    "prettier": "^3.1.0"
  }
}
```

**Initial Test Suite**:
```javascript
// tests/e2e/baseline.spec.js
test('Custom Colors - CRUD operations', async ({ page }) => {
  // Capture baseline behavior
  await page.goto('http://localhost:9099');
  await page.click('[data-tab="custom-colors"]');

  // Test add color
  await page.click('.add-color-btn');
  await page.fill('#color-code', 'TEST001');
  await page.fill('#color-name', 'Test Color');
  await page.fill('#formula', '红 50g 黄 30g');
  await page.click('.save-btn');

  // Verify creation
  await expect(page.locator('.color-card:has-text("TEST001")')).toBeVisible();
});
```

#### 0.3 Performance Baseline
**Metrics to capture before refactoring**:

```javascript
// scripts/performance-baseline.js
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

async function captureBaseline() {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  const options = {
    logLevel: 'info',
    output: 'json',
    port: chrome.port
  };

  const results = await lighthouse('http://localhost:9099', options);

  // Save baseline metrics
  const metrics = {
    FCP: results.lhr.audits['first-contentful-paint'].numericValue,
    TTI: results.lhr.audits['interactive'].numericValue,
    SpeedIndex: results.lhr.audits['speed-index'].numericValue,
    TotalBlockingTime: results.lhr.audits['total-blocking-time'].numericValue,
    CLS: results.lhr.audits['cumulative-layout-shift'].numericValue,
    Performance: results.lhr.categories.performance.score * 100
  };

  await fs.writeJson('tests/baseline/performance.json', metrics);
  await chrome.kill();
}
```

**Success Criteria**:
- ✅ Complete archive created
- ✅ Test infrastructure running
- ✅ Baseline metrics documented
- ✅ CI/CD pipeline configured

---

### Phase 1: Utilities Consolidation (Week 2)

#### 1.1 Color Utilities Merge
**Target**: Reduce from 2 files to 1, add TypeScript

```typescript
// src/utils/color.ts
export interface RGB { r: number; g: number; b: number; }
export interface HSL { h: number; s: number; l: number; }
export interface CMYK { c: number; m: number; y: number; k: number; }
export interface LAB { l: number; a: number; b: number; }

// Merged from color-converter.js and colorConversion.js
export function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function rgbToHex(rgb: RGB): string {
  return "#" + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b)
    .toString(16).slice(1);
}

export function rgbToCmyk(rgb: RGB): CMYK {
  // Implementation
}

export function rgbToHsl(rgb: RGB): HSL {
  // Implementation
}

export function rgbToLab(rgb: RGB): LAB {
  // Implementation
}

// Legacy support during migration
if (typeof window !== 'undefined') {
  window.ColorUtils = {
    hexToRgb, rgbToHex, rgbToCmyk, rgbToHsl, rgbToLab
  };
}
```

#### 1.2 Helper Consolidation
**Target**: Unify helpers and messaging

```typescript
// src/utils/notify.ts
import { ElMessage, ElMessageBox } from 'element-plus';

export const notify = {
  success(message: string) {
    ElMessage.success({ message, duration: 3000 });
  },

  error(message: string) {
    ElMessage.error({ message, duration: 5000 });
  },

  warning(message: string) {
    ElMessage.warning({ message, duration: 4000 });
  },

  async confirm(message: string, title = '确认'): Promise<boolean> {
    try {
      await ElMessageBox.confirm(message, title);
      return true;
    } catch {
      return false;
    }
  }
};

// src/utils/formatters.ts
export function formatDate(date: string | Date): string {
  // Consolidated from helpers.js
}

export function formatFormula(formula: string): string {
  // Consolidated from multiple locations
}
```

**Tests Required**:
```javascript
// tests/unit/utils/color.spec.js
describe('Color Utilities', () => {
  test('hexToRgb converts correctly', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  test('rgbToHex converts correctly', () => {
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
  });

  test('rgbToCmyk handles edge cases', () => {
    expect(rgbToCmyk({ r: 0, g: 0, b: 0 })).toEqual({ c: 0, m: 0, y: 0, k: 100 });
  });
});
```

---

### Phase 2: Performance Optimization (Week 3)

#### 2.1 Pantone Data Lazy Loading
**Current Issue**: 1.13 MB loaded on every page

```typescript
// src/services/pantone.ts
interface PantoneColor {
  code: string;
  name: string;
  hex: string;
  rgb: RGB;
}

class PantoneService {
  private cache: Map<string, PantoneColor[]> = new Map();

  async loadPantone(options: { full?: boolean } = {}): Promise<PantoneColor[]> {
    const cacheKey = options.full ? 'full' : 'basic';

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const endpoint = options.full
      ? '/data/pantone-colors-full.json'
      : '/data/pantone-colors-basic.json';

    const response = await fetch(endpoint);
    const data = await response.json();

    this.cache.set(cacheKey, data);
    return data;
  }

  async searchPantone(query: string): Promise<PantoneColor[]> {
    const colors = await this.loadPantone({ full: true });
    return colors.filter(c =>
      c.code.includes(query) ||
      c.name.toLowerCase().includes(query.toLowerCase())
    );
  }
}

export const pantoneService = new PantoneService();
```

```typescript
// src/composables/usePantone.ts
import { ref, computed } from 'vue';
import { pantoneService } from '@/services/pantone';

export function usePantone() {
  const colors = ref<PantoneColor[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const loadColors = async (full = false) => {
    loading.value = true;
    error.value = null;

    try {
      colors.value = await pantoneService.loadPantone({ full });
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  return {
    colors: computed(() => colors.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    loadColors
  };
}
```

#### 2.2 Bundle Optimization with Vite
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    vue(),
    visualizer({
      template: 'treemap',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ],

  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia'],
          'element': ['element-plus'],
          'utils': ['axios', 'lodash-es']
        }
      }
    },
    chunkSizeWarningLimit: 500
  },

  optimizeDeps: {
    include: ['element-plus', 'vue', 'axios']
  }
});
```

---

### Phase 3: API Modernization (Week 3-4)

#### 3.1 Service Layer Architecture
```typescript
// src/services/http.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { notify } from '@/utils/notify';

class HttpService {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:9099/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      config => {
        // Add auth token if exists
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      response => response.data,
      (error: AxiosError) => {
        const message = error.response?.data?.error || '网络错误';
        notify.error(message);
        return Promise.reject(error);
      }
    );
  }

  get axios() {
    return this.instance;
  }
}

export const http = new HttpService().axios;
```

```typescript
// src/services/api/colors.ts
import { http } from '../http';

export interface Color {
  id: number;
  color_code: string;
  name: string;
  formula: string;
  category_id: number;
  image_path?: string;
  created_at: string;
  updated_at: string;
}

export const colorsApi = {
  async getAll(params?: { category?: number; search?: string }): Promise<Color[]> {
    return http.get('/custom-colors', { params });
  },

  async getById(id: number): Promise<Color> {
    return http.get(`/custom-colors/${id}`);
  },

  async create(color: Omit<Color, 'id' | 'created_at' | 'updated_at'>): Promise<Color> {
    return http.post('/custom-colors', color);
  },

  async update(id: number, color: Partial<Color>): Promise<Color> {
    return http.put(`/custom-colors/${id}`, color);
  },

  async delete(id: number): Promise<void> {
    return http.delete(`/custom-colors/${id}`);
  },

  async checkDuplicate(formula: string): Promise<{ isDuplicate: boolean; similar: Color[] }> {
    return http.post('/custom-colors/check-duplicate', { formula });
  }
};
```

---

### Phase 4: Component Modularization (Week 4-6)

#### 4.1 Breaking Down Custom Colors Component
**From**: 1822 lines monolith
**To**: Multiple focused SFCs

```vue
<!-- src/views/CustomColorsView.vue -->
<template>
  <div class="custom-colors-view">
    <ColorFilters
      v-model:category="filters.category"
      v-model:search="filters.search"
      @update="handleFilterUpdate"
    />

    <ColorGrid
      :colors="paginatedColors"
      :loading="loading"
      @select="handleColorSelect"
      @edit="handleColorEdit"
      @delete="handleColorDelete"
    />

    <Pagination
      v-model:page="currentPage"
      :total="totalColors"
      :page-size="pageSize"
    />

    <ColorFormDialog
      v-model="showForm"
      :color="editingColor"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCustomColors } from '@/composables/useCustomColors';
import ColorFilters from '@/components/custom-colors/ColorFilters.vue';
import ColorGrid from '@/components/custom-colors/ColorGrid.vue';
import ColorFormDialog from '@/components/custom-colors/ColorFormDialog.vue';
import Pagination from '@/components/shared/Pagination.vue';

const {
  colors,
  loading,
  filters,
  currentPage,
  pageSize,
  totalColors,
  paginatedColors,
  loadColors,
  createColor,
  updateColor,
  deleteColor
} = useCustomColors();

// Event handlers
const handleFilterUpdate = () => {
  currentPage.value = 1;
  loadColors();
};

const handleColorEdit = (color: Color) => {
  editingColor.value = color;
  showForm.value = true;
};

const handleSave = async (color: Color) => {
  if (color.id) {
    await updateColor(color.id, color);
  } else {
    await createColor(color);
  }
  showForm.value = false;
};
</script>
```

```vue
<!-- src/components/custom-colors/ColorCard.vue -->
<template>
  <div class="color-card" :class="{ selected, highlighted }" @click="$emit('select')">
    <div class="color-header">
      <h3>{{ color.color_code }}</h3>
      <span class="category">{{ categoryName }}</span>
    </div>

    <div class="color-preview" v-if="color.image_path">
      <img :src="color.image_path" :alt="color.name" />
    </div>

    <div class="color-formula">
      <FormulaChips :formula="color.formula" />
    </div>

    <div class="color-actions">
      <el-button size="small" @click.stop="$emit('edit')">编辑</el-button>
      <el-button size="small" type="danger" @click.stop="$emit('delete')">删除</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import FormulaChips from '@/components/shared/FormulaChips.vue';

const props = defineProps<{
  color: Color;
  selected?: boolean;
  highlighted?: boolean;
}>();

const emit = defineEmits<{
  select: [];
  edit: [];
  delete: [];
}>();

const categoryName = computed(() => {
  // Category logic
});
</script>
```

#### 4.2 Shared Components Library
```vue
<!-- src/components/shared/BaseCard.vue -->
<template>
  <div class="base-card" :class="cardClasses">
    <div class="base-card__header" v-if="$slots.header || title">
      <slot name="header">
        <h3>{{ title }}</h3>
      </slot>
    </div>

    <div class="base-card__body">
      <slot />
    </div>

    <div class="base-card__footer" v-if="$slots.footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  bordered?: boolean;
  shadow?: 'always' | 'hover' | 'never';
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  bordered: true,
  shadow: 'hover',
  clickable: false
});

const cardClasses = computed(() => ({
  'base-card--bordered': props.bordered,
  'base-card--clickable': props.clickable,
  [`base-card--shadow-${props.shadow}`]: true
}));
</script>
```

---

### Phase 5: Backend Optimization (Week 7-8)

#### 5.1 Controller Layer Implementation
```javascript
// backend/controllers/ColorController.js
const { validationResult } = require('express-validator');
const ColorService = require('../services/ColorService');
const DuplicateService = require('../services/DuplicateService');
const CacheService = require('../services/CacheService');

class ColorController {
  async getAll(req, res, next) {
    try {
      const { category, search, page = 1, limit = 50 } = req.query;

      // Check cache first
      const cacheKey = `colors:${category}:${search}:${page}:${limit}`;
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const colors = await ColorService.findAll({
        category,
        search,
        offset: (page - 1) * limit,
        limit
      });

      // Cache for 5 minutes
      await CacheService.set(cacheKey, colors, 300);

      res.json(colors);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check duplicates
      const duplicates = await DuplicateService.checkFormula(req.body.formula);
      if (duplicates.length > 0) {
        return res.status(409).json({
          error: 'Duplicate formula detected',
          duplicates
        });
      }

      const color = await ColorService.create(req.body);

      // Invalidate cache
      await CacheService.invalidatePattern('colors:*');

      res.status(201).json(color);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ColorController();
```

#### 5.2 Service Layer Refactoring
```javascript
// backend/services/ColorService.js
const db = require('../db');
const FormulaService = require('./FormulaService');

class ColorService {
  async findAll({ category, search, offset = 0, limit = 50 }) {
    let query = `
      SELECT c.*, cat.name as category_name
      FROM custom_colors c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE 1=1
    `;

    const params = [];

    if (category) {
      query += ' AND c.category_id = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (c.color_code LIKE ? OR c.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY c.updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return db.all(query, params);
  }

  async create(colorData) {
    const { color_code, name, formula, category_id, image_path } = colorData;

    // Parse and validate formula
    const parsedFormula = FormulaService.parse(formula);
    const normalizedFormula = FormulaService.normalize(parsedFormula);

    const result = await db.run(
      `INSERT INTO custom_colors
       (color_code, name, formula, category_id, image_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [color_code, name, normalizedFormula, category_id, image_path]
    );

    return this.findById(result.lastID);
  }

  async update(id, updates) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (['color_code', 'name', 'formula', 'category_id', 'image_path'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    fields.push('updated_at = datetime("now")');
    values.push(id);

    await db.run(
      `UPDATE custom_colors SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }
}

module.exports = new ColorService();
```

#### 5.3 Database Optimization
```sql
-- backend/db/migrations/002_add_indexes.sql
CREATE INDEX IF NOT EXISTS idx_color_code ON custom_colors(color_code);
CREATE INDEX IF NOT EXISTS idx_category_id ON custom_colors(category_id);
CREATE INDEX IF NOT EXISTS idx_updated_at ON custom_colors(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_artwork_name ON artworks(name);
CREATE INDEX IF NOT EXISTS idx_formula_text ON custom_colors(formula);

-- Add full-text search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS colors_fts USING fts5(
  color_code,
  name,
  formula,
  content=custom_colors
);

-- Trigger to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS colors_fts_insert AFTER INSERT ON custom_colors
BEGIN
  INSERT INTO colors_fts(rowid, color_code, name, formula)
  VALUES (new.id, new.color_code, new.name, new.formula);
END;

CREATE TRIGGER IF NOT EXISTS colors_fts_update AFTER UPDATE ON custom_colors
BEGIN
  UPDATE colors_fts
  SET color_code = new.color_code,
      name = new.name,
      formula = new.formula
  WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS colors_fts_delete AFTER DELETE ON custom_colors
BEGIN
  DELETE FROM colors_fts WHERE rowid = old.id;
END;
```

---

### Phase 6: Testing & Quality (Week 8)

#### 6.1 Comprehensive Test Coverage

**Unit Testing Strategy**:
```javascript
// tests/unit/services/FormulaService.spec.js
describe('FormulaService', () => {
  describe('parse', () => {
    test('parses simple formula correctly', () => {
      const result = FormulaService.parse('红 50g 黄 30g');
      expect(result).toEqual([
        { material: '红', quantity: 50, unit: 'g' },
        { material: '黄', quantity: 30, unit: 'g' }
      ]);
    });

    test('handles different units', () => {
      const result = FormulaService.parse('蓝 100ml 白 200g');
      expect(result).toEqual([
        { material: '蓝', quantity: 100, unit: 'ml' },
        { material: '白', quantity: 200, unit: 'g' }
      ]);
    });

    test('throws on invalid formula', () => {
      expect(() => FormulaService.parse('invalid')).toThrow();
    });
  });

  describe('calculateSimilarity', () => {
    test('identical formulas have similarity 1.0', () => {
      const f1 = '红 50g 黄 30g';
      const f2 = '红 50g 黄 30g';
      expect(FormulaService.calculateSimilarity(f1, f2)).toBe(1.0);
    });

    test('proportional formulas have high similarity', () => {
      const f1 = '红 50g 黄 30g';
      const f2 = '红 100g 黄 60g';
      expect(FormulaService.calculateSimilarity(f1, f2)).toBeGreaterThan(0.95);
    });
  });
});
```

**E2E Testing Suite**:
```typescript
// tests/e2e/custom-colors.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Custom Colors Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/custom-colors');
  });

  test('should add new color', async ({ page }) => {
    await page.click('[data-testid="add-color-btn"]');

    await page.fill('[data-testid="color-code"]', 'TEST-001');
    await page.fill('[data-testid="color-name"]', 'Test Red');
    await page.fill('[data-testid="formula"]', '红 100g 白 50g');
    await page.selectOption('[data-testid="category"]', '3'); // Red category

    await page.click('[data-testid="save-btn"]');

    // Verify success message
    await expect(page.locator('.el-message--success')).toContainText('创建成功');

    // Verify card appears
    await expect(page.locator('[data-color-code="TEST-001"]')).toBeVisible();
  });

  test('should detect duplicate formulas', async ({ page }) => {
    // Add first color
    await page.click('[data-testid="add-color-btn"]');
    await page.fill('[data-testid="formula"]', '红 100g 黄 50g');
    await page.click('[data-testid="save-btn"]');

    // Try to add duplicate
    await page.click('[data-testid="add-color-btn"]');
    await page.fill('[data-testid="formula"]', '红 100g 黄 50g');
    await page.click('[data-testid="save-btn"]');

    // Should show duplicate warning
    await expect(page.locator('.duplicate-warning')).toBeVisible();
  });

  test('should filter by category', async ({ page }) => {
    await page.click('[data-category="red"]');

    // All visible cards should be red category
    const cards = page.locator('.color-card');
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i).locator('.category')).toContainText('红');
    }
  });
});
```

#### 6.2 Code Quality Tools

**ESLint Configuration**:
```javascript
// .eslintrc.js
module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-explicit-any': 'warn'
  }
};
```

**Prettier Configuration**:
```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "vueIndentScriptAndStyle": false
}
```

---

### Phase 7: Logging & Monitoring (Week 9)

#### 7.1 Structured Logging
```javascript
// backend/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'stereowood-api' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

**Frontend Debug Helper**:
```typescript
// src/utils/debug.ts
const isDevelopment = import.meta.env.DEV;

export const debug = {
  log(...args: any[]) {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  error(...args: any[]) {
    if (isDevelopment) {
      console.error('[ERROR]', ...args);
    }
    // Send to error tracking in production
    if (!isDevelopment && window.Sentry) {
      window.Sentry.captureException(new Error(args.join(' ')));
    }
  },

  time(label: string) {
    if (isDevelopment) {
      console.time(label);
    }
  },

  timeEnd(label: string) {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  }
};
```

#### 7.2 Performance Monitoring
```javascript
// backend/middleware/performance.js
const logger = require('../utils/logger');

module.exports = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info('request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      userAgent: req.get('user-agent'),
      ip: req.ip
    });

    // Alert on slow requests
    if (duration > 1000) {
      logger.warn('slow-request', {
        url: req.url,
        duration
      });
    }
  });

  next();
};
```

---

### Phase 8: Deployment & CI/CD (Week 9-10)

#### 8.1 Docker Optimization
```dockerfile
# Multi-stage build for smaller image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --only=production
RUN cd frontend && npm ci --only=production

# Copy source
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/backend ./backend
COPY --from=builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist
COPY --chown=nodejs:nodejs package*.json ./

# Create necessary directories
RUN mkdir -p /app/backend/uploads /app/logs && \
    chown -R nodejs:nodejs /app/backend/uploads /app/logs

USER nodejs

EXPOSE 9099

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/server.js"]
```

#### 8.2 GitHub Actions CI/CD
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: |
        npm ci
        cd frontend && npm ci

    - name: Run linting
      run: npm run lint

    - name: Run unit tests
      run: npm run test:unit -- --coverage

    - name: Run API tests
      run: |
        npm run start:test &
        sleep 5
        npm run test:api

    - name: Run E2E tests
      run: |
        npx playwright install
        npm run test:e2e

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info

    - name: Build Docker image
      if: github.ref == 'refs/heads/main'
      run: docker build -t stereowood:${{ github.sha }} .

    - name: Security scan
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: stereowood:${{ github.sha }}
        format: 'sarif'
        output: 'trivy-results.sarif'
```

---

## Success Metrics & KPIs

### Technical Metrics
| Metric | Current | Target | Measurement Method |
|--------|---------|--------|-------------------|
| Code Lines | 8,500 | 5,000 (-41%) | cloc analysis |
| Component Size | 1500+ lines | <500 lines | File analysis |
| Test Coverage | 0% | >80% | Jest coverage |
| Page Load Time | 4.5s | <2s | Lighthouse |
| API Response | 350ms avg | <200ms | Performance monitoring |
| Bundle Size | 2.3MB | <500KB gzipped | Webpack analyzer |
| Duplicate Code | ~30% | <5% | Sonarqube |

### Business Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| System Uptime | 99.9% | Monitoring tools |
| Zero Data Loss | 100% | Audit logs |
| Feature Velocity | +30% | Sprint metrics |
| Bug Rate | -50% | Issue tracking |
| Maintenance Time | -60% | Time tracking |

### Quality Gates (Per Phase)
- ✅ All tests passing (unit, integration, E2E)
- ✅ No regression in performance metrics
- ✅ Code coverage maintained or improved
- ✅ Zero critical security vulnerabilities
- ✅ Documentation updated
- ✅ Backward compatibility maintained

---

## Risk Management

### High-Risk Areas & Mitigation

#### 1. Formula Parsing Logic
**Risk**: Core business logic breakage
**Mitigation**:
- Comprehensive unit tests with edge cases
- Parallel run with validation
- Feature flag for rollback
- Extensive logging during transition

#### 2. Duplicate Detection Algorithm
**Risk**: False positives/negatives affecting data integrity
**Mitigation**:
- Keep threshold configurable
- A/B testing with sample data
- Manual review queue for edge cases
- Audit trail for all detections

#### 3. Database Migration
**Risk**: Data loss or corruption
**Mitigation**:
- Automated backups before each migration
- Reversible migrations only
- Test on production data copy
- Blue-green deployment strategy

#### 4. User Experience Disruption
**Risk**: Users unable to complete tasks
**Mitigation**:
- Feature flags for gradual rollout
- Legacy mode fallback
- User training materials
- Support hotline during transition

### Rollback Strategy
```bash
# Quick rollback procedure
1. Switch load balancer to previous version
2. Restore database from checkpoint
3. Clear CDN cache
4. Notify team via Slack
5. Investigate root cause
6. Plan fix and re-deployment
```

---

## Team Organization

### Role Distribution

**Developer 1 (Frontend Lead)**:
- Vue 3 migration and component splitting
- Composables and state management
- CSS modularization
- Frontend testing (unit + E2E)
- Performance optimization

**Developer 2 (Backend Lead)**:
- Controller/Service architecture
- Database optimization
- API versioning and documentation
- Backend testing (unit + integration)
- Logging and monitoring

**Shared Responsibilities**:
- Code reviews (mandatory for all PRs)
- Documentation updates
- Testing and validation
- Deployment procedures
- Knowledge transfer sessions

### Communication Plan
- **Daily**: 15-min standup (9:00 AM)
- **Weekly**: Progress review (Friday 3:00 PM)
- **Phase End**: Retrospective and planning
- **Emergency**: Slack channel with 15-min SLA

---

## Documentation Requirements

### Technical Documentation
```
docs/
├── API/
│   ├── OpenAPI.yaml          # Swagger spec
│   ├── Postman.json          # Collection
│   └── Examples.md           # Request/response examples
├── Architecture/
│   ├── Overview.md           # System design
│   ├── DataFlow.md           # Data flow diagrams
│   └── Security.md           # Security considerations
├── Components/
│   ├── Catalog.md            # Component library
│   ├── Props.md              # Props documentation
│   └── Events.md             # Event handling
├── Database/
│   ├── Schema.md             # Table definitions
│   ├── Migrations.md         # Migration guide
│   └── Queries.md            # Common queries
└── Operations/
    ├── Deployment.md         # Deploy procedures
    ├── Monitoring.md         # Monitoring setup
    └── Troubleshooting.md    # Common issues
```

### User Documentation
- Video tutorials for new UI
- Migration guide for changes
- FAQ for common questions
- Release notes per version

---

## Conclusion

This comprehensive refactoring plan provides a structured, low-risk approach to modernizing the STEREOWOOD Color System. The phased implementation ensures:

1. **Safety**: Archive-first approach with comprehensive testing
2. **Quality**: Modern architecture with best practices
3. **Performance**: Significant improvements in load times and responsiveness
4. **Maintainability**: Modular structure for easier future development
5. **Team Growth**: Skills development in modern technologies

The estimated 9-10 week timeline allows for thorough implementation with proper testing and validation at each phase. The plan's flexibility enables adjustments based on discoveries during implementation while maintaining the core objectives.

**Critical Success Factors**:
- Commitment to test-first development
- Regular communication and code reviews
- Incremental deployment with validation
- User feedback integration
- Continuous monitoring and optimization

**Next Steps**:
1. Team review and feedback on plan
2. Finalize tool selection and setup
3. Create project board with detailed tasks
4. Begin Phase 0 implementation
5. Schedule kick-off meeting with stakeholders

---

## Appendices

### A. Tool Stack Recommendations
- **Build Tool**: Vite 5.0+ (faster than Webpack)
- **Testing**: Jest + Playwright + Supertest
- **Linting**: ESLint + Prettier + Husky
- **Documentation**: VitePress + Swagger
- **Monitoring**: Sentry + Datadog/New Relic
- **CI/CD**: GitHub Actions + Docker
- **State Management**: Pinia (Vue 3 official)
- **UI Library**: Element Plus (already used)

### B. Migration Checklist Template
```markdown
## Phase X Migration Checklist

### Pre-Migration
- [ ] Archive current state
- [ ] Create feature branch
- [ ] Update dependencies
- [ ] Write migration tests

### Migration
- [ ] Implement changes
- [ ] Update documentation
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Run E2E tests

### Post-Migration
- [ ] Code review
- [ ] Performance testing
- [ ] Security scan
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor metrics
```

### C. Performance Budget
| Metric | Budget | Action if Exceeded |
|--------|--------|-------------------|
| JS Bundle | 200KB | Code split required |
| CSS Bundle | 50KB | Remove unused styles |
| Images | 100KB each | Optimize/lazy load |
| Total Page | 500KB | Review all assets |
| FCP | 1.5s | Optimize critical path |
| TTI | 3.5s | Reduce JS execution |

### D. Breaking Changes Tracking
Will be updated during implementation:
- [ ] API endpoint changes
- [ ] Database schema modifications
- [ ] Configuration updates
- [ ] Dependency version changes
- [ ] Environment variable changes

---

*End of Refactoring Plan v3.0*