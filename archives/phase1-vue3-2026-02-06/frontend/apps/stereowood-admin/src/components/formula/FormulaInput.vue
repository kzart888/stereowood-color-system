<template>
  <div class="formula-input">
    <header v-if="structured.lines.length" class="formula-input__chips">
      <el-tag
        v-for="(line, index) in structured.lines"
        :key="`${line.name}-${index}`"
        size="small"
        :type="line.amount && line.unit ? 'info' : 'warning'"
        class="formula-input__chip"
      >
        <span class="formula-input__chip-name">{{ line.name }}</span>
        <span v-if="line.amount" class="formula-input__chip-amount">
          {{ line.amount }}{{ line.unit }}
        </span>
        <span v-else class="formula-input__chip-empty">缺少用量</span>
      </el-tag>
    </header>

    <el-input
      ref="textareaRef"
      v-model="localValue"
      type="textarea"
      :placeholder="placeholder"
      :autosize="{ minRows: 2, maxRows: 5 }"
      class="formula-input__textarea"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown="handleKeydown"
      @compositionstart="isComposing = true"
      @compositionend="handleCompositionEnd"
    />

    <transition name="el-fade-in-linear">
      <div
        v-if="showSuggestions"
        class="formula-input__suggestions"
        role="listbox"
        :aria-busy="internalSuggestionLoading ? 'true' : 'false'"
      >
        <div class="formula-input__suggestions-header">
          <span>常用原料建议</span>
          <el-icon v-if="internalSuggestionLoading" class="formula-input__spinner">
            <loading />
          </el-icon>
        </div>
        <template v-if="suggestionItems.length">
          <button
            v-for="item in suggestionItems"
            :key="item.value"
            type="button"
            class="formula-input__suggestion"
            @mousedown.prevent="applySuggestion(item)"
          >
            <span class="formula-input__suggestion-name">{{ item.label }}</span>
            <span v-if="item.meta" class="formula-input__suggestion-meta">
              {{ item.meta }}
            </span>
            <span v-if="item.units.length" class="formula-input__suggestion-units">
              {{ item.units.join(' / ') }}
            </span>
          </button>
        </template>
        <p v-else class="formula-input__suggestions-empty">
          {{ internalSuggestionLoading ? '正在加载...' : '暂无相关建议' }}
        </p>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { ElInput, ElMessage } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';
import { tokenizeFormula } from '@/features/formula/matcher';
import { formulaUnitBuckets, splitFormulaSegments, structureFormula } from '@/utils/formula';
import { hashFormulaIngredients } from '@/utils/formula';
import type { IngredientSuggestion } from '@/features/formula/ingredientSuggester';
import type { FormulaDraftChange } from '@/components/formula/types';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    fetchSuggestions?: (query: string) => IngredientSuggestion[] | Promise<IngredientSuggestion[]>;
    suggestionsEnabled?: boolean;
    emitWarningForInvalid?: boolean;
  }>(),
  {
    modelValue: '',
    placeholder: '请输入配方，支持中文名称 + 数量 + 单位，例如：钛白粉 1g 群青 0.5g',
    fetchSuggestions: undefined,
    suggestionsEnabled: true,
    emitWarningForInvalid: false,
  },
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'change', payload: FormulaDraftChange): void;
}>();

const textareaRef = ref<InstanceType<typeof ElInput> | null>(null);
const localValue = ref(props.modelValue);
const isFocused = ref(false);
const isComposing = ref(false);
const caretPosition = ref(localValue.value.length);
const internalSuggestionLoading = ref(false);
const suggestionItems = ref<
  Array<{
    value: string;
    label: string;
    meta: string | null;
    units: string[];
    suggestion: IngredientSuggestion;
  }>
>([]);

let suggestionTimer: number | undefined;

const structured = computed(() => structureFormula(localValue.value));

const tokens = computed(() => tokenizeFormula(localValue.value));

const currentUnits = computed(() => formulaUnitBuckets(tokens.value));

const changePayload = computed<FormulaDraftChange>(() => ({
  value: localValue.value,
  tokens: tokens.value,
  hash: tokens.value.length ? hashFormulaIngredients(tokens.value) : null,
  segments: splitFormulaSegments(localValue.value),
  units: currentUnits.value,
}));

const queryRange = computed(() => {
  const value = localValue.value;
  const caret = Math.max(0, Math.min(caretPosition.value, value.length));
  let start = caret;
  while (start > 0 && !/\s/.test(value[start - 1] ?? '')) {
    start -= 1;
  }
  let end = caret;
  while (end < value.length && !/\s/.test(value[end] ?? '')) {
    end += 1;
  }
  const text = value.slice(start, caret);
  return {
    start,
    end,
    text,
  };
});

const showSuggestions = computed(() => {
  if (!props.suggestionsEnabled || !isFocused.value) {
    return false;
  }
  if (internalSuggestionLoading.value) {
    return true;
  }
  return suggestionItems.value.length > 0;
});

function setCaret(newPosition: number) {
  caretPosition.value = newPosition;
  nextTick(() => {
    const textarea = (textareaRef.value as unknown as { textarea?: HTMLTextAreaElement })?.textarea;
    if (textarea) {
      textarea.setSelectionRange(newPosition, newPosition);
    }
  });
}

