# STEREOWOOD Color System - Detailed Module Decomposition Plans

**Version:** 1.0.0  
**Date:** 2025-01-03  
**Purpose:** Line-by-line decomposition strategy for monolithic components

## 1. CustomColors Component Decomposition (1301 lines → 9 files)

### 1.1 Current Structure Analysis

```javascript
// frontend/js/components/custom-colors.js
Lines 1-9:     Component definition and props
Lines 10-250:  Template string (massive inline HTML)
Lines 251-450: Data properties and computed properties
Lines 451-650: Color management methods
Lines 651-850: Duplicate detection logic
Lines 851-950: Formula parsing and validation
Lines 951-1050: API interaction methods
Lines 1051-1200: Event handlers and UI logic
Lines 1201-1301: Utility functions and lifecycle hooks
```

### 1.2 Target Decomposition

#### File 1: `views/CustomColors.vue` (150 lines)
**Purpose:** Main container and orchestration
**Extract from:** Lines 1-50, 1201-1301

```vue
<template>
  <div class="custom-colors-view">
    <CategoryFilter 
      v-model="activeCategory"
      :categories="categories" 
    />
    <ColorList
      :colors="filteredColors"
      :loading="loading"
      @edit="handleEdit"
      @delete="handleDelete"
      @calculate="handleCalculate"
    />
    <ColorEditor
      v-model:visible="showEditor"
      :color="editingColor"
      @save="handleSave"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useColorsStore } from '@/stores/colors'
import CategoryFilter from '@/components/molecules/CategoryFilter.vue'
import ColorList from '@/components/organisms/ColorList.vue'
import ColorEditor from '@/components/organisms/ColorEditor.vue'

const store = useColorsStore()
const activeCategory = ref('all')
// ... orchestration logic
</script>
```

#### File 2: `components/organisms/ColorList.vue` (200 lines)
**Purpose:** Display list of colors with actions
**Extract from:** Lines 24-224

```vue
<template>
  <div class="color-list">
    <div v-if="loading" class="loading">
      <LoadingSpinner />
    </div>
    <div v-else-if="colors.length === 0" class="empty">
      暂无自配色
    </div>
    <ColorCard
      v-for="color in colors"
      :key="color.id"
      :color="color"
      @edit="$emit('edit', color)"
      @delete="$emit('delete', color)"
      @calculate="$emit('calculate', color)"
    />
  </div>
</template>
```

#### File 3: `components/organisms/ColorEditor.vue` (180 lines)
**Purpose:** Color creation/editing dialog
**Extract from:** Lines 451-630

```vue
<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑颜色' : '新建颜色'"
    width="600px"
  >
    <el-form :model="form" :rules="rules" ref="formRef">
      <el-form-item label="颜色代码" prop="color_code">
        <el-input v-model="form.color_code" />
      </el-form-item>
      <FormulaEditor 
        v-model="form.formula"
        :materials="materials"
      />
      <ImageUploader
        v-model="form.image"
        :preview="form.image_path"
      />
    </el-form>
  </el-dialog>
</template>
```

#### File 4: `components/molecules/ColorCard.vue` (120 lines)
**Purpose:** Individual color display card
**Extract from:** Lines 27-147

```vue
<template>
  <div class="color-card" :class="{ highlighted: isHighlighted }">
    <div class="color-header">
      <h3>{{ color.color_code }}</h3>
      <div class="actions">
        <el-button @click="$emit('calculate', color)">
          <el-icon><ScaleToOriginal /></el-icon> 计算
        </el-button>
        <el-button @click="$emit('edit', color)">
          <el-icon><Edit /></el-icon> 修改
        </el-button>
        <el-button 
          @click="$emit('delete', color)"
          :disabled="isReferenced"
        >
          <el-icon><Delete /></el-icon> 删除
        </el-button>
      </div>
    </div>
    <ColorThumbnail :path="color.image_path" />
    <FormulaDisplay :formula="color.formula" />
  </div>
</template>
```

#### File 5: `components/molecules/FormulaDisplay.vue` (80 lines)
**Purpose:** Display parsed formula with chips
**Extract from:** Lines 50-130

```vue
<template>
  <div class="formula-display">
    <div v-if="!formula" class="empty">
      （未指定配方）
    </div>
    <div v-else class="formula-chips">
      <el-tag 
        v-for="(item, index) in parsedFormula" 
        :key="index"
        :type="getChipType(item)"
      >
        {{ item.name }} {{ item.amount }}{{ item.unit }}
      </el-tag>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { parseFormula } from '@/utils/formulaParser'

const props = defineProps(['formula'])
const parsedFormula = computed(() => parseFormula(props.formula))
</script>
```

