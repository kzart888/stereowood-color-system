<!-- 自配颜色表单组件 -->
<!-- 职责：负责自配颜色的添加和编辑表单 -->
<template>
  <el-dialog 
    v-model="visible" 
    class="scheme-dialog"
    :title="editingColor ? '修改自配色' : '添加自配色'"
    width="600px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @open="onOpenDialog"
    @close="onCloseDialog"
  >
    <el-form 
      :model="form" 
      :rules="rules" 
      ref="formRef" 
      label-width="100px" 
      @keydown.enter.stop.prevent="saveColor"
    >
      <!-- 颜色分类 -->
      <el-form-item label="颜色分类" prop="category_id">
        <el-select 
          v-model="form.category_id" 
          placeholder="请选择" 
          @change="onCategoryChange"
        >
          <el-option 
            v-for="cat in categoriesWithOther" 
            :key="cat.id || 'other'"
            :label="cat.name" 
            :value="cat.id || 'other'"
          />
        </el-select>
      </el-form-item>

      <!-- 颜色编号 -->
      <el-form-item label="颜色编号" prop="color_code">
        <div class="dup-inline-row">
          <el-input 
            v-model="form.color_code" 
            placeholder="例如: BU001"
            @input="onColorCodeInput"
            class="short-inline-input"
          />
          <span v-if="colorCodeDuplicate" class="dup-msg">编号重复</span>
        </div>
      </el-form-item>

      <!-- 配方 -->
      <el-form-item label="配方">
        <formula-editor 
          v-if="visible"
          v-model="form.formula"
          :mont-marte-colors="montMarteColors"
        />
      </el-form-item>

      <!-- 颜色样本 -->
      <el-form-item label="颜色样本">
        <el-upload
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleImageChange"
          accept="image/*"
        >
          <el-button>选择图片</el-button>
        </el-upload>
        <div v-if="form.imagePreview" style="margin-top: 10px;">
          <div 
            class="scheme-thumbnail" 
            :style="{ backgroundImage: 'url(' + form.imagePreview + ')', backgroundColor: 'transparent' }" 
            @click="form.imagePreview && $thumbPreview && $thumbPreview.show($event, form.imagePreview)"
          />
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="attemptClose">取消</el-button>
      <el-button 
        type="primary" 
        @click="saveColor" 
        :disabled="colorCodeDuplicate"
        :loading="saving"
      >
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ref, reactive, computed, watch, nextTick } from 'vue'

