// 冲突解决组件
// 用于处理并发编辑时的数据版本冲突

const ConflictResolver = {
  name: 'ConflictResolver',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    conflictData: {
      type: Object,
      default: () => ({})
    },
    myData: {
      type: Object,
      default: () => ({})
    },
    latestData: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:visible', 'resolve'],
  data() {
    return {
      selectedOption: 'overwrite', // 默认选中保留我的修改
      formulaSelection: {}, // 手动合并时每个配方片段的选择状态 { index: 'my'|'server' }
      alignedFormula: [], // 按颜色原料对齐的配方数组
      conflictTime: null // 冲突发生时间，固定不变
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.selectedOption = 'overwrite'
        this.conflictTime = new Date().toISOString() // 设置冲突发生的固定时间
        this.parseFormulas()
        this.resetFormulaSelection()
      }
    },
    selectedOption(newVal) {
      if (newVal !== 'merge') {
        this.resetFormulaSelection()
      }
    }
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return '-'
      // 使用全局helpers中修复了时区的formatDate函数
      return window.helpers.formatDate(dateStr, 'simple')
    },
    
    // 解析配方为颜色原料对象数组
    parseFormulas() {
      const myParsed = this.parseFormulaToIngredients(this.myData.formula || '')
      const serverParsed = this.parseFormulaToIngredients(this.latestData.formula || '')
      
      
      // 获取所有颜色原料名称的并集，使用sortKey进行匹配
      const allIngredientKeys = new Set()
      myParsed.forEach(item => allIngredientKeys.add(item.sortKey))
      serverParsed.forEach(item => allIngredientKeys.add(item.sortKey))
      
      // 创建对齐的配方数组
      this.alignedFormula = Array.from(allIngredientKeys).map(sortKey => {
        const myItem = myParsed.find(item => item.sortKey === sortKey)
        const serverItem = serverParsed.find(item => item.sortKey === sortKey)
        
        return {
          name: myItem ? myItem.name : (serverItem ? serverItem.name : sortKey),
          sortKey,
          my: myItem || null,
          server: serverItem || null
        }
      })
      
    },
    
    // 解析配方字符串为颜色原料对象数组
    parseFormulaToIngredients(formula) {
      if (!formula) return []
      
      
      // 先尝试用逗号分隔
      let parts = formula.split(/[,，\n]/).map(part => part.trim()).filter(part => part)
      
      // 如果逗号分隔没有效果（只有一个部分），则尝试匹配连续的"颜色名+数量+单位"模式
      if (parts.length <= 1) {
        // 匹配模式：颜色名(可包含空格) + 数字 + 可选单位(g/ml等)
        const regex = /([^\d]+)\s*(\d+(?:\.\d+)?)\s*(g|ml|克|毫升|滴)?/g
        parts = []
        let match
        while ((match = regex.exec(formula)) !== null) {
          const fullMatch = match[0].trim()
          if (fullMatch) {
            parts.push(fullMatch)
          }
        }
      }
      
      const ingredients = parts.map(line => {
        
        // 尝试解析颜色原料名称和用量
        const match = line.match(/^(.+?)\s*(\d+(?:\.\d+)?)\s*(g|ml|克|毫升|滴)?(.*)$/)
        if (match) {
          const colorName = match[1].trim()
          const amount = match[2]
          const unit = (match[3] || '').trim()
          const extra = (match[4] || '').trim()
          
          const result = {
            name: colorName,
            amount: amount,
            unit: unit,
            extra: extra,
            display: line,
            sortKey: colorName.replace(/\s/g, '').toLowerCase()
          }
          
          return result
        }
        
        // 如果无法解析用量，整个作为名称
        const fallbackResult = {
          name: line.trim(),
          amount: '',
          unit: '',
          extra: '',
          display: line,
          sortKey: line.trim().replace(/\s/g, '').toLowerCase()
        }
        
        return fallbackResult
      })
      
      return ingredients
    },
    
    // 获取对齐后的配方行数
    getAlignedFormulaCount() {
      return this.alignedFormula ? this.alignedFormula.length : 0
    },
    
    // 重置配方选择状态
    resetFormulaSelection() {
      this.formulaSelection = {}
      if (!this.alignedFormula) return
      
      this.alignedFormula.forEach((ingredient, index) => {
        if (this.selectedOption === 'overwrite') {
          // 选择我的版本（包括"删除"状态）
          this.formulaSelection[index] = 'my'
        } else if (this.selectedOption === 'refresh') {
          // 选择服务器版本（包括"（空）"状态）
          this.formulaSelection[index] = 'server'
        }
      })
    },
    
    // 点击chip切换选择
    selectChip(index, side) {
      if (this.selectedOption !== 'merge') {
        // 如果不是手动合并模式，切换到手动合并
        this.selectedOption = 'merge'
      }
      this.formulaSelection[index] = side
    },
    
    // 判断chip是否被选中
    isChipSelected(index, side) {
      if (this.selectedOption === 'merge') {
        return this.formulaSelection[index] === side
      }
      // 在非合并模式下，根据当前选择方案高亮对应版本
      return this.formulaSelection[index] === side
    },
    
    // 判断chip是否可点击（现在所有chip都可点击，包括"删除"和"（空）"）
    isChipClickable(index, side) {
      return true // 所有chip都可点击，包括删除和空白状态
    },
    
    selectOption(option) {
      this.selectedOption = option
    },
    
    handleCancel() {
      this.$emit('update:visible', false)
    },
    
    handleResolve() {
      let finalFormula = ''
      
      if (this.selectedOption === 'overwrite') {
        finalFormula = this.myData.formula || ''
      } else if (this.selectedOption === 'refresh') {
        finalFormula = this.latestData.formula || ''
      } else {
        // 构建合并后的配方（包括merge和其他模式）
        const selectedIngredients = []
        
        if (this.alignedFormula) {
          this.alignedFormula.forEach((ingredient, index) => {
            const selection = this.formulaSelection[index]
            if (selection === 'my' && ingredient.my) {
              selectedIngredients.push(ingredient.my.display)
            } else if (selection === 'server' && ingredient.server) {
              selectedIngredients.push(ingredient.server.display)
            }
          })
        }
        
        finalFormula = selectedIngredients.join(' ') // 使用空格连接，保持与原格式一致
      }
      
      this.$emit('resolve', {
        action: this.selectedOption,
        finalFormula,
        conflictData: this.conflictData,
        myData: this.myData,
        latestData: this.latestData
      })
    }
  },
  template: `
    <el-dialog
      :model-value="visible"
      @update:model-value="$emit('update:visible', $event)"
      class="conflict-resolver-dialog"
      title="数据冲突处理"
      width="750px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="conflict-content">
        <!-- 提示信息 -->
        <div class="conflict-alert">
          <el-alert
            title="检测到数据冲突"
            type="warning"
            show-icon
            :closable="false"
          >
            <template #default>
              <span>您正在编辑的数据已被其他用户修改，请选择处理方案：</span>
            </template>
          </el-alert>
        </div>

        <!-- 数据对比表格 -->
        <div class="comparison-table-container">
          <table class="comparison-table">
            <thead>
              <tr>
                <th width="60">版本</th>
                <th>我的修改 ({{ formatDate(conflictTime) }})</th>
                <th>服务器版本 ({{ formatDate(latestData.updated_at) }})</th>
              </tr>
            </thead>
            <tbody>
              <!-- 颜色编号 -->
              <tr>
                <td class="field-label">颜色编号</td>
                <td class="data-cell">{{ myData.color_code || '-' }}</td>
                <td class="data-cell">{{ latestData.color_code || '-' }}</td>
              </tr>
              <!-- 分类 -->
              <tr>
                <td class="field-label">分类</td>
                <td class="data-cell">{{ myData.category_name || '-' }}</td>
                <td class="data-cell">{{ latestData.category_name || '-' }}</td>
              </tr>
              <!-- 配方对比 - 每个颜色原料一行 -->
              <template v-if="alignedFormula.length">
                <tr v-for="(ingredient, index) in alignedFormula" :key="'ingredient-' + index" class="ingredient-row">
                  <td class="field-label ingredient-name">{{ ingredient.name }}</td>
                  <td class="formula-cell">
                    <span 
                      v-if="ingredient.my"
                      class="mf-chip formula-chip"
                      :class="{ 
                        selected: isChipSelected(index, 'my'),
                        clickable: true
                      }"
                      @click="selectChip(index, 'my')"
                    >
                      {{ ingredient.my.display }}
                    </span>
                    <span 
                      v-else 
                      class="mf-chip formula-chip deleted-chip"
                      :class="{ 
                        selected: isChipSelected(index, 'my'),
                        clickable: true
                      }"
                      @click="selectChip(index, 'my')"
                    >
                      删除
                    </span>
                  </td>
                  <td class="formula-cell">
                    <span 
                      v-if="ingredient.server"
                      class="mf-chip formula-chip"
                      :class="{ 
                        selected: isChipSelected(index, 'server'),
                        clickable: true
                      }"
                      @click="selectChip(index, 'server')"
                    >
                      {{ ingredient.server.display }}
                    </span>
                    <span 
                      v-else 
                      class="mf-chip formula-chip empty-chip"
                      :class="{ 
                        selected: isChipSelected(index, 'server'),
                        clickable: true
                      }"
                      @click="selectChip(index, 'server')"
                    >
                      （空）
                    </span>
                  </td>
                </tr>
              </template>
              <tr v-else>
                <td class="field-label">配方</td>
                <td class="formula-cell empty-formula">（无配方）</td>
                <td class="formula-cell empty-formula">（无配方）</td>
              </tr>
              <!-- 图片 -->
              <tr>
                <td class="field-label">图片</td>
                <td class="data-cell">{{ myData.image_path ? '已上传新图片' : '无变更' }}</td>
                <td class="data-cell">{{ latestData.image_path ? '有图片' : '无图片' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 处理方案选择 -->
        <div class="resolution-options">
          <div class="options-buttons-aligned">
            <div class="left-column-button">
              <el-button
                :type="selectedOption === 'overwrite' ? 'primary' : 'default'"
                :class="{ active: selectedOption === 'overwrite' }"
                @click="selectOption('overwrite')"
                size="small"
              >
                保留我的修改
              </el-button>
            </div>
            <div class="center-button">
              <el-button
                :type="selectedOption === 'merge' ? 'primary' : 'default'"
                :class="{ active: selectedOption === 'merge' }"
                @click="selectOption('merge')"
                size="small"
              >
                手动选择
              </el-button>
            </div>
            <div class="right-column-button">
              <el-button
                :type="selectedOption === 'refresh' ? 'primary' : 'default'"
                :class="{ active: selectedOption === 'refresh' }"
                @click="selectOption('refresh')"
                size="small"
              >
                保留服务器版本
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCancel" size="small">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleResolve"
            size="small"
          >
            确认处理
          </el-button>
        </div>
      </template>
    </el-dialog>
  `
}

// 添加样式
const conflictResolverStyles = `
<style>
.conflict-resolver-dialog {
  --el-dialog-content-font-size: 13px;
}

.conflict-content {
  max-height: 80vh;
  overflow-y: auto;
}

.conflict-alert {
  margin-bottom: 12px;
}

.conflict-alert .el-alert {
  padding: 8px 16px;
}

.conflict-alert .el-alert__title {
  font-size: 14px;
}

.conflict-alert .el-alert__description {
  font-size: 13px;
  margin-top: 4px;
}

/* 对比表格样式 */
.comparison-table-container {
  margin-bottom: 12px;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--sw-border-color);
  font-size: 12px;
  table-layout: fixed; /* 固定表格布局，更好控制列宽 */
}

.comparison-table th {
  background: var(--sw-bg-secondary);
  padding: 6px 8px;
  border: 1px solid var(--sw-border-color);
  font-weight: 600;
  color: var(--sw-text-primary);
  text-align: left;
  font-size: 11px;
}

.comparison-table th:first-child {
  width: 60px; /* 字段列更窄 */
}

.comparison-table th:nth-child(2),
.comparison-table th:nth-child(3) {
  width: calc((100% - 60px) / 2); /* 平分剩余宽度 */
}

.comparison-table td {
  padding: 4px 6px;
  border: 1px solid var(--sw-border-color);
  vertical-align: middle;
}

.field-label {
  background: var(--sw-bg-light);
  font-weight: 500;
  color: var(--sw-text-secondary);
  white-space: nowrap;
}

.data-cell {
  color: var(--sw-text-primary);
  word-break: break-word;
}

/* 配料行样式 */
.ingredient-row {
  border-bottom: 1px solid var(--sw-border-light);
}

.ingredient-row:last-of-type {
  border-bottom: none;
}

.ingredient-name {
  font-size: 11px !important;
  color: var(--sw-text-primary) !important;
  font-weight: 600 !important;
  background: var(--sw-bg-light) !important;
  text-align: right;
  padding-right: 8px !important;
}

/* 配方chip单元格 */
.formula-cell {
  padding: 3px 4px !important;
  text-align: center;
}

/* 删除状态chip */
.deleted-chip {
  background: var(--sw-danger-light) !important;
  color: var(--sw-danger) !important;
  border-color: var(--sw-danger-light) !important;
  cursor: pointer;
}

.deleted-chip.selected {
  background: var(--sw-danger) !important;
  color: white !important;
  border-color: var(--sw-danger) !important;
  box-shadow: 0 0 0 2px var(--sw-danger-light);
}

.deleted-chip:hover {
  background: var(--sw-danger) !important;
  color: white !important;
}

/* 空白状态chip */
.empty-chip {
  background: var(--sw-bg-light) !important;
  color: var(--sw-text-tertiary) !important;
  border-color: var(--sw-border-light) !important;
  cursor: pointer;
  font-style: italic;
}

.empty-chip.selected {
  background: var(--sw-text-tertiary) !important;
  color: white !important;
  border-color: var(--sw-text-tertiary) !important;
  box-shadow: 0 0 0 2px rgba(128, 128, 128, 0.2);
}

.empty-chip:hover {
  background: var(--sw-text-tertiary) !important;
  color: white !important;
}

.formula-chips-column {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
}

.chip-row {
  display: flex;
  width: 100%;
  min-height: 20px;
  align-items: center;
}

.formula-chip {
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  position: relative;
}

.formula-chip.clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.formula-chip.selected {
  background: var(--sw-primary) !important;
  color: white !important;
  border-color: var(--sw-primary) !important;
  box-shadow: 0 0 0 2px var(--sw-primary-light);
}

.chip-placeholder {
  height: 18px;
  width: 100%;
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--sw-text-tertiary);
  font-style: italic;
}

.deleted-ingredient {
  color: var(--sw-danger);
  background: var(--sw-danger-light);
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid var(--sw-danger-light);
}

.empty-ingredient {
  color: var(--sw-text-tertiary);
  background: var(--sw-bg-light);
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid var(--sw-border-light);
}

.empty-formula {
  color: var(--sw-text-tertiary);
  font-style: italic;
  font-size: 12px;
}

/* 处理方案选择 */
.resolution-options {
  margin-top: 12px;
}

.options-buttons-aligned {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 8px;
}

.left-column-button,
.center-button, 
.right-column-button {
  flex: 1;
  display: flex;
  justify-content: center;
}

.options-buttons-aligned .el-button {
  min-width: 90px;
  max-width: 120px;
  font-size: 12px;
  padding: 6px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.options-buttons-aligned .el-button.active {
  font-weight: 600;
}

/* 对话框底部 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.dialog-footer .el-button {
  min-width: 80px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .conflict-resolver-dialog {
    width: 95vw !important;
  }
  
  .comparison-table th,
  .comparison-table td {
    padding: 6px 8px;
    font-size: 12px;
  }
}

@media (max-width: 768px) {
  .comparison-table th:first-child,
  .comparison-table td.field-label {
    width: 80px;
  }
  
  .options-buttons {
    flex-direction: column;
  }
  
  .options-buttons .el-button {
    min-width: auto;
    width: 100%;
  }
}

/* 继承现有mf-chip样式 */
.comparison-table .mf-chip {
  background: #f0f4f8;
  border: 1px solid #d6dee6;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
  display: inline-block;
}
</style>
`

// 注入样式到页面头部
if (!document.querySelector('#conflict-resolver-styles')) {
  const styleElement = document.createElement('style')
  styleElement.id = 'conflict-resolver-styles'
  styleElement.innerHTML = conflictResolverStyles
  document.head.appendChild(styleElement)
}