#### File 6: `composables/useColors.js` (150 lines)
**Purpose:** Reusable color management logic
**Extract from:** Lines 951-1100

```javascript
import { ref, computed } from 'vue'
import { colorService } from '@/services/colorService'
import { useNotification } from './useNotification'

export function useColors() {
  const colors = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  const loadColors = async () => {
    loading.value = true
    try {
      const response = await colorService.getAll()
      colors.value = response.data
    } catch (err) {
      error.value = err
      useNotification().error('加载颜色失败')
    } finally {
      loading.value = false
    }
  }
  
  const createColor = async (colorData) => {
    const formData = new FormData()
    Object.entries(colorData).forEach(([key, value]) => {
      formData.append(key, value)
    })
    
    const response = await colorService.create(formData)
    await loadColors() // Refresh list
    return response.data
  }
  
  const updateColor = async (id, colorData) => {
    // ... update logic
  }
  
  const deleteColor = async (id) => {
    // ... delete logic
  }
  
  return {
    colors,
    loading,
    error,
    loadColors,
    createColor,
    updateColor,
    deleteColor
  }
}
```

#### File 7: `composables/useDuplicateDetection.js` (100 lines)
**Purpose:** Formula duplicate detection logic
**Extract from:** Lines 651-750

```javascript
import { computed } from 'vue'
import { parseFormula, normalizeFormula } from '@/utils/formulaParser'

export function useDuplicateDetection(colors) {
  const DUPLICATE_THRESHOLD = 0.95
  
  const findDuplicates = (formula) => {
    if (!formula) return []
    
    const normalized = normalizeFormula(formula)
    const duplicates = []
    
    colors.value.forEach(color => {
      if (!color.formula) return
      
      const similarity = calculateSimilarity(
        normalized, 
        normalizeFormula(color.formula)
      )
      
      if (similarity >= DUPLICATE_THRESHOLD) {
        duplicates.push({
          color,
          similarity,
          exactMatch: similarity === 1
        })
      }
    })
    
    return duplicates.sort((a, b) => b.similarity - a.similarity)
  }
  
  const calculateSimilarity = (formula1, formula2) => {
    // Ratio-based comparison algorithm
    const ratio1 = extractRatios(formula1)
    const ratio2 = extractRatios(formula2)
    
    // Calculate cosine similarity
    return cosineSimilarity(ratio1, ratio2)
  }
  
  return {
    findDuplicates,
    DUPLICATE_THRESHOLD
  }
}
```

#### File 8: `stores/colors.js` (200 lines)
**Purpose:** Centralized color state management
**Extract from:** Lines 251-450

```javascript
import { defineStore } from 'pinia'
import { colorService } from '@/services/colorService'

export const useColorsStore = defineStore('colors', {
  state: () => ({
    colors: [],
    categories: [],
    loading: false,
    error: null,
    filters: {
      category: 'all',
      search: '',
      sortBy: 'time'
    }
  }),
  
  getters: {
    filteredColors: (state) => {
      let result = [...state.colors]
      
      // Apply category filter
      if (state.filters.category !== 'all') {
        result = result.filter(c => 
          c.category_id === state.filters.category
        )
      }
      
      // Apply search filter
      if (state.filters.search) {
        const query = state.filters.search.toLowerCase()
        result = result.filter(c => 
          c.color_code.toLowerCase().includes(query) ||
          c.formula?.toLowerCase().includes(query)
        )
      }
      
      // Apply sorting
      switch (state.filters.sortBy) {
        case 'name':
          result.sort((a, b) => a.color_code.localeCompare(b.color_code))
          break
        case 'time':
        default:
          result.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          )
      }
      
      return result
    },
    
    colorByCode: (state) => (code) => {
      return state.colors.find(c => c.color_code === code)
    },
    
    isColorReferenced: (state) => (color) => {
      // Check if color is used in any artwork schemes
      const artworksStore = useArtworksStore()
      return artworksStore.isColorUsed(color.color_code)
    }
  },
  
  actions: {
    async loadColors() {
      this.loading = true
      try {
        const response = await colorService.getAll()
        this.colors = response.data
      } catch (error) {
        this.error = error
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async createColor(colorData) {
      // ... create logic
    },
    
    async updateColor(id, colorData) {
      // ... update logic
    },
    
    async deleteColor(id) {
      // ... delete logic
    }
  }
})
```

