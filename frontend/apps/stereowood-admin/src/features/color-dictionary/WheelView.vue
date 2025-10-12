<template>
  <section class="wheel-view">
    <header class="wheel-view__controls">
      <div class="wheel-view__control">
        <label class="wheel-view__label">
          邻近范围 (ΔE): <strong>{{ proximityRange }}</strong>
        </label>
        <el-slider v-model="proximityRange" :min="0" :max="50" :step="1" show-tooltip="false" />
      </div>
      <el-checkbox v-model="showOnlyWithRgb">仅显示有 RGB 数据的颜色</el-checkbox>
      <span class="wheel-view__stats">
        显示 {{ wheelColors.length }} / {{ enrichedColors.length }} 个颜色
        <template v-if="matchedColors.length"> · 命中 {{ matchedColors.length }} 个颜色 </template>
      </span>
    </header>

    <div class="wheel-view__stage">
      <div class="wheel-view__circle">
        <button
          v-for="dot in wheelColors"
          :key="dot.base.id"
          class="wheel-dot"
          :class="{
            'wheel-dot--selected': dot.base.id === selectedId,
            'wheel-dot--matched': matchedIds.has(dot.base.id),
            'wheel-dot--blank': !dot.hex,
          }"
          :style="{
            left: `${dot.position.x}px`,
            top: `${dot.position.y}px`,
            backgroundColor: dot.hex ?? 'transparent',
          }"
          type="button"
          @click="emitSelect(dot.base.id)"
          :title="buildTooltip(dot.base)"
        >
          <span v-if="!dot.hex" class="wheel-dot__placeholder">无</span>
        </button>
        <div class="wheel-view__center">色轮导航</div>
      </div>
    </div>

    <section v-if="matchedColors.length" class="wheel-view__matches">
      <header>
        <h3>命中颜色 (ΔE ≤ {{ proximityRange }})</h3>
        <small>ΔE 越小表示越接近</small>
      </header>
      <div class="match-grid">
        <article
          v-for="match in matchedColors"
          :key="match.base.id"
          class="match-card"
          :class="{ 'match-card--selected': match.base.id === selectedId }"
          @click="emitSelect(match.base.id)"
        >
          <div
            class="match-card__swatch"
            :style="match.swatch.style"
            :class="match.swatch.className"
          >
            <span v-if="match.swatch.type === 'empty'">无</span>
          </div>
          <div class="match-card__meta">
            <strong>{{ match.base.color_code }}</strong>
            <span>ΔE {{ match.deltaE.toFixed(1) }}</span>
          </div>
        </article>
      </div>
    </section>

    <section v-if="colorsWithoutHsl.length" class="wheel-view__missing">
      <h3>无色相信息的颜色</h3>
      <div class="missing-grid">
        <article
          v-for="item in colorsWithoutHsl"
          :key="item.base.id"
          class="missing-card"
          :class="{ 'missing-card--selected': item.base.id === selectedId }"
          @click="emitSelect(item.base.id)"
        >
          <div
            class="missing-card__swatch"
            :style="item.swatch.style"
            :class="item.swatch.className"
          >
            <span v-if="item.swatch.type === 'empty'">无</span>
          </div>
          <div class="missing-card__meta">
            <strong>{{ item.base.color_code }}</strong>
            <span>缺少 RGB/HSL 数据</span>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { CustomColor } from '@/models/customColor';
import { enrichColor } from '@/features/color-dictionary/utils';
import { rgbToLab, deltaE } from '@/features/color-dictionary/colorMath';

const WHEEL_SIZE = 520;
const DOT_SIZE = 18;
const RADIUS = WHEEL_SIZE / 2 - DOT_SIZE;

const props = defineProps<{
  colors: CustomColor[];
  selectedId: number | null;
}>();

const emit = defineEmits<{
  (event: 'select', id: number): void;
}>();

interface WheelColor {
  base: CustomColor;
  hex: string | null;
  hsl: { h: number; s: number; l: number } | null;
  lab: { L: number; a: number; b: number } | null;
  swatch: ReturnType<typeof enrichColor>['swatch'];
  position: { x: number; y: number };
}

const showOnlyWithRgb = ref(false);
const proximityRange = ref(15);

const enrichedColors = computed(() =>
  props.colors.map((color) => {
    const enriched = enrichColor(color);
    const lab =
      enriched.rgb != null ? rgbToLab(enriched.rgb.r, enriched.rgb.g, enriched.rgb.b) : null;
    return {
      base: enriched.base,
      hex: enriched.hex,
      hsl: enriched.hsl,
      rgb: enriched.rgb,
      lab,
      swatch: enriched.swatch,
    };
  }),
);

function computePosition(hsl: { h: number; s: number }): { x: number; y: number } {
  const angleRad = ((hsl.h - 90) * Math.PI) / 180;
  const distance = (hsl.s / 100) * RADIUS;
  const center = WHEEL_SIZE / 2 - DOT_SIZE / 2;
  const x = center + Math.cos(angleRad) * distance;
  const y = center + Math.sin(angleRad) * distance;
  return { x, y };
}

