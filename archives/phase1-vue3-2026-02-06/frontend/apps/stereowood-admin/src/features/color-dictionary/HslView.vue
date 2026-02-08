<template>
  <section class="hsl-view">
    <div class="hsl-view__controls">
      <div class="hsl-view__slider">
        <input
          type="range"
          min="0"
          max="360"
          v-model.number="selectedHue"
          :style="sliderStyle"
          aria-label="选择色相（度）"
        />
        <div class="hsl-view__preset">
          <el-button
            v-for="preset in huePresets"
            :key="preset.value"
            size="small"
            :type="Math.abs(selectedHue - preset.value) <= 2 ? 'primary' : 'default'"
            @click="selectedHue = preset.value"
          >
            {{ preset.label }}
          </el-button>
        </div>
      </div>

      <div class="hsl-view__grid-controls">
        <span>网格密度：</span>
        <el-radio-group v-model.number="gridSize" size="small">
          <el-radio-button :label="6">6×6</el-radio-button>
          <el-radio-button :label="10">10×10</el-radio-button>
          <el-radio-button :label="15">15×15</el-radio-button>
        </el-radio-group>
        <span class="hsl-view__grid-info">{{ colorsInHue.length }} 个颜色</span>
      </div>
    </div>

    <div class="hsl-grid">
      <div v-for="(row, rowIndex) in colorGrid" :key="`row-${rowIndex}`" class="hsl-grid__row">
        <div
          v-for="(cell, columnIndex) in row"
          :key="`cell-${rowIndex}-${columnIndex}`"
          class="hsl-grid__cell"
          :style="getCellStyle(cell)"
          :class="{ 'hsl-grid__cell--active': cell.colors.length }"
        >
          <template v-if="cell.colors.length">
            <button
              v-for="colorEntry in cell.colors"
              :key="colorEntry.color.id"
              class="hsl-grid__dot"
              :class="{
                'hsl-grid__dot--selected': selectedId === colorEntry.color.id,
              }"
              :style="{ backgroundColor: colorEntry.hex }"
              type="button"
              @click.stop="emitSelect(colorEntry.color.id)"
              :title="buildTooltip(colorEntry.color)"
            />
          </template>
        </div>
      </div>
    </div>

    <div class="hsl-list" v-if="colorsInHue.length">
      <header class="hsl-list__header">
        <h3>色相 {{ selectedHue - HUE_WINDOW }}° 至 {{ selectedHue + HUE_WINDOW }}°</h3>
        <span>按亮度排序</span>
      </header>
      <div class="hsl-list__grid">
        <article
          v-for="colorEntry in sortedHueColors"
          :key="colorEntry.color.id"
          class="hsl-card"
          :class="{ 'hsl-card--selected': colorEntry.color.id === selectedId }"
          @click="emitSelect(colorEntry.color.id)"
        >
          <div
            class="hsl-card__swatch"
            :class="colorEntry.swatch.className"
            :style="colorEntry.swatch.style"
          >
            <span v-if="colorEntry.swatch.type === 'empty'">无</span>
          </div>
          <div class="hsl-card__meta">
            <strong>{{ colorEntry.color.color_code }}</strong>
            <span v-if="colorEntry.hsl">
              HSL {{ colorEntry.hsl.h }}° / {{ colorEntry.hsl.s }}% / {{ colorEntry.hsl.l }}%
            </span>
            <span v-else>无法计算 HSL</span>
          </div>
        </article>
      </div>
    </div>

    <el-empty v-else description="该色相范围暂无颜色。试着移动滑块或降低网格密度。" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { CustomColor } from '@/models/customColor';
import { enrichColor, type ColorSwatchInfo } from '@/features/color-dictionary/utils';

const HUE_WINDOW = 15;
const DEFAULT_GRID = 10;

const huePresets = [
  { label: '红', value: 0 },
  { label: '橙', value: 30 },
  { label: '黄', value: 60 },
  { label: '绿', value: 120 },
  { label: '青', value: 180 },
  { label: '蓝', value: 240 },
  { label: '紫', value: 300 },
] as const;

const props = defineProps<{
  colors: CustomColor[];
  selectedId: number | null;
}>();

const emit = defineEmits<{
  (event: 'select', id: number): void;
}>();

interface ColorWithHsl {
  color: CustomColor;
  hex: string | null;
  hsl: { h: number; s: number; l: number } | null;
  swatch: ColorSwatchInfo;
}

interface GridCell {
  saturation: number;
  lightness: number;
  colors: ColorWithHsl[];
}

const selectedHue = ref(180);
const gridSize = ref<number>(DEFAULT_GRID);