#### File 9: `utils/formulaParser.js` (101 lines)
**Purpose:** Formula parsing and validation utilities
**Extract from:** Lines 851-950

```javascript
/**
 * Parse formula string into structured data
 * Format: "颜色名 数量单位 颜色名 数量单位"
 */
export function parseFormula(formula) {
  if (!formula || typeof formula !== 'string') return []
  
  const items = []
  const parts = formula.trim().split(/\s+/)
  
  for (let i = 0; i < parts.length; i += 2) {
    const name = parts[i]
    const amountUnit = parts[i + 1] || ''
    
    const match = amountUnit.match(/^(\d+(?:\.\d+)?)(.*?)$/)
    if (match) {
      items.push({
        name,
        amount: parseFloat(match[1]),
        unit: match[2] || ''
      })
    } else {
      items.push({
        name,
        amount: 0,
        unit: ''
      })
    }
  }
  
  return items
}

/**
 * Normalize formula for comparison
 */
export function normalizeFormula(formula) {
  const parsed = parseFormula(formula)
  const total = parsed.reduce((sum, item) => sum + item.amount, 0)
  
  return parsed.map(item => ({
    ...item,
    ratio: total > 0 ? item.amount / total : 0
  }))
}

/**
 * Validate formula format
 */
export function validateFormula(formula) {
  if (!formula) return { valid: false, error: '配方不能为空' }
  
  const parsed = parseFormula(formula)
  if (parsed.length === 0) {
    return { valid: false, error: '配方格式不正确' }
  }
  
  for (const item of parsed) {
    if (item.amount <= 0) {
      return { valid: false, error: `${item.name} 的数量必须大于0` }
    }
  }
  
  return { valid: true }
}
```

## 2. Artworks Component Decomposition (1125 lines → 8 files)

### 2.1 Current Structure Analysis

```javascript
// frontend/js/components/artworks.js
Lines 1-70:    Template header and filters
Lines 71-200:  Artwork list template
Lines 201-400: Scheme display templates
Lines 401-500: Data and computed properties
Lines 501-700: Scheme management methods
Lines 701-850: Layer mapping logic
Lines 851-950: API interactions
Lines 951-1050: Validation and helpers
Lines 1051-1125: Event handlers
```

### 2.2 Target Decomposition

#### File 1: `views/Artworks.vue` (120 lines)

```vue
<template>
  <div class="artworks-view">
    <ViewModeToggle v-model="viewMode" />
    <ArtworkList
      v-if="viewMode === 'byLayer'"
      :artworks="artworks"
      :view-mode="viewMode"
      @edit-scheme="handleEditScheme"
      @delete-scheme="handleDeleteScheme"
    />
    <ColorPriorityView
      v-else
      :artworks="artworks"
      @focus="handleFocus"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useArtworksStore } from '@/stores/artworks'
import ArtworkList from '@/components/organisms/ArtworkList.vue'
import ColorPriorityView from '@/components/organisms/ColorPriorityView.vue'

const store = useArtworksStore()
const viewMode = ref('byLayer')
</script>
```

#### File 2: `components/organisms/ArtworkList.vue` (180 lines)
**Extract from:** Lines 71-250

```vue
<template>
  <div class="artwork-list">
    <div 
      v-for="artwork in sortedArtworks" 
      :key="artwork.id"
      class="artwork-item"
    >
      <ArtworkHeader :artwork="artwork" />
      <div class="schemes-container">
        <SchemeCard
          v-for="scheme in artwork.schemes"
          :key="scheme.id"
          :scheme="scheme"
          :artwork="artwork"
          @edit="$emit('edit-scheme', artwork, scheme)"
          @delete="$emit('delete-scheme', artwork, scheme)"
        />
      </div>
    </div>
  </div>
</template>
```

#### File 3: `components/organisms/SchemeEditor.vue` (200 lines)
**Extract from:** Lines 401-600

```vue
<template>
  <el-dialog
    v-model="visible"
    :title="editMode ? '编辑配色方案' : '新建配色方案'"
    width="800px"
  >
    <el-form :model="form" :rules="rules">
      <el-form-item label="方案名称" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <LayerMappingEditor
        v-model="form.layers"
        :available-colors="availableColors"
      />
      <ThumbnailUploader
        v-model="form.thumbnail"
        :preview="form.thumbnailPreview"
      />
    </el-form>
  </el-dialog>
</template>
```

#### File 4: `components/molecules/SchemeCard.vue` (100 lines)
**Extract from:** Lines 201-300

