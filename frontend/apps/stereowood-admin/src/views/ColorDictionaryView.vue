<template>
  <section class="view">
    <header class="view__header">
      <div class="detail-bar" :class="{ 'detail-bar--empty': !selectedColor }">
        <div class="detail-bar__swatch" :style="selectedSwatchStyle" />
        <div class="detail-bar__meta">
          <template v-if="selectedColor">
            <h2>{{ selectedColor.color_code }}</h2>
            <ul class="detail-list">
              <li>
                <span class="detail-label">HEX</span>
                <span class="detail-value">{{ selectedColor.hex_color || '—' }}</span>
              </li>
              <li>
                <span class="detail-label">RGB</span>
                <span class="detail-value">{{ formatRgb(selectedColor) }}</span>
              </li>
              <li>
                <span class="detail-label">CMYK</span>
                <span class="detail-value">{{ formatCmyk(selectedColor) }}</span>
              </li>
              <li>
                <span class="detail-label">Pantone</span>
                <span class="detail-value">{{ formatPantone(selectedColor) }}</span>
              </li>
              <li>
                <span class="detail-label">适用层</span>
                <span class="detail-value">{{ selectedColor.applicable_layers || '—' }}</span>
              </li>
              <li>
                <span class="detail-label">更新</span>
                <span class="detail-value">{{ selectedColor.updated_at || '—' }}</span>
              </li>
            </ul>
          </template>
          <template v-else>
            <h2>未选择颜色</h2>
            <p>从列表中点击一个颜色即可在此查看详细信息。</p>
          </template>
        </div>
        <div class="detail-bar__actions">
          <el-button
            type="primary"
            :disabled="!selectedColor"
            @click="navigateToCustomColor"
          >
            在自配色管理中查看
          </el-button>
        </div>
      </div>

      <div class="view__tabs">
        <el-button-group>
          <el-button
            v-for="tab in viewTabs"
            :key="tab.value"
            :type="viewMode === tab.value ? 'primary' : 'default'"
            @click="switchView(tab.value)"
          >
            {{ tab.label }}
          </el-button>
        </el-button-group>
      </div>
      <div class="view__sort" v-if="viewMode === 'list'">
        <span>排序：</span>
        <el-button-group>
          <el-button
            :type="listSortMode === 'code' ? 'primary' : 'default'"
            @click="setSortMode('code')"
          >
            按编号
          </el-button>
          <el-button
            :type="listSortMode === 'hue' ? 'primary' : 'default'"
            @click="setSortMode('hue')"
          >
            按色相
          </el-button>
        </el-button-group>
      </div>
    </header>

    <div class="view__body">
      <el-skeleton v-if="isLoading" :rows="6" animated />

      <el-alert
        v-else-if="loadError"
        type="error"
        :closable="false"
        show-icon
        :title="`加载失败：${loadError}`"
      />

      <template v-else>
        <div v-if="viewMode === 'list'">
          <el-empty
            v-if="groupedList.length === 0"
            description="没有匹配的颜色，请稍后再试。"
          />
          <section
            v-for="group in groupedList"
            :key="group.category"
            class="category-section"
          >
            <header class="category-header">
              <h2>{{ group.category }}</h2>
              <span class="category-count">{{ group.colors.length }} 个颜色</span>
            </header>
            <div class="color-grid">
              <article
                v-for="color in group.colors"
                :key="color.id"
                class="color-card"
                :class="{ 'color-card--selected': selectedColor?.id === color.id }"
                @click="selectColor(color)"
              >
                <div class="color-card__swatch" :style="getSwatchStyle(color)" />
                <div class="color-card__meta">
                  <div class="color-card__code">{{ color.color_code }}</div>
                  <div class="color-card__formula">
                    {{ color.formula || '未填写配方' }}
                  </div>
                  <div class="color-card__pantone">
                    <el-tag
                      v-if="color.pantone_coated"
                      size="small"
                      type="info"
                    >
                      {{ color.pantone_coated }} (C)
                    </el-tag>
                    <el-tag
                      v-if="color.pantone_uncoated"
                      size="small"
                      type="info"
                    >
                      {{ color.pantone_uncoated }} (U)
                    </el-tag>
                    <span v-if="!color.pantone_coated && !color.pantone_uncoated">
                      无 Pantone 数据
                    </span>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>

        <div v-else class="coming-soon">
          <el-empty
            description="该视图正在迁移中，敬请期待。"
          />
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useCustomColorStore } from '@/stores/customColors';
import type { CustomColor } from '@/models/customColor';
import { resolveCustomColorSwatch } from '@/features/pure-color/customColorSwatch';
import { message } from '@/utils/message';
import { useRouter } from 'vue-router';

