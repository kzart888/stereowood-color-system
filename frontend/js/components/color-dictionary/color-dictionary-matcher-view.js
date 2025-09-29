(function (window) {
    const service = window.ColorDictionaryService;
    const converter = window.ColorConverter;

    if (!service) {
        console.error('ColorDictionaryService is required for ColorDictionaryMatcherView');
        return;
    }

    if (!converter) {
        console.error('ColorConverter utility is required for ColorDictionaryMatcherView');
        return;
    }

    const clamp = (value, min, max) => {
        if (!Number.isFinite(value)) return min;
        return Math.min(Math.max(value, min), max);
    };

    const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

    const normalizeHex = (value) => {
        if (!value && value !== 0) {
            return null;
        }
        const str = String(value).trim();
        if (!str) {
            return null;
        }
        const prefixed = str.startsWith('#') ? str : `#${str}`;
        if (converter.isValidHex && converter.isValidHex(prefixed)) {
            return prefixed.startsWith('#') ? prefixed.toUpperCase() : `#${prefixed.toUpperCase()}`;
        }
        return /^#?[0-9A-Fa-f]{6}$/.test(prefixed) ? (prefixed.startsWith('#') ? prefixed.toUpperCase() : `#${prefixed.toUpperCase()}`) : null;
    };

    const buildTargetColor = (rgb, hex, hsl) => {
        const { r, g, b } = rgb;
        const targetHex = normalizeHex(hex) || (converter.rgbToHex ? converter.rgbToHex(r, g, b) : null);
        const targetHsl = hsl && isFiniteNumber(hsl.h) && isFiniteNumber(hsl.s) && isFiniteNumber(hsl.l)
            ? { h: clamp(Math.round(hsl.h), 0, 360), s: clamp(Math.round(hsl.s), 0, 100), l: clamp(Math.round(hsl.l), 0, 100) }
            : (typeof rgbToHsl === 'function' ? rgbToHsl(r, g, b) : null);

        const target = {
            id: '__matcher_target__',
            rgb_r: r,
            rgb_g: g,
            rgb_b: b,
            rgb: { r, g, b },
            hex: targetHex,
            hex_color: targetHex ? targetHex.replace('#', '') : null,
            hsl: targetHsl || null
        };

        if (typeof rgbToLab === 'function') {
            target.lab = rgbToLab(r, g, b);
        }

        return target;
    };

    const fallbackDelta = (colorA, colorB) => {
        const a = service.enrichColor ? service.enrichColor(colorA) : colorA;
        const b = colorB;
        const rgbA = a && a.rgb ? a.rgb : null;
        const rgbB = b && b.rgb ? b.rgb : null;
        if (!rgbA || !rgbB) {
            return Number.POSITIVE_INFINITY;
        }
        const dr = rgbA.r - rgbB.r;
        const dg = rgbA.g - rgbB.g;
        const db = rgbA.b - rgbB.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    };

    const ColorDictionaryMatcherView = {
        template: `
        <div class="color-matcher-view">
            <div class="matcher-layout">
                <section class="matcher-input-panel">
                    <div class="matcher-header">
                        <div class="matcher-title">
                            <h3>色彩匹配</h3>
                            <p>输入任意颜色格式，自动换算其他数值并查找最接近的自配色。</p>
                        </div>
                        <div class="matcher-options">
                            <span>自动匹配</span>
                            <el-switch
                                v-model="autoUpdate"
                                size="small"
                                inline-prompt
                                active-text="开"
                                inactive-text="关"
                            ></el-switch>
                        </div>
                    </div>

                    <div class="matcher-preview" :class="{ 'is-empty': !hasValidRgb }">
                        <div class="preview-swatch" :style="previewStyle">
                            <span v-if="!hasValidRgb">待输入</span>
                        </div>
                        <div class="preview-info">
                            <div class="preview-hex" v-if="hasValidRgb">{{ displayHex }}</div>
                            <div class="preview-rgb" v-if="hasValidRgb">RGB {{ inputRgb.r }}, {{ inputRgb.g }}, {{ inputRgb.b }}</div>
                            <div class="preview-hsl" v-if="hasValidRgb && inputHsl">
                                HSL {{ inputHsl.h }}°, {{ inputHsl.s }}%, {{ inputHsl.l }}%
                            </div>
                            <div class="preview-empty" v-else>
                                支持 RGB / CMYK / HEX / HSL 任意组合输入。
                            </div>
                        </div>
                    </div>

                    <el-form label-position="top" class="matcher-form" @submit.prevent>
                        <div class="form-group">
                            <div class="form-group-header">
                                <h4>RGB</h4>
                                <small>0 - 255</small>
                            </div>
                            <div class="input-row">
                                <el-input-number
                                    v-model.number="inputRgb.r"
                                    :min="0"
                                    :max="255"
                                    :step="1"
                                    size="small"
                                    controls-position="right"
                                    @change="handleRgbChange"
                                    placeholder="R"
                                />
                                <el-input-number
                                    v-model.number="inputRgb.g"
                                    :min="0"
                                    :max="255"
                                    :step="1"
                                    size="small"
                                    controls-position="right"
                                    @change="handleRgbChange"
                                    placeholder="G"
                                />
                                <el-input-number
                                    v-model.number="inputRgb.b"
                                    :min="0"
                                    :max="255"
                                    :step="1"
                                    size="small"
                                    controls-position="right"
                                    @change="handleRgbChange"
                                    placeholder="B"
                                />
                            </div>
                        </div>

                        <div class="form-group">
                            <div class="form-group-header">
                                <h4>CMYK</h4>
                                <small>0 - 100</small>
                            </div>
                            <div class="input-row">
                                <el-input-number
                                    v-model.number="inputCmyk.c"
                                    :min="0"
                                    :max="100"
                                    :step="1"
                                    size="small"
                                    controls-position="right"
                                    @change="handleCmykChange"
                                    placeholder="C"
                                />
                                <el-input-number
                                    v-model.number="inputCmyk.m"
                                    :min="0"
                                    :max="100"
                                    :step="1"
                                    size="small"
                                    controls-position="right"
                                    @change="handleCmykChange"
                                    placeholder="M"
                                />
                                <el-input-number
                                    v-model.number="inputCmyk.y"
                                    :min="0"
                                    :max="100"
                                    :step="1"
                                    size="small"
                                    controls-position="right"
                                    @change="handleCmykChange"
                                    placeholder="Y"
                                />
                                <el-input-number
                                    v-model.number="inputCmyk.k"
                                    :min="0"
                                    :max="100"
                                    :step="1"
                                    size="small"
                                    controls-position="right"
                                    @change="handleCmykChange"
                                    placeholder="K"
                                />
                            </div>
                        </div>

                        <div class="form-group">
                            <div class="form-group-header">
                                <h4>HEX</h4>
                                <small>如 #FFAA00</small>
                            </div>
                            <el-input
                                v-model.trim="inputHex"
                                size="small"
                                placeholder="#000000"
                                @change="handleHexChange"
                                @blur="handleHexBlur"
                            />
                        </div>

                        <div class="form-group">
                            <div class="form-group-header">
                                <h4>HSL</h4>
                                <small>H: 0-360, S/L: 0-100</small>
                            </div>
                            <div class="input-row">
                                <el-input-number
                                    v-model.number="inputHsl.h"
                                    :min="0"
                                    :max="360"
                                    :step="1"
                                    size="small"
                                    controls-position="right"
                                    @change="handleHslChange"
                                    placeholder="H"
                                />
                                <el-input-number
                                    v-model.number="inputHsl.s"
                                    :min="0"
                                    :max="100"
                                    :step="1"
                                    size="small"
                                    controls-position="right"
                                    @change="handleHslChange"
                                    placeholder="S"
                                />
                                <el-input-number
                                    v-model.number="inputHsl.l"
                                    :min="0"
                                    :max="100"
                                    :step="1"
                                    size="small"
                                    controls-position="right"
                                    @change="handleHslChange"
                                    placeholder="L"
                                />
                            </div>
                        </div>
                    </el-form>

                    <div class="matcher-actions">
                        <div class="action-left">
                            <el-button
                                size="small"
                                type="default"
                                @click="resetInputs"
                            >清空输入</el-button>
                            <el-button
                                size="small"
                                type="primary"
                                :disabled="!hasValidRgb"
                                v-if="!autoUpdate"
                                @click="computeMatches"
                            >开始匹配</el-button>
                        </div>
                        <div class="action-right">
                            <span class="matches-count" v-if="matches.length">展示 {{ matches.length }} / {{ matchLimit }} 个候选</span>
                            <el-input-number
                                v-model.number="matchLimit"
                                size="small"
                                :min="3"
                                :max="24"
                                :step="1"
                                controls-position="right"
                                @change="handleLimitChange"
                                title="最多显示的候选颜色数量"
                            />
                        </div>
                    </div>

                    <el-alert
                        v-if="conversionMessage"
                        :title="conversionMessage"
                        type="warning"
                        show-icon
                        :closable="false"
                    ></el-alert>
                </section>

                <section class="matcher-results-panel">
                    <div class="results-header">
                        <h3>最近似的自配色</h3>
                        <span v-if="hasValidRgb && matches.length">ΔE 越小表示越接近</span>
                    </div>

                    <div class="results-empty" v-if="!hasValidRgb">
                        请输入任意颜色信息以获取匹配结果。
                    </div>
                    <div class="results-empty" v-else-if="hasValidRgb && matches.length === 0">
                        暂无可计算的候选颜色，请确认自配色信息是否包含 RGB 或 HEX 数据。
                    </div>

                    <div class="match-list" v-else>
                        <div
                            v-for="color in matches"
                            :key="color.id"
                            class="match-item"
                            :class="{ selected: isSelected(color) }"
                            role="button"
                            tabindex="0"
                            @click="selectColor(color)"
                            @keydown.enter.prevent="selectColor(color)"
                            @keydown.space.prevent="selectColor(color)"
                            @mouseenter="$emit('hover', color)"
                            @mouseleave="$emit('hover', null)"
                        >
                            <div class="match-preview" :class="{ blank: !getColorStyle(color) }" :style="getPreviewStyle(color)">
                                <span v-if="!getColorStyle(color)">空</span>
                            </div>
                            <div class="match-info">
                                <div class="match-title">
                                    <strong>{{ color.color_code || '未命名' }}</strong>
                                    <span class="match-category">{{ getCategoryName(color.category_id) }}</span>
                                </div>
                                <div class="match-meta">
                                    <span class="delta-pill">ΔE {{ formatDelta(color.deltaE) }}</span>
                                    <span v-if="color.rgb_r != null" class="match-values">RGB {{ color.rgb_r }}, {{ color.rgb_g }}, {{ color.rgb_b }}</span>
                                    <span v-if="getHexLabel(color)" class="match-hex">{{ getHexLabel(color) }}</span>
                                </div>
                                <div class="match-notes" v-if="color.formula">
                                    配方: {{ color.formula }}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
        `,
        props: {
            colors: {
                type: Array,
                default: () => []
            },
            categories: {
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
                inputRgb: { r: null, g: null, b: null },
                inputCmyk: { c: null, m: null, y: null, k: null },
                inputHex: '',
                inputHsl: { h: null, s: null, l: null },
                autoUpdate: true,
                activeRgb: null,
                matches: [],
                matchLimit: 10,
                conversionMessage: '',
                pendingCompute: null,
                lastSelectedColorId: null,
                _suspendInputs: false,
                _internalSelect: false
            };
        },
        computed: {
            hasValidRgb() {
                return !!(this.activeRgb && isFiniteNumber(this.activeRgb.r) && isFiniteNumber(this.activeRgb.g) && isFiniteNumber(this.activeRgb.b));
            },
            previewStyle() {
                if (!this.hasValidRgb) {
                    return {};
                }
                const { r, g, b } = this.activeRgb;
                return { background: `rgb(${r}, ${g}, ${b})` };
            },
            displayHex() {
                const hex = normalizeHex(this.inputHex);
                if (hex) {
                    return hex;
                }
                if (this.hasValidRgb && converter.rgbToHex) {
                    const { r, g, b } = this.activeRgb;
                    return converter.rgbToHex(r, g, b);
                }
                return '#------';
            }
        },
        watch: {
            colors() {
                if (this.hasValidRgb) {
                    this.scheduleCompute(true);
                }
            },
            autoUpdate(value) {
                if (value && this.hasValidRgb) {
                    this.scheduleCompute(true);
                }
            },
            selectedColor: {
                immediate: true,
                handler(newColor) {
                    if (!newColor || !newColor.id) {
                        return;
                    }
                    if (this._internalSelect && newColor.id === this.lastSelectedColorId) {
                        this._internalSelect = false;
                        return;
                    }
                    if (newColor.id !== this.lastSelectedColorId) {
                        this.lastSelectedColorId = newColor.id;
                    }
                    if (!this.hasValidRgb) {
                        this.initializeFromColor(newColor, true);
                    }
                }
            }
        },
        mounted() {
            if (!this.hasValidRgb && this.selectedColor) {
                this.initializeFromColor(this.selectedColor, false);
            }
        },
        beforeUnmount() {
            if (this.pendingCompute) {
                clearTimeout(this.pendingCompute);
                this.pendingCompute = null;
            }
        },
        methods: {
            handleRgbChange() {
                if (this._suspendInputs) {
                    return;
                }
                const { r, g, b } = this.inputRgb;
                if (!isFiniteNumber(r) || !isFiniteNumber(g) || !isFiniteNumber(b)) {
                    this.conversionMessage = '请补全 RGB 数值';
                    return;
                }
                this.applyRgb({ r, g, b }, 'rgb');
            },
            handleCmykChange() {
                if (this._suspendInputs) {
                    return;
                }
                const { c, m, y, k } = this.inputCmyk;
                if (!isFiniteNumber(c) || !isFiniteNumber(m) || !isFiniteNumber(y) || !isFiniteNumber(k)) {
                    this.conversionMessage = '请补全 CMYK 数值';
                    return;
                }
                if (converter.isValidCMYK && !converter.isValidCMYK(c, m, y, k)) {
                    this.conversionMessage = 'CMYK 数值范围应在 0-100';
                    return;
                }
                const rgb = converter.cmykToRgb(c, m, y, k);
                if (!rgb) {
                    this.conversionMessage = '无法将该 CMYK 转换为 RGB';
                    return;
                }
                this.applyRgb(rgb, 'cmyk');
            },
            handleHexChange() {
                if (this._suspendInputs) {
                    return;
                }
                if (!this.inputHex) {
                    this.conversionMessage = '请输入 HEX 色值';
                    return;
                }
                const normalized = normalizeHex(this.inputHex);
                if (!normalized) {
                    this.conversionMessage = 'HEX 格式应为 #RRGGBB';
                    return;
                }
                if (!converter.hexToRgb) {
                    this.conversionMessage = '缺少 HEX 转换函数';
                    return;
                }
                const rgb = converter.hexToRgb(normalized);
                if (!rgb) {
                    this.conversionMessage = '无法解析该 HEX 色值';
                    return;
                }
                this.applyRgb(rgb, 'hex');
            },
            handleHexBlur() {
                if (!this.inputHex) {
                    return;
                }
                const normalized = normalizeHex(this.inputHex);
                if (normalized) {
                    this.suspendInputs(() => {
                        this.inputHex = normalized;
                    });
                }
            },
            handleHslChange() {
                if (this._suspendInputs) {
                    return;
                }
                const { h, s, l } = this.inputHsl;
                if (!isFiniteNumber(h) || !isFiniteNumber(s) || !isFiniteNumber(l)) {
                    this.conversionMessage = '请补全 HSL 数值';
                    return;
                }
                const clampedH = clamp(h, 0, 360);
                const clampedS = clamp(s, 0, 100);
                const clampedL = clamp(l, 0, 100);
                if (typeof hslToRgb !== 'function') {
                    this.conversionMessage = '缺少 HSL 转换函数';
                    return;
                }
                const rgb = hslToRgb(clampedH, clampedS, clampedL);
                if (!rgb) {
                    this.conversionMessage = '无法将该 HSL 转换为 RGB';
                    return;
                }
                this.applyRgb(rgb, 'hsl', { h: clampedH, s: clampedS, l: clampedL });
            },
            handleLimitChange() {
                if (this.matches.length > this.matchLimit) {
                    this.matches = this.matches.slice(0, this.matchLimit);
                }
                if (this.hasValidRgb) {
                    this.scheduleCompute(true);
                }
            },
            resetInputs() {
                this.suspendInputs(() => {
                    this.inputRgb = { r: null, g: null, b: null };
                    this.inputCmyk = { c: null, m: null, y: null, k: null };
                    this.inputHex = '';
                    this.inputHsl = { h: null, s: null, l: null };
                });
                this.activeRgb = null;
                this.matches = [];
                this.conversionMessage = '';
                this.$emit('hover', null);
            },
            applyRgb(rgb, source, providedHsl = null) {
                const sanitized = {
                    r: clamp(Math.round(rgb.r), 0, 255),
                    g: clamp(Math.round(rgb.g), 0, 255),
                    b: clamp(Math.round(rgb.b), 0, 255)
                };

                this.activeRgb = sanitized;
                this.conversionMessage = '';

                const hex = converter.rgbToHex ? converter.rgbToHex(sanitized.r, sanitized.g, sanitized.b) : null;
                const cmyk = converter.rgbToCmyk ? converter.rgbToCmyk(sanitized.r, sanitized.g, sanitized.b) : null;
                const hsl = providedHsl || (typeof rgbToHsl === 'function' ? rgbToHsl(sanitized.r, sanitized.g, sanitized.b) : null);

                this.suspendInputs(() => {
                    this.inputRgb = { ...sanitized };
                    this.inputHex = hex || normalizeHex(this.inputHex) || '';
                    this.inputCmyk = cmyk ? { c: cmyk.c, m: cmyk.m, y: cmyk.y, k: cmyk.k } : { c: null, m: null, y: null, k: null };
                    this.inputHsl = hsl ? { h: hsl.h, s: hsl.s, l: hsl.l } : { h: null, s: null, l: null };
                });

                if (this.autoUpdate) {
                    this.scheduleCompute(false);
                }
            },
            scheduleCompute(force) {
                if (!this.hasValidRgb) {
                    return;
                }
                if (!this.autoUpdate && !force) {
                    return;
                }
                if (this.pendingCompute) {
                    clearTimeout(this.pendingCompute);
                }
                const delay = force ? 0 : 120;
                this.pendingCompute = setTimeout(() => {
                    this.pendingCompute = null;
                    this.computeMatches();
                }, delay);
            },
            computeMatches() {
                if (!this.hasValidRgb) {
                    this.matches = [];
                    return;
                }
                const hex = converter.rgbToHex ? converter.rgbToHex(this.activeRgb.r, this.activeRgb.g, this.activeRgb.b) : null;
                const target = buildTargetColor(this.activeRgb, hex, this.inputHsl);

                const pool = Array.isArray(this.colors) ? this.colors : [];
                const results = [];

                pool.forEach((color) => {
                    if (!color) {
                        return;
                    }
                    const delta = service.calculateDeltaE
                        ? service.calculateDeltaE(target, color)
                        : fallbackDelta(target, color);
                    if (!Number.isFinite(delta)) {
                        return;
                    }
                    results.push({
                        ...color,
                        deltaE: Math.round(delta * 100) / 100
                    });
                });

                results.sort((a, b) => a.deltaE - b.deltaE);
                this.matches = results.slice(0, this.matchLimit);

                if (this.matches.length > 0) {
                    const hasSelected = this.selectedColor && this.selectedColor.id && this.matches.some(candidate => candidate.id === this.selectedColor.id);
                    if (!hasSelected) {
                        const primary = this.matches[0];
                        if (primary && primary.id) {
                            this._internalSelect = true;
                            this.lastSelectedColorId = primary.id;
                            this.$emit('select', primary);
                        }
                    }
                }
            },
            initializeFromColor(color, immediate) {
                if (!color) {
                    return;
                }
                const enriched = service.enrichColor ? service.enrichColor(color) : color;
                let rgb = null;

                if (enriched.rgb && isFiniteNumber(enriched.rgb.r) && isFiniteNumber(enriched.rgb.g) && isFiniteNumber(enriched.rgb.b)) {
                    rgb = enriched.rgb;
                } else if (isFiniteNumber(enriched.rgb_r) && isFiniteNumber(enriched.rgb_g) && isFiniteNumber(enriched.rgb_b)) {
                    rgb = { r: enriched.rgb_r, g: enriched.rgb_g, b: enriched.rgb_b };
                } else if (enriched.hex || enriched.hex_color) {
                    const candidateHex = normalizeHex(enriched.hex || enriched.hex_color);
                    if (candidateHex && converter.hexToRgb) {
                        rgb = converter.hexToRgb(candidateHex);
                    }
                }

                if (!rgb) {
                    return;
                }

                this.applyRgb(rgb, 'external', enriched.hsl || null);
                if (immediate) {
                    this.scheduleCompute(true);
                }
            },
            selectColor(color) {
                if (!color || !color.id) {
                    return;
                }
                this._internalSelect = true;
                this.lastSelectedColorId = color.id;
                this.$emit('select', color);
            },
            getColorStyle(color) {
                if (!color) {
                    return null;
                }
                if (service.getColorStyle) {
                    return service.getColorStyle(color);
                }
                if (color.hex) {
                    return color.hex;
                }
                if (color.hex_color) {
                    return color.hex_color.startsWith('#') ? color.hex_color : `#${color.hex_color}`;
                }
                if (isFiniteNumber(color.rgb_r) && isFiniteNumber(color.rgb_g) && isFiniteNumber(color.rgb_b)) {
                    return `rgb(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b})`;
                }
                return null;
            },
            getPreviewStyle(color) {
                const background = this.getColorStyle(color);
                return background ? { background } : {};
            },
            getCategoryName(categoryId) {
                if (service.getCategoryName) {
                    return service.getCategoryName(this.categories || [], categoryId);
                }
                return '';
            },
            getHexLabel(color) {
                if (!color) {
                    return '';
                }
                if (color.hex) {
                    return color.hex;
                }
                if (color.hex_color) {
                    return color.hex_color.startsWith('#') ? color.hex_color : `#${color.hex_color}`;
                }
                return '';
            },
            formatDelta(value) {
                if (!Number.isFinite(value)) {
                    return '--';
                }
                return value.toFixed(2);
            },
            isSelected(color) {
                if (!color || !this.selectedColor) {
                    return false;
                }
                return this.selectedColor.id === color.id;
            },
            suspendInputs(fn) {
                this._suspendInputs = true;
                try {
                    fn();
                } finally {
                    this._suspendInputs = false;
                }
            }
        }
    };

    window.ColorDictionaryMatcherView = ColorDictionaryMatcherView;
})(window);