function notifyInvalidIfNeeded() {
  if (!props.emitWarningForInvalid) {
    return;
  }
  const hasInvalid = tokens.value.some((token) => token.invalid);
  if (hasInvalid) {
    ElMessage.warning('部分原料配对缺少用量或单位，请补充完整');
  }
}

function refreshSuggestions() {
  if (!props.fetchSuggestions || !props.suggestionsEnabled) {
    suggestionItems.value = [];
    internalSuggestionLoading.value = false;
    return;
  }
  const query = queryRange.value.text.trim().toLowerCase();
  internalSuggestionLoading.value = true;
  Promise.resolve(props.fetchSuggestions(query))
    .then((list) => {
      suggestionItems.value = list.map((item) => ({
        value: item.name,
        label: item.name,
        meta: item.extras[0] ?? null,
        units: item.units,
        suggestion: item,
      }));
    })
    .catch(() => {
      suggestionItems.value = [];
    })
    .finally(() => {
      internalSuggestionLoading.value = false;
    });
}

function scheduleSuggestionRefresh() {
  if (!props.fetchSuggestions || !props.suggestionsEnabled) {
    return;
  }
  if (suggestionTimer) {
    window.clearTimeout(suggestionTimer);
  }
  suggestionTimer = window.setTimeout(refreshSuggestions, 140);
}

function handleFocus() {
  isFocused.value = true;
  scheduleSuggestionRefresh();
}

function handleBlur() {
  isFocused.value = false;
}

function handleCompositionEnd() {
  isComposing.value = false;
  updateCaretFromTextarea();
  scheduleSuggestionRefresh();
  emit('update:modelValue', localValue.value);
  emit('change', changePayload.value);
}

function updateCaretFromTextarea() {
  const textarea = (textareaRef.value as unknown as { textarea?: HTMLTextAreaElement })?.textarea;
  if (textarea) {
    caretPosition.value = textarea.selectionStart ?? localValue.value.length;
  }
}

function handleKeydown() {
  nextTick(() => {
    updateCaretFromTextarea();
    scheduleSuggestionRefresh();
  });
}

function applySuggestion(item: {
  value: string;
  label: string;
  suggestion: IngredientSuggestion;
}) {
  const value = localValue.value;
  const before = value.slice(0, queryRange.value.start);
  const after = value.slice(queryRange.value.end);
  let prefix = before;
  if (prefix && !/\s$/.test(prefix)) {
    prefix = `${prefix} `;
  }
  const normalizedAfter = after.replace(/^\s+/, '');
  const inserted = `${item.value} `;
  const nextValue = `${prefix}${inserted}${normalizedAfter}`.replace(/\s{2,}/g, ' ');
  localValue.value = nextValue;
  nextTick(() => {
    const newCaret = (prefix + inserted).length;
    setCaret(newCaret);
    scheduleSuggestionRefresh();
    notifyInvalidIfNeeded();
  });
}

watch(
  () => props.modelValue,
  (value) => {
    if (value !== localValue.value) {
      localValue.value = value;
      nextTick(() => {
        updateCaretFromTextarea();
        scheduleSuggestionRefresh();
      });
    }
  },
);

watch(
  () => localValue.value,
  () => {
    if (isComposing.value) {
      return;
    }
    updateCaretFromTextarea();
    emit('update:modelValue', localValue.value);
    emit('change', changePayload.value);
    scheduleSuggestionRefresh();
  },
);

watch(
  () => props.suggestionsEnabled,
  (enabled) => {
    if (enabled) {
      scheduleSuggestionRefresh();
    } else {
      suggestionItems.value = [];
    }
  },
);

onMounted(() => {
  updateCaretFromTextarea();
  if (props.suggestionsEnabled) {
    refreshSuggestions();
  }
});
</script>

<style scoped>
.formula-input {
  display: grid;
  gap: 8px;
  position: relative;
}

.formula-input__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.formula-input__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
}

.formula-input__chip-name {
  font-weight: 600;
}

.formula-input__chip-amount {
  color: #606266;
  font-size: 12px;
}

.formula-input__chip-empty {
  font-size: 12px;
  color: #e6a23c;
}

.formula-input__textarea {
  width: 100%;
}

.formula-input__suggestions {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 8px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(43, 40, 70, 0.08);
  display: grid;
  gap: 6px;
}

.formula-input__suggestions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #606266;
}

.formula-input__spinner {
  animation: spin 1s linear infinite;
}

.formula-input__suggestion {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  background: #f8f9ff;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.formula-input__suggestion:hover {
  border-color: #8c7ae6;
  background: #eef0ff;
}

.formula-input__suggestion-name {
  font-weight: 600;
  color: #2f2b43;
}

.formula-input__suggestion-meta {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
}

.formula-input__suggestion-units {
  font-size: 12px;
  color: #606266;
}

.formula-input__suggestions-empty {
  font-size: 12px;
  color: #909399;
  text-align: center;
  margin: 8px 0 2px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
