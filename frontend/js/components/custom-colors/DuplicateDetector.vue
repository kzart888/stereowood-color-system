<!-- 配方查重检测组件 -->
<!-- 职责：负责自配颜色配方的重复检测、显示和合并处理 -->
<template>
  <el-dialog
    v-model="visible"
    class="dup-groups-dialog"
    title="重复配方处理（比例等价）"
    width="760px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <!-- 删除进度提示 -->
    <div v-if="deletionPending" style="margin-bottom:8px;">
      <el-alert type="info" title="正在删除..." show-icon />
    </div>

    <!-- 无重复组提示 -->
    <div v-if="!duplicateGroups.length" class="meta-text">
      暂无重复组
    </div>

    <!-- 重复组列表 -->
    <div v-else class="dup-groups-wrapper">
      <div 
        class="dup-group-block" 
        v-for="grp in duplicateGroups" 
        :key="grp.signature"
      >
        <!-- 重复组头部 -->
        <div class="dup-group-head">
          <span class="dup-group-badge">{{ grp.records.length }} 条</span>
          <span class="dup-group-formula">
            <el-tag 
              v-for="it in grp.parsed.items" 
              :key="it.name+'-'+it.unit" 
              size="small" 
              disable-transitions
            >
              {{ it.name }} {{ it.ratio }}
            </el-tag>
          </span>
        </div>

        <!-- 重复组记录 -->
        <div class="dup-records">
          <div 
            class="dup-record-row" 
            v-for="rec in grp.records" 
            :key="rec.id" 
            :class="{ 'is-referenced': isColorReferenced(rec) }"
          >
            <!-- 保留选项 -->
            <label class="keep-radio">
              <input 
                type="radio" 
                :name="'keep-'+grp.signature" 
                :value="rec.id" 
                v-model="duplicateSelections[grp.signature]" 
              />
              <span>保留</span>
            </label>
            
            <!-- 颜色编号 -->
            <span 
              class="code" 
              @click="$emit('focus-custom-color', rec.color_code)"
            >
              {{ rec.color_code }}
            </span>
            
            <!-- 更新时间 -->
            <span class="meta" v-if="rec.updated_at">
              {{ formatDate(rec.updated_at) }}
            </span>
            
            <!-- 引用标记 -->
            <span class="ref-flag" v-if="isColorReferenced(rec)">
              被引用
            </span>
          </div>
        </div>

        <!-- 重复组底部提示 -->
        <div 
          class="dup-group-foot meta-text" 
          v-if="!duplicateSelections[grp.signature]"
        >
          请选择要保留的记录
        </div>
      </div>
    </div>

    <!-- 对话框底部按钮 -->
    <template #footer>
      <el-button @click="keepAllDuplicates" :disabled="deletionPending">
        全部保留
      </el-button>
      
      <el-button 
        type="primary" 
        :disabled="!canDeleteAny || deletionPending" 
        @click="performDuplicateDeletion"
      >
        保留所选并删除其它
      </el-button>
      
      <el-tooltip content="更新引用到保留记录后删除其它（包括已被引用的记录）" placement="top">
        <span>
          <el-button 
            type="danger" 
            :disabled="!canForceMerge || deletionPending || mergingPending" 
            :loading="mergingPending" 
            @click="confirmForceMerge"
          >
            强制合并（更新引用）
          </el-button>
        </span>
      </el-tooltip>
    </template>
  </el-dialog>
</template>

<script>
import { ref, reactive, computed, watch } from 'vue'