const sliderStyle = computed(() => ({
  background:
    'linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))',
}));

const colorsWithHsl = computed<ColorWithHsl[]>(() =>
  props.colors.map((color) => {
    const enriched = enrichColor(color);
    return {
      color: enriched.base,
      hex: enriched.hex,
      hsl: enriched.hsl,
      swatch: enriched.swatch,
    };
  }),
);

const colorsInHue = computed(() =>
  colorsWithHsl.value.filter((entry) => {
    if (!entry.hsl) {
      return false;
    }
    const hueDiff = Math.abs(entry.hsl.h - selectedHue.value);
    const wrappedDiff = Math.min(hueDiff, 360 - hueDiff);
    return wrappedDiff <= HUE_WINDOW;
  }),
);

const colorGrid = computed<GridCell[][]>(() => {
  const size = gridSize.value;
  if (size <= 1) {
    return [];
  }

  const tolerance = 100 / size;
  const grid: GridCell[][] = [];
  for (let row = 0; row < size; row += 1) {
    const rowCells: GridCell[] = [];
    for (let column = 0; column < size; column += 1) {
      const saturation = (column / (size - 1)) * 100;
      const lightness = 100 - (row / (size - 1)) * 100;
      const matching = colorsInHue.value.filter((entry) => {
        if (!entry.hsl) {
          return false;
        }
        const sDiff = Math.abs(entry.hsl.s - saturation);
        const lDiff = Math.abs(entry.hsl.l - lightness);
        return sDiff <= tolerance && lDiff <= tolerance;
      });
      rowCells.push({ saturation, lightness, colors: matching.slice(0, 3) });
    }
    grid.push(rowCells);
  }
  return grid;
});

const sortedHueColors = computed(() =>
  [...colorsInHue.value].sort((a, b) => {
    if (!a.hsl || !b.hsl) return 0;
    if (a.hsl.l === b.hsl.l) {
      return b.hsl.s - a.hsl.s;
    }
    return b.hsl.l - a.hsl.l;
  }),
);

function getCellStyle(cell: GridCell) {
  const saturation = Math.round(cell.saturation);
  const lightness = Math.round(cell.lightness);
  return {
    background: `hsl(${selectedHue.value}, ${saturation}%, ${lightness}%)`,
  };
}

function buildTooltip(color: CustomColor) {
  return `${color.color_code}${color.formula ? ` · ${color.formula}` : ''}`;
}

function emitSelect(id: number) {
  emit('select', id);
}

watch(
  () => props.selectedId,
  (id) => {
    if (!id) {
      return;
    }
    const match = colorsWithHsl.value.find((entry) => entry.color.id === id);
    if (match?.hsl) {
      selectedHue.value = match.hsl.h;
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.hsl-view {
  display: grid;
  gap: 20px;
}

.hsl-view__controls {
  display: grid;
  gap: 16px;
}

.hsl-view__slider {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hsl-view__slider input[type='range'] {
  appearance: none;
  height: 8px;
  border-radius: 8px;
  outline: none;
  cursor: pointer;
}

.hsl-view__slider input[type='range']::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #409eff;
}

.hsl-view__slider input[type='range']::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #409eff;
}

.hsl-view__preset {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hsl-view__grid-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.hsl-view__grid-info {
  color: #909399;
  font-size: 13px;
}

.hsl-grid {
  display: grid;
  gap: 4px;
}

.hsl-grid__row {
  display: grid;
  gap: 4px;
  grid-template-columns: repeat(auto-fit, minmax(24px, 1fr));
}

.hsl-grid__cell {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.hsl-grid__cell--active {
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
}

.hsl-grid__cell .hsl-grid__dot {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  cursor: pointer;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  outline: none;
}

.hsl-grid__cell .hsl-grid__dot + .hsl-grid__dot {
  transform: translate(-50%, -50%) scale(0.9);
}

.hsl-grid__dot--selected {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.35);
}

.hsl-list {
  display: grid;
  gap: 12px;
}

.hsl-list__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  color: #606266;
}

.hsl-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.hsl-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  background: #fff;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.hsl-card:hover {
  border-color: #409eff;
}

.hsl-card--selected {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.hsl-card__swatch {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f7fb;
  color: #909399;
  font-size: 12px;
}

.hsl-card__meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  color: #606266;
  font-size: 13px;
}

.hsl-card__meta strong {
  color: #303133;
  font-size: 14px;
}

@media (max-width: 768px) {
  .hsl-grid__row {
    grid-template-columns: repeat(auto-fit, minmax(18px, 1fr));
  }

  .hsl-list__grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}
</style>