```vue
<template>
  <div class="scheme-card">
    <div class="scheme-header">
      <h4>{{ scheme.name }}</h4>
      <div class="scheme-actions">
        <el-button size="small" @click="$emit('edit')">
          修改
        </el-button>
        <el-button size="small" type="danger" @click="$emit('delete')">
          删除
        </el-button>
      </div>
    </div>
    <LayerGrid :layers="scheme.layers" />
  </div>
</template>
```

#### File 5: `components/molecules/LayerMappingTable.vue` (150 lines)
**Extract from:** Lines 701-850

```vue
<template>
  <table class="layer-mapping-table">
    <thead>
      <tr>
        <th>层号</th>
        <th>颜色代码</th>
        <th>配方</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(mapping, index) in modelValue" :key="index">
        <td>
          <el-input-number 
            v-model="mapping.layer" 
            :min="1"
            size="small"
          />
        </td>
        <td>
          <ColorSelector
            v-model="mapping.colorCode"
            :colors="availableColors"
          />
        </td>
        <td>
          <FormulaPreview :color-code="mapping.colorCode" />
        </td>
        <td>
          <el-button 
            size="small" 
            @click="removeLayer(index)"
          >
            删除
          </el-button>
        </td>
      </tr>
    </tbody>
  </table>
</template>
```

#### File 6: `components/organisms/ColorPriorityView.vue` (150 lines)
**Extract from:** Lines 301-450

```vue
<template>
  <div class="color-priority-view">
    <div 
      v-for="group in colorGroups" 
      :key="group.colorCode"
      class="color-group"
    >
      <div class="color-header">
        <ColorChip :code="group.colorCode" />
        <span class="usage-count">
          使用 {{ group.usages.length }} 次
        </span>
      </div>
      <div class="usage-list">
        <div 
          v-for="usage in group.usages" 
          :key="`${usage.artworkId}-${usage.schemeId}`"
          class="usage-item"
          @click="$emit('focus', usage)"
        >
          {{ usage.artworkName }} - {{ usage.schemeName }}
          (第{{ usage.layers.join(', ') }}层)
        </div>
      </div>
    </div>
  </div>
</template>
```

#### File 7: `composables/useArtworks.js` (125 lines)
**Extract from:** Lines 951-1075

```javascript
import { ref, computed } from 'vue'
import { artworkService } from '@/services/artworkService'

export function useArtworks() {
  const artworks = ref([])
  const loading = ref(false)
  
  const loadArtworks = async () => {
    loading.value = true
    try {
      const response = await artworkService.getAll()
      artworks.value = response.data
    } finally {
      loading.value = false
    }
  }
  
  const createScheme = async (artworkId, schemeData) => {
    const formData = new FormData()
    formData.append('name', schemeData.name)
    formData.append('layers', JSON.stringify(schemeData.layers))
    if (schemeData.thumbnail) {
      formData.append('thumbnail', schemeData.thumbnail)
    }
    
    await artworkService.createScheme(artworkId, formData)
    await loadArtworks()
  }
  
  const updateScheme = async (artworkId, schemeId, schemeData) => {
    // ... update logic
  }
  
  const deleteScheme = async (artworkId, schemeId) => {
    // ... delete logic
  }
  
  const parseArtworkTitle = (title) => {
    const match = title.match(/^([A-Z0-9]+)-(.+)$/)
    if (!match) return null
    return {
      code: match[1],
      name: match[2]
    }
  }
  
  return {
    artworks,
    loading,
    loadArtworks,
    createScheme,
    updateScheme,
    deleteScheme,
    parseArtworkTitle
  }
}
```

#### File 8: `stores/artworks.js` (150 lines)
**Extract from:** Lines 501-650