const wheelColors = computed<WheelColor[]>(() =>
  enrichedColors.value
    .filter((item) => {
      if (showOnlyWithRgb.value) {
        return item.rgb != null;
      }
      return true;
    })
    .map((item) => ({
      base: item.base,
      hex: item.hex,
      hsl: item.hsl,
      lab: item.lab,
      swatch: item.swatch,
      position: item.hsl
        ? computePosition({ h: item.hsl.h, s: item.hsl.s })
        : { x: WHEEL_SIZE / 2 - DOT_SIZE / 2, y: WHEEL_SIZE / 2 - DOT_SIZE / 2 },
    })),
);

const colorsWithHsl = computed(() => wheelColors.value.filter((item) => item.hsl));
const colorsWithoutHsl = computed(() =>
  enrichedColors.value
    .filter((item) => !item.hsl)
    .map((item) => ({
      base: item.base,
      swatch: item.swatch,
    })),
);

const selectedColor = computed(
  () => wheelColors.value.find((item) => item.base.id === props.selectedId) ?? null,
);

const matchedColors = computed(() => {
  const source = selectedColor.value;
  if (!source || !source.lab) {
    return [];
  }
  return colorsWithHsl.value
    .filter((item) => item.base.id !== source.base.id && item.lab)
    .map((item) => ({
      ...item,
      deltaE: item.lab ? deltaE(source.lab, item.lab) : Number.POSITIVE_INFINITY,
    }))
    .filter((item) => item.deltaE <= proximityRange.value)
    .sort((a, b) => a.deltaE - b.deltaE)
    .slice(0, 30);
});

const matchedIds = computed(() => new Set(matchedColors.value.map((item) => item.base.id)));

function emitSelect(id: number) {
  emit('select', id);
}

function buildTooltip(color: CustomColor) {
  return `${color.color_code}${color.formula ? ` · ${color.formula}` : ''}`;
}
</script>

<style scoped>
.wheel-view {
  display: grid;
  gap: 24px;
}

.wheel-view__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.wheel-view__control {
  min-width: 240px;
  flex: 1 1 320px;
}

.wheel-view__label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #2f2b43;
}

.wheel-view__stats {
  color: #909399;
  font-size: 13px;
}

.wheel-view__stage {
  display: flex;
  justify-content: center;
}

.wheel-view__circle {
  position: relative;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: conic-gradient(
    from -90deg,
    #ff5f5f,
    #ffa75f,
    #ffe65f,
    #5fff81,
    #5fbcff,
    #7b5fff,
    #ff5ff0,
    #ff5f5f
  );
  border: 6px solid #ffffff;
  box-shadow:
    0 12px 30px rgba(47, 43, 67, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.wheel-view__center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  letter-spacing: 0.08em;
  box-shadow: 0 4px 16px rgba(47, 43, 67, 0.08);
}

.wheel-dot {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 4px 12px rgba(47, 43, 67, 0.2);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wheel-dot:hover {
  transform: scale(1.15);
  box-shadow: 0 6px 16px rgba(47, 43, 67, 0.25);
}

.wheel-dot--selected {
  border-color: #ffb347;
  box-shadow: 0 6px 20px rgba(255, 179, 71, 0.4);
}

.wheel-dot--matched {
  border-color: #67c23a;
}

.wheel-dot--blank {
  background: rgba(96, 99, 108, 0.4);
  color: #ffffff;
  font-size: 10px;
}

.wheel-dot__placeholder {
  font-size: 10px;
  color: #ffffff;
}

.wheel-view__matches header,
.wheel-view__missing h3 {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
  color: #2f2b43;
}

.wheel-view__matches small {
  color: #909399;
}

.match-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}

.match-card {
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 12px;
  display: grid;
  gap: 10px;
  cursor: pointer;
  background: #ffffff;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.match-card:hover {
  border-color: #dcdfe6;
  box-shadow: 0 8px 20px rgba(47, 43, 67, 0.08);
}

.match-card--selected {
  border-color: #409eff;
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.2);
}

.match-card__swatch {
  width: 100%;
  padding-bottom: 56%;
  border-radius: 8px;
  background-color: #f6f7fb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #909399;
}

.match-card__meta {
  display: grid;
  gap: 4px;
  font-size: 13px;
  color: #606266;
}

.missing-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}

.missing-card {
  border: 1px dashed #dcdfe6;
  border-radius: 10px;
  padding: 12px;
  display: grid;
  gap: 8px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  background: #fafbff;
}

.missing-card:hover {
  border-color: #b3c0d1;
}

.missing-card--selected {
  border-color: #409eff;
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.15);
}

.missing-card__swatch {
  width: 100%;
  padding-bottom: 56%;
  border-radius: 8px;
  background-color: #f6f7fb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #909399;
}

.missing-card__meta {
  display: grid;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}
</style>