export default {
  name: 'CustomColorForm',
  
  props: {
    // 控制对话框显示隐藏
    modelValue: {
      type: Boolean,
      default: false
    },
    // 正在编辑的颜色（null表示新增）
    editingColor: {
      type: Object,
      default: null
    },
    // 颜色分类数据
    categories: {
      type: Array,
      default: () => []
    },
    // 现有颜色列表（用于重复检查）
    customColors: {
      type: Array,
      default: () => []
    },
    // 蒙马特颜色数据（配方编辑器需要）
    montMarteColors: {
      type: Array,
      default: () => []
    },
    // 基础URL
    baseURL: {
      type: String,
      default: ''
    },
    // 当前激活的分类（用于预填充）
    activeCategory: {
      type: String,
      default: 'all'
    }
  },

  emits: ['update:modelValue', 'save', 'cancel'],

  setup(props, { emit }) {
    // 响应式数据
    const formRef = ref(null)
    const saving = ref(false)
    
    // 表单数据
    const form = reactive({
      category_id: '',
      color_code: '',
      formula: '',
      imageFile: null,
      imagePreview: null
    })

    // 表单验证规则
    const rules = {
      category_id: [{ required: true, message: '请选择分类', trigger: 'change' }],
      color_code: [{ required: true, message: '请输入颜色编号', trigger: 'blur' }]
    }

    // 内部状态
    const _originalFormSnapshot = ref(null)
    const _escHandler = ref(null)

    // 计算属性
    const visible = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })

    const sjCategoryId = computed(() => {
      const sj = props.categories.find(c => c.code === 'SJ')
      return sj ? sj.id : null
    })

    const categoriesWithOther = computed(() => {
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
      
      // 如果 SJ 存在但顺序不正确，重排
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

    const colorCodeDuplicate = computed(() => {
      const val = (form.color_code || '').trim()
      if (!val) return false
      return props.customColors.some(c => 
        c.color_code === val && c.id !== (props.editingColor?.id || null)
      )
    })

    // 监听编辑颜色变化，更新表单
    watch(() => props.editingColor, (newColor) => {
      if (newColor) {
        initFormForEdit(newColor)
      } else {
        initFormForAdd()
      }
    }, { immediate: true })

    // 方法
    const initFormForAdd = () => {
      // 如果当前不在"全部"标签页，自动填充对应分类
      if (props.activeCategory !== 'all') {
        if (props.activeCategory === 'other') {
          form.category_id = 'other'
          form.color_code = ''
        } else {
          const categoryId = parseInt(props.activeCategory)
          form.category_id = categoryId
          generateColorCode(categoryId)
        }
      } else {
        form.category_id = ''
        form.color_code = ''
      }
      
      form.formula = ''
      form.imageFile = null
      form.imagePreview = null
    }

    const initFormForEdit = (color) => {
      // 判断颜色是否属于"其他"分类
      const prefix = color.color_code.substring(0, 2).toUpperCase()
      const matchedCategory = props.categories.find(cat => cat.code === prefix)
      
      form.category_id = matchedCategory ? color.category_id : 'other'
      form.color_code = color.color_code
      form.formula = color.formula || ''
      form.imageFile = null
      form.imagePreview = color.image_path 
        ? buildUploadURL(props.baseURL, color.image_path) 
        : null
    }

    const buildUploadURL = (baseURL, raw) => {
      if (!raw) return ''
      if (/^https?:\/\//i.test(raw)) return raw
      const cleaned = String(raw).replace(/^\/+/, '')
      const withPrefix = cleaned.startsWith('uploads/') ? cleaned : `uploads/${cleaned}`
      return `${baseURL || window.location.origin}/${withPrefix}`
    }

    const generateColorCode = (categoryId) => {
      if (!categoryId || categoryId === 'other' || categoryId === sjCategoryId.value) return
      
      const category = props.categories.find(c => c.id === categoryId)
      if (!category) return
      
      // 获取该分类下的所有颜色
      const categoryColors = props.customColors.filter(c => c.category_id === categoryId)
      
      if (categoryColors.length === 0) {
        form.color_code = `${category.code}001`
        return
      }
      
      // 提取所有编号的数字部分
      const numbers = categoryColors
        .map(color => {
          const match = color.color_code.match(/\d+$/)
          return match ? parseInt(match[0]) : 0
        })
        .filter(num => num > 0)
      
      if (numbers.length === 0) {
        form.color_code = `${category.code}001`
        return
      }
      
      // 找最大编号并+1
      const maxNumber = Math.max(...numbers)
      const nextNumber = maxNumber + 1
      const paddedNumber = String(nextNumber).padStart(3, '0')
      form.color_code = `${category.code}${paddedNumber}`
    }

    const onCategoryChange = (categoryId) => {
      if (!props.editingColor && categoryId && categoryId !== 'other' && categoryId !== sjCategoryId.value) {
        generateColorCode(categoryId)
      } else if (categoryId === 'other' || categoryId === sjCategoryId.value) {
        form.color_code = ''
      }
    }

    const onColorCodeInput = (value) => {
      // 规则：
      // 1. 编辑模式不自动分类
      // 2. 当前分类若为 "色精"(SJ) 或 "其他" 则不再自动切换
      // 3. 若首字符为 酒/沙/红/黑/蓝 => 设置分类为 色精(SJ)
      // 4. 否则按前两位字母 BU GN RD VT YE 识别；无匹配 => 其他
      
      if (props.editingColor) return
      const sjId = sjCategoryId.value
      if (form.category_id === 'other' || (sjId && form.category_id === sjId)) return
      if (!value) return

      const firstChar = value.charAt(0)
      const sjTriggers = ['酒', '沙', '红', '黑', '蓝']
      if (sjId && sjTriggers.includes(firstChar)) {
        if (form.category_id !== sjId) {
          form.category_id = sjId
          window.ElementPlus?.ElMessage?.info('已自动识别为 色精')
        }
        return
      }

      if (value.length >= 2) {
        const prefix = value.substring(0, 2).toUpperCase()
        const matchedCategory = props.categories.find(cat => cat.code === prefix)
        if (matchedCategory) {
          if (form.category_id !== matchedCategory.id) {
            form.category_id = matchedCategory.id
            window.ElementPlus?.ElMessage?.info(`已自动切换到 ${matchedCategory.name}`)
          }
        } else {
          if (form.category_id !== 'other') {
            form.category_id = 'other'
            window.ElementPlus?.ElMessage?.warning('无法识别的前缀，已切换到"其他"')
          }
        }
      }
    }

    const handleImageChange = (file) => {
      form.imageFile = file.raw
      form.imagePreview = URL.createObjectURL(file.raw)
    }

    const _normalizedForm = () => {
      return {
        category_id: form.category_id || '',
        color_code: form.color_code || '',
        formula: form.formula || '',
        imagePreview: form.imagePreview ? '1' : ''
      }
    }

    const _isFormDirty = () => {
      if (!_originalFormSnapshot.value) return false
      return JSON.stringify(_normalizedForm()) !== _originalFormSnapshot.value
    }

    const onOpenDialog = () => {
      // 建立初始快照
      _originalFormSnapshot.value = JSON.stringify(_normalizedForm())
      // 绑定 ESC
      _bindEsc()
    }

    const onCloseDialog = () => {
      _originalFormSnapshot.value = null
      _unbindEsc()
    }

    const _bindEsc = () => {
      if (_escHandler.value) return
      _escHandler.value = (e) => {
        if (e.key === 'Escape' && visible.value) {
          attemptClose()
        }
      }
      document.addEventListener('keydown', _escHandler.value)
    }

    const _unbindEsc = () => {
      if (_escHandler.value) {
        document.removeEventListener('keydown', _escHandler.value)
        _escHandler.value = null
      }
    }

    const attemptClose = async () => {
      if (_isFormDirty()) {
        try {
          await window.ElementPlus.ElMessageBox.confirm(
            '检测到未保存的修改，确认丢弃吗？', 
            '未保存的修改', 
            {
              confirmButtonText: '丢弃修改',
              cancelButtonText: '继续编辑',
              type: 'warning'
            }
          )
        } catch (e) {
          return
        }
      }
      visible.value = false
      emit('cancel')
    }

    const saveColor = async () => {
      try {
        const valid = await formRef.value.validate()
        if (!valid) return
      } catch {
        return
      }

      if (colorCodeDuplicate.value) return

      saving.value = true
      try {
        // 处理分类ID（"其他"分类特殊处理）
        let actualCategoryId = form.category_id
        if (actualCategoryId === 'other') {
          const prefix = form.color_code.substring(0, 2).toUpperCase()
          const matchedCategory = props.categories.find(cat => cat.code === prefix)
          if (matchedCategory) {
            actualCategoryId = matchedCategory.id
          } else {
            actualCategoryId = props.categories[0]?.id || 1
          }
        }

        const formData = {
          category_id: actualCategoryId,
          color_code: form.color_code,
          formula: form.formula,
          imageFile: form.imageFile
        }

        // 发送保存事件给父组件处理
        await emit('save', {
          ...formData,
          isEdit: !!props.editingColor,
          colorId: props.editingColor?.id
        })

        visible.value = false
      } finally {
        saving.value = false
      }
    }

    return {
      // 响应式数据
      formRef,
      form,
      rules,
      saving,
      
      // 计算属性
      visible,
      categoriesWithOther,
      colorCodeDuplicate,
      
      // 方法
      onOpenDialog,
      onCloseDialog,
      onCategoryChange,
      onColorCodeInput,
      handleImageChange,
      attemptClose,
      saveColor
    }
  }
}
</script>

<style scoped>
.dup-inline-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.short-inline-input {
  flex: 1;
}

.dup-msg {
  color: #f56c6c;
  font-size: 12px;
}

.scheme-thumbnail {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  border: 2px dashed #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-size: cover;
  background-position: center;
}
</style>