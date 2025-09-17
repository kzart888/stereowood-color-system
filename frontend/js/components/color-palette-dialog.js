/**
 * Color Palette Dialog Component
 * Advanced color selection dialog with HSL and Color Wheel views
 */

const paletteDebug = (...args) => {
    if (typeof window !== 'undefined' && window.__DEBUG__) {
        console.log(...args);
    }
};

// Forward declare the component, we'll add child components later
const ColorPaletteDialog = {
    template: `
        <el-dialog
            v-model="dialogVisible"
            width="90%"
            :custom-class="'color-palette-dialog'"
            :close-on-click-modal="false"
            :destroy-on-close="true"
            @close="handleClose"
            :fullscreen="isMobile"
        >
            <!-- Custom Header -->
            <template #header>
                <div class="dialog-header-custom">
                    <div class="header-row-top">
                        <h3 class="dialog-title">{{ title }}</h3>
                        <div class="header-actions">
                            <el-button 
                                type="primary" 
                                @click="handleConfirm"
                                :disabled="!selectedColor"
                                size="small"
                            >
                                确定选择
                            </el-button>
                            <el-button 
                                @click="showHelp = true" 
                                circle 
                                size="small"
                                icon="el-icon-question"
                                title="使用帮助"
                            >
                            </el-button>
                            <el-button 
                                @click="handleClose" 
                                circle 
                                size="small"
                                icon="el-icon-close"
                                title="关闭"
                            >
                            </el-button>
                        </div>
                    </div>
                    
                    <!-- Integrated Color Info Panel -->
                    <div class="header-color-info" v-if="hoveredColor || selectedColor">
                        <div class="color-preview-header"
                             :style="{ backgroundColor: getColorStyle(hoveredColor || selectedColor) }">
                        </div>
                        <div class="color-details-header">
                            <div class="color-name-row">
                                <strong>{{ (hoveredColor || selectedColor).name }}</strong>
                                <span class="color-code-header">{{ (hoveredColor || selectedColor).color_code }}</span>
                            </div>
                            <div class="color-values-row">
                                <span v-if="(hoveredColor || selectedColor).rgb">
                                    RGB: {{ formatRgb((hoveredColor || selectedColor).rgb) }}
                                </span>
                                <span v-if="(hoveredColor || selectedColor).cmyk_c">
                                    CMYK: {{ formatCmyk(hoveredColor || selectedColor) }}
                                </span>
                                <span v-if="(hoveredColor || selectedColor).hsl">
                                    HSL: {{ formatHsl((hoveredColor || selectedColor).hsl) }}
                                </span>
                                <span v-if="(hoveredColor || selectedColor).hex_color">
                                    HEX: {{ (hoveredColor || selectedColor).hex_color }}
                                </span>
                                <span v-if="(hoveredColor || selectedColor).pantone">
                                    Pantone: {{ (hoveredColor || selectedColor).pantone }}
                                </span>
                            </div>
                            <div class="color-formula-row" v-if="(hoveredColor || selectedColor).formula">
                                配方: {{ (hoveredColor || selectedColor).formula }}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tab Navigation in Header -->
                    <div class="header-tabs">
                        <el-tabs v-model="activeTab" type="card">
                            <el-tab-pane label="HSL色彩空间" name="hsl"></el-tab-pane>
                            <el-tab-pane label="色轮导航" name="wheel"></el-tab-pane>
                            <el-tab-pane label="列表视图" name="list"></el-tab-pane>
                        </el-tabs>
                    </div>
                </div>
            </template>
            
            <!-- Tab Content -->
            <div class="color-palette-tabs">
                <hsl-color-space-view
                    v-if="activeTab === 'hsl'"
                    :colors="enrichedColors"
                    :selected-color="selectedColor"
                    :show-rgb-toggle="true"
                    :show-hue-tolerance-control="true"
                    :initial-hue-tolerance="viewPreferences.hueTolerance"
                    :initial-show-rgb-only="viewPreferences.onlyShowRgb"
                    :default-grid-size="viewPreferences.hslGridSize"
                    @select="handleColorSelect"
                    @hover="handleColorHover"
                />
                
                <color-wheel-view
                    v-if="activeTab === 'wheel'"
                    :colors="enrichedColors"
                    :selected-color="selectedColor"
                    :show-rgb-toggle="true"
                    :initial-show-rgb-only="viewPreferences.onlyShowRgb"
                    :initial-proximity-range="viewPreferences.wheelProximity"
                    :delta-e-algorithm="'2000'"
                    @select="handleColorSelect"
                    @hover="handleColorHover"
                />
                
                <enhanced-list-view
                    v-if="activeTab === 'list'"
                    :colors="enrichedColors"
                    :categories="categories"
                    :selected-color-id="selectedColor ? selectedColor.id : null"
                    :enable-advanced-controls="true"
                    :default-view-mode="viewPreferences.listViewMode"
                    :show-rgb-filter="true"
                    :show-search="true"
                    :default-page-size="viewPreferences.listPageSize"
                    :sort-mode="viewPreferences.categorySort"
                    @select="handleColorSelect"
                    @hover="handleColorHover"
                />
            </div>
            
            <!-- Help Dialog -->
            <el-dialog
                v-model="showHelp"
                title="使用帮助"
                width="600px"
                append-to-body
            >
                <div class="help-content">
                    <h4>HSL色彩空间</h4>
                    <ul>
                        <li>拖动色相滑块选择基础颜色</li>
                        <li>在饱和度-亮度网格中查找颜色</li>
                        <li>点击网格单元或颜色块选择颜色</li>
                        <li>调整网格密度获得更精确的定位</li>
                    </ul>
                    
                    <h4>色轮导航</h4>
                    <ul>
                        <li>点击色轮上任意位置选择颜色</li>
                        <li>调整距离容差查找相似颜色</li>
                        <li>颜色会根据实际位置显示在色轮上</li>
                        <li>鼠标悬停查看颜色信息</li>
                    </ul>
                    
                    <h4>列表视图</h4>
                    <ul>
                        <li>支持网格、列表、紧凑三种显示模式</li>
                        <li>可按名称、色相、饱和度、亮度排序</li>
                        <li>使用搜索框快速查找颜色</li>
                        <li>按类别筛选颜色</li>
                    </ul>
                    
                    <h4>快捷键</h4>
                    <ul>
                        <li><kbd>ESC</kbd> - 取消选择或关闭对话框</li>
                        <li><kbd>Enter</kbd> - 确认选择</li>
                        <li>点击空白处 - 取消当前选择</li>
                    </ul>
                </div>
            </el-dialog>
        </el-dialog>
    `,
    
    props: {
        visible: {
            type: Boolean,
            default: false
        },
        colors: {
            type: Array,
            default: () => []
        },
        categories: {
            type: Array,
            default: () => []
        },
        title: {
            type: String,
            default: '自配色列表 - 高级选择器'
        },
        initialColor: {
            type: Object,
            default: null
        }
    },
    
    data() {
        return {
            dialogVisible: this.visible,
            activeTab: 'hsl',
            selectedColor: this.initialColor,
            hoveredColor: null,
            enrichedColors: [],
            isMobile: window.innerWidth < 768,
            showHelp: false,
            viewPreferences: {
                hslGridSize: 10,
                hueTolerance: 15,
                onlyShowRgb: false,
                wheelProximity: 15,
                listViewMode: 'grid',
                listPageSize: 24,
                categorySort: 'name'
            }
        };
    },
    
    watch: {
        visible(val) {
            this.dialogVisible = val;
            if (val && this.colors && this.colors.length > 0) {
                this.enrichColors();
            }
        },
        
        dialogVisible(val) {
            this.$emit('update:visible', val);
        },
        
        colors: {
            handler(newColors) {
                if (newColors && newColors.length > 0) {
                    this.enrichColors();
                }
            },
            deep: true
        }
    },
    
    created() {
        paletteDebug('ColorPaletteDialog created');
        paletteDebug('Initial visible:', this.visible);
        paletteDebug('Initial colors:', this.colors?.length);
    },
    
    mounted() {
        paletteDebug('ColorPaletteDialog mounted');
        if (this.colors && this.colors.length > 0) {
            this.enrichColors();
        }
        this.handleResize();
        window.addEventListener('resize', this.handleResize);
        // Add ESC key handler
        window.addEventListener('keydown', this.handleKeyDown);
        // Add click outside handler (delayed to avoid immediate trigger)
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside);
        }, 100);
    },
    
    beforeDestroy() {
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('click', this.handleClickOutside);
    },
    
    methods: {
        // Enrich colors with calculated properties
        enrichColors() {
            const utils = window.ColorProcessingUtils;
            paletteDebug('Enriching palette colors', this.colors ? this.colors.length : 0);

            if (!Array.isArray(this.colors) || this.colors.length === 0) {
                this.enrichedColors = [];
                return;
            }

            if (utils && typeof utils.enrichColors === 'function') {
                const fallback = (categoryId) => {
                    if (utils && typeof utils.getDefaultColorForCategory === 'function') {
                        return utils.getDefaultColorForCategory(categoryId);
                    }
                    return null;
                };

                this.enrichedColors = utils.enrichColors(this.colors, {
                    fallbackByCategory: fallback
                });
                return;
            }

            const categoryColors = {
                1: { r: 70, g: 130, b: 180 },
                2: { r: 255, g: 215, b: 0 },
                3: { r: 220, g: 20, b: 60 },
                4: { r: 34, g: 139, b: 34 },
                5: { r: 128, g: 0, b: 128 },
                6: { r: 139, g: 69, b: 19 },
                7: { r: 255, g: 140, b: 0 }
            };

            this.enrichedColors = this.colors.map((color, index) => {
                const enriched = { ...color };

                try {
                    const hasHex = color.hex_color && color.hex_color !== '未填写';
                    const normalizedHex = hasHex
                        ? (color.hex_color.startsWith('#') ? color.hex_color : `#${color.hex_color}`)
                        : null;

                    if (normalizedHex && typeof hexToRgb === 'function') {
                        const rgb = hexToRgb(normalizedHex);
                        enriched.rgb = rgb;
                        enriched.hex = normalizedHex;
                        enriched.hsl = typeof rgbToHsl === 'function' ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
                        enriched.lab = typeof rgbToLab === 'function' ? rgbToLab(rgb.r, rgb.g, rgb.b) : null;
                        enriched.hasValidRGB = true;
                    } else if (color.rgb_r != null && color.rgb_g != null && color.rgb_b != null) {
                        const r = parseInt(color.rgb_r, 10) || 0;
                        const g = parseInt(color.rgb_g, 10) || 0;
                        const b = parseInt(color.rgb_b, 10) || 0;
                        enriched.rgb = { r, g, b };
                        enriched.hex = typeof rgbToHex === 'function' ? rgbToHex(r, g, b) : null;
                        enriched.hsl = typeof rgbToHsl === 'function' ? rgbToHsl(r, g, b) : null;
                        enriched.lab = typeof rgbToLab === 'function' ? rgbToLab(r, g, b) : null;
                        enriched.hasValidRGB = true;
                    } else {
                        const fallbackColor = categoryColors[color.category_id] || { r: 128, g: 128, b: 128 };
                        enriched.rgb = fallbackColor;
                        enriched.hex = typeof rgbToHex === 'function' ? rgbToHex(fallbackColor.r, fallbackColor.g, fallbackColor.b) : '#808080';
                        enriched.hsl = typeof rgbToHsl === 'function' ? rgbToHsl(fallbackColor.r, fallbackColor.g, fallbackColor.b) : null;
                        enriched.lab = typeof rgbToLab === 'function' ? rgbToLab(fallbackColor.r, fallbackColor.g, fallbackColor.b) : null;
                        enriched.hasValidRGB = false;
                    }

                    if (!enriched.name) {
                        enriched.name = color.color_code || color.color_name || `Color ${index + 1}`;
                    }
                } catch (error) {
                    console.error('Error enriching color:', error);
                    enriched.rgb = { r: 128, g: 128, b: 128 };
                    enriched.hsl = { h: 0, s: 0, l: 50 };
                    enriched.lab = { L: 50, a: 0, b: 0 };
                    enriched.hex = '#808080';
                    enriched.hasValidRGB = false;
                }

                return enriched;
            });
        },
        // Extract dominant color from image
        async extractColorFromImage(imagePath) {
            return new Promise((resolve) => {
                // Skip if no image path
                if (!imagePath) {
                    resolve({ r: 128, g: 128, b: 128 });
                    return;
                }
                
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = 1;
                        canvas.height = 1;
                        
                        // Draw scaled down image
                        ctx.drawImage(img, 0, 0, 1, 1);
                        
                        // Get pixel data
                        const pixel = ctx.getImageData(0, 0, 1, 1).data;
                        resolve({
                            r: pixel[0],
                            g: pixel[1],
                            b: pixel[2]
                        });
                    } catch (error) {
                        // Canvas error, return default
                        resolve({ r: 128, g: 128, b: 128 });
                    }
                };
                
                img.onerror = () => {
                    // Default gray if image fails to load
                    resolve({ r: 128, g: 128, b: 128 });
                };
                
                // Build proper image URL
                const baseUrl = window.location.origin;
                // Ensure path starts with / or uploads/
                let fullPath = imagePath;
                if (!imagePath.startsWith('http')) {
                    if (!imagePath.startsWith('/')) {
                        fullPath = '/' + imagePath;
                    }
                    img.src = `${baseUrl}${fullPath}`;
                } else {
                    img.src = imagePath;
                }
            });
        },
        
        // Handle color selection
        handleColorSelect(color) {
            this.selectedColor = color;
            this.$emit('select', color);
        },
        
        // Handle color hover
        handleColorHover(color) {
            this.hoveredColor = color;
            this.$emit('hover', color);
        },
        
        // Confirm selection
        handleConfirm() {
            if (this.selectedColor) {
                this.$emit('confirm', this.selectedColor);
                this.handleClose();
            }
        },
        
        // Close dialog
        handleClose() {
            this.dialogVisible = false;
            this.selectedColor = null;
            this.hoveredColor = null;
            this.$emit('close');
        },
        
        // Handle window resize
        handleResize() {
            this.isMobile = window.innerWidth < 768;
        },
        
        // Handle ESC key press
        handleKeyDown(event) {
            if (!this.dialogVisible) return;
            
            if (event.key === 'Escape' || event.keyCode === 27) {
                event.preventDefault();
                event.stopPropagation();
                
                // If there's a selection, clear it first
                if (this.selectedColor) {
                    this.selectedColor = null;
                    this.hoveredColor = null;
                    this.$emit('select', null);
                } else {
                    // If no selection, close the dialog
                    this.handleClose();
                }
            }
        },
        
        // Handle click outside to deselect
        handleClickOutside(event) {
            if (!this.dialogVisible || !this.selectedColor) return;
            
            // Check if click is outside of color selection elements
            const target = event.target;
            const isColorElement = target.closest('.color-chip, .color-dot, .grid-cell, .color-grid-item, .color-list-item, canvas');
            const isDialogElement = target.closest('.el-dialog');
            
            // If clicked outside color elements but inside dialog, deselect
            if (isDialogElement && !isColorElement) {
                this.selectedColor = null;
                this.hoveredColor = null;
                this.$emit('select', null);
            }
        },
        
        // Get color style for preview
        getColorStyle(color) {
            if (!color) {
                return '#808080';
            }
            const helpers = window.ColorDictionaryHelpers || {};
            if (helpers.getColorStyle) {
                const style = helpers.getColorStyle(color);
                if (style) {
                    return style;
                }
            }
            if (color.hex) {
                return color.hex;
            }
            if (color.rgb) {
                return `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
            }
            if (color.hex_color) {
                const hex = color.hex_color.startsWith('#') ? color.hex_color : `#${color.hex_color}`;
                return hex;
            }
            return '#808080';
        },
        
        // Format RGB for display
        formatRgb(rgb) {
            return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
        },
        
        // Format HSL for display
        formatHsl(hsl) {
            return `${hsl.h}°, ${hsl.s}%, ${hsl.l}%`;
        },
        
        // Format CMYK for display
        formatCmyk(color) {
            if (color.cmyk_c !== null && color.cmyk_c !== undefined) {
                return `${color.cmyk_c || 0}, ${color.cmyk_m || 0}, ${color.cmyk_y || 0}, ${color.cmyk_k || 0}`;
            }
            return '';
        }
    }
};

const dictionaryViews = window.ColorDictionaryViews || {};
const paletteComponents = {};

if (dictionaryViews.HslDictionaryView) {
    paletteComponents['hsl-color-space-view'] = dictionaryViews.HslDictionaryView;
} else {
    paletteDebug('HSL view module unavailable for palette dialog');
}

if (dictionaryViews.WheelDictionaryView) {
    paletteComponents['color-wheel-view'] = dictionaryViews.WheelDictionaryView;
} else {
    paletteDebug('Wheel view module unavailable for palette dialog');
}

if (dictionaryViews.SimplifiedListView) {
    paletteComponents['enhanced-list-view'] = dictionaryViews.SimplifiedListView;
} else {
    paletteDebug('List view module unavailable for palette dialog');
}

ColorPaletteDialog.components = paletteComponents;
