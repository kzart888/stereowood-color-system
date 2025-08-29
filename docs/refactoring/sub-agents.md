# STEREOWOOD Color System - Sub-Agent Configuration

**Version:** 1.0.0  
**Date:** 2025-01-03  
**Purpose:** Detailed instructions for 5 specialized refactoring agents

## Overview

This document contains precise instructions for five specialized agents to work in parallel on the STEREOWOOD Color System refactoring. Each agent has specific responsibilities, files to work on, and success criteria.

## 1. Frontend Agent

### 1.1 Agent Profile

**Specialization:** Vue.js component decomposition and state management  
**Expertise Required:** Vue 3 Composition API, Pinia, SFC, Element Plus  
**Time Allocation:** 40 hours  
**Priority:** CRITICAL

### 1.2 Assigned Files

```
PRIMARY TARGETS (Must refactor):
├── frontend/js/components/custom-colors.js (1301 lines)
├── frontend/js/components/artworks.js (1125 lines)
├── frontend/js/components/formula-calculator.js (630 lines)
├── frontend/js/components/mont-marte.js (619 lines)

SECONDARY TARGETS (Optimize):
├── frontend/js/app.js (275 lines)
├── frontend/js/components/formula-editor.js (314 lines)
├── frontend/js/components/app-header-bar.js (251 lines)

SUPPORT FILES (Create new):
├── frontend/src/stores/*.js (Pinia stores)
├── frontend/src/composables/*.js (Composition functions)
├── frontend/src/components/**/*.vue (Vue SFCs)
```

### 1.3 Specific Tasks

#### Task 1: Decompose custom-colors.js
**Lines to extract:**
- Lines 10-250 → `CustomColors.vue` template
- Lines 251-450 → `stores/colors.js` state
- Lines 451-650 → `ColorEditor.vue` component
- Lines 651-850 → `useDuplicateDetection.js` composable
- Lines 851-950 → `utils/formulaParser.js`
- Lines 951-1050 → `services/colorService.js`
- Lines 1051-1200 → `ColorList.vue` methods
- Lines 1201-1301 → `useColors.js` composable

**Transformation example:**
```javascript
// FROM: frontend/js/components/custom-colors.js (lines 251-270)
data() {
    return {
        colors: [],
        categories: [],
        loading: false,
        activeCategory: 'all',
        showDialog: false,
        formData: {
            color_code: '',
            formula: '',
            category_id: null,
            image: null
        }
    }
}

// TO: frontend/src/stores/colors.js
import { defineStore } from 'pinia'

export const useColorsStore = defineStore('colors', {
    state: () => ({
        colors: [],
        categories: [],
        loading: false,
        filters: {
            category: 'all',
            search: ''
        }
    }),
    getters: {
        filteredColors: (state) => {
            // Filter logic here
        }
    },
    actions: {
        async loadColors() {
            // API call here
        }
    }
})
```

#### Task 2: Decompose artworks.js
**Lines to extract:**
- Lines 1-200 → `Artworks.vue` template
- Lines 201-400 → `SchemeEditor.vue` component
- Lines 401-500 → `stores/artworks.js` state
- Lines 501-700 → `ArtworkService.js` methods
- Lines 701-850 → `LayerMappingTable.vue` component
- Lines 851-950 → `useArtworks.js` composable
- Lines 951-1125 → Various utility functions

#### Task 3: Implement Pinia Stores
Create the following stores:
```javascript
// frontend/src/stores/index.js
import { createPinia } from 'pinia'
export const pinia = createPinia()

// frontend/src/stores/colors.js
export const useColorsStore = defineStore('colors', {
    // ... implementation
})

// frontend/src/stores/artworks.js
export const useArtworksStore = defineStore('artworks', {
    // ... implementation
})

// frontend/src/stores/ui.js
export const useUIStore = defineStore('ui', {
    state: () => ({
        activeTab: 'custom-colors',
        loading: false,
        error: null
    })
})
```

#### Task 4: Create Vue SFCs
Convert inline templates to proper SFC format:
```vue
<!-- frontend/src/components/organisms/ColorList.vue -->
<template>
  <!-- Extract lines 24-224 from custom-colors.js -->
</template>

<script setup>
import { computed } from 'vue'
import { useColorsStore } from '@/stores/colors'
import ColorCard from '../molecules/ColorCard.vue'

const store = useColorsStore()
const colors = computed(() => store.filteredColors)
</script>

<style scoped lang="scss">
/* Extract relevant CSS from frontend/css/components/custom-colors.css */
</style>
```

