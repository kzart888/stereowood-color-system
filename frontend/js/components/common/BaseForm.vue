<!-- 通用表单组件 -->
<!-- 职责：提供统一的表单布局、验证、提交逻辑 -->
<template>
  <el-form
    ref="formRef"
    :model="formData"
    :rules="formRules"
    :label-width="labelWidth"
    :size="size"
    :disabled="disabled || loading"
    @submit.prevent="handleSubmit"
    @keydown.enter.stop.prevent="handleEnterKey"
    v-bind="$attrs"
  >
    <!-- 表单项插槽 -->
    <slot 
      :form-data="formData"
      :form-ref="formRef"
      :loading="loading"
      :disabled="disabled"
    />

    <!-- 表单底部操作区域 -->
    <div v-if="showFooter" class="form-footer" :class="footerClass">
      <slot name="footer" :loading="loading" :disabled="disabled">
        <!-- 默认按钮 -->
        <el-button 
          @click="handleCancel" 
          :disabled="loading"
          :size="size"
        >
          {{ cancelText }}
        </el-button>
        
        <el-button 
          type="primary" 
          @click="handleSubmit"
          :loading="loading"
          :disabled="submitDisabled"
          :size="size"
        >
          {{ submitText }}
        </el-button>
      </slot>
    </div>

    <!-- 加载遮罩 -->
    <div v-if="loading && showLoadingMask" class="form-loading-mask">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>{{ loadingText }}</span>
    </div>
  </el-form>
</template>

<script>
import { ref, computed, watch, nextTick } from 'vue'

export default {
  name: 'BaseForm',
  
  inheritAttrs: false,

  props: {
    // 表单数据
    modelValue: {
      type: Object,
      required: true
    },
    
    // 验证规则
    rules: {
      type: Object,
      default: () => ({})
    },
    
    // 标签宽度
    labelWidth: {
      type: String,
      default: '100px'
    },
    
    // 表单尺寸
    size: {
      type: String,
      default: 'default'
    },
    
    // 是否禁用
    disabled: {
      type: Boolean,
      default: false
    },
    
    // 是否显示底部操作区
    showFooter: {
      type: Boolean,
      default: true
    },
    
    // 底部样式类
    footerClass: {
      type: String,
      default: ''
    },
    
    // 取消按钮文本
    cancelText: {
      type: String,
      default: '取消'
    },
    
    // 提交按钮文本
    submitText: {
      type: String,
      default: '确定'
    },
    
    // 加载状态
    loading: {
      type: Boolean,
      default: false
    },
    
    // 加载文本
    loadingText: {
      type: String,
      default: '处理中...'
    },
    
    // 是否显示加载遮罩
    showLoadingMask: {
      type: Boolean,
      default: false
    },
    
    // 是否在提交前验证
    validateOnSubmit: {
      type: Boolean,
      default: true
    },
    
    // 是否在值变化时验证
    validateOnChange: {
      type: Boolean,
      default: false
    },
    
    // 是否支持Enter键提交
    submitOnEnter: {
      type: Boolean,
      default: false
    },
    
    // 自定义提交禁用逻辑
    customSubmitDisabled: {
      type: Boolean,
      default: false
    }
  },

  emits: [
    'update:modelValue',
    'submit',
    'cancel',
    'validate',
    'change'
  ],

  setup(props, { emit }) {
    // 响应式数据
    const formRef = ref(null)
    const validating = ref(false)

    // 计算属性
    const formData = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })

    const formRules = computed(() => props.rules)

    const submitDisabled = computed(() => {
      return props.customSubmitDisabled || validating.value
    })

    // 监听表单数据变化
    watch(
      () => props.modelValue,
      (newValue, oldValue) => {
        if (props.validateOnChange && formRef.value && oldValue) {
          // 延迟验证，避免频繁验证
          clearTimeout(validateTimer)
          validateTimer = setTimeout(() => {
            validateForm()
          }, 300)
        }
        emit('change', newValue)
      },
      { deep: true }
    )

    let validateTimer = null

    // 方法
    const validateForm = async (callback) => {
      if (!formRef.value) return false

      validating.value = true
      try {
        const valid = await formRef.value.validate()
        emit('validate', valid)
        if (callback) callback(valid)
        return valid
      } catch (error) {
        emit('validate', false)
        if (callback) callback(false)
        return false
      } finally {
        validating.value = false
      }
    }

    const validateField = (prop, callback) => {
      if (!formRef.value) return
      formRef.value.validateField(prop, callback)
    }

    const clearValidation = (props) => {
      if (!formRef.value) return
      formRef.value.clearValidate(props)
    }

    const resetForm = () => {
      if (!formRef.value) return
      formRef.value.resetFields()
    }

    const handleSubmit = async () => {
      if (props.loading) return

      if (props.validateOnSubmit) {
        const valid = await validateForm()
        if (!valid) return
      }

      emit('submit', formData.value)
    }

    const handleCancel = () => {
      emit('cancel')
    }

    const handleEnterKey = (event) => {
      if (!props.submitOnEnter) return
      
      // 如果当前焦点在textarea或其他多行输入框中，不触发提交
      const target = event.target
      if (target.tagName === 'TEXTAREA' || 
          (target.tagName === 'INPUT' && target.type === 'text' && target.getAttribute('rows'))) {
        return
      }

      handleSubmit()
    }

    const scrollToError = async () => {
      await nextTick()
      const errorField = document.querySelector('.el-form-item.is-error')
      if (errorField) {
        errorField.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }
    }

    // 暴露方法给父组件
    const publicMethods = {
      validate: validateForm,
      validateField,
      clearValidation,
      resetForm,
      scrollToError,
      submit: handleSubmit
    }

    return {
      // 响应式数据
      formRef,
      validating,
      
      // 计算属性
      formData,
      formRules,
      submitDisabled,
      
      // 方法
      handleSubmit,
      handleCancel,
      handleEnterKey,
      
      // 公共方法
      ...publicMethods
    }
  }
}
</script>

<style scoped>
.form-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.form-footer.center {
  justify-content: center;
}

.form-footer.left {
  justify-content: flex-start;
}

.form-footer.space-between {
  justify-content: space-between;
}

.form-loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
  z-index: 100;
}

.form-loading-mask .el-icon {
  font-size: 20px;
}

/* 表单容器相对定位，为加载遮罩提供定位上下文 */
:deep(.el-form) {
  position: relative;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .form-footer {
    flex-direction: column-reverse;
    align-items: stretch;
  }
  
  .form-footer.space-between {
    flex-direction: column-reverse;
  }
}
</style>