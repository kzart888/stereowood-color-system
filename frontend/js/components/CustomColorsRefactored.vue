<!-- 重构后的自配颜色管理主组件 -->
<!-- 职责：作为容器组件，协调各子组件的交互 -->
<template>
  <div>
    <!-- 自配颜色列表 -->
    <CustomColorsList
      :custom-colors="customColors"
      :categories="categories"
      :artworks="artworks"
      :base-u-r-l="baseURL"
      :sort-mode="sortMode"
      :loading="loading"
      :global-search-query="globalSearchQuery"
      :active-tab="activeTab"
      @edit-color="editColor"
      @delete-color="deleteColor"
      @view-history="viewHistory"
      @focus-artwork-scheme="handleFocusArtworkScheme"
    />

    <!-- 自配颜色表单对话框 -->
    <CustomColorForm
      v-model="formVisible"
      :editing-color="editingColor"
      :categories="categories"
      :custom-colors="customColors"
      :mont-marte-colors="montMarteColors"
      :base-u-r-l="baseURL"
      :active-category="activeCategory"
      @save="saveColor"
      @cancel="formVisible = false"
    />

    <!-- 查重检测对话框 -->
    <DuplicateDetector
      v-model="duplicateDetectorVisible"
      :custom-colors="customColors"
      :artworks="artworks"
      @focus-custom-color="focusCustomColor"
      @delete-colors="deleteColors"
      @force-merge="forceMerge"
    />
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, inject } from 'vue'
import { useCustomColors } from '../composables/useCustomColors.js'
import CustomColorsList from './custom-colors/CustomColorsList.vue'
import CustomColorForm from './custom-colors/CustomColorForm.vue'
import DuplicateDetector from './custom-colors/DuplicateDetector.vue'

export default {
  name: 'CustomColorsRefactored',
  
  components: {
    CustomColorsList,
    CustomColorForm,
    DuplicateDetector
  },

  props: {
    // 排序模式
    sortMode: {
      type: String,
      default: 'time' // time | name
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

  setup(props) {
    // 注入全局数据
    const globalData = inject('globalData')
    
    // 使用自配颜色 composable
    const {
      // 响应式状态
      loading,
      activeCategory,
      editingColor,
      highlightCode,
      formVisible,
      duplicateDetectorVisible,
      
      // 计算属性
      baseURL,
      categories,
      customColors,
      artworks,
      montMarteColors,
      
      // 方法
      openAddDialog,
      editColor,
      deleteColor,
      deleteColors,
      forceMerge,
      saveColor,
      runDuplicateCheck,
      viewHistory,
      focusCustomColor,
      handleFocusArtworkScheme,
      setColorItemRef,
      refreshData,
      init,
      cleanup
    } = useCustomColors(globalData)

    // 生命周期
    onMounted(async () => {
      await init()
      console.log('自配颜色模块已初始化')
    })

    onUnmounted(() => {
      cleanup()
    })

    // 暴露方法给外部组件调用（如头部按钮）
    const publicMethods = {
      openAddDialog: () => openAddDialog(activeCategory.value),
      runDuplicateCheck,
      focusCustomColor
    }

    return {
      // 响应式状态
      loading,
      activeCategory,
      editingColor,
      highlightCode,
      formVisible,
      duplicateDetectorVisible,
      
      // 计算属性
      baseURL,
      categories,
      customColors,
      artworks,
      montMarteColors,
      
      // 方法
      editColor,
      deleteColor,
      deleteColors,
      forceMerge,
      saveColor,
      viewHistory,
      focusCustomColor,
      handleFocusArtworkScheme,
      
      // 公共方法
      ...publicMethods
    }
  }
}
</script>

<style scoped>
/* 如果需要特定样式，可以在这里添加 */
</style>