### 1.4 Dependencies & Coordination

**Depends on:**
- Backend Agent: API contract must remain stable during transition
- DevOps Agent: Build configuration for Vue/Vite setup

**Provides to:**
- Testing Agent: Component specs for unit tests
- Backend Agent: API requirements documentation

### 1.5 Success Criteria

✅ No component file exceeds 200 lines  
✅ All inline templates converted to SFC  
✅ All state managed by Pinia stores  
✅ All API calls through service layer  
✅ Zero console errors  
✅ All existing features working  
✅ Bundle size < 500KB gzipped  

### 1.6 Implementation Order

1. **Day 1-2:** Set up Vite and project structure
2. **Day 3-4:** Create Pinia stores
3. **Day 5-6:** Decompose custom-colors.js
4. **Day 7-8:** Decompose artworks.js
5. **Day 9:** Decompose formula-calculator.js
6. **Day 10:** Testing and bug fixes

## 2. Backend Agent

### 2.1 Agent Profile

**Specialization:** Node.js API architecture and database optimization  
**Expertise Required:** Express.js, SQLite, Repository pattern, REST  
**Time Allocation:** 32 hours  
**Priority:** HIGH

### 2.2 Assigned Files

```
PRIMARY TARGETS:
├── backend/routes/*.js (All route files)
├── backend/services/*.js (All service files)
├── backend/db/queries/*.js (All query files)

CREATE NEW:
├── backend/src/controllers/*.js
├── backend/src/repositories/*.js
├── backend/src/validators/*.js
├── backend/src/middleware/validation.js
```

### 2.3 Specific Tasks

#### Task 1: Implement Controller Layer
Extract route handlers to controllers:

```javascript
// FROM: backend/routes/custom-colors.js (lines 20-45)
router.get('/custom-colors', async (req, res) => {
    try {
        const colors = await ColorService.getAllColors()
        res.json(colors)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// TO: backend/src/controllers/ColorController.js
class ColorController {
    async getAll(req, res, next) {
        try {
            const filters = this.extractFilters(req.query)
            const colors = await this.colorService.getAllColors(filters)
            res.json(this.formatResponse(colors))
        } catch (error) {
            next(error) // Centralized error handling
        }
    }
    
    extractFilters(query) {
        return {
            category: query.category || null,
            search: query.search || '',
            sortBy: query.sortBy || 'time',
            page: parseInt(query.page) || 1,
            limit: parseInt(query.limit) || 20
        }
    }
}
```

#### Task 2: Create Repository Layer
Move database queries to repositories:

```javascript
// FROM: backend/db/queries/colors.js (lines 10-35)
function getAllColors(callback) {
    db.all(`SELECT * FROM custom_colors ORDER BY created_at DESC`, callback)
}

// TO: backend/src/repositories/ColorRepository.js
class ColorRepository extends BaseRepository {
    constructor() {
        super('custom_colors')
    }
    
    async findAll(filters = {}) {
        const query = this.db
            .select('*')
            .from(this.table)
            
        if (filters.category) {
            query.where('category_id', filters.category)
        }
        
        if (filters.search) {
            query.where(function() {
                this.where('color_code', 'like', `%${filters.search}%`)
                    .orWhere('formula', 'like', `%${filters.search}%`)
            })
        }
        
        // Add pagination
        const page = filters.page || 1
        const limit = filters.limit || 20
        query.limit(limit).offset((page - 1) * limit)
        
        return query
    }
    
    async findById(id) {
        return this.db
            .select('*')
            .from(this.table)
            .where('id', id)
            .first()
    }
}
```

#### Task 3: Add Validation Middleware

