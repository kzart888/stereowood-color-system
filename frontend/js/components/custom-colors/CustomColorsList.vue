<!-- 自配颜色列表展示组件 -->
<!-- 职责：负责颜色列表的展示、分类筛选、排序等UI逻辑 -->
<template>
  <div>
    <!-- 分类筛选标签栏 -->
    <div class="category-switch-group" role="tablist" aria-label="颜色分类筛选">
      <button 
        type="button" 
        class="category-switch" 
        :class="{active: activeCategory==='all'}" 
        @click="activeCategory='all'" 
        role="tab" 
        :aria-selected="activeCategory==='all'"
      >
        全部
      </button>
      <button 
        v-for="cat in orderedCategoriesWithOther" 
        :key="cat.id || 'other'"
        type="button"
        class="category-switch"
        :class="{active: activeCategory===String(cat.id || 'other')}"
        @click="activeCategory=String(cat.id || 'other')"
        role="tab"
        :aria-selected="activeCategory===String(cat.id || 'other')"
      >
        {{ cat.name }}
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon> 加载中...
    </div>

    <!-- 列表内容 -->
    <div v-else>
      <!-- 空状态 -->
      <div v-if="filteredColors.length === 0" class="empty-message">
        暂无自配色，点击右上角"新自配色"添加
      </div>

      <!-- 颜色列表 -->
      <div 
        v-for="color in filteredColors" 
        :key="color.id" 
        class="artwork-bar" 
        :ref="setColorItemRef(color)" 
        :class="{'highlight-pulse': highlightCode === color.color_code}"
      >
        <div class="artwork-header">
          <div class="artwork-title">{{ color.color_code }}</div>
          <div class="color-actions">
            <el-button 
              size="small" 
              @click="$calc && $calc.open(color.color_code, color.formula||'', $event.currentTarget)"
            >
              <el-icon><ScaleToOriginal /></el-icon> 计算
            </el-button>
            <el-button 
              size="small" 
              type="primary" 
              @click="$emit('edit-color', color)"
            >
              <el-icon><Edit /></el-icon> 修改
            </el-button>
            <el-button 
              size="small" 
              @click="$emit('view-history', color)" 
              disabled
            >
              <el-icon><Clock /></el-icon> 历史
            </el-button>
            
            <!-- 删除按钮 - 根据是否被引用显示不同状态 -->
            <template v-if="isColorReferenced(color)">
              <el-tooltip content="该自配色已被引用，无法删除" placement="top">
                <span>
                  <el-button size="small" type="danger" disabled>
                    <el-icon><Delete /></el-icon> 删除
                  </el-button>
                </span>
              </el-tooltip>
            </template>
            <el-button 
              v-else 
              size="small" 
              type="danger" 
              @click="$emit('delete-color', color)"
            >
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </div>
        </div>

        <!-- 颜色详细信息 -->
        <div style="display:flex; gap:12px; padding:6px 4px 4px;">
          <!-- 颜色缩略图 -->
          <div 
            class="scheme-thumbnail" 
            :class="{ 'no-image': !color.image_path }" 
            @click="color.image_path && $thumbPreview && $thumbPreview.show($event, $helpers.buildUploadURL(baseURL, color.image_path))"
          >
            <template v-if="!color.image_path">未上传图片</template>
            <img 
              v-else 
              :src="$helpers.buildUploadURL(baseURL, color.image_path)" 
              style="width:100%;height:100%;object-fit:cover;border-radius:4px;" 
            />
          </div>

          <!-- 颜色信息 -->
          <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;">
            <!-- 配方信息 -->
            <div class="meta-text" v-if="!color.formula">（未指定配方）</div>
            <div class="meta-text" v-else>
              <div class="mapping-formula-chips">
                <el-tooltip 
                  v-for="(seg,i) in formulaSegments(color.formula)" 
                  :key="'ccf'+color.id+'-'+i" 
                  :content="seg" 
                  placement="top"
                >
                  <span class="mf-chip">{{ seg }}</span>
                </el-tooltip>
              </div>
            </div>
            
            <!-- 分类信息 -->
            <div class="meta-text">分类：{{ categoryName(color) }}</div>
            
            <!-- 更新时间 -->
            <div class="meta-text" v-if="color.updated_at">
              更新：{{ formatDate(color.updated_at) }}
            </div>
            
            <!-- 使用情况 -->
            <div class="meta-text">适用层：
              <template v-if="usageGroups(color).length">
                <span class="usage-chips">
                  <span 
                    v-for="g in usageGroups(color)" 
                    :key="'ug'+color.id+g.display" 
                    class="mf-chip usage-chip" 
                    style="cursor:pointer;" 
                    @click="$emit('focus-artwork-scheme', g)"
                  >
                    {{ g.display }}
                  </span>
                </span>
              </template>
              <span v-else>（未使用）</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'CustomColorsList',
  
  props: {
    // 颜色数据
    customColors: {
      type: Array,
      default: () => []
    },
    // 分类数据
    categories: {
      type: Array,
      default: () => []
    },
    // 作品数据（用于计算使用情况）
    artworks: {
      type: Array,
      default: () => []
    },
    // 基础URL
    baseURL: {
      type: String,
      default: ''
    },
    // 排序模式
    sortMode: {
      type: String,
      default: 'time' // time | name
    },
    // 加载状态
    loading: {
      type: Boolean,
      default: false
    },
    // 全局搜索查询
    globalSearchQuery: {
      type: String,
      default: ''
    },
    // 当前激活的标签页
    activeTab: {
      type: String,
      default: 'custom-colors'
    }
  },

  emits: [
    'edit-color',
    'delete-color', 
    'view-history',
    'focus-artwork-scheme'
  ],

  setup(props, { emit }) {
    // 响应式数据
    const activeCategory = ref('all')
    const _colorItemRefs = new Map()
    const highlightCode = ref(null)

    // 计算属性
    const sjCategoryId = computed(() => {
      const sj = props.categories.find(c => c.code === 'SJ')
      return sj ? sj.id : null
    })

    // 排序并插入"色精"分类在正确位置
    const orderedCategoriesWithOther = computed(() => {
      const raw = [...(props.categories || [])]
      raw.sort((a, b) => (a.code || '').localeCompare(b.code || ''))
      
      const result = []
      raw.forEach(cat => {
        result.push(cat)
        if (cat.code === 'YE') {
          if (!raw.some(c => c.code === 'SJ')) {
            // 若未出现在原始数据中，跳过插入（后端保证存在）
          }
        }
      })
      
      // 如果 SJ 存在但顺序不正确，重排：先移除再重新插入
      const sjIndex = result.findIndex(c => c.code === 'SJ')
      if (sjIndex !== -1) {
        const sjCat = result.splice(sjIndex, 1)[0]
        const yeIndex = result.findIndex(c => c.code === 'YE')
        if (yeIndex !== -1) result.splice(yeIndex + 1, 0, sjCat)
        else result.push(sjCat)
      }
      
      // 添加"其他"
      result.push({ id: 'other', name: '其他', code: 'OTHER' })
      return result
    })

    // 根据当前选中的分类过滤颜色
    const filteredColors = computed(() => {
      let list
      if (activeCategory.value === 'all') {
        list = props.customColors.slice()
      } else if (activeCategory.value === 'other') {
        list = props.customColors.filter(color => {
          const prefix = color.color_code.substring(0, 2).toUpperCase()
          const matchedCategory = props.categories.find(cat => cat.code === prefix)
          return !matchedCategory
        })
      } else {
        list = props.customColors.filter(c => c.category_id === parseInt(activeCategory.value))
      }

      // 本页搜索过滤
      const q = (props.globalSearchQuery || '').trim().toLowerCase()
      if (q && props.activeTab === 'custom-colors') {
        list = list.filter(c => 
          ((c.name || '').toLowerCase().includes(q)) || 
          ((c.color_code || '').toLowerCase().includes(q))
        )
      }

      // 排序
      if (props.sortMode === 'name') {
        list.sort((a, b) => (a.color_code || '').localeCompare(b.color_code || ''))
      } else { // time 默认
        list.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
      }

      return list
    })

    // 工具方法
    const setColorItemRef = (color) => {
      return (el) => {
        if (el) _colorItemRefs.set(color.color_code, el)
        else _colorItemRefs.delete(color.color_code)
      }
    }

    const formatDate = (ts) => {
      if (!ts) return ''
      const d = new Date(ts)
      const p = n => n < 10 ? '0' + n : '' + n
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    }

    const categoryName = (color) => {
      if (!color) return '-'
      const cat = props.categories.find(c => c.id === color.category_id)
      if (cat) return cat.name
      // 前缀推断
      const prefix = (color.color_code || '').substring(0, 2).toUpperCase()
      const byPrefix = props.categories.find(c => c.code === prefix)
      return byPrefix ? byPrefix.name : '其他'
    }

    const formulaSegments = (formula) => {
      const str = (formula || '').trim()
      if (!str) return []
      const parts = str.split(/\s+/)
      const segs = []
      let pending = null
      
      for (const t of parts) {
        const m = t.match(/^([\d.]+)([a-zA-Z\u4e00-\u9fa5%]+)$/)
        if (m && pending) {
          segs.push(pending + ' ' + m[1] + m[2])
          pending = null
        } else {
          if (pending) segs.push(pending)
          pending = t
        }
      }
      if (pending) segs.push(pending)
      return segs
    }

    const artworkTitle = (art) => {
      if (!art) return ''
      const code = art.code || art.no || ''
      const name = art.name || art.title || ''
      if (code && name) return `${code}-${name}`
      return code || name || `作品#${art.id}`
    }

    const usageGroups = (color) => {
      if (!color) return []
      const code = color.color_code
      if (!code) return []
      const artworks = props.artworks || []
      const groups = []

      artworks.forEach(a => {
        (a.schemes || []).forEach(s => {
          const layers = []
          ;(s.layers || []).forEach(l => {
            if (l.colorCode === code) {
              const num = Number(l.layer)
              if (Number.isFinite(num)) layers.push(num)
            }
          })
          if (layers.length) {
            layers.sort((x, y) => x - y)
            const schemeName = s.name || s.scheme_name || '-'
            const header = `${artworkTitle(a)}-[${schemeName}]`
            const suffix = layers.map(n => `(${n})`).join('')
            groups.push({
              display: header + suffix,
              artworkId: a.id,
              schemeId: s.id,
              layers: layers.slice(),
              colorCode: code,
              schemeName
            })
          }
        })
      })
      return groups
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

    const focusCustomColor = (code) => {
      // 确保在"全部"标签下便于查找
      if (activeCategory.value !== 'all') activeCategory.value = 'all'
      
      // 使用nextTick确保DOM更新完成
      setTimeout(() => {
        const el = _colorItemRefs.get(code)
        if (el && el.scrollIntoView) {
          // 居中尝试：计算位置
          try {
            const rect = el.getBoundingClientRect()
            const vh = window.innerHeight || document.documentElement.clientHeight
            const current = window.pageYOffset || document.documentElement.scrollTop
            const targetScroll = current + rect.top - (vh / 2 - rect.height / 2)
            window.scrollTo(0, Math.max(0, targetScroll))
          } catch (e) {
            el.scrollIntoView()
          }
          highlightCode.value = code
          setTimeout(() => {
            highlightCode.value = null
          }, 2000)
        }
      }, 100)
    }

    // 暴露方法给父组件调用
    return {
      // 响应式数据
      activeCategory,
      highlightCode,
      
      // 计算属性
      orderedCategoriesWithOther,
      filteredColors,
      
      // 方法
      setColorItemRef,
      formatDate,
      categoryName,
      formulaSegments,
      usageGroups,
      isColorReferenced,
      focusCustomColor
    }
  }
}
</script>