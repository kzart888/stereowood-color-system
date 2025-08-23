/**
 * 自配颜色模块状态管理 Composable
 * 职责：集中管理自配颜色的状态、数据获取、CRUD操作等业务逻辑
 */
import { ref, computed, reactive } from 'vue'

export function useCustomColors(globalData) {
  // ===== 响应式状态 =====
  const loading = ref(false)
  const activeCategory = ref('all')
  const showAddDialog = ref(false)
  const showDuplicateDialog = ref(false)
  const editingColor = ref(null)
  const highlightCode = ref(null)
  
  // 表单状态
  const formVisible = ref(false)
  const duplicateDetectorVisible = ref(false)
  
  // 内部状态
  const _colorItemRefs = new Map()

  // ===== 计算属性 =====
  const baseURL = computed(() => globalData.baseURL || window.location.origin)
  const categories = computed(() => globalData.categories?.value || [])
  const customColors = computed(() => globalData.customColors?.value || [])
  const artworks = computed(() => globalData.artworks?.value || [])
  const montMarteColors = computed(() => globalData.montMarteColors?.value || [])

  // ===== 业务方法 =====
  
  /**
   * 打开添加对话框
   * @param {string} currentCategory - 当前激活的分类
   */
  const openAddDialog = (currentCategory = 'all') => {
    editingColor.value = null
    activeCategory.value = currentCategory
    formVisible.value = true
  }

  /**
   * 编辑颜色
   * @param {Object} color - 要编辑的颜色对象
   */
  const editColor = (color) => {
    editingColor.value = color
    formVisible.value = true
  }

  /**
   * 删除颜色
   * @param {Object} color - 要删除的颜色对象
   */
  const deleteColor = async (color) => {
    const ok = await window.helpers?.doubleDangerConfirm({
      firstMessage: `确定删除 ${color.color_code} 吗？`,
      secondMessage: '删除后将无法恢复，确认最终删除？',
      secondConfirmText: '永久删除'
    })
    if (!ok) return

    try {
      await window.api.customColors.delete(color.id)
      window.ElementPlus?.ElMessage?.success('删除成功')
      await refreshData()
    } catch (error) {
      handleDeleteError(error)
    }
  }

  /**
   * 批量删除颜色（用于查重）
   * @param {Array} colorIds - 要删除的颜色ID数组
   */
  const deleteColors = async (colorIds) => {
    if (!colorIds || !colorIds.length) return

    let successCount = 0
    let failCount = 0
    
    for (const colorId of colorIds) {
      try {
        await window.api.customColors.delete(colorId)
        successCount++
      } catch (error) {
        failCount++
        console.error('删除失败:', error)
        break
      }
    }
    
    window.ElementPlus?.ElMessage?.success(`删除完成：成功 ${successCount} 条，失败 ${failCount} 条`)
    await refreshData()
    
    // 重新检测查重
    setTimeout(() => {
      runDuplicateCheck()
    }, 100)
  }

  /**
   * 强制合并重复项
   * @param {Object} mergeData - 合并数据 {keepId, removeIds, signature}
   */
  const forceMerge = async (mergeData) => {
    try {
      const resp = await window.api.customColors.forceMerge(mergeData)
      const updated = resp?.updatedLayers ?? resp?.data?.updatedLayers ?? 0
      const deleted = resp?.deleted ?? resp?.data?.deleted ?? mergeData.removeIds.length
      
      window.ElementPlus?.ElMessage?.success(`强制合并完成：更新引用 ${updated} 个，删除 ${deleted} 条`)
      await refreshData()
      
      setTimeout(() => {
        runDuplicateCheck()
      }, 100)
    } catch (err) {
      const raw = err?.response?.data?.error || ''
      if (raw) {
        window.ElementPlus?.ElMessage?.error('合并失败: ' + raw)
      } else if (err?.request) {
        window.ElementPlus?.ElMessage?.error('网络错误，合并失败')
      } else {
        window.ElementPlus?.ElMessage?.error('合并失败')
      }
    }
  }

  /**
   * 保存颜色（新增或修改）
   * @param {Object} formData - 表单数据
   */
  const saveColor = async (formData) => {
    try {
      const data = new FormData()
      
      // 处理分类ID（"其他"分类特殊处理）
      let actualCategoryId = formData.category_id
      if (actualCategoryId === 'other') {
        const prefix = formData.color_code.substring(0, 2).toUpperCase()
        const matchedCategory = categories.value.find(cat => cat.code === prefix)
        if (matchedCategory) {
          actualCategoryId = matchedCategory.id
        } else {
          actualCategoryId = categories.value[0]?.id || 1
        }
      }
      
      data.append('category_id', actualCategoryId)
      data.append('color_code', formData.color_code)
      data.append('formula', formData.formula || '')
      if (formData.imageFile) {
        data.append('image', formData.imageFile)
      }
      
      if (formData.isEdit) {
        // 修改
        await window.api.customColors.update(formData.colorId, data)
        window.ElementPlus?.ElMessage?.success('修改成功')
      } else {
        // 新增
        await window.api.customColors.create(data)
        window.ElementPlus?.ElMessage?.success('添加成功')
      }
      
      formVisible.value = false
      await refreshData()
      
      // 保存后自动比例查重
      if (window.duplicateDetector) {
        const saved = customColors.value.find(c => c.color_code === formData.color_code)
        if (saved) {
          const grp = window.duplicateDetector.detectOnSave(saved, customColors.value)
          if (grp) {
            window.ElementPlus?.ElMessage?.warning('发现重复配方（比例等价）')
            // 直接打开对话框
            duplicateDetectorVisible.value = true
          }
        }
      }
    } catch (error) {
      window.ElementPlus?.ElMessage?.error('操作失败')
      console.error('保存颜色失败:', error)
    }
  }

  /**
   * 运行查重检测
   */
  const runDuplicateCheck = () => {
    if (!window.duplicateDetector) {
      window.ElementPlus?.ElMessage?.info('查重模块未加载')
      return
    }
    
    duplicateDetectorVisible.value = true
  }

  /**
   * 查看历史记录
   * @param {Object} color - 颜色对象
   */
  const viewHistory = (color) => {
    window.ElementPlus?.ElMessage?.info('历史功能待实现')
  }

  /**
   * 聚焦到指定颜色
   * @param {string} code - 颜色编号
   */
  const focusCustomColor = (code) => {
    // 确保在"全部"标签下便于查找
    if (activeCategory.value !== 'all') {
      activeCategory.value = 'all'
    }
    
    setTimeout(() => {
      const el = _colorItemRefs.get(code)
      if (el && el.scrollIntoView) {
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

  /**
   * 处理作品方案聚焦
   * @param {Object} focusData - 聚焦数据
   */
  const handleFocusArtworkScheme = (focusData) => {
    if (window.$root?.focusArtworkScheme) {
      window.$root.focusArtworkScheme(focusData)
    }
  }

  /**
   * 刷新数据
   */
  const refreshData = async () => {
    await Promise.all([
      globalData.loadCustomColors?.(),
      globalData.loadArtworks?.()
    ])
  }

  /**
   * 处理删除错误
   * @param {Error} error - 错误对象
   */
  const handleDeleteError = (error) => {
    const raw = error?.response?.data?.error || ''
    if (raw.includes('配色方案使用')) {
      window.ElementPlus?.ElMessage?.warning('该自配色已被引用，无法删除')
    } else if (raw.includes('不存在')) {
      window.ElementPlus?.ElMessage?.error('该自配色不存在')
    } else if (raw) {
      window.ElementPlus?.ElMessage?.error(raw)
    } else if (error?.response?.status === 404) {
      window.ElementPlus?.ElMessage?.error('删除功能暂不可用')
    } else if (error?.request) {
      window.ElementPlus?.ElMessage?.error('网络异常，删除失败')
    } else {
      window.ElementPlus?.ElMessage?.error('删除失败')
    }
  }

  /**
   * 设置颜色项引用
   * @param {Object} color - 颜色对象
   */
  const setColorItemRef = (color) => {
    return (el) => {
      if (el) {
        _colorItemRefs.set(color.color_code, el)
      } else {
        _colorItemRefs.delete(color.color_code)
      }
    }
  }

  // ===== 生命周期 =====
  
  /**
   * 初始化
   */
  const init = async () => {
    loading.value = true
    try {
      await refreshData()
    } catch (error) {
      console.error('初始化自配颜色模块失败:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 清理资源
   */
  const cleanup = () => {
    _colorItemRefs.clear()
    highlightCode.value = null
    editingColor.value = null
  }

  // ===== 返回API =====
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
  }
}