```javascript
// backend/src/validators/colorValidator.js
const Joi = require('joi')

const colorSchemas = {
    create: Joi.object({
        color_code: Joi.string()
            .pattern(/^[A-Z0-9-]+$/)
            .required()
            .messages({
                'string.pattern.base': '颜色代码只能包含大写字母、数字和横线'
            }),
        formula: Joi.string()
            .required()
            .custom(validateFormulaFormat),
        category_id: Joi.number().integer().positive(),
        image: Joi.any()
    }),
    
    update: Joi.object({
        color_code: Joi.string().pattern(/^[A-Z0-9-]+$/),
        formula: Joi.string().custom(validateFormulaFormat),
        category_id: Joi.number().integer().positive(),
        image: Joi.any()
    })
}

// backend/src/middleware/validation.js
function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body)
        
        if (error) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.details.map(d => ({
                    field: d.path.join('.'),
                    message: d.message
                }))
            })
        }
        
        req.validatedBody = value
        next()
    }
}
```

#### Task 4: Standardize Error Handling

```javascript
// backend/src/middleware/errorHandler.js
class AppError extends Error {
    constructor(message, statusCode) {
        super(message)
        this.statusCode = statusCode
        this.isOperational = true
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400)
    }
}

class NotFoundError extends AppError {
    constructor(message) {
        super(message, 404)
    }
}

function errorHandler(err, req, res, next) {
    const { statusCode = 500, message } = err
    
    // Log error
    logger.error({
        error: err,
        request: req.url,
        method: req.method,
        ip: req.ip
    })
    
    // Don't leak error details in production
    const response = {
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
    
    res.status(statusCode).json(response)
}
```

### 2.4 Field Name Standardization

Fix the current field name mismatches:

```javascript
// Compatibility layer for transition period
function fieldMapper(req, res, next) {
    // Map frontend field names to backend
    const mappings = {
        'name': 'scheme_name',
        'layer': 'layer_number',
        'colorCode': 'color_code'
    }
    
    if (req.body) {
        Object.entries(mappings).forEach(([from, to]) => {
            if (req.body[from] !== undefined) {
                req.body[to] = req.body[from]
                delete req.body[from]
            }
        })
    }
    
    next()
}
```

### 2.5 Success Criteria

✅ All routes use controller pattern  
✅ All DB queries through repositories  
✅ Input validation on all endpoints  
✅ Consistent error responses  
✅ No direct DB access in routes  
✅ API response time < 200ms  
✅ Proper HTTP status codes  

## 3. Database Agent

### 3.1 Agent Profile

**Specialization:** Database optimization and repository pattern  
**Expertise Required:** SQLite, Query optimization, Migrations  
**Time Allocation:** 24 hours  
**Priority:** MEDIUM

### 3.2 Assigned Files

```
REFACTOR:
├── backend/db/queries/artworks.js (288 lines)
├── backend/db/queries/colors.js (205 lines)
├── backend/db/queries/materials.js (227 lines)

CREATE NEW:
├── backend/src/repositories/BaseRepository.js
├── backend/src/repositories/ColorRepository.js
├── backend/src/repositories/ArtworkRepository.js
├── backend/src/repositories/MaterialRepository.js
├── backend/src/database/QueryBuilder.js
```

### 3.3 Specific Tasks

#### Task 1: Create Base Repository

```javascript
// backend/src/repositories/BaseRepository.js
class BaseRepository {
    constructor(tableName) {
        this.table = tableName
        this.db = require('../database/connection')
    }
    
    async findAll(conditions = {}) {
        return new Promise((resolve, reject) => {
            const whereClause = this.buildWhereClause(conditions)
            const sql = `SELECT * FROM ${this.table} ${whereClause}`
            
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err)
                else resolve(rows)
            })
        })
    }
    
    async findById(id) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM ${this.table} WHERE id = ?`
            
            this.db.get(sql, [id], (err, row) => {
                if (err) reject(err)
                else resolve(row)
            })
        })
    }
    
    async create(data) {
        const columns = Object.keys(data)
        const placeholders = columns.map(() => '?')
        const values = Object.values(data)
        
        const sql = `
            INSERT INTO ${this.table} (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
        `
        
        return new Promise((resolve, reject) => {
            this.db.run(sql, values, function(err) {
                if (err) reject(err)
                else resolve({ id: this.lastID, ...data })
            })
        })
    }
    
    async update(id, data) {
        const updates = Object.keys(data)
            .map(key => `${key} = ?`)
            .join(', ')
        const values = [...Object.values(data), id]
        
        const sql = `UPDATE ${this.table} SET ${updates} WHERE id = ?`
        
        return new Promise((resolve, reject) => {
            this.db.run(sql, values, (err) => {
                if (err) reject(err)
                else resolve(this.findById(id))
            })
        })
    }
    
    async delete(id) {
        const sql = `DELETE FROM ${this.table} WHERE id = ?`
        
        return new Promise((resolve, reject) => {
            this.db.run(sql, [id], (err) => {
                if (err) reject(err)
                else resolve({ deleted: true })
            })
        })
    }
    
    async transaction(callback) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION')
                
                try {
                    const result = callback()
                    this.db.run('COMMIT')
                    resolve(result)
                } catch (error) {
                    this.db.run('ROLLBACK')
                    reject(error)
                }
            })
        })
    }
}
```

#### Task 2: Optimize Queries

Add indexes for frequently queried columns:

```sql
-- backend/src/database/migrations/add_indexes.sql
CREATE INDEX IF NOT EXISTS idx_custom_colors_code 
ON custom_colors(color_code);