```javascript
import { defineStore } from 'pinia'
import { artworkService } from '@/services/artworkService'

export const useArtworksStore = defineStore('artworks', {
  state: () => ({
    artworks: [],
    loading: false,
    viewMode: 'byLayer',
    filters: {
      search: '',
      sortBy: 'time'
    }
  }),
  
  getters: {
    sortedArtworks: (state) => {
      let result = [...state.artworks]
      
      if (state.filters.search) {
        const query = state.filters.search.toLowerCase()
        result = result.filter(a => 
          a.code.toLowerCase().includes(query) ||
          a.name.toLowerCase().includes(query)
        )
      }
      
      switch (state.filters.sortBy) {
        case 'code':
          result.sort((a, b) => a.code.localeCompare(b.code))
          break
        case 'name':
          result.sort((a, b) => a.name.localeCompare(b.name))
          break
        case 'time':
        default:
          result.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          )
      }
      
      return result
    },
    
    colorUsageGroups: (state) => {
      const groups = new Map()
      
      state.artworks.forEach(artwork => {
        artwork.schemes?.forEach(scheme => {
          scheme.layers?.forEach(layer => {
            if (!layer.colorCode) return
            
            if (!groups.has(layer.colorCode)) {
              groups.set(layer.colorCode, {
                colorCode: layer.colorCode,
                usages: []
              })
            }
            
            groups.get(layer.colorCode).usages.push({
              artworkId: artwork.id,
              artworkName: `${artwork.code}-${artwork.name}`,
              schemeId: scheme.id,
              schemeName: scheme.name,
              layers: [layer.layer]
            })
          })
        })
      })
      
      return Array.from(groups.values())
        .sort((a, b) => b.usages.length - a.usages.length)
    },
    
    isColorUsed: (state) => (colorCode) => {
      return state.artworks.some(artwork =>
        artwork.schemes?.some(scheme =>
          scheme.layers?.some(layer => 
            layer.colorCode === colorCode
          )
        )
      )
    }
  },
  
  actions: {
    async loadArtworks() {
      // ... load logic
    },
    
    async createArtwork(artworkData) {
      // ... create logic
    },
    
    async updateArtwork(id, artworkData) {
      // ... update logic
    },
    
    async deleteArtwork(id) {
      // ... delete logic
    }
  }
})
```

## 3. Formula Calculator Decomposition (630 lines → 5 files)

### 3.1 Current Structure Analysis

```javascript
// frontend/js/components/formula-calculator.js
Lines 1-100:   Component definition and template
Lines 101-250: Calculator state and logic
Lines 251-400: Calculation methods
Lines 401-500: UI interaction handlers
Lines 501-630: Persistence and utilities
```

### 3.2 Target Decomposition

#### File 1: `components/organisms/FormulaCalculator.vue` (200 lines)

```vue
<template>
  <div class="formula-calculator" :class="{ minimized, floating }">
    <div class="calculator-header" @mousedown="startDrag">
      <h3>配方计算器</h3>
      <div class="calculator-controls">
        <el-button size="small" @click="toggleMinimize">
          <el-icon>
            <component :is="minimized ? 'Plus' : 'Minus'" />
          </el-icon>
        </el-button>
        <el-button size="small" @click="close">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </div>
    
    <div v-show="!minimized" class="calculator-body">
      <CalculatorInputs
        v-model="inputs"
        :max-volume="maxVolume"
        @calculate="calculate"
      />
      <CalculatorResults
        :results="results"
        :overflow="overflow"
        @rebalance="rebalance"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCalculator } from '@/composables/useCalculator'
import { useDraggable } from '@/composables/useDraggable'
import CalculatorInputs from '@/components/molecules/CalculatorInputs.vue'
import CalculatorResults from '@/components/molecules/CalculatorResults.vue'

const { 
  inputs, 
  results, 
  overflow,
  calculate,
  rebalance 
} = useCalculator()

const { 
  startDrag,
  position 
} = useDraggable('.formula-calculator')

const minimized = ref(false)
const floating = ref(true)
</script>
```

#### File 2: `components/molecules/CalculatorInputs.vue` (100 lines)

```vue
<template>
  <div class="calculator-inputs">
    <div class="input-row" v-for="(input, index) in modelValue" :key="index">
      <el-input
        v-model="input.name"
        placeholder="材料名称"
        size="small"
      />
      <el-input-number
        v-model="input.amount"
        :min="0"
        :step="0.1"
        placeholder="数量"
        size="small"
      />
      <el-select
        v-model="input.unit"
        placeholder="单位"
        size="small"
      >
        <el-option value="g" label="克" />
        <el-option value="ml" label="毫升" />
        <el-option value="滴" label="滴" />
      </el-select>
      <el-button
        size="small"
        type="danger"
        @click="removeInput(index)"
      >
        删除
      </el-button>
    </div>
    
    <el-button @click="addInput" size="small">
      添加材料
    </el-button>
  </div>
</template>
```

#### File 3: `components/molecules/CalculatorResults.vue` (80 lines)

