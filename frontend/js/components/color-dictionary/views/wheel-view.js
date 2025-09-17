(function(window) {
    'use strict';

    const helpers = window.ColorDictionaryHelpers || { getColorStyle: () => null };
    const processing = window.ColorProcessingUtils || {};

    const WheelDictionaryView = {
        name: 'WheelDictionaryView',
        template: `
        <div class="color-wheel-view">
            <div class="wheel-container" :class="{ 'dragging': isDragging }">
                <canvas
                    ref="wheelCanvas"
                    width="600"
                    height="600"
                    class="wheel-canvas"
                    @mousedown="handleMouseDown"
                    @mousemove="handleMouseMove"
                    @mouseup="handleMouseUp"
                    @mouseleave="handleMouseLeave"
                ></canvas>
                <div class="wheel-colors-overlay" :style="{ pointerEvents: isDragging ? 'none' : 'none' }">
                    <div
                        v-for="color in positionedColors"
                        :key="color.id"
                        class="wheel-color-dot"
                        :style="{
                            left: color.x + 'px',
                            top: color.y + 'px',
                            background: getColorStyle(color) || 'transparent',
                            pointerEvents: isDragging ? 'none' : 'all'
                        }"
                        :class="{
                            'selected': isSelected(color),
                            'blank': !getColorStyle(color),
                            'matched': isMatched(color)
                        }"
                        @click="selectColor(color)"
                        :title="color.color_code + ' - ' + (color.color_name || '')"
                    >
                        <span v-if="!getColorStyle(color)" class="blank-dot">×</span>
                    </div>
                </div>
                <div v-if="clickedPoint"
                     class="click-indicator"
                     :class="{ 'dragging': isDragging }"
                     :style="{
                         left: clickedPoint.x + 'px',
                         top: clickedPoint.y + 'px'
                     }">
                </div>
            </div>
            <div class="wheel-controls">
                <div class="control-row">
                    <label>邻近范围 (ΔE): {{ proximityRange }}</label>
                    <el-slider
                        v-model="proximityRange"
                        :min="0"
                        :max="50"
                        :step="1"
                    ></el-slider>
                </div>
                <div class="control-row" v-if="showRgbToggle">
                    <el-checkbox v-model="showOnlyWithRGB">
                        仅显示有RGB数据的颜色
                    </el-checkbox>
                </div>
                <div class="stats">
                    显示 {{ visibleColors.length }} / {{ colors.length }} 个颜色
                    <span v-if="matchedColors.length > 0">
                        | 命中 {{ matchedColors.length }} 个颜色
                    </span>
                </div>
            </div>

            <div class="matched-colors-section" v-if="matchedColors.length > 0">
                <h4>命中颜色 (ΔE ≤ {{ proximityRange }})</h4>
                <div class="color-chips">
                    <div
                        v-for="color in matchedColors"
                        :key="color.id"
                        class="color-chip-80"
                        @click="selectColor(color)"
                        :class="{ 'selected': isSelected(color) }"
                    >
                        <div class="color-preview"
                             :class="{ 'blank-color': !getColorStyle(color) }"
                             :style="getColorStyle(color) ? { background: getColorStyle(color) } : {}">
                            <span v-if="!getColorStyle(color)" class="blank-text">无</span>
                        </div>
                        <div class="color-code">{{ color.color_code }}</div>
                        <div class="delta-e-value">ΔE: {{ color.deltaE.toFixed(1) }}</div>
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
                default: true
            },
            initialShowRgbOnly: {
                type: Boolean,
                default: false
            },
            initialProximityRange: {
                type: Number,
                default: 15
            },
            deltaEAlgorithm: {
                type: String,
                default: '2000'
            }
        },

        data() {
            return {
                proximityRange: this.initialProximityRange,
                showOnlyWithRGB: this.showRgbToggle ? this.initialShowRgbOnly : false,
                ctx: null,
                centerX: 300,
                centerY: 300,
                radius: 270,
                clickedPoint: null,
                clickedColor: null,
                matchedColors: [],
                isDragging: false,
                dragStart: null
            };
        },

        computed: {
            visibleColors() {
                const source = Array.isArray(this.colors) ? this.colors : [];
                if (this.showRgbToggle && this.showOnlyWithRGB) {
                    return source.filter((c) => c && (c.hasValidRGB || (c.rgb_r != null && c.rgb_g != null && c.rgb_b != null)));
                }
                return source;
            },

            positionedColors() {
                return this.visibleColors.map(color => {
                    if (!color.hsl || color.hsl.h === undefined) {
                        return {
                            ...color,
                            x: this.centerX + (Math.random() - 0.5) * 40,
                            y: this.centerY + (Math.random() - 0.5) * 40
                        };
                    }

                    const angle = (color.hsl.h * Math.PI) / 180;
                    const distance = (color.hsl.s / 100) * this.radius * 0.9;

                    return {
                        ...color,
                        x: this.centerX + Math.cos(angle) * distance,
                        y: this.centerY + Math.sin(angle) * distance
                    };
                });
            }
        },

        watch: {
            proximityRange() {
                if (this.clickedColor) {
                    this.updateMatchedColors();
                }
            }
        },

        mounted() {
            this.$nextTick(() => {
                this.initWheel();
            });
        },

        methods: {
            initWheel() {
                this.wheelCanvas = this.$refs.wheelCanvas;
                if (!this.wheelCanvas) return;

                this.ctx = this.wheelCanvas.getContext('2d');
                this.drawWheelBackground();
            },

            drawWheelBackground() {
                const ctx = this.ctx;
                if (!ctx) return;

                ctx.clearRect(0, 0, 600, 600);

                for (let angle = 0; angle < 360; angle += 2) {
                    const startAngle = (angle - 1) * Math.PI / 180;
                    const endAngle = (angle + 1) * Math.PI / 180;

                    const gradient = ctx.createRadialGradient(
                        this.centerX, this.centerY, 0,
                        this.centerX, this.centerY, this.radius
                    );

                    gradient.addColorStop(0, `hsl(${angle}, 0%, 50%)`);
                    gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);

                    ctx.beginPath();
                    ctx.moveTo(this.centerX, this.centerY);
                    ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle);
                    ctx.closePath();
                    ctx.fillStyle = gradient;
                    ctx.fill();
                }

                ctx.strokeStyle = '#ccc';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, this.radius, 0, 2 * Math.PI);
                ctx.stroke();
            },

            selectColor(color) {
                this.$emit('select', color);
            },

            isSelected(color) {
                return this.selectedColor && this.selectedColor.id === color.id;
            },

            getColorStyle(color) {
                return helpers.getColorStyle(color);
            },

            handleMouseDown(event) {
                const rect = this.wheelCanvas.getBoundingClientRect();
                const scaleX = this.wheelCanvas.width / rect.width;
                const scaleY = this.wheelCanvas.height / rect.height;

                const x = (event.clientX - rect.left) * scaleX;
                const y = (event.clientY - rect.top) * scaleY;

                const dx = x - this.centerX;
                const dy = y - this.centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > this.radius) {
                    this.clickedPoint = null;
                    this.clickedColor = null;
                    this.matchedColors = [];
                    return;
                }

                this.clickedPoint = { x, y };
                this.isDragging = true;
                this.dragStart = { x: event.clientX, y: event.clientY };

                this.updateColorAtPosition(x, y);
            },

            handleMouseMove(event) {
                if (!this.isDragging || !this.clickedPoint) return;

                const rect = this.wheelCanvas.getBoundingClientRect();
                const scaleX = this.wheelCanvas.width / rect.width;
                const scaleY = this.wheelCanvas.height / rect.height;

                const x = (event.clientX - rect.left) * scaleX;
                const y = (event.clientY - rect.top) * scaleY;

                const dx = x - this.centerX;
                const dy = y - this.centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= this.radius) {
                    this.clickedPoint = { x, y };
                    this.updateColorAtPosition(x, y);
                }
            },

            handleMouseUp() {
                this.isDragging = false;
                this.dragStart = null;
            },

            handleMouseLeave() {
                this.isDragging = false;
                this.dragStart = null;
            },

            updateColorAtPosition(x, y) {
                const dx = x - this.centerX;
                const dy = y - this.centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const angle = Math.atan2(dy, dx);
                const hue = (angle * 180 / Math.PI + 360) % 360;
                const saturation = (distance / this.radius) * 100;
                const lightness = 50;

                const rgb = typeof this.hslToRgb === 'function'
                    ? this.hslToRgb(hue / 360, saturation / 100, lightness / 100)
                    : this.hslToRgbLocal(hue / 360, saturation / 100, lightness / 100);

                this.clickedColor = {
                    hsl: { h: hue, s: saturation, l: lightness },
                    rgb_r: Math.round(rgb.r * 255),
                    rgb_g: Math.round(rgb.g * 255),
                    rgb_b: Math.round(rgb.b * 255)
                };

                this.updateMatchedColors();
                this.drawClickIndicator();
            },

            updateMatchedColors() {
                if (!this.clickedColor) {
                    this.matchedColors = [];
                    return;
                }

                const algorithm = this.deltaEAlgorithm;
                const matched = [];

                for (const color of this.visibleColors) {
                    if (!color) continue;
                    const deltaE = this.calculateDeltaE(this.clickedColor, color, algorithm);
                    if (Number.isFinite(deltaE) && deltaE <= this.proximityRange) {
                        matched.push({
                            ...color,
                            deltaE
                        });
                    }
                }

                matched.sort((a, b) => a.deltaE - b.deltaE);
                this.matchedColors = matched;
            },

            isMatched(color) {
                return this.matchedColors.some(m => m.id === color.id);
            },

            calculateDeltaE(color1, color2, algorithm) {
                if (processing && typeof processing.calculateDeltaE === 'function') {
                    return processing.calculateDeltaE(color1, color2, { algorithm });
                }
                return this.calculateDeltaEFallback(color1, color2);
            },

            calculateDeltaEFallback(color1, color2) {
                const r1 = color1.rgb_r || 0;
                const g1 = color1.rgb_g || 0;
                const b1 = color1.rgb_b || 0;
                const r2 = color2.rgb_r || 0;
                const g2 = color2.rgb_g || 0;
                const b2 = color2.rgb_b || 0;
                const dr = r1 - r2;
                const dg = g1 - g2;
                const db = b1 - b2;
                return Math.sqrt(dr * dr + dg * dg + db * db) * 0.4;
            },

            hslToRgbLocal(h, s, l) {
                let r, g, b;
                if (s === 0) {
                    r = g = b = l;
                } else {
                    const hue2rgb = (p, q, t) => {
                        if (t < 0) t += 1;
                        if (t > 1) t -= 1;
                        if (t < 1/6) return p + (q - p) * 6 * t;
                        if (t < 1/2) return q;
                        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                        return p;
                    };

                    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    const p = 2 * l - q;
                    r = hue2rgb(p, q, h + 1/3);
                    g = hue2rgb(p, q, h);
                    b = hue2rgb(p, q, h - 1/3);
                }
                return { r, g, b };
            },

            hslToRgb(h, s, l) {
                if (typeof window.hslToRgb === 'function') {
                    const value = window.hslToRgb(h * 360, s * 100, l * 100);
                    return {
                        r: value.r / 255,
                        g: value.g / 255,
                        b: value.b / 255
                    };
                }
                return this.hslToRgbLocal(h, s, l);
            },

            drawClickIndicator() {
                if (this.ctx) {
                    this.drawWheelBackground();
                }
            }
        }
    };

    window.ColorDictionaryViews = window.ColorDictionaryViews || {};
    window.ColorDictionaryViews.WheelDictionaryView = WheelDictionaryView;
})(window);