CREATE INDEX IF NOT EXISTS idx_custom_colors_category 
ON custom_colors(category_id);

CREATE INDEX IF NOT EXISTS idx_artworks_code 
ON artworks(code);

CREATE INDEX IF NOT EXISTS idx_scheme_layers_color 
ON scheme_layers(custom_color_id);

CREATE INDEX IF NOT EXISTS idx_scheme_layers_scheme 
ON scheme_layers(scheme_id);

-- Composite indexes for common joins
CREATE INDEX IF NOT EXISTS idx_schemes_artwork 
ON color_schemes(artwork_id, created_at DESC);
```

#### Task 3: Fix N+1 Query Problems

```javascript
// FROM: Current N+1 problem
async function getArtworksWithSchemes() {
    const artworks = await db.all('SELECT * FROM artworks')
    
    for (const artwork of artworks) {
        artwork.schemes = await db.all(
            'SELECT * FROM color_schemes WHERE artwork_id = ?',
            [artwork.id]
        )
        
        for (const scheme of artwork.schemes) {
            scheme.layers = await db.all(
                'SELECT * FROM scheme_layers WHERE scheme_id = ?',
                [scheme.id]
            )
        }
    }
    
    return artworks
}

// TO: Single optimized query
async function getArtworksWithSchemes() {
    const sql = `
        SELECT 
            a.id as artwork_id,
            a.code as artwork_code,
            a.name as artwork_name,
            s.id as scheme_id,
            s.scheme_name,
            s.thumbnail_path,
            sl.layer_number,
            sl.custom_color_id,
            c.color_code,
            c.formula
        FROM artworks a
        LEFT JOIN color_schemes s ON a.id = s.artwork_id
        LEFT JOIN scheme_layers sl ON s.id = sl.scheme_id
        LEFT JOIN custom_colors c ON sl.custom_color_id = c.id
        ORDER BY a.created_at DESC, s.created_at DESC, sl.layer_number
    `
    
    const rows = await db.all(sql)
    
    // Transform flat results to nested structure
    const artworksMap = new Map()
    
    rows.forEach(row => {
        // ... transformation logic (see module-plans.md)
    })
    
    return Array.from(artworksMap.values())
}
```

### 3.4 Success Criteria

✅ All queries use repository pattern  
✅ No N+1 query problems  
✅ Proper indexes on all foreign keys  
✅ Transaction support for multi-table operations  
✅ Query response time < 50ms  
✅ Prepared statements for all queries  

## 4. DevOps Agent

### 4.1 Agent Profile

**Specialization:** Build tools, Docker, CI/CD  
**Expertise Required:** Vite, Docker, GitHub Actions, Nginx  
**Time Allocation:** 16 hours  
**Priority:** MEDIUM

### 4.2 Assigned Files

```
MODIFY:
├── Dockerfile
├── docker-compose.yml
├── package.json

CREATE NEW:
├── frontend/vite.config.js
├── .github/workflows/ci.yml
├── .github/workflows/deploy.yml
├── nginx/nginx.conf
├── scripts/health-check.js
```

### 4.3 Specific Tasks

#### Task 1: Set Up Vite Build

```javascript
// frontend/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
    plugins: [vue()],
    root: './frontend',
    base: '/',
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    },
    build: {
        outDir: '../dist',
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            },
            output: {
                manualChunks: {
                    vendor: ['vue', 'pinia', 'axios'],
                    elementPlus: ['element-plus']
                }
            }
        },
        chunkSizeWarningLimit: 500,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            }
        }
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:9099',
                changeOrigin: true
            },
            '/uploads': {
                target: 'http://localhost:9099',
                changeOrigin: true
            }
        }
    }
})
```

#### Task 2: Multi-Stage Docker Build

```dockerfile
# Dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Stage 3: Production image
FROM node:20-alpine
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built frontend
COPY --from=frontend-builder --chown=nodejs:nodejs /app/dist ./frontend

