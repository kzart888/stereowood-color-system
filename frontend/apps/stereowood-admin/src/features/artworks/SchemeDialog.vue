<template>
  <el-dialog
    :model-value="dialog.isOpen.value"
    @update:model-value="(value) => (dialog.isOpen.value = value)"
    :title="dialog.dialogTitle.value"
    width="720px"
    class="scheme-dialog"
    destroy-on-close
    @close="dialog.close"
  >
    <section v-if="dialog.activeScheme.value">
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
        <template v-if="dialog.layers.value.length">
          <article
            v-for="(layer, index) in dialog.layers.value"
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
            <FormulaInput
              :model-value="layer.manualFormula"
              :fetch-suggestions="dialog.fetchIngredientSuggestions"
              :suggestions-enabled="true"
              emit-warning-for-invalid
              placeholder="记录该层的手写配方，可与自配色无关"
              @change="(payload) => dialog.updateManualFormula(index, payload)"
            />
            <section class="scheme-dialog__candidates">
              <header class="scheme-dialog__candidates-header">
                <h4>候选自配色</h4>
                <el-tag v-if="layer.colorCode" type="success" size="small">
                  已关联 {{ layer.colorCode }}
                </el-tag>
                <el-tag v-else type="info" size="small">未指定</el-tag>
              </header>
              <el-skeleton
                v-if="dialog.ingredientSuggestionsLoading.value && !layer.candidateMatches.length"
                animated
                :rows="2"
              />
              <template v-else>
                <el-alert
                  v-if="!layer.candidateMatches.length"
                  class="scheme-dialog__candidate-empty"
                  type="info"
                  :closable="false"
                  title="暂无完全匹配的自配色"
                  description="保留手写记录，或在右侧候选列表中手动指定。"
                />
                <ul v-else class="scheme-dialog__candidate-list">
                  <li
                    v-for="candidate in layer.candidateMatches"
                    :key="candidateKey(candidate)"
                    class="scheme-dialog__candidate-item"
                  >
                    <div class="scheme-dialog__candidate-info">
                      <strong>{{ candidate.colorCode || '未编号' }}</strong>
                      <span class="scheme-dialog__candidate-formula">
                        {{ candidateFormula(candidate) }}
                      </span>
                    </div>
                    <div class="scheme-dialog__candidate-actions">
                      <el-tag
                        v-if="isCandidateSelected(layer, candidate)"
                        size="small"
                        type="success"
                      >
                        已应用
                      </el-tag>
                      <el-button
                        v-else
                        size="small"
                        type="primary"
                        link
                        @click="dialog.applyCandidate(index, candidate)"
                      >
                        使用
                      </el-button>
                    </div>
                  </li>
                </ul>
              </template>
              <div class="scheme-dialog__candidate-footer">
                <el-button
                  size="small"
                  :disabled="!layer.colorCode && layer.customColorId == null"
                  @click="dialog.clearCandidate(index)"
                >
                  仅保留手写记录
                </el-button>
              </div>
            </section>
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
        <el-button @click="dialog.resetForm" :disabled="!dialog.hasChanges.value">重置</el-button>
        <el-button @click="dialog.close">取消</el-button>
        <el-button
          type="primary"
          :disabled="!dialog.canSave.value"
          :loading="dialog.isSaving.value"
          @click="dialog.save"
        >
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { EditableSchemeLayer, SchemeDialogBindings } from '@/features/artworks/useSchemeDialog';
import FormulaInput from '@/components/formula/FormulaInput.vue';
import type { FormulaMatchEntry } from '@/features/formula/matcher';

const props = defineProps<{
  dialog: SchemeDialogBindings;
}>();

const dialog = props.dialog;

function normalizeId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (value != null) {
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function candidateKey(candidate: FormulaMatchEntry) {
  const rawId =
    candidate.id ??
    (candidate.color && (candidate.color as { id?: unknown }).id) ??
    `${candidate.colorCode ?? 'candidate'}-${candidate.formula ?? ''}`;
  return `${candidate.colorCode || 'candidate'}-${String(rawId)}`;
}

function candidateFormula(candidate: FormulaMatchEntry) {
  return (
    candidate.formula ||
    (candidate.color && (candidate.color as { formula?: string | null })?.formula) ||
    '—'
  );
}

function isCandidateSelected(layer: EditableSchemeLayer, candidate: FormulaMatchEntry) {
  const candidateId =
    normalizeId(candidate.id) ??
    normalizeId(candidate.color && (candidate.color as { id?: unknown }).id);
  if (candidateId != null && layer.customColorId != null) {
    return layer.customColorId === candidateId;
  }
  const candidateCode =
    candidate.colorCode ||
    (candidate.color && (candidate.color as { color_code?: string | null }).color_code) ||
    null;
  if (candidateCode && layer.colorCode) {
    return layer.colorCode === candidateCode;
  }
  return false;
}
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

.scheme-dialog__candidates {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbff;
}

.scheme-dialog__candidates-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.scheme-dialog__candidates-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #2f2b43;
}

.scheme-dialog__candidate-empty {
  margin: 0;
}

.scheme-dialog__candidate-list {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.scheme-dialog__candidate-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #ebeef5;
}

.scheme-dialog__candidate-item:hover {
  border-color: #c0c7ff;
}

.scheme-dialog__candidate-info {
  display: grid;
  gap: 4px;
}

.scheme-dialog__candidate-info strong {
  font-size: 13px;
  color: #2f2b43;
}

.scheme-dialog__candidate-formula {
  font-size: 12px;
  color: #606266;
  max-width: 360px;
  word-break: break-all;
}

.scheme-dialog__candidate-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scheme-dialog__candidate-footer {
  display: flex;
  justify-content: flex-end;
}

.scheme-dialog__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}
</style>
