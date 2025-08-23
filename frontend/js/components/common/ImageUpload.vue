<!-- 通用图片上传组件 -->
<!-- 职责：提供统一的图片上传、预览、删除功能 -->
<template>
  <div class="image-upload-container">
    <!-- 图片预览区域 -->
    <div 
      class="image-preview" 
      :class="{ 
        'has-image': hasImage,
        'no-image': !hasImage,
        [size]: true 
      }"
      @click="hasImage && showPreview && handlePreviewClick"
      :style="previewStyle"
    >
      <!-- 无图片状态 -->
      <template v-if="!hasImage">
        <span class="no-image-text">{{ placeholder }}</span>
      </template>
      
      <!-- 有图片状态 -->
      <img 
        v-else 
        :src="imageUrl" 
        :alt="alt"
        class="preview-image"
      />
      
      <!-- 操作遮罩层 -->
      <div v-if="hasImage && showActions" class="image-actions-overlay">
        <el-button 
          v-if="allowPreview" 
          size="small" 
          circle 
          @click.stop="handlePreviewClick"
        >
          <el-icon><ZoomIn /></el-icon>
        </el-button>
        <el-button 
          v-if="allowRemove" 
          size="small" 
          type="danger" 
          circle 
          @click.stop="handleRemove"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 上传按钮区域 -->
    <div class="upload-controls">
      <el-upload
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileChange"
        :accept="accept"
        :before-upload="beforeUpload"
      >
        <el-button :size="buttonSize" :disabled="disabled">
          <el-icon><Upload /></el-icon>
          {{ uploadText }}
        </el-button>
      </el-upload>
      
      <el-button 
        v-if="hasImage && allowRemove" 
        :size="buttonSize"
        type="warning" 
        @click="handleRemove"
        :disabled="disabled"
      >
        <el-icon><Delete /></el-icon>
        {{ removeText }}
      </el-button>
    </div>

    <!-- 帮助文本 -->
    <div v-if="helpText" class="help-text">{{ helpText }}</div>
  </div>
</template>

<script>
import { computed, ref } from 'vue'

export default {
  name: 'ImageUpload',
  
  props: {
    // v-model 绑定的值（可以是文件对象、URL字符串等）
    modelValue: {
      type: [File, String, null],
      default: null
    },
    
    // 预览图片URL（用于编辑时显示现有图片）
    existingImageUrl: {
      type: String,
      default: ''
    },
    
    // 基础URL（用于构建完整的图片URL）
    baseUrl: {
      type: String,
      default: ''
    },
    
    // 尺寸预设
    size: {
      type: String,
      default: 'medium', // small | medium | large
      validator: (value) => ['small', 'medium', 'large'].includes(value)
    },
    
    // 接受的文件类型
    accept: {
      type: String,
      default: 'image/*'
    },
    
    // 最大文件大小 (MB)
    maxSize: {
      type: Number,
      default: 5
    },
    
    // 占位符文本
    placeholder: {
      type: String,
      default: '未上传图片'
    },
    
    // 上传按钮文本
    uploadText: {
      type: String,
      default: '选择图片'
    },
    
    // 移除按钮文本
    removeText: {
      type: String,
      default: '移除'
    },
    
    // 图片alt文本
    alt: {
      type: String,
      default: '预览图片'
    },
    
    // 帮助文本
    helpText: {
      type: String,
      default: ''
    },
    
    // 按钮尺寸
    buttonSize: {
      type: String,
      default: 'default'
    },
    
    // 是否禁用
    disabled: {
      type: Boolean,
      default: false
    },
    
    // 是否允许预览
    allowPreview: {
      type: Boolean,
      default: true
    },
    
    // 是否允许移除
    allowRemove: {
      type: Boolean,
      default: true
    },
    
    // 是否显示操作按钮
    showActions: {
      type: Boolean,
      default: true
    },
    
    // 是否显示预览（点击图片预览）
    showPreview: {
      type: Boolean,
      default: true
    }
  },

  emits: ['update:modelValue', 'change', 'remove', 'preview'],

  setup(props, { emit }) {
    // 响应式数据
    const previewUrl = ref('')

    // 计算属性
    const hasImage = computed(() => {
      return !!(props.modelValue || props.existingImageUrl || previewUrl.value)
    })

    const imageUrl = computed(() => {
      // 优先级：预览URL > modelValue（如果是File对象则不显示）> existingImageUrl
      if (previewUrl.value) return previewUrl.value
      if (props.modelValue && typeof props.modelValue === 'string') return buildImageUrl(props.modelValue)
      if (props.existingImageUrl) return buildImageUrl(props.existingImageUrl)
      return ''
    })

    const previewStyle = computed(() => {
      if (hasImage.value) {
        return {
          backgroundImage: `url(${imageUrl.value})`,
          backgroundColor: 'transparent'
        }
      }
      return {}
    })

    // 方法
    const buildImageUrl = (url) => {
      if (!url) return ''
      if (/^https?:\/\//i.test(url)) return url
      
      const cleaned = String(url).replace(/^\/+/, '')
      const withPrefix = cleaned.startsWith('uploads/') ? cleaned : `uploads/${cleaned}`
      return `${props.baseUrl || window.location.origin}/${withPrefix}`
    }

    const handleFileChange = (file) => {
      if (!beforeUpload(file.raw)) return
      
      // 创建预览URL
      previewUrl.value = URL.createObjectURL(file.raw)
      
      // 更新v-model
      emit('update:modelValue', file.raw)
      emit('change', file.raw)
    }

    const beforeUpload = (file) => {
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        window.ElementPlus?.ElMessage?.error('请选择图片文件')
        return false
      }
      
      // 检查文件大小
      if (file.size / 1024 / 1024 > props.maxSize) {
        window.ElementPlus?.ElMessage?.error(`图片大小不能超过 ${props.maxSize}MB`)
        return false
      }
      
      return true
    }

    const handleRemove = () => {
      // 清理预览URL
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
        previewUrl.value = ''
      }
      
      // 更新v-model
      emit('update:modelValue', null)
      emit('remove')
    }

    const handlePreviewClick = () => {
      if (!props.allowPreview) return
      
      const url = imageUrl.value
      if (url && window.$thumbPreview) {
        // 使用现有的缩略图预览功能
        const fakeEvent = { currentTarget: document.querySelector('.image-preview') }
        window.$thumbPreview.show(fakeEvent, url)
      }
      
      emit('preview', url)
    }

    return {
      // 计算属性
      hasImage,
      imageUrl,
      previewStyle,
      
      // 方法
      handleFileChange,
      handleRemove,
      handlePreviewClick,
      beforeUpload
    }
  }
}
</script>

<style scoped>
.image-upload-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-preview {
  position: relative;
  border-radius: 4px;
  border: 2px dashed #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.image-preview:hover {
  border-color: #409eff;
}

.image-preview.no-image {
  background-color: #fafafa;
  cursor: default;
}

.image-preview.no-image:hover {
  border-color: #ddd;
}

/* 尺寸变体 */
.image-preview.small {
  width: 60px;
  height: 60px;
}

.image-preview.medium {
  width: 80px;
  height: 80px;
}

.image-preview.large {
  width: 120px;
  height: 120px;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 2px;
}

.no-image-text {
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.image-actions-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-preview:hover .image-actions-overlay {
  opacity: 1;
}

.upload-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.help-text {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}
</style>