# Copy backend with dependencies
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --chown=nodejs:nodejs backend ./backend

# Create necessary directories
RUN mkdir -p /data /app/backend/uploads && \
    chown -R nodejs:nodejs /data /app/backend/uploads

# Switch to non-root user
USER nodejs

# Environment variables
ENV NODE_ENV=production \
    PORT=9099 \
    DB_FILE=/data/color_management.db

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD node /app/backend/scripts/health-check.js || exit 1

EXPOSE 9099

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/server.js"]
```

#### Task 3: CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci --prefix frontend
          npm ci --prefix backend
      
      - name: Lint frontend
        run: npm run lint --prefix frontend
      
      - name: Lint backend
        run: npm run lint --prefix backend

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci --prefix frontend
          npm ci --prefix backend
      
      - name: Run frontend tests
        run: npm run test:unit --prefix frontend
      
      - name: Run backend tests
        run: npm run test --prefix backend
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t stereowood-color-system:${{ github.sha }} .
      
      - name: Run security scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: stereowood-color-system:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

#### Task 4: Health Check Implementation

```javascript
// backend/scripts/health-check.js
const http = require('http')
const sqlite3 = require('sqlite3')

const checks = {
    server: () => {
        return new Promise((resolve, reject) => {
            http.get('http://localhost:9099/api/health', (res) => {
                resolve(res.statusCode === 200)
            }).on('error', reject)
        })
    },
    
    database: () => {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(
                process.env.DB_FILE || './color_management.db'
            )
            
            db.get('SELECT 1', (err) => {
                db.close()
                if (err) reject(err)
                else resolve(true)
            })
        })
    },
    
    diskSpace: () => {
        const { statSync } = require('fs')
        const stats = statSync('/data')
        const freeSpace = stats.blocks * stats.blksize
        return freeSpace > 100 * 1024 * 1024 // 100MB minimum
    }
}

async function runHealthCheck() {
    try {
        const results = await Promise.all([
            checks.server(),
            checks.database(),
            checks.diskSpace()
        ])
        
        if (results.every(r => r === true)) {
            console.log('Health check passed')
            process.exit(0)
        } else {
            console.error('Health check failed:', results)
            process.exit(1)
        }
    } catch (error) {
        console.error('Health check error:', error)
        process.exit(1)
    }
}

runHealthCheck()
```

### 4.4 Success Criteria

✅ Automated CI/CD pipeline  
✅ Docker image < 100MB  
✅ Build time < 2 minutes  
✅ Zero-downtime deployment  
✅ Health checks passing  
✅ Automatic rollback on failure  

## 5. Testing Agent

### 5.1 Agent Profile

**Specialization:** Test automation and quality assurance  
**Expertise Required:** Jest, Vitest, Cypress, Supertest  
**Time Allocation:** 32 hours  
**Priority:** HIGH

### 5.2 Test Structure

```
tests/
├── unit/
│   ├── frontend/
│   │   ├── components/
│   │   ├── stores/
│   │   ├── composables/
│   │   └── utils/
│   └── backend/
│       ├── services/
│       ├── repositories/
│       └── validators/
├── integration/
│   ├── api/
│   └── database/
└── e2e/
    ├── workflows/
    └── fixtures/
```

### 5.3 Specific Tasks

#### Task 1: Frontend Component Tests

```javascript
// tests/unit/frontend/components/ColorCard.spec.js
import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import ColorCard from '@/components/molecules/ColorCard.vue'

