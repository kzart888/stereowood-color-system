
(function (window) {
    const service = window.ColorDictionaryService;

    if (!service) {
        console.error('ColorDictionaryService is required for ColorDictionaryWheelView');
        return;
    }

    const ColorDictionaryWheelView = {
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
                <div class="wheel-colors-overlay" :style="{ pointerEvents: isDragging ? 'none' : 'auto' }">
                    <div
                        v-for="color in positionedColors"
                        :key="color.id"
                        class="wheel-color-dot"
                        :style="{
                            left: color.x + 'px',
                            top: color.y + 'px',
                            background: getColorStyle(color) || 'transparent',
                            pointerEvents: isDragging ? 'none' : 'auto'
                        }"
                        :class="{
                            'selected': isSelected(color),
                            'blank': !getColorStyle(color),
                            'matched': isMatched(color)
                        }"
                        @click="selectColor(color)"
                        :title="color.color_code + ' - ' + (color.color_name || '未命名')"
                    >
                        <span v-if="!getColorStyle(color)" class="blank-dot">无</span>
                    </div>
                </div>
                <div v-if="clickedPoint"
                     class="click-indicator"
                     :class="{ 'dragging': isDragging }"
                     :style="{
                         left: clickedPoint.x + 'px',
                         top: clickedPoint.y + 'px'
                     }"></div>
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
                <div class="control-row">
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
            }
        },

        data() {
            return {
                proximityRange: 15,
                showOnlyWithRGB: false,
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
                let filtered = this.colors || [];
                if (this.showOnlyWithRGB) {
                    filtered = filtered.filter((color) =>
                        color.rgb_r != null && color.rgb_g != null && color.rgb_b != null
                    );
                }
                return filtered;
            },

            positionedColors() {
                return this.visibleColors.map((color) => {
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
                if (!this.wheelCanvas) {
                    return;
                }
                this.ctx = this.wheelCanvas.getContext('2d');
                this.drawWheelBackground();
            },

            drawWheelBackground() {
                const ctx = this.ctx;
                if (!ctx) {
                    return;
                }
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
            },

            getColorStyle(color) {
                return service.getColorStyle(color);
            },

            selectColor(color) {
                this.$emit('select', color);
            },

            isSelected(color) {
                return this.selectedColor && this.selectedColor.id === color.id;
            },

            isMatched(color) {
                return this.matchedColors.some((candidate) => candidate.id === color.id);
            },

            handleMouseDown(event) {
                if (!this.wheelCanvas) {
                    return;
                }
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
                if (!this.isDragging || !this.clickedPoint || !this.wheelCanvas) {
                    return;
                }
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
                const saturation = Math.min(100, (distance / this.radius) * 100);
                const lightness = 50;

                const colorDefinition = {
                    hsl: { h: hue, s: saturation, l: lightness }
                };

                if (typeof hslToRgb === 'function') {
                    const rgb = hslToRgb(hue, saturation, lightness);
                    colorDefinition.rgb_r = rgb.r;
                    colorDefinition.rgb_g = rgb.g;
                    colorDefinition.rgb_b = rgb.b;
                }

                const enriched = service.enrichColor(colorDefinition);
                if (!enriched.hex) {
                    enriched.hex = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                }
                this.clickedColor = enriched;

                this.updateMatchedColors();
            },

            updateMatchedColors() {
                if (!this.clickedColor) {
                    this.matchedColors = [];
                    return;
                }
                const matched = [];
                this.visibleColors.forEach((color) => {
                    if (color.rgb_r == null || color.rgb_g == null || color.rgb_b == null) {
                        return;
                    }
                    const deltaE = service.calculateDeltaE(this.clickedColor, color);
                    if (deltaE <= this.proximityRange) {
                        matched.push({
                            ...color,
                            deltaE
                        });
                    }
                });
                matched.sort((a, b) => a.deltaE - b.deltaE);
                this.matchedColors = matched;
            }
        }
    };

    window.ColorDictionaryWheelView = ColorDictionaryWheelView;
})(window);