type ViewMode = 'list' | 'hsl' | 'wheel' | 'matcher';
type ListSortMode = 'code' | 'hue';

const store = useCustomColorStore();
const { items, loading, error } = storeToRefs(store);
const router = useRouter();

const viewTabs = [
  { value: 'list', label: '列表导航' },
  { value: 'hsl', label: 'HSL 导航' },
  { value: 'wheel', label: '色轮导航' },
  { value: 'matcher', label: '配方匹配' },
] as const;

const viewMode = ref<ViewMode>(
  (localStorage.getItem('color-dict-view') as ViewMode) || 'list',
);
const listSortMode = ref<ListSortMode>(
  (localStorage.getItem('color-dict-sort') as ListSortMode) || 'code',
);

const isLoading = computed(() => loading.value);
const loadError = computed(() => error.value);

const sortedColors = computed(() => {
  const base = [...items.value];
  if (listSortMode.value === 'code') {
    return base.sort((a, b) => (a.color_code || '').localeCompare(b.color_code || ''));
  }
  return base.sort((a, b) => getHueValue(a) - getHueValue(b));
});

const groupedList = computed(() => {
  const groups: Record<string, CustomColor[]> = {};
  sortedColors.value.forEach((color) => {
    const category = color.category_name || color.category_code || '未分类';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(color);
  });
  return Object.entries(groups).map(([category, colors]) => ({
    category,
    colors,
  }));
});

const selectedId = ref<number | null>(null);

const selectedColor = computed(() =>
  selectedId.value == null
    ? null
    : items.value.find((item) => item.id === selectedId.value) ?? null,
);

const selectedSwatchStyle = computed(() => {
  if (!selectedColor.value) {
    return { backgroundColor: '#f3f3f5' };
  }
  return getSwatchStyle(selectedColor.value);
});

function setSortMode(mode: ListSortMode) {
  if (listSortMode.value === mode) return;
  listSortMode.value = mode;
}

function switchView(mode: ViewMode) {
  viewMode.value = mode;
}