describe('ColorCard', () => {
    let wrapper
    
    const mockColor = {
        id: 1,
        color_code: 'B001',
        formula: '蓝色 50g 白色 30g',
        category_id: 1,
        image_path: 'uploads/b001.jpg'
    }
    
    beforeEach(() => {
        wrapper = mount(ColorCard, {
            props: {
                color: mockColor
            }
        })
    })
    
    it('displays color code correctly', () => {
        expect(wrapper.find('h3').text()).toBe('B001')
    })
    
    it('emits edit event when edit button clicked', async () => {
        await wrapper.find('[data-test="edit-button"]').trigger('click')
        expect(wrapper.emitted('edit')).toBeTruthy()
        expect(wrapper.emitted('edit')[0][0]).toEqual(mockColor)
    })
    
    it('disables delete button when color is referenced', async () => {
        await wrapper.setProps({
            color: { ...mockColor, isReferenced: true }
        })
        
        const deleteButton = wrapper.find('[data-test="delete-button"]')
        expect(deleteButton.attributes('disabled')).toBeDefined()
    })
    
    it('shows formula chips correctly', () => {
        const chips = wrapper.findAll('.formula-chip')
        expect(chips).toHaveLength(2)
        expect(chips[0].text()).toContain('蓝色 50g')
        expect(chips[1].text()).toContain('白色 30g')
    })
})
```

#### Task 2: Store Tests

```javascript
// tests/unit/frontend/stores/colors.spec.js
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useColorsStore } from '@/stores/colors'
import * as colorService from '@/services/colorService'

vi.mock('@/services/colorService')

describe('Colors Store', () => {
    let store
    
    beforeEach(() => {
        setActivePinia(createPinia())
        store = useColorsStore()
    })
    
    describe('actions', () => {
        it('loads colors successfully', async () => {
            const mockColors = [
                { id: 1, color_code: 'R001' },
                { id: 2, color_code: 'B001' }
            ]
            
            colorService.getAll.mockResolvedValue({ data: mockColors })
            
            await store.loadColors()
            
            expect(store.colors).toEqual(mockColors)
            expect(store.loading).toBe(false)
            expect(store.error).toBe(null)
        })
        
        it('handles load error', async () => {
            const error = new Error('Network error')
            colorService.getAll.mockRejectedValue(error)
            
            await expect(store.loadColors()).rejects.toThrow()
            
            expect(store.colors).toEqual([])
            expect(store.loading).toBe(false)
            expect(store.error).toBe(error)
        })
    })
    
    describe('getters', () => {
        beforeEach(() => {
            store.colors = [
                { id: 1, color_code: 'R001', category_id: 1 },
                { id: 2, color_code: 'B001', category_id: 2 },
                { id: 3, color_code: 'G001', category_id: 1 }
            ]
        })
        
        it('filters colors by category', () => {
            store.filters.category = 1
            expect(store.filteredColors).toHaveLength(2)
            expect(store.filteredColors[0].color_code).toBe('R001')
        })
        
        it('searches colors by code', () => {
            store.filters.search = 'B00'
            expect(store.filteredColors).toHaveLength(1)
            expect(store.filteredColors[0].color_code).toBe('B001')
        })
    })
})
```

#### Task 3: Backend Service Tests

```javascript
// tests/unit/backend/services/ColorService.spec.js
const { ColorService } = require('@/services/ColorService')
const { ColorRepository } = require('@/repositories/ColorRepository')
const { DuplicateDetectionService } = require('@/services/DuplicateDetectionService')

jest.mock('@/repositories/ColorRepository')
jest.mock('@/services/DuplicateDetectionService')

