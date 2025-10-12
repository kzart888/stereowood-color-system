<template>
  <el-dialog
    v-model="dialog.isOpen"
    :title="dialog.dialogTitle"
    width="720px"
    class="scheme-dialog"
    destroy-on-close
    @close="dialog.close"
  >
    <section v-if="dialog.activeScheme">
      <el-form label-position="top" class="scheme-dialog__form">
        <el-form-item label="方案名称">
          <el-input
            v-model="dialog.form.name.value"
            placeholder="请输入方案名称"
            maxlength="120"
            show-word-limit
          />
        </el-form-item>
        <el-divider />
        <template v-if="dialog.layers.length">
          <article
            v-for="(layer, index) in dialog.layers"
            :key="`${layer.layer}-${layer.colorCode ?? 'empty'}`"
            class="scheme-dialog__layer"
          >
            <header class="scheme-dialog__layer-header">
              <h3>第 {{ layer.layer }} 层</h3>
              <div class="scheme-dialog__layer-meta">
                <span>
                  自配色：
                  <strong v-if="layer.colorCode">{{ layer.colorCode }}</strong>
                  <span v-else>未指定</span>
                </span>
                <span v-if="layer.customColorId != null" class="scheme-dialog__layer-id">
                  #{{ layer.customColorId }}
                </span>
              </div>
            </header>
            <el-input
              type="textarea"
              :model-value="layer.manualFormula"
              :autosize="{ minRows: 2, maxRows: 4 }"
              placeholder="记录该层的手写配方，可与自配色无关"
              @update:model-value="dialog.updateManualFormula(index, $event)"
            />
            <p v-if="layer.referencedFormula" class="scheme-dialog__reference">
              参考配方：{{ layer.referencedFormula }}
            </p>
          </article>
        </template>
        <el-empty v-else description="该方案尚无层记录" />
      </el-form>
    </section>
    <section v-else>
      <el-empty description="未选择配色方案" />
    </section>

    <template #footer>
      <div class="scheme-dialog__footer">
        <el-button @click="dialog.resetForm" :disabled="!dialog.hasChanges">重置</el-button>
        <el-button @click="dialog.close">取消</el-button>
        <el-button
          type="primary"
          :disabled="!dialog.canSave"
          :loading="dialog.isSaving"
          @click="dialog.save"
        >
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { SchemeDialogBindings } from '@/features/artworks/useSchemeDialog';

const props = defineProps<{
  dialog: SchemeDialogBindings;
}>();

const dialog = props.dialog;
</script>

<style scoped>
.scheme-dialog__form {
  display: grid;
  gap: 16px;
}

.scheme-dialog__layer {
  display: grid;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
}

.scheme-dialog__layer:last-of-type {
  border-bottom: none;
}

.scheme-dialog__layer-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.scheme-dialog__layer-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2f2b43;
}

.scheme-dialog__layer-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #606266;
}

.scheme-dialog__layer-id {
  color: #909399;
}

.scheme-dialog__reference {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.scheme-dialog__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}
</style>