```vue
<template>
  <div class="calculator-results">
    <div v-if="overflow" class="overflow-warning">
      <el-alert
        type="warning"
        :title="`超出最大容量 ${overflow}${overflowUnit}`"
        show-icon
      >
        <el-button size="small" @click="$emit('rebalance')">
          自动调整比例
        </el-button>
      </el-alert>
    </div>
    
    <div class="results-table">
      <table>
        <thead>
          <tr>
            <th>材料</th>
            <th>原始量</th>
            <th>调整后</th>
            <th>比例</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="result in results" :key="result.name">
            <td>{{ result.name }}</td>
            <td>{{ result.original }}{{ result.unit }}</td>
            <td>{{ result.adjusted }}{{ result.unit }}</td>
            <td>{{ result.ratio }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
```

#### File 4: `composables/useCalculator.js` (150 lines)

```javascript
import { ref, computed, watch } from 'vue'
import { useStorage } from './useStorage'

export function useCalculator() {
  const { load, save } = useStorage('calculator-state')
  
  const inputs = ref([
    { name: '', amount: 0, unit: 'g' }
  ])
  
  const maxVolume = ref(100)
  const results = ref([])
  const overflow = ref(0)
  
  // Load saved state
  const savedState = load()
  if (savedState) {
    inputs.value = savedState.inputs || inputs.value
    maxVolume.value = savedState.maxVolume || maxVolume.value
  }
  
  // Auto-save state
  watch([inputs, maxVolume], () => {
    save({
      inputs: inputs.value,
      maxVolume: maxVolume.value
    })
  }, { deep: true })
  
  const calculate = () => {
    const total = inputs.value.reduce((sum, item) => {
      return sum + convertToGrams(item.amount, item.unit)
    }, 0)
    
    if (total > maxVolume.value) {
      overflow.value = total - maxVolume.value
    } else {
      overflow.value = 0
    }
    
    results.value = inputs.value.map(item => {
      const grams = convertToGrams(item.amount, item.unit)
      const ratio = total > 0 ? (grams / total * 100).toFixed(2) : 0
      
      return {
        name: item.name,
        original: item.amount,
        adjusted: overflow.value > 0 
          ? (item.amount * maxVolume.value / total).toFixed(2)
          : item.amount,
        unit: item.unit,
        ratio
      }
    })
  }
  
  const rebalance = () => {
    const total = inputs.value.reduce((sum, item) => {
      return sum + convertToGrams(item.amount, item.unit)
    }, 0)
    
    if (total <= maxVolume.value) return
    
    const scale = maxVolume.value / total
    inputs.value = inputs.value.map(item => ({
      ...item,
      amount: (item.amount * scale).toFixed(2)
    }))
    
    calculate()
  }
  
  const convertToGrams = (amount, unit) => {
    switch (unit) {
      case 'ml': return amount * 1.0 // Assume density of 1
      case '滴': return amount * 0.05 // Assume 0.05g per drop
      default: return amount
    }
  }
  
  return {
    inputs,
    maxVolume,
    results,
    overflow,
    calculate,
    rebalance
  }
}
```

#### File 5: `composables/useDraggable.js` (100 lines)

```javascript
import { ref, onMounted, onUnmounted } from 'vue'

export function useDraggable(selector) {
  const position = ref({ x: 0, y: 0 })
  const isDragging = ref(false)
  const dragStart = ref({ x: 0, y: 0 })
  
  let element = null
  
  const startDrag = (e) => {
    isDragging.value = true
    dragStart.value = {
      x: e.clientX - position.value.x,
      y: e.clientY - position.value.y
    }
    
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
    e.preventDefault()
  }
  
  const onDrag = (e) => {
    if (!isDragging.value) return
    
    position.value = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y
    }
    
    if (element) {
      element.style.transform = 
        `translate(${position.value.x}px, ${position.value.y}px)`
    }
  }
  
  const stopDrag = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
  }
  
  onMounted(() => {
    element = document.querySelector(selector)
    
    // Load saved position
    const saved = localStorage.getItem('calculator-position')
    if (saved) {
      position.value = JSON.parse(saved)
      if (element) {
        element.style.transform = 
          `translate(${position.value.x}px, ${position.value.y}px)`
      }
    }
  })
  
  onUnmounted(() => {
    // Save position
    localStorage.setItem(
      'calculator-position', 
      JSON.stringify(position.value)
    )
  })
  
  return {
    position,
    isDragging,
    startDrag
  }
}
```

## 4. Backend Service Layer Decomposition

### 4.1 ColorService Refactoring

#### Current: `backend/services/ColorService.js` (156 lines)

```javascript
// Current monolithic service
class ColorService {
  getAllColors() { /* ... */ }
  getColorById() { /* ... */ }
  createColor() { /* ... */ }
  updateColor() { /* ... */ }
  deleteColor() { /* ... */ }
  findDuplicates() { /* ... */ }
  validateFormula() { /* ... */ }
  // ... mixed concerns
}
```