export default {
  name: 'DuplicateDetector',
  
  props: {
    // 控制对话框显示隐藏
    modelValue: {
      type: Boolean,
      default: false
    },
    // 自配颜色数据列表
    customColors: {
      type: Array,
      default: () => []
    },
    // 作品数据（用于检查引用）
    artworks: {
      type: Array,
      default: () => []
    }
  },

  emits: [
    'update:modelValue',
    'focus-custom-color',
    'delete-colors',
    'force-merge'
  ],

  setup(props, { emit }) {
    // 响应式数据
    const duplicateGroups = ref([])
    const duplicateSelections = reactive({})
    const deletionPending = ref(false)
    const mergingPending = ref(false)

    // 计算属性
    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })

    const canDeleteAny = computed(() => {
      if (!duplicateGroups.value || !duplicateGroups.value.length) return false
      for (const g of duplicateGroups.value) {
        const keepId = duplicateSelections[g.signature]
        if (!keepId) continue
        // 是否存在可删（未引用且不是保留项）
        if (g.records.some(r => r.id !== keepId && !isColorReferenced(r))) return true
      }
      return false
    })

    const canForceMerge = computed(() => {
      if (!duplicateGroups.value || !duplicateGroups.value.length) return false
      return duplicateGroups.value.some(g => 
        g.records.length > 1 && duplicateSelections[g.signature]
      )
    })

    // 监听数据变化，自动运行查重
    watch(() => props.customColors, (newColors) => {
      if (newColors && newColors.length > 0 && visible.value) {
        runDuplicateCheck()
      }
    }, { deep: true })

    // 方法
    const formatDate = (ts) => {
      if (!ts) return ''
      const d = new Date(ts)
      const p = n => n < 10 ? '0' + n : '' + n
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    }

    const isColorReferenced = (color) => {
      if (!color) return false
      const code = color.color_code
      if (!code) return false
      const artworks = props.artworks || []
      
      for (const a of artworks) {
        for (const s of (a.schemes || [])) {
          for (const l of (s.layers || [])) {
            if (l.colorCode === code) return true
          }
        }
      }
      return false
    }

    const runDuplicateCheck = (focusSignature = null, preferredKeepId = null) => {
      if (!window.duplicateDetector) {
        window.ElementPlus?.ElMessage?.info('查重模块未加载')
        return
      }

      const list = props.customColors || []
      const map = window.duplicateDetector.groupByRatioSignature(list)
      const sigs = Object.keys(map)
      
      if (!sigs.length) {
        window.ElementPlus?.ElMessage?.success('未发现重复配方')
        visible.value = false
        return
      }

      // 构造组数据
      duplicateGroups.value = sigs.map(sig => {
        const recs = map[sig].slice().sort((a, b) => 
          new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
        )
        const parsed = window.duplicateDetector.parseRatio(sig)
        return { signature: sig, records: recs, parsed }
      })

      // 重置选择状态
      Object.keys(duplicateSelections).forEach(key => {
        delete duplicateSelections[key]
      })

      // 默认选中：刚保存记录所在组，否则各组选更新时间最新一条
      duplicateGroups.value.forEach(g => {
        if (focusSignature && g.signature === focusSignature && preferredKeepId) {
          duplicateSelections[g.signature] = preferredKeepId
        } else if (g.records.length) {
          duplicateSelections[g.signature] = g.records[0].id // 最新
        }
      })

      window.ElementPlus?.ElMessage?.warning(`发现 ${sigs.length} 组重复配方`)
    }

    const detectOnSave = (savedColor, allColors) => {
      if (!window.duplicateDetector || !savedColor) return null
      
      const grp = window.duplicateDetector.detectOnSave(savedColor, allColors)
      if (grp) {
        window.ElementPlus?.ElMessage?.warning('发现重复配方（比例等价）')
        // 直接打开对话框并聚焦到该组
        visible.value = true
        setTimeout(() => {
          runDuplicateCheck(grp.signature, savedColor.id)
        }, 100)
        return grp
      }
      return null
    }

    const keepAllDuplicates = () => {
      visible.value = false
      window.ElementPlus?.ElMessage?.info('已保留全部重复记录')
    }

    const performDuplicateDeletion = async () => {
      if (deletionPending.value) return
      
      const toDelete = []
      duplicateGroups.value.forEach(g => {
        const keepId = duplicateSelections[g.signature]
        if (!keepId) return
        g.records.forEach(r => {
          if (r.id !== keepId && !isColorReferenced(r)) {
            toDelete.push(r)
          }
        })
      })
      
      if (!toDelete.length) {
        window.ElementPlus?.ElMessage?.info('没有可删除的记录')
        return
      }

      try {
        await window.ElementPlus.ElMessageBox.confirm(
          `将删除 ${toDelete.length} 条记录，确认继续？`,
          '删除确认',
          {
            type: 'warning',
            confirmButtonText: '确认删除',
            cancelButtonText: '取消'
          }
        )
      } catch (e) {
        return
      }

      emit('delete-colors', toDelete.map(r => r.id))
    }

    const confirmForceMerge = async () => {
      if (mergingPending.value || deletionPending.value) return
      
      const candidates = duplicateGroups.value.filter(g => 
        g.records.length > 1 && duplicateSelections[g.signature]
      )
      
      if (!candidates.length) {
        window.ElementPlus?.ElMessage?.info('请选择要保留的记录')
        return
      }

      const g = candidates[0]
      const keepId = duplicateSelections[g.signature]
      if (!keepId) {
        window.ElementPlus?.ElMessage?.info('请先选择要保留的记录')
        return
      }

      const removeIds = g.records.filter(r => r.id !== keepId).map(r => r.id)
      if (!removeIds.length) {
        window.ElementPlus?.ElMessage?.info('该组没有其它记录')
        return
      }

      let referenced = 0
      g.records.forEach(r => {
        if (r.id !== keepId && isColorReferenced(r)) referenced++
      })

      const msg = `将合并该组：保留 1 条，删除 ${removeIds.length} 条；其中 ${referenced} 条被引用，其引用将更新到保留记录。确认继续？`
      
      try {
        await window.ElementPlus.ElMessageBox.confirm(msg, '强制合并确认', {
          type: 'warning',
          confirmButtonText: '执行合并',
          cancelButtonText: '取消'
        })
      } catch (e) {
        return
      }

      emit('force-merge', {
        keepId,
        removeIds,
        signature: g.signature
      })
    }

    // 暴露方法给父组件
    const publicMethods = {
      runDuplicateCheck,
      detectOnSave
    }

    return {
      // 响应式数据
      duplicateGroups,
      duplicateSelections,
      deletionPending,
      mergingPending,
      
      // 计算属性
      visible,
      canDeleteAny,
      canForceMerge,
      
      // 方法
      formatDate,
      isColorReferenced,
      keepAllDuplicates,
      performDuplicateDeletion,
      confirmForceMerge,
      
      // 公共方法
      ...publicMethods
    }
  }
}
</script>

<style scoped>
.dup-groups-wrapper {
  max-height: 500px;
  overflow-y: auto;
}

.dup-group-block {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-bottom: 12px;
  padding: 12px;
  background-color: #fafafa;
}

.dup-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.dup-group-badge {
  background-color: #409eff;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
}

.dup-group-formula {
  flex: 1;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.dup-records {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dup-record-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 3px;
  background-color: white;
}

.dup-record-row.is-referenced {
  background-color: #fef0f0;
  border-left: 3px solid #f56c6c;
}

.keep-radio {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 12px;
  min-width: 50px;
}

.keep-radio input {
  margin: 0;
}

.code {
  font-weight: bold;
  color: #409eff;
  cursor: pointer;
  min-width: 80px;
}

.code:hover {
  text-decoration: underline;
}

.meta {
  font-size: 12px;
  color: #909399;
  flex: 1;
}

.ref-flag {
  background-color: #f56c6c;
  color: white;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 10px;
}

.dup-group-foot {
  margin-top: 8px;
  font-size: 12px;
  color: #f56c6c;
}

.meta-text {
  color: #909399;
  font-size: 14px;
  text-align: center;
  padding: 20px;
}
</style>