function getSwatchStyle(color: CustomColor) {
  const swatch = resolveCustomColorSwatch(color, { includeColorConcentrate: false });
  if (!swatch) {
    return {};
  }
  if (swatch.type === 'image' && swatch.imageUrl) {
    return {
      backgroundImage: `url(${swatch.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  if ((swatch.type === 'pure' || swatch.type === 'color') && swatch.hex) {
    return {
      backgroundColor: swatch.hex,
    };
  }
  return {
    backgroundColor: '#f3f3f5',
  };
}

function selectColor(color: CustomColor) {
  selectedId.value = color.id;
}

function getHueValue(color: CustomColor): number {
  const hex = color.pure_hex_color || color.hex_color || '';
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  if (normalized.length !== 6) {
    return Number.MAX_SAFE_INTEGER;
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const { h } = rgbToHsl(r, g, b);
  return h;
}

function rgbToHsl(r: number, g: number, b: number) {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rN:
        h = (gN - bN) / d + (gN < bN ? 6 : 0);
        break;
      case gN:
        h = (bN - rN) / d + 2;
        break;
      case bN:
        h = (rN - gN) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s, l };
}

function formatRgb(color: CustomColor) {
  const r = color.pure_rgb_r ?? color.rgb_r;
  const g = color.pure_rgb_g ?? color.rgb_g;
  const b = color.pure_rgb_b ?? color.rgb_b;
  if ([r, g, b].every((val) => val != null)) {
    return `${r}, ${g}, ${b}`;
  }
  return '—';
}

function formatCmyk(color: CustomColor) {
  const values = [color.cmyk_c, color.cmyk_m, color.cmyk_y, color.cmyk_k];
  if (values.every((val) => val != null)) {
    return values.map((v) => `${Number(v).toFixed(0)}%`).join(' / ');
  }
  return '—';
}

function formatPantone(color: CustomColor) {
  const parts: string[] = [];
  if (color.pantone_coated) {
    parts.push(`${color.pantone_coated} (C)`);
  }
  if (color.pantone_uncoated) {
    parts.push(`${color.pantone_uncoated} (U)`);
  }
  return parts.length ? parts.join('，') : '—';
}

function navigateToCustomColor() {
  if (!selectedColor.value) {
    message.info('请先选择一个颜色。');
    return;
  }
  message.warning('页面跳转功能将在迁移完成后启用。');
  router.push({ name: 'custom-colors' }).catch(() => {});
}

watch(viewMode, (mode) => {
  localStorage.setItem('color-dict-view', mode);
});

watch(listSortMode, (mode) => {
  localStorage.setItem('color-dict-sort', mode);
});

watch(
  () => items.value,
  (list) => {
    if (!selectedColor.value && list.length) {
      selectedId.value = list[0].id;
    }
    if (
      selectedId.value != null &&
      list.every((item) => item.id !== selectedId.value)
    ) {
      selectedId.value = list.length ? list[0].id : null;
    }
  },
  { deep: true },
);

onMounted(async () => {
  if (items.value.length === 0) {
    try {
      await store.loadAll();
    } catch {
      /* handled via store error */
    }
  }
  if (!selectedColor.value && items.value.length > 0) {
    selectedId.value = items.value[0].id;
  }
});
</script>

<style scoped>
.view {
  display: grid;
  gap: 24px;
}

.view__header {
  display: grid;
  gap: 16px;
}

.view__tabs {
  display: flex;
}

.view__sort {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view__body {
  padding: 12px 0 64px;
}

.category-section {
  margin-bottom: 32px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.category-header h2 {
  margin: 0;
  font-size: 20px;
  color: #2f2b43;
}

.category-count {
  color: #909399;
  font-size: 14px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.color-card {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 12px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
  min-height: 90px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.color-card__swatch {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
}

.color-card__meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.color-card__code {
  font-weight: 600;
  color: #2f2b43;
}

.color-card__formula {
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
}

.color-card__pantone {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  color: #909399;
  font-size: 12px;
}

.coming-soon {
  padding: 64px 0;
}

.detail-bar {
  display: grid;
  grid-template-columns: 96px 1fr auto;
  gap: 16px;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #f9fafc;
}

.detail-bar--empty {
  background: #f4f4f6;
  opacity: 0.8;
}

.detail-bar__swatch {
  width: 96px;
  height: 96px;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  background: #f3f3f5;
}

.detail-bar__meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
}

.detail-bar__meta h2 {
  margin: 0;
  font-size: 22px;
  color: #2f2b43;
}

.detail-bar__meta p {
  margin: 0;
  color: #606266;
}

.detail-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 6px 16px;
  padding: 0;
  margin: 0;
  list-style: none;
  font-size: 13px;
  color: #606266;
}

.detail-label {
  color: #909399;
  margin-right: 4px;
}

.detail-bar__actions {
  display: flex;
  align-items: center;
}

.color-card:hover {
  border-color: #409eff;
}

.color-card--selected {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

@media (max-width: 768px) {
  .color-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }

  .color-card {
    grid-template-columns: 48px 1fr;
  }

  .color-card__swatch {
    width: 48px;
    height: 48px;
  }

  .detail-bar {
    grid-template-columns: 64px 1fr;
    grid-template-rows: auto auto;
  }

  .detail-bar__actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}
</style>