#### Target Structure:

**File 1: `services/ColorService.js` (80 lines)**
```javascript
// Pure business logic
import { ColorRepository } from '../repositories/ColorRepository'
import { DuplicateDetectionService } from './DuplicateDetectionService'
import { FormulaValidator } from '../validators/FormulaValidator'

export class ColorService {
  constructor() {
    this.repository = new ColorRepository()
    this.duplicateDetector = new DuplicateDetectionService()
    this.validator = new FormulaValidator()
  }
  
  async getAllColors(filters = {}) {
    return this.repository.findAll(filters)
  }
  
  async getColorById(id) {
    const color = await this.repository.findById(id)
    if (!color) {
      throw new NotFoundError(`Color ${id} not found`)
    }
    return color
  }
  
  async createColor(colorData) {
    // Validate
    const validation = this.validator.validate(colorData)
    if (!validation.valid) {
      throw new ValidationError(validation.errors)
    }
    
    // Check duplicates
    const duplicates = await this.duplicateDetector.check(colorData.formula)
    if (duplicates.length > 0) {
      throw new DuplicateError('Formula already exists', duplicates)
    }
    
    // Create
    return this.repository.create(colorData)
  }
  
  async updateColor(id, colorData) {
    await this.getColorById(id) // Verify exists
    
    // Validate
    const validation = this.validator.validate(colorData)
    if (!validation.valid) {
      throw new ValidationError(validation.errors)
    }
    
    return this.repository.update(id, colorData)
  }
  
  async deleteColor(id) {
    // Check references
    const isReferenced = await this.repository.isReferenced(id)
    if (isReferenced) {
      throw new ConflictError('Color is referenced by artworks')
    }
    
    return this.repository.delete(id)
  }
}
```

**File 2: `repositories/ColorRepository.js` (100 lines)**
```javascript
// Data access layer
import { BaseRepository } from './BaseRepository'
import { db } from '../database/connection'

export class ColorRepository extends BaseRepository {
  constructor() {
    super('custom_colors')
  }
  
  async findAll(filters = {}) {
    let query = db(this.table).select('*')
    
    if (filters.category) {
      query = query.where('category_id', filters.category)
    }
    
    if (filters.search) {
      query = query.where(function() {
        this.where('color_code', 'like', `%${filters.search}%`)
          .orWhere('formula', 'like', `%${filters.search}%`)
      })
    }
    
    if (filters.sortBy === 'name') {
      query = query.orderBy('color_code')
    } else {
      query = query.orderBy('created_at', 'desc')
    }
    
    return query
  }
  
  async isReferenced(id) {
    const count = await db('scheme_layers')
      .where('custom_color_id', id)
      .count('* as count')
      .first()
    
    return count.count > 0
  }
  
  async create(data) {
    const [id] = await db(this.table).insert({
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    })
    
    return this.findById(id)
  }
  
  async update(id, data) {
    await db(this.table)
      .where('id', id)
      .update({
        ...data,
        updated_at: new Date()
      })
    
    return this.findById(id)
  }
}
```

**File 3: `controllers/ColorController.js` (60 lines)**
```javascript
// Route handler
import { ColorService } from '../services/ColorService'
import { upload } from '../middleware/upload'

export class ColorController {
  constructor() {
    this.service = new ColorService()
  }
  
  async getAll(req, res, next) {
    try {
      const colors = await this.service.getAllColors(req.query)
      res.json(colors)
    } catch (error) {
      next(error)
    }
  }
  
  async getById(req, res, next) {
    try {
      const color = await this.service.getColorById(req.params.id)
      res.json(color)
    } catch (error) {
      next(error)
    }
  }
  
  async create(req, res, next) {
    try {
      const colorData = {
        ...req.body,
        image_path: req.file ? req.file.filename : null
      }
      
      const color = await this.service.createColor(colorData)
      res.status(201).json(color)
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        await deleteFile(req.file.path)
      }
      next(error)
    }
  }
  
  async update(req, res, next) {
    try {
      const colorData = {
        ...req.body,
        image_path: req.file ? req.file.filename : req.body.existingImagePath
      }
      
      const color = await this.service.updateColor(req.params.id, colorData)
      res.json(color)
    } catch (error) {
      next(error)
    }
  }
  
  async delete(req, res, next) {
    try {
      await this.service.deleteColor(req.params.id)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
```

## 5. CSS Modularization Plan

### 5.1 Current CSS Structure (11 files)

