<template>
  <section class="matcher-view">
    <header class="matcher-view__header">
      <div>
        <h2>色彩匹配</h2>
        <p>输入任意颜色格式，系统将换算其余数值并查找最近似的自配色。</p>
      </div>
      <el-switch
        v-model="autoUpdate"
        size="small"
        inline-prompt
        active-text="自动匹配"
        inactive-text="手动匹配"
      />
    </header>

    <section class="matcher-view__content">
      <aside class="matcher-inputs">
        <div class="matcher-preview" :class="{ 'matcher-preview--empty': !previewColor }">
          <div class="matcher-preview__swatch" :style="previewStyle">
            <span v-if="!previewColor">待输入</span>
          </div>
          <div class="matcher-preview__meta">
            <template v-if="previewColor">
              <strong>{{ previewColor.hex }}</strong>
              <span
                >RGB {{ previewColor.rgb.r }}, {{ previewColor.rgb.g }},
                {{ previewColor.rgb.b }}</span
              >
              <span v-if="previewColor.hsl">
                HSL {{ previewColor.hsl.h }}°, {{ previewColor.hsl.s }}%, {{ previewColor.hsl.l }}%
              </span>
            </template>
            <span v-else>支持 RGB / CMYK / HEX / HSL 任意组合输入。</span>
          </div>
        </div>

        <el-form label-position="top" class="matcher-form" @submit.prevent>
          <el-form-item label="RGB (0 - 255)">
            <div class="matcher-row">
              <el-input-number
                v-model.number="inputRgb.r"
                :min="0"
                :max="255"
                :step="1"
                size="small"
                @change="handleRgbChange"
                placeholder="R"
              />
              <el-input-number
                v-model.number="inputRgb.g"
                :min="0"
                :max="255"
                :step="1"
                size="small"
                @change="handleRgbChange"
                placeholder="G"
              />
              <el-input-number
                v-model.number="inputRgb.b"
                :min="0"
                :max="255"
                :step="1"
                size="small"
                @change="handleRgbChange"
                placeholder="B"
              />
            </div>
          </el-form-item>

          <el-form-item label="CMYK (0 - 100)">
            <div class="matcher-row">
              <el-input-number
                v-model.number="inputCmyk.c"
                :min="0"
                :max="100"
                :step="1"
                size="small"
                @change="handleCmykChange"
                placeholder="C"
              />
              <el-input-number
                v-model.number="inputCmyk.m"
                :min="0"
                :max="100"
                :step="1"
                size="small"
                @change="handleCmykChange"
                placeholder="M"
              />
              <el-input-number
                v-model.number="inputCmyk.y"
                :min="0"
                :max="100"
                :step="1"
                size="small"
                @change="handleCmykChange"
                placeholder="Y"
              />
              <el-input-number
                v-model.number="inputCmyk.k"
                :min="0"
                :max="100"
                :step="1"
                size="small"
                @change="handleCmykChange"
                placeholder="K"
              />
            </div>
          </el-form-item>

          <el-form-item label="HEX (如 #FFAA00)">
            <el-input
              v-model.trim="inputHex"
              size="small"
              placeholder="#000000"
              @change="handleHexChange"
              @blur="handleHexBlur"
            />
          </el-form-item>

          <el-form-item label="HSL (H: 0-360, S/L: 0-100)">
            <div class="matcher-row">
              <el-input-number
                v-model.number="inputHsl.h"
                :min="0"
                :max="360"
                :step="1"
                size="small"
                @change="handleHslChange"
                placeholder="H"
              />
              <el-input-number
                v-model.number="inputHsl.s"
                :min="0"
                :max="100"
                :step="1"
                size="small"
                @change="handleHslChange"
                placeholder="S"
              />
              <el-input-number
                v-model.number="inputHsl.l"
                :min="0"
                :max="100"
                :step="1"
                size="small"
                @change="handleHslChange"
                placeholder="L"
              />
            </div>
          </el-form-item>
        </el-form>

        <div class="matcher-actions">
          <el-button
            type="primary"
            :disabled="!previewColor || autoUpdate"
            @click="applyMatchTarget"
          >
            计算匹配
          </el-button>
          <el-button @click="resetInputs">重置</el-button>
        </div>
      </aside>

      <section class="matcher-results">
        <header class="matcher-results__header">
          <h3>
            匹配结果
            <small v-if="matchTarget">目标 ΔE 排序，取前 {{ matches.length }} 个</small>
          </h3>
          <el-empty v-if="!matchTarget" description="暂无目标颜色，请先录入数值。" />
        </header>

        <div v-if="matchTarget" class="match-results__grid">
          <article
            v-for="match in matches"
            :key="match.base.id"
            class="matcher-result"
            :class="{ 'matcher-result--selected': match.base.id === selectedId }"
            @click="emitSelect(match.base.id)"
          >
            <div
              class="matcher-result__swatch"
              :style="match.swatch.style"
              :class="match.swatch.className"
            >
              <span v-if="match.swatch.type === 'empty'">无</span>
            </div>
            <div class="matcher-result__meta">
              <strong>{{ match.base.color_code }}</strong>
              <span>ΔE {{ match.deltaE.toFixed(2) }}</span>
              <span v-if="match.base.formula" class="matcher-result__formula">{{
                match.base.formula
              }}</span>
            </div>
          </article>
          <el-empty
            v-if="!matches.length"
            description="未找到符合阈值的颜色，请调整输入或增大范围。"
          />
        </div>
      </section>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { CustomColor } from '@/models/customColor';
import {
  rgbToHex,
  hexToRgb,
  rgbToCmyk,
  cmykToRgb,
  rgbToHsl,
} from '@/features/pure-color/colorConverter';
import { enrichColor } from '@/features/color-dictionary/utils';
import { rgbToLab, deltaE } from '@/features/color-dictionary/colorMath';

const props = defineProps<{
  colors: CustomColor[];
  selectedId: number | null;
}>();

const emit = defineEmits<{
  (event: 'select', id: number): void;
}>();

type Source = 'rgb' | 'hex' | 'cmyk' | 'hsl';

const inputRgb = reactive<{ r: number | null; g: number | null; b: number | null }>({
  r: null,
  g: null,
  b: null,
});
const inputCmyk = reactive<{
  c: number | null;
  m: number | null;
  y: number | null;
  k: number | null;
}>({
  c: null,
  m: null,
  y: null,
  k: null,
});
const inputHsl = reactive<{ h: number | null; s: number | null; l: number | null }>({
  h: null,
  s: null,
  l: null,
});
const inputHex = ref('');

const autoUpdate = ref(true);
const matchTarget = ref<MatchTarget | null>(null);

interface MatchTarget {
  rgb: { r: number; g: number; b: number };
  lab: { L: number; a: number; b: number };
  hex: string;
  hsl: { h: number; s: number; l: number } | null;
}

interface MatchResult {
  base: CustomColor;
  swatch: ReturnType<typeof enrichColor>['swatch'];
  deltaE: number;
}

const enrichedColors = computed(() =>
  props.colors.map((color) => {
    const enriched = enrichColor(color);
    const lab =
      enriched.rgb != null ? rgbToLab(enriched.rgb.r, enriched.rgb.g, enriched.rgb.b) : null;
    return { ...enriched, lab };
  }),
);

const previewColor = computed<MatchTarget | null>(() => {
  const rgb = resolveRgbFromInputs();
  if (!rgb) {
    return null;
  }
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return {
    rgb,
    hex: hex ?? formatRgbAsHex(rgb),
    hsl,
    lab: rgbToLab(rgb.r, rgb.g, rgb.b),
  };
});

const previewStyle = computed(() =>
  previewColor.value
    ? { backgroundColor: previewColor.value.hex, boxShadow: '0 0 0 1px rgba(47,43,67,.08)' }
    : {},
);

const matches = computed<MatchResult[]>(() => {
  if (!matchTarget.value) {
    return [];
  }
  return enrichedColors.value
    .filter((entry) => entry.lab != null)
    .map((entry) => ({
      base: entry.base,
      swatch: entry.swatch,
      deltaE: entry.lab ? deltaE(matchTarget.value!.lab, entry.lab) : Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => a.deltaE - b.deltaE)
    .slice(0, 24);
});

function formatRgbAsHex(rgb: { r: number; g: number; b: number }): string {
  return (
    '#' +
    [rgb.r, rgb.g, rgb.b]
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function resolveRgbFromInputs(): { r: number; g: number; b: number } | null {
  const hex = normalizeHex(inputHex.value);
  if (hex) {
    const rgb = hexToRgb(hex);
    if (rgb) {
      return rgb;
    }
  }
  if (isRgbComplete(inputRgb)) {
    return {
      r: clampByte(inputRgb.r!),
      g: clampByte(inputRgb.g!),
      b: clampByte(inputRgb.b!),
    };
  }
  if (isHslComplete(inputHsl)) {
    return hslToRgb(inputHsl.h!, inputHsl.s!, inputHsl.l!);
  }
  if (isCmykComplete(inputCmyk)) {
    const rgb = cmykToRgb(inputCmyk.c!, inputCmyk.m!, inputCmyk.y!, inputCmyk.k!);
    return rgb ? { r: rgb.r, g: rgb.g, b: rgb.b } : null;
  }
  return null;
}

function applyRgb(rgb: { r: number; g: number; b: number }, origin: Source) {
  if (origin !== 'rgb') {
    inputRgb.r = rgb.r;
    inputRgb.g = rgb.g;
    inputRgb.b = rgb.b;
  }

  const hex = rgbToHex(rgb.r, rgb.g, rgb.b) ?? formatRgbAsHex(rgb);
  if (origin !== 'hex') {
    inputHex.value = hex;
  }

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  if (origin !== 'hsl' && hsl) {
    inputHsl.h = hsl.h;
    inputHsl.s = hsl.s;
    inputHsl.l = hsl.l;
  }

  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
  if (origin !== 'cmyk' && cmyk) {
    inputCmyk.c = cmyk.c;
    inputCmyk.m = cmyk.m;
    inputCmyk.y = cmyk.y;
    inputCmyk.k = cmyk.k;
  }

  if (autoUpdate.value) {
    commitTargetFromPreview();
  }
}

function commitTargetFromPreview() {
  if (!previewColor.value) {
    matchTarget.value = null;
    return;
  }
  matchTarget.value = {
    rgb: previewColor.value.rgb,
    lab: previewColor.value.lab,
    hex: previewColor.value.hex,
    hsl: previewColor.value.hsl,
  };
}

function handleRgbChange() {
  if (!isRgbComplete(inputRgb)) {
    return;
  }
  const rgb = {
    r: clampByte(inputRgb.r!),
    g: clampByte(inputRgb.g!),
    b: clampByte(inputRgb.b!),
  };
  applyRgb(rgb, 'rgb');
}

function handleHexChange() {
  const hex = normalizeHex(inputHex.value);
  if (!hex) {
    return;
  }
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return;
  }
  applyRgb(rgb, 'hex');
}

function handleHexBlur() {
  const hex = normalizeHex(inputHex.value);
  if (!hex) {
    return;
  }
  inputHex.value = hex;
}

function handleCmykChange() {
  if (!isCmykComplete(inputCmyk)) {
    return;
  }
  const rgb = cmykToRgb(inputCmyk.c!, inputCmyk.m!, inputCmyk.y!, inputCmyk.k!);
  if (!rgb) {
    return;
  }
  applyRgb(rgb, 'cmyk');
}

function handleHslChange() {
  if (!isHslComplete(inputHsl)) {
    return;
  }
  const rgb = hslToRgb(inputHsl.h!, inputHsl.s!, inputHsl.l!);
  applyRgb(rgb, 'hsl');
}

watch(
  () => previewColor.value,
  () => {
    if (autoUpdate.value) {
      commitTargetFromPreview();
    }
  },
);

watch(
  () => autoUpdate.value,
  (value) => {
    if (value) {
      commitTargetFromPreview();
    }
  },
);

function applyMatchTarget() {
  if (!previewColor.value) {
    return;
  }
  matchTarget.value = {
    rgb: previewColor.value.rgb,
    lab: previewColor.value.lab,
    hex: previewColor.value.hex,
    hsl: previewColor.value.hsl,
  };
}

function resetInputs() {
  inputRgb.r = null;
  inputRgb.g = null;
  inputRgb.b = null;
  inputCmyk.c = null;
  inputCmyk.m = null;
  inputCmyk.y = null;
  inputCmyk.k = null;
  inputHsl.h = null;
  inputHsl.s = null;
  inputHsl.l = null;
  inputHex.value = '';
  matchTarget.value = null;
}

function emitSelect(id: number) {
  emit('select', id);
}

function normalizeHex(value: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const upper = prefixed.toUpperCase();
  return /^[#][0-9A-F]{6}$/.test(upper) ? upper : null;
}

function clampByte(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isRgbComplete(rgb: { r: number | null; g: number | null; b: number | null }): boolean {
  return [rgb.r, rgb.g, rgb.b].every((channel) => channel != null && Number.isFinite(channel));
}

function isCmykComplete(cmyk: {
  c: number | null;
  m: number | null;
  y: number | null;
  k: number | null;
}): boolean {
  return [cmyk.c, cmyk.m, cmyk.y, cmyk.k].every((value) => value != null && Number.isFinite(value));
}

function isHslComplete(hsl: { h: number | null; s: number | null; l: number | null }): boolean {
  return [hsl.h, hsl.s, hsl.l].every((value) => value != null && Number.isFinite(value));
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hue = ((h % 360) + 360) % 360;
  const sat = clampPercent(s) / 100;
  const light = clampPercent(l) / 100;

  if (sat === 0) {
    const gray = clampByte(light * 255);
    return { r: gray, g: gray, b: gray };
  }

  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;

  const convert = (t: number) => {
    let temp = (t + 1) % 1;
    if (temp < 0) temp += 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
    return p;
  };

  const r = convert(hue / 360 + 1 / 3);
  const g = convert(hue / 360);
  const b = convert(hue / 360 - 1 / 3);

  return {
    r: clampByte(r * 255),
    g: clampByte(g * 255),
    b: clampByte(b * 255),
  };
}
</script>

<style scoped>
.matcher-view {
  display: grid;
  gap: 24px;
}

.matcher-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.matcher-view__header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #2f2b43;
}

.matcher-view__header p {
  margin: 4px 0 0;
  color: #606266;
  font-size: 14px;
}

.matcher-view__content {
  display: grid;
  grid-template-columns: minmax(320px, 360px) 1fr;
  gap: 28px;
}

.matcher-inputs {
  display: grid;
  gap: 20px;
  align-content: start;
}

.matcher-preview {
  display: flex;
  gap: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 16px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(47, 43, 67, 0.04);
  align-items: center;
}

.matcher-preview--empty {
  border-style: dashed;
  background: #fafbff;
}

.matcher-preview__swatch {
  width: 92px;
  height: 92px;
  border-radius: 12px;
  background: #f6f7fb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 13px;
}

.matcher-preview__meta {
  display: grid;
  gap: 4px;
  font-size: 13px;
  color: #606266;
}

.matcher-form {
  display: grid;
  gap: 16px;
}

.matcher-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.matcher-actions {
  display: flex;
  gap: 12px;
}

.matcher-results {
  display: grid;
  gap: 16px;
}

.matcher-results__header h3 {
  margin: 0;
  font-size: 18px;
  color: #2f2b43;
}

.matcher-results__header small {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
  font-weight: 400;
}

.match-results__grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.matcher-result {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 16px;
  display: grid;
  gap: 12px;
  cursor: pointer;
  background: #ffffff;
  transition:
    border-color 0.15s ease,
    box-shadow 0.2s ease;
}

.matcher-result:hover {
  border-color: #dcdfe6;
  box-shadow: 0 12px 28px rgba(47, 43, 67, 0.08);
}

.matcher-result--selected {
  border-color: #409eff;
  box-shadow: 0 12px 32px rgba(64, 158, 255, 0.2);
}

.matcher-result__swatch {
  width: 100%;
  padding-bottom: 56%;
  border-radius: 10px;
  background: #f6f7fb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 12px;
}

.matcher-result__meta {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}

.matcher-result__formula {
  color: #909399;
  line-height: 1.4;
}

@media (max-width: 960px) {
  .matcher-view__content {
    grid-template-columns: 1fr;
  }
}
</style>