describe('ColorService', () => {
    let service
    let mockRepository
    let mockDuplicateDetector
    
    beforeEach(() => {
        mockRepository = {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            isReferenced: jest.fn()
        }
        
        mockDuplicateDetector = {
            check: jest.fn()
        }
        
        ColorRepository.mockImplementation(() => mockRepository)
        DuplicateDetectionService.mockImplementation(() => mockDuplicateDetector)
        
        service = new ColorService()
    })
    
    describe('createColor', () => {
        it('creates color when validation passes', async () => {
            const colorData = {
                color_code: 'R001',
                formula: '红色 50g 白色 30g'
            }
            
            mockDuplicateDetector.check.mockResolvedValue([])
            mockRepository.create.mockResolvedValue({ id: 1, ...colorData })
            
            const result = await service.createColor(colorData)
            
            expect(result).toEqual({ id: 1, ...colorData })
            expect(mockDuplicateDetector.check).toHaveBeenCalledWith(colorData.formula)
            expect(mockRepository.create).toHaveBeenCalledWith(colorData)
        })
        
        it('throws error when duplicate found', async () => {
            const colorData = {
                color_code: 'R001',
                formula: '红色 50g 白色 30g'
            }
            
            mockDuplicateDetector.check.mockResolvedValue([
                { id: 2, color_code: 'R002', similarity: 0.98 }
            ])
            
            await expect(service.createColor(colorData))
                .rejects.toThrow('Formula already exists')
            
            expect(mockRepository.create).not.toHaveBeenCalled()
        })
    })
    
    describe('deleteColor', () => {
        it('deletes color when not referenced', async () => {
            mockRepository.isReferenced.mockResolvedValue(false)
            mockRepository.delete.mockResolvedValue(true)
            
            await service.deleteColor(1)
            
            expect(mockRepository.isReferenced).toHaveBeenCalledWith(1)
            expect(mockRepository.delete).toHaveBeenCalledWith(1)
        })
        
        it('throws error when color is referenced', async () => {
            mockRepository.isReferenced.mockResolvedValue(true)
            
            await expect(service.deleteColor(1))
                .rejects.toThrow('Color is referenced by artworks')
            
            expect(mockRepository.delete).not.toHaveBeenCalled()
        })
    })
})
```

#### Task 4: API Integration Tests

```javascript
// tests/integration/api/colors.spec.js
const request = require('supertest')
const app = require('@/app')
const { db } = require('@/database/connection')

describe('Colors API', () => {
    beforeEach(async () => {
        // Reset database
        await db.run('DELETE FROM custom_colors')
        await db.run('DELETE FROM color_categories')
        
        // Seed test data
        await db.run(`
            INSERT INTO color_categories (id, code, name)
            VALUES (1, 'blue', '蓝色系')
        `)
    })
    
    describe('GET /api/custom-colors', () => {
        it('returns empty array when no colors', async () => {
            const response = await request(app)
                .get('/api/custom-colors')
                .expect(200)
            
            expect(response.body).toEqual([])
        })
        
        it('returns colors with pagination', async () => {
            // Insert 25 test colors
            for (let i = 1; i <= 25; i++) {
                await db.run(`
                    INSERT INTO custom_colors (color_code, formula, category_id)
                    VALUES ('C${i.toString().padStart(3, '0')}', 'Test ${i}', 1)
                `)
            }
            
            const response = await request(app)
                .get('/api/custom-colors?page=1&limit=10')
                .expect(200)
            
            expect(response.body.data).toHaveLength(10)
            expect(response.body.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 25,
                pages: 3
            })
        })
    })
    
    describe('POST /api/custom-colors', () => {
        it('creates new color with valid data', async () => {
            const colorData = {
                color_code: 'B001',
                formula: '蓝色 50g 白色 30g',
                category_id: 1
            }
            
            const response = await request(app)
                .post('/api/custom-colors')
                .send(colorData)
                .expect(201)
            
            expect(response.body).toMatchObject(colorData)
            expect(response.body.id).toBeDefined()
            
            // Verify in database
            const saved = await db.get(
                'SELECT * FROM custom_colors WHERE id = ?',
                [response.body.id]
            )
            expect(saved.color_code).toBe('B001')
        })
        
        it('returns 400 for invalid color code', async () => {
            const response = await request(app)
                .post('/api/custom-colors')
                .send({
                    color_code: 'invalid-code!',
                    formula: '蓝色 50g'
                })
                .expect(400)
            
            expect(response.body.error).toBe('Validation failed')
            expect(response.body.details[0].field).toBe('color_code')
        })
    })
})
```

#### Task 5: E2E Tests

```javascript
// tests/e2e/workflows/color-management.cy.js
describe('Color Management Workflow', () => {
    beforeEach(() => {
        cy.visit('/')
        cy.get('[data-test="tab-custom-colors"]').click()
    })
    
    it('creates new color successfully', () => {
        // Click new color button
        cy.get('[data-test="new-color-button"]').click()
        
        // Fill form
        cy.get('[data-test="color-code-input"]').type('B001')
        cy.get('[data-test="formula-input"]').type('蓝色 50g 白色 30g')
        cy.get('[data-test="category-select"]').select('蓝色系')
        
        // Upload image
        cy.get('[data-test="image-upload"]').selectFile('tests/fixtures/blue.jpg')
        
        // Submit
        cy.get('[data-test="save-button"]').click()
        
        // Verify success
        cy.get('.el-message--success').should('contain', '创建成功')
        cy.get('[data-test="color-card"]').should('contain', 'B001')
    })
    
    it('detects duplicate formulas', () => {
        // Create first color
        cy.createColor({
            code: 'B001',
            formula: '蓝色 50g 白色 30g'
        })
        
        // Try to create duplicate
        cy.get('[data-test="new-color-button"]').click()
        cy.get('[data-test="color-code-input"]').type('B002')
        cy.get('[data-test="formula-input"]').type('蓝色 50g 白色 30g')
        
        // Check duplicate warning
        cy.get('[data-test="duplicate-warning"]').should('be.visible')
        cy.get('[data-test="duplicate-list"]').should('contain', 'B001')
    })
    
    it('edits existing color', () => {
        cy.createColor({ code: 'B001', formula: '蓝色 50g' })
        
        // Click edit
        cy.get('[data-test="color-B001"] [data-test="edit-button"]').click()
        
        // Modify formula
        cy.get('[data-test="formula-input"]').clear().type('蓝色 60g 白色 20g')
        cy.get('[data-test="save-button"]').click()
        
        // Verify update
        cy.get('.el-message--success').should('contain', '更新成功')
        cy.get('[data-test="color-B001"]').should('contain', '蓝色 60g 白色 20g')
    })
})
```

### 5.4 Coverage Requirements

```javascript
// jest.config.js / vitest.config.js
module.exports = {
    collectCoverage: true,
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        },
        './src/services/': {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90
        }
    },
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/tests/',
        '.config.js'
    ]
}
```

### 5.5 Success Criteria

✅ Unit test coverage > 80%  
✅ Integration test coverage > 70%  
✅ E2E tests for critical workflows  
✅ All tests passing in CI  
✅ Test execution time < 5 minutes  
✅ Automated test reports  

## 6. Coordination Protocol

### 6.1 Communication Channels

```yaml
channels:
  daily-standup:
    time: "09:00 UTC"
    duration: "15 minutes"
    format: "Progress, blockers, next tasks"
  
  code-review:
    trigger: "PR opened"
    reviewers: ["Backend Agent", "Frontend Agent"]
    sla: "4 hours"
  
  emergency:
    trigger: "Production issue"
    response: "All agents"
    sla: "30 minutes"