```
frontend/css/
├── index.css (imports all)
├── base/
│   ├── reset.css
│   └── variables.css
├── components/
│   ├── artworks.css (479 lines)
│   ├── buttons.css (245 lines)
│   ├── chips.css (173 lines)
│   ├── common.css (272 lines)
│   ├── custom-colors.css (253 lines)
│   ├── duplicate-dialog.css (182 lines)
│   ├── formula-calc.css (389 lines)
│   ├── mont-marte.css (150 lines)
│   └── print-dialog.css (306 lines)
├── layout/
│   ├── header.css (242 lines)
│   └── main.css (159 lines)
└── utilities/
    ├── animations.css (251 lines)
    └── helpers.css (192 lines)
```

### 5.2 Target SCSS Structure

```scss
// styles/variables.scss
$primary-color: #409EFF;
$success-color: #67C23A;
$warning-color: #E6A23C;
$danger-color: #F56C6C;

$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;

$font-size-xs: 12px;
$font-size-sm: 14px;
$font-size-md: 16px;
$font-size-lg: 18px;
$font-size-xl: 20px;

$border-radius: 4px;
$box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
```

```scss
// styles/mixins.scss
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin card {
  background: white;
  border-radius: $border-radius;
  box-shadow: $box-shadow;
  padding: $spacing-md;
}

@mixin button-variant($bg, $color: white) {
  background-color: $bg;
  color: $color;
  border: 1px solid darken($bg, 10%);
  
  &:hover {
    background-color: darken($bg, 10%);
  }
  
  &:active {
    background-color: darken($bg, 15%);
  }
}
```

### 5.3 Component Scoped Styles

```vue
<!-- components/molecules/ColorCard.vue -->
<style scoped lang="scss">
.color-card {
  @include card;
  margin-bottom: $spacing-md;
  
  &.highlighted {
    animation: pulse 1s ease-in-out;
    border: 2px solid $primary-color;
  }
  
  .color-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-sm;
    
    h3 {
      font-size: $font-size-lg;
      font-weight: 600;
      color: $text-primary;
    }
  }
  
  .actions {
    display: flex;
    gap: $spacing-xs;
  }
}
</style>
```

## 6. Common Patterns Extraction

### 6.1 Form Validation Composable

```javascript
// composables/useFormValidation.js
export function useFormValidation() {
  const rules = {
    required: (message = '此字段必填') => ({
      required: true,
      message,
      trigger: 'blur'
    }),
    
    colorCode: () => ({
      pattern: /^[A-Z0-9-]+$/,
      message: '颜色代码只能包含大写字母、数字和横线',
      trigger: 'blur'
    }),
    
    formula: () => ({
      validator: (rule, value, callback) => {
        const validation = validateFormula(value)
        if (!validation.valid) {
          callback(new Error(validation.error))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    })
  }
  
  return { rules }
}
```

### 6.2 API Error Handler

```javascript
// utils/errorHandler.js
export function handleApiError(error) {
  const status = error.response?.status
  const message = error.response?.data?.error || error.message
  
  switch (status) {
    case 400:
      ElMessage.error(`请求错误: ${message}`)
      break
    case 404:
      ElMessage.warning('资源不存在')
      break
    case 409:
      ElMessage.warning(`冲突: ${message}`)
      break
    case 500:
      ElMessage.error('服务器错误，请稍后重试')
      break
    default:
      ElMessage.error(`操作失败: ${message}`)
  }
  
  console.error('API Error:', error)
  return Promise.reject(error)
}
```

## 7. Performance Optimization Targets

### 7.1 Bundle Size Reduction

**Current:** ~2MB uncompressed
**Target:** <500KB gzipped

**Strategies:**
- Code splitting by route
- Lazy loading components
- Tree shaking unused code
- Optimize images with WebP
- Use CDN for large libraries

### 7.2 Load Time Optimization

**Current:** 4-5 seconds
**Target:** <2 seconds

**Strategies:**
- Implement caching layer
- Add pagination (10-20 items)
- Virtual scrolling for lists
- Debounce search inputs
- Optimize database queries

### 7.3 Memory Usage

**Current:** ~150MB after heavy use
**Target:** <50MB stable

**Strategies:**
- Clean up event listeners
- Implement virtual DOM properly
- Clear unused component instances
- Optimize state management
- Use WeakMap for caches

---

This detailed module decomposition plan provides specific, line-by-line guidance for breaking down the monolithic components into maintainable, testable modules. Each new file has a clear purpose, reasonable size, and defined interfaces with other modules.