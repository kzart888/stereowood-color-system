(function(window) {
    'use strict';

    const helpers = window.ColorDictionaryHelpers || { getColorStyle: () => null };

    const HslDictionaryView = {
        name: 'HslDictionaryView',
        template: `
        <div class="hsl-color-space-view">
            <!-- Hue Slider -->
            <div class="hue-slider-container">
                <div class="hue-controls">
                    <label>色相 (Hue): {{ Math.round(selectedHue) }}°</label>
                    <div class="hue-presets">
                        <button
                            v-for="preset in huePresets"
                            :key="preset.value"
                            @click="selectedHue = preset.value"
                            class="hue-preset-btn"
                            :style="{ backgroundColor: 'hsl(' + preset.value + ', 100%, 50%)' }"
                            :title="preset.name"
                        >
                        </button>
                    </div>
                </div>
                <input
                    type="range"
                    v-model="selectedHue"
                    min="0"
                    max="360"
                    class="hue-slider"
                    :style="hueSliderStyle"
                >
            </div>

            <!-- Grid Size & Filters -->
            <div class="grid-controls">
                <label>网格密度: </label>
                <el-radio-group v-model="gridSize" size="small">
                    <el-radio-button :label="5">5x5</el-radio-button>
                    <el-radio-button :label="10">10x10</el-radio-button>
                    <el-radio-button :label="15">15x15</el-radio-button>
                </el-radio-group>
                <el-checkbox
                    v-if="showRgbToggle"
                    v-model="showOnlyWithRGB"
                    class="grid-control-checkbox"
                >
                    仅显示有RGB数据的颜色
                </el-checkbox>
                <div v-if="showHueToleranceControl" class="hue-tolerance-control">
                    <span class="tolerance-label">色相容差: {{ effectiveHueTolerance }}°</span>
                    <el-slider
                        v-model="hueTolerance"
                        :min="5"
                        :max="30"
                        :step="5"
                        class="tolerance-slider"
                        show-tooltip
                    ></el-slider>
                </div>
                <span class="grid-info">{{ colorsInHue.length }} 个颜色在此色相范围</span>
            </div>

            <!-- Saturation-Lightness Grid -->
            <div class="sl-grid-container">
                <div class="sl-grid" :style="gridStyle">
                    <div
                        v-for="(row, rowIndex) in colorGrid"
                        :key="rowIndex"
                        class="grid-row"
                    >
                        <div
                            v-for="(cell, colIndex) in row"
                            :key="colIndex"
                            class="grid-cell"
                            :style="getCellStyle(cell)"
                            @click="selectCell(cell)"
                            :title="getCellTooltip(cell)"
                            :class="{
                                'has-colors': cell.colors.length > 0
                            }"
                        >
                            <div
                                v-for="(color, idx) in cell.colors"
                                :key="color.id"
                                class="cell-color-dot"
                                :style="getDotStyle(color, idx, cell.colors.length)"
                                :class="{ 'selected': isSelected(color) }"
                                @click.stop="selectColor(color)"
                                @mouseenter="$emit('hover', color)"
                                @mouseleave="$emit('hover', null)"
                            >
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid-labels">
                    <div class="label-y">
                        <span>明</span>
                        <span>度</span>
                        <span>↓</span>
                    </div>
                    <div class="label-x">饱和度 →</div>
                </div>
            </div>

            <!-- Color matches in current hue -->
            <div class="hue-colors" v-if="colorsInHue.length > 0">
                <div class="hue-colors-header">
                    <h4>当前色相范围的颜色 ({{ selectedHue - effectiveHueTolerance }}° - {{ selectedHue + effectiveHueTolerance }}°)</h4>
                </div>
                <div class="color-chips">
                    <div
                        v-for="color in colorsInHue"
                        :key="color.id"
                        class="color-chip-80"
                        @click="selectColor(color)"
                        :class="{ 'selected': isSelected(color) }"
                        @mouseenter="$emit('hover', color)"
                        @mouseleave="$emit('hover', null)"
                    >
                        <div class="color-preview"
                             :class="{ 'blank-color': !getColorStyle(color) }"
                             :style="getColorStyle(color) ? { background: getColorStyle(color) } : {}">
                            <span v-if="!getColorStyle(color)" class="blank-text">无</span>
                        </div>
                        <div class="color-code">{{ color.color_code }}</div>
                    </div>
                </div>
            </div>
        </div>
    `,

        props: {
            colors: {
                type: Array,
                default: () => []
            },
            selectedColor: {
                type: Object,
                default: null
            },
            showRgbToggle: {
                type: Boolean,
                default: false
            },
            initialShowRgbOnly: {
                type: Boolean,
                default: false
            },
            showHueToleranceControl: {
                type: Boolean,
                default: false
            },
            initialHueTolerance: {
                type: Number,
                default: 15
            },
            defaultGridSize: {
                type: Number,
                default: 10
            }
        },

        data() {
            return {
                selectedHue: 180,
                gridSize: this.defaultGridSize,
                hueTolerance: this.initialHueTolerance,
                showOnlyWithRGB: this.showRgbToggle ? this.initialShowRgbOnly : false,
                huePresets: [
                    { name: '红', value: 0 },
                    { name: '橙', value: 30 },
                    { name: '黄', value: 60 },
                    { name: '绿', value: 120 },
                    { name: '青', value: 180 },
                    { name: '蓝', value: 240 },
                    { name: '紫', value: 300 }
                ]
            };
        },

        computed: {
            hueSliderStyle() {
                return {
                    background: `linear-gradient(to right,
                        hsl(0, 100%, 50%),
                        hsl(60, 100%, 50%),
                        hsl(120, 100%, 50%),
                        hsl(180, 100%, 50%),
                        hsl(240, 100%, 50%),
                        hsl(300, 100%, 50%),
                        hsl(360, 100%, 50%))`
                };
            },

            gridStyle() {
                return {
                    gridTemplateColumns: `repeat(${this.gridSize}, 1fr)`,
                    gridTemplateRows: `repeat(${this.gridSize}, 1fr)`,
                    width: '520px',
                    height: '520px',
                    padding: '0',
                    gap: '0'
                };
            },

            effectiveHueTolerance() {
                return this.showHueToleranceControl ? this.hueTolerance : 15;
            },

            filteredColors() {
                const source = Array.isArray(this.colors) ? this.colors : [];
                return source.filter((color) => {
                    if (!color) return false;
                    if (this.showRgbToggle && this.showOnlyWithRGB && !color.hasValidRGB) {
                        return false;
                    }
                    if (!color.hsl || color.hsl.h === undefined) {
                        return false;
                    }
                    const hueDiff = Math.abs(color.hsl.h - this.selectedHue);
                    const inRange = Math.min(hueDiff, 360 - hueDiff) <= this.effectiveHueTolerance;
                    return inRange;
                });
            },

            colorGrid() {
                const grid = [];
                const colors = this.filteredColors;
                const tolerance = this.gridSize <= 5 ? 20 : this.gridSize <= 10 ? 15 : 10;

                for (let lIndex = 0; lIndex < this.gridSize; lIndex++) {
                    const row = [];
                    for (let sIndex = 0; sIndex < this.gridSize; sIndex++) {
                        const saturation = (sIndex / (this.gridSize - 1)) * 100;
                        const lightness = 100 - (lIndex / (this.gridSize - 1)) * 100;

                        const matchingColors = colors.filter((color) => {
                            if (!color.hsl) return false;
                            const sDiff = Math.abs(color.hsl.s - saturation);
                            const lDiff = Math.abs(color.hsl.l - lightness);
                            return sDiff <= tolerance && lDiff <= tolerance;
                        });

                        row.push({
                            saturation,
                            lightness,
                            colors: matchingColors
                        });
                    }
                    grid.push(row);
                }

                return grid;
            },

            colorsInHue() {
                return this.filteredColors;
            }
        },

        watch: {
            selectedColor: {
                immediate: true,
                handler(newVal) {
                    if (newVal && newVal.hsl && typeof newVal.hsl.h === 'number') {
                        this.selectedHue = Math.round(newVal.hsl.h);
                    }
                }
            }
        },

        methods: {
            getCellStyle(cell) {
                const bgColor = `hsl(${this.selectedHue}, ${cell.saturation}%, ${cell.lightness}%)`;
                return {
                    background: bgColor,
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    position: 'relative'
                };
            },

            getDotStyle(color, index, total) {
                const cellSize = 520 / this.gridSize;
                const dotSize = this.calculateDotSize(total, cellSize);
                const position = this.calculateDotPosition(index, total, dotSize, cellSize);
                const bgColor = this.getColorStyle(color);

                return {
                    width: `${dotSize}px`,
                    height: `${dotSize}px`,
                    background: bgColor || '#f5f5f5',
                    border: bgColor ? '2px solid white' : '2px dashed #999',
                    position: 'absolute',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    zIndex: 1
                };
            },

            calculateDotSize(total, cellSize) {
                if (total === 1) {
                    return Math.min(30, cellSize * 0.6);
                }
                if (total <= 4) {
                    return Math.min(20, cellSize * 0.4);
                }
                return Math.min(15, cellSize * 0.3);
            },

            calculateDotPosition(index, total, dotSize, cellSize) {
                const centerX = cellSize / 2;
                const centerY = cellSize / 2;

                if (total === 1) {
                    return {
                        x: centerX - dotSize / 2,
                        y: centerY - dotSize / 2
                    };
                }
                if (total <= 4) {
                    const row = Math.floor(index / 2);
                    const col = index % 2;
                    const spacing = cellSize * 0.25;
                    return {
                        x: centerX - dotSize + col * (dotSize + spacing / 2),
                        y: centerY - dotSize + row * (dotSize + spacing / 2)
                    };
                }

                const angle = (index / total) * Math.PI * 2;
                const radius = Math.min(20, cellSize * 0.3);
                return {
                    x: centerX + Math.cos(angle) * radius - dotSize / 2,
                    y: centerY + Math.sin(angle) * radius - dotSize / 2
                };
            },

            getCellTooltip(cell) {
                if (cell.colors.length === 0) {
                    return `S: ${Math.round(cell.saturation)}%, L: ${Math.round(cell.lightness)}%`;
                }
                return cell.colors.map(c => c.color_code).join(', ');
            },

            selectCell(cell) {
                if (cell.colors.length === 0) return;
                this.selectColor(cell.colors[0]);
            },

            selectColor(color) {
                this.$emit('select', color);
            },

            isSelected(color) {
                return this.selectedColor && this.selectedColor.id === color.id;
            },

            getColorStyle(color) {
                return helpers.getColorStyle(color);
            }
        }
    };

    window.ColorDictionaryViews = window.ColorDictionaryViews || {};
    window.ColorDictionaryViews.HslDictionaryView = HslDictionaryView;
})(window);