```

### 6.2 Git Branch Strategy

```
main
├── develop
│   ├── feature/frontend-decomposition
│   ├── feature/backend-repositories
│   ├── feature/database-optimization
│   ├── feature/docker-setup
│   └── feature/test-coverage
└── hotfix/*
```

### 6.3 Merge Order

1. DevOps Agent - Build configuration (Day 1-2)
2. Database Agent - Repository pattern (Day 3-4)
3. Backend Agent - Service layer (Day 5-6)
4. Frontend Agent - Component decomposition (Day 7-9)
5. Testing Agent - Test coverage (Day 10)

### 6.4 Conflict Resolution

- **API Contract Changes:** Backend Agent has priority
- **Database Schema:** Database Agent has veto power
- **Build Issues:** DevOps Agent makes final decision
- **Test Failures:** Testing Agent can block merge

## 7. Deliverables Checklist

### Frontend Agent
- [ ] Vite configuration working
- [ ] All components < 200 lines
- [ ] Pinia stores implemented
- [ ] API service layer complete
- [ ] Bundle size < 500KB

### Backend Agent
- [ ] Controllers extracted
- [ ] Repositories implemented
- [ ] Validation middleware added
- [ ] Error handling standardized
- [ ] Response time < 200ms

### Database Agent
- [ ] BaseRepository created
- [ ] All queries optimized
- [ ] Indexes added
- [ ] Transactions working
- [ ] N+1 problems fixed

### DevOps Agent
- [ ] Docker build working
- [ ] CI/CD pipeline active
- [ ] Health checks passing
- [ ] Zero-downtime deployment
- [ ] Monitoring configured

### Testing Agent
- [ ] Unit tests > 80% coverage
- [ ] Integration tests complete
- [ ] E2E tests for workflows
- [ ] Test reports generated
- [ ] CI integration working

---

Each agent should work independently within their domain while coordinating on interfaces. Success requires all agents to complete their deliverables and pass integration testing.