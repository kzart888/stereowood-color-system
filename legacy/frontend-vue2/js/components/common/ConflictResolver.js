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
      selectedOption: ''
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.selectedOption = ''
      }
    }
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return '-'
      return new Date(dateStr).toLocaleString('zh-CN')
    },
    getResolveButtonText() {
      switch (this.selectedOption) {
        case 'overwrite':
          return '强制覆盖'
        case 'merge':
          return '手动合并'
        case 'refresh':
          return '刷新数据'
        default:
          return '确定'
      }
    },
    handleCancel() {
      this.$emit('update:visible', false)
    },
    handleResolve() {
      if (!this.selectedOption) return
      
      this.$emit('resolve', {
        action: this.selectedOption,
        conflictData: this.conflictData,
        myData: this.myData,
        latestData: this.latestData
      })
    }
  },
  template: `
    <el-dialog
      v-model="visible"
      class="conflict-resolver-dialog"
      title="数据冲突处理"
      width="800px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="conflict-content">
        <div class="conflict-alert">
          <el-alert
            title="检测到数据冲突"
            type="warning"
            show-icon
            :closable="false"
          >
            <template #default>
              <p>您正在编辑的数据已被其他用户修改，请选择如何处理：</p>
            </template>
          </el-alert>
        </div>

        <div class="conflict-comparison">
          <div class="comparison-header">
            <h3>数据对比</h3>
          </div>
          
          <div class="comparison-content">
            <!-- 我的修改 -->
            <div class="data-column my-changes">
              <h4 class="column-title">
                <el-icon><Edit /></el-icon>
                我的修改
              </h4>
              <div class="data-card">
                <div v-if="myData.color_code" class="data-row">
                  <span class="label">颜色编号:</span>
                  <span class="value">{{ myData.color_code }}</span>
                </div>
                <div v-if="myData.formula" class="data-row">
                  <span class="label">配方:</span>
                  <span class="value formula">{{ myData.formula }}</span>
                </div>
                <div v-if="myData.category_name" class="data-row">
                  <span class="label">分类:</span>
                  <span class="value">{{ myData.category_name }}</span>
                </div>
                <div v-if="myData.image_path" class="data-row">
                  <span class="label">图片:</span>
                  <span class="value">已上传新图片</span>
                </div>
              </div>
            </div>

            <!-- 服务器最新版本 -->
            <div class="data-column server-latest">
              <h4 class="column-title">
                <el-icon><Connection /></el-icon>
                服务器最新版本
              </h4>
              <div class="data-card">
                <div v-if="latestData.color_code" class="data-row">
                  <span class="label">颜色编号:</span>
                  <span class="value">{{ latestData.color_code }}</span>
                </div>
                <div v-if="latestData.formula" class="data-row">
                  <span class="label">配方:</span>
                  <span class="value formula">{{ latestData.formula }}</span>
                </div>
                <div v-if="latestData.category_name" class="data-row">
                  <span class="label">分类:</span>
                  <span class="value">{{ latestData.category_name }}</span>
                </div>
                <div class="data-row">
                  <span class="label">更新时间:</span>
                  <span class="value">{{ formatDate(latestData.updated_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="resolution-options">
          <h3>选择解决方案</h3>
          <div class="options-list">
            <el-card class="option-card" :class="{ active: selectedOption === 'overwrite' }">
              <el-radio v-model="selectedOption" value="overwrite">
                <strong>覆盖保存</strong>
              </el-radio>
              <p class="option-desc">使用我的修改覆盖服务器版本（将丢失其他用户的修改）</p>
            </el-card>
            
            <el-card class="option-card" :class="{ active: selectedOption === 'merge' }">
              <el-radio v-model="selectedOption" value="merge">
                <strong>手动合并</strong>
              </el-radio>
              <p class="option-desc">查看最新数据，手动合并后重新提交</p>
            </el-card>
            
            <el-card class="option-card" :class="{ active: selectedOption === 'refresh' }">
              <el-radio v-model="selectedOption" value="refresh">
                <strong>刷新数据</strong>
              </el-radio>
              <p class="option-desc">丢弃我的修改，使用服务器最新版本（推荐安全选项）</p>
            </el-card>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCancel">取消</el-button>
          <el-button 
            type="primary" 
            :disabled="!selectedOption"
            @click="handleResolve"
          >
            {{ getResolveButtonText() }}
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
  --el-dialog-content-font-size: 14px;
}

.conflict-content {
  max-height: 70vh;
  overflow-y: auto;
}

.conflict-alert {
  margin-bottom: 24px;
}

.conflict-comparison {
  margin-bottom: 24px;
}

.comparison-header h3 {
  margin: 0 0 16px 0;
  color: var(--sw-text-primary);
  font-size: 16px;
  font-weight: 600;
}

.comparison-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.data-column {
  border: 1px solid var(--sw-border-color);
  border-radius: 8px;
  overflow: hidden;
}

.column-title {
  background: var(--sw-bg-secondary);
  padding: 12px 16px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.my-changes .column-title {
  color: var(--sw-primary);
  background: var(--sw-primary-light);
}

.server-latest .column-title {
  color: var(--sw-success);
  background: var(--sw-success-light);
}

.data-card {
  padding: 16px;
}

.data-row {
  display: flex;
  margin-bottom: 8px;
}

.data-row:last-child {
  margin-bottom: 0;
}

.data-row .label {
  min-width: 80px;
  color: var(--sw-text-secondary);
  font-weight: 500;
}

.data-row .value {
  flex: 1;
  color: var(--sw-text-primary);
  word-break: break-all;
}

.data-row .value.formula {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  background: var(--sw-bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}

.resolution-options h3 {
  margin: 0 0 16px 0;
  color: var(--sw-text-primary);
  font-size: 16px;
  font-weight: 600;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid var(--sw-border-color);
}

.option-card:hover {
  border-color: var(--sw-primary-light);
  box-shadow: var(--sw-shadow-hover);
}

.option-card.active {
  border-color: var(--sw-primary);
  background: var(--sw-primary-light);
}

.option-card .el-card__body {
  padding: 16px;
}

.option-card .el-radio {
  display: block;
  margin-bottom: 8px;
}

.option-card .el-radio__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--sw-text-primary);
}

.option-desc {
  margin: 0;
  font-size: 13px;
  color: var(--sw-text-secondary);
  line-height: 1.4;
  padding-left: 24px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .comparison-content {
    grid-template-columns: 1fr;
  }
  
  .conflict-resolver-dialog {
    width: 95vw !important;
    margin: 0 auto;
  }
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