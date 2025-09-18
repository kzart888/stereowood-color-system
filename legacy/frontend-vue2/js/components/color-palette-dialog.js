/**
 * Color Palette Dialog Component
 * Advanced color selection dialog with HSL and Color Wheel views
 */

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
                    @select="handleColorSelect"
                    @hover="handleColorHover"
                />
                
                <color-wheel-view
                    v-if="activeTab === 'wheel'"
                    :colors="enrichedColors"
                    :selected-color="selectedColor"
                    @select="handleColorSelect"
                    @hover="handleColorHover"
                />
                
                <enhanced-list-view
                    v-if="activeTab === 'list'"
                    :colors="enrichedColors"
                    :selected-color="selectedColor"
                    :categories="categories"
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
            colorState: {
                selectedHue: 180,
                proximityRange: 15,
                sortBy: 'hue',
                filterCategory: null
            }
        };
    },
    
    computed: {
        // Provide shared state to child components
        sharedState() {
            return {
                colors: this.enrichedColors,
                selectedColor: this.selectedColor,
                hoveredColor: this.hoveredColor,
                colorState: this.colorState
            };
        }
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
        console.log('ColorPaletteDialog created');
        console.log('Initial visible:', this.visible);
        console.log('Initial colors:', this.colors?.length);
    },
    
    mounted() {
        console.log('ColorPaletteDialog mounted');
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
            console.log('Starting enrichColors with', this.colors?.length, 'colors');
            
            // Check if colors exist
            if (!this.colors || this.colors.length === 0) {
                this.enrichedColors = [];
                return;
            }
            
            // Process all colors synchronously
            this.enrichedColors = this.colors.map((color, index) => {
                const enriched = { ...color };
                
                try {
                    // Try to get RGB from different sources
                    let rgb = null;
                    let hasValidRGB = false;
                    
                    // Check for hex value (database field: hex_color)
                    if (color.hex_color && color.hex_color !== '未填写' && color.hex_color !== '') {
                        const hex = color.hex_color.startsWith('#') ? color.hex_color : '#' + color.hex_color;
                        rgb = hexToRgb(hex);
                        enriched.hex = hex;
                        hasValidRGB = true;
                    }
                    // Check for RGB values (database fields: rgb_r, rgb_g, rgb_b)
                    else if (color.rgb_r !== null && color.rgb_r !== undefined && 
                             color.rgb_g !== null && color.rgb_g !== undefined && 
                             color.rgb_b !== null && color.rgb_b !== undefined) {
                        rgb = {
                            r: parseInt(color.rgb_r) || 0,
                            g: parseInt(color.rgb_g) || 0,
                            b: parseInt(color.rgb_b) || 0
                        };
                        enriched.hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                        hasValidRGB = true;
                    }
                    // Use category default color if no RGB data
                    else {
                        rgb = this.getDefaultColorForCategory(color.category_id);
                        enriched.hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                        hasValidRGB = false;
                    }
                    
                    // Mark whether this color has valid RGB data
                    enriched.hasValidRGB = hasValidRGB;
                    
                    enriched.rgb = rgb;
                    
                    // Calculate HSL and LAB
                    if (rgb && typeof rgbToHsl !== 'undefined') {
                        enriched.hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                    } else {
                        enriched.hsl = { h: 0, s: 0, l: 50 };
                    }
                    
                    if (rgb && typeof rgbToLab !== 'undefined') {
                        enriched.lab = rgbToLab(rgb.r, rgb.g, rgb.b);
                    } else {
                        enriched.lab = { L: 50, a: 0, b: 0 };
                    }
                    
                    // Ensure the color has a name property for consistency
                    // Database returns color_code, not color_name
                    if (!enriched.name) {
                        enriched.name = color.color_code || color.color_name || `Color ${index + 1}`;
                    }
                    
                    // Log first few colors for debugging
                    if (index < 3) {
                        console.log(`Color ${index}: ${enriched.name}`, {
                            original: { 
                                hex_color: color.hex_color, 
                                rgb_r: color.rgb_r,
                                rgb_g: color.rgb_g,
                                rgb_b: color.rgb_b,
                                hasValidRGB: hasValidRGB
                            },
                            enriched: { hex: enriched.hex, rgb: enriched.rgb, hsl: enriched.hsl }
                        });
                    }
                } catch (error) {
                    console.error('Error enriching color:', error);
                    // Fallback values on any error
                    enriched.rgb = { r: 128, g: 128, b: 128 };
                    enriched.hsl = { h: 0, s: 0, l: 50 };
                    enriched.lab = { L: 50, a: 0, b: 0 };
                    enriched.hex = '#808080';
                }
                
                return enriched;
            });
            
            console.log('Total enriched colors:', this.enrichedColors.length);
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
        
        // Get default color based on category
        getDefaultColorForCategory(categoryId) {
            // Default colors for different categories
            const categoryColors = {
                1: { r: 70, g: 130, b: 180 },  // 蓝 - Blue
                2: { r: 255, g: 215, b: 0 },   // 黄 - Yellow
                3: { r: 220, g: 20, b: 60 },   // 红 - Red
                4: { r: 34, g: 139, b: 34 },   // 绿 - Green
                5: { r: 128, g: 0, b: 128 },   // 紫 - Purple
                6: { r: 139, g: 69, b: 19 },   // 色精 - Brown
                7: { r: 255, g: 140, b: 0 }    // 其他 - Orange
            };
            
            return categoryColors[categoryId] || { r: 128, g: 128, b: 128 };
        },
        
        // Get color style for preview
        getColorStyle(color) {
            if (color.hex) return color.hex;
            if (color.rgb) {
                return `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
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

// HSL Color Space View Component - Enhanced
const HslColorSpaceView = {
    template: `
        <div class="hsl-color-space-view">
            <!-- Hue Slider -->
            <div class="hue-slider-container">
                <div class="hue-controls">
                    <label>色相 (Hue): {{ selectedHue }}°</label>
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
            
            <!-- Grid Size Control -->
            <div class="grid-controls">
                <label>网格密度: </label>
                <el-radio-group v-model="gridSize" size="small">
                    <el-radio-button :label="5">5x5</el-radio-button>
                    <el-radio-button :label="10">10x10</el-radio-button>
                    <el-radio-button :label="15">15x15</el-radio-button>
                </el-radio-group>
                <el-checkbox v-model="showOnlyWithRGB" style="margin-left: 10px;">
                    仅显示有RGB数据的颜色
                </el-checkbox>
                <span class="grid-info">{{ matchedColorsCount }} 个颜色在此色相范围</span>
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
                            @mouseenter="hoverCell(cell)"
                            @mouseleave="hoveredCell = null"
                            :title="getCellTooltip(cell)"
                            :class="{ 
                                'has-colors': cell.colors.length > 0,
                                'is-hovered': hoveredCell === cell
                            }"
                        >
                            <!-- Color count indicator -->
                            <div v-if="cell.colors.length > 1" class="color-count">
                                {{ cell.colors.length }}
                            </div>
                            
                            <!-- Show dots for actual colors -->
                            <div 
                                v-for="(color, idx) in cell.colors.slice(0, 4)"
                                :key="color.id"
                                class="color-dot"
                                :class="{ 
                                    'selected': isSelected(color),
                                    'mini': cell.colors.length > 2
                                }"
                                :style="getDotPosition(idx, cell.colors.length)"
                                @click.stop="selectColor(color)"
                            />
                        </div>
                    </div>
                </div>
                
                <!-- Grid Labels -->
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
                    <h4>当前色相范围的颜色 ({{ selectedHue - hueTolerance }}° - {{ selectedHue + hueTolerance }}°)</h4>
                    <el-slider 
                        v-model="hueTolerance" 
                        :min="5" 
                        :max="30" 
                        :step="5"
                        size="small"
                        style="width: 150px; margin-left: 20px;"
                    />
                </div>
                <div class="color-chips">
                    <div 
                        v-for="color in colorsInHue"
                        :key="color.id"
                        class="color-chip"
                        :style="{ backgroundColor: color.hex }"
                        @click="selectColor(color)"
                        @mouseenter="$emit('hover', color)"
                        :title="color.name + ' - ' + color.formula"
                        :class="{ 'selected': isSelected(color) }"
                    >
                        <span class="chip-name">{{ color.color_code }}</span>
                    </div>
                </div>
            </div>
        </div>
    `,
    
    props: {
        colors: Array,
        selectedColor: Object
    },
    
    data() {
        return {
            selectedHue: 180,
            colorGrid: [],
            hoveredCell: null,
            gridSize: 10,
            hueTolerance: 15,
            showOnlyWithRGB: false,
            huePresets: [
                { name: '红', value: 0 },
                { name: '橙', value: 30 },
                { name: '黄', value: 60 },
                { name: '绿', value: 120 },
                { name: '青', value: 180 },
                { name: '蓝', value: 240 },
                { name: '紫', value: 270 },
                { name: '品红', value: 300 }
            ]
        };
    },
    
    computed: {
        hueSliderStyle() {
            if (typeof createHueGradient !== 'undefined') {
                return { background: createHueGradient() };
            }
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
            // Return empty since we're using flexbox for rows, not CSS grid
            return {};
        },
        
        colorsInHue() {
            if (!this.colors || this.colors.length === 0) {
                console.log('No colors available for filtering');
                return [];
            }
            
            const filtered = [];
            for (const color of this.colors) {
                // Filter out colors without valid RGB data if the option is enabled
                if (this.showOnlyWithRGB && !color.hasValidRGB) {
                    continue;
                }
                
                if (!color.hsl) {
                    if (filtered.length === 0) {
                        console.log('Color has no HSL:', color);
                    }
                    continue;
                }
                const hueDiff = Math.abs(color.hsl.h - this.selectedHue);
                const minDiff = Math.min(hueDiff, 360 - hueDiff);
                const inRange = minDiff <= this.hueTolerance;
                if (inRange) {
                    filtered.push(color);
                    if (filtered.length <= 3) {
                        console.log(`Color ${color.name || color.color_code} in range: hue=${color.hsl.h}, diff=${minDiff}, hasRGB=${color.hasValidRGB}`);
                    }
                }
            }
            
            return filtered.sort((a, b) => {
                // Sort by saturation and lightness
                const aDist = Math.abs(a.hsl.s - 50) + Math.abs(a.hsl.l - 50);
                const bDist = Math.abs(b.hsl.s - 50) + Math.abs(b.hsl.l - 50);
                return aDist - bDist;
            });
        },
        
        matchedColorsCount() {
            return this.colorsInHue.length;
        }
    },
    
    watch: {
        selectedHue() {
            this.generateGrid();
        },
        gridSize() {
            this.generateGrid();
        },
        hueTolerance() {
            // Just trigger computed update, no need to regenerate grid
        }
    },
    
    mounted() {
        console.log('HSL view mounted, generating grid');
        console.log('Colors received in HSL view:', this.colors?.length);
        console.log('First 3 colors:', this.colors?.slice(0, 3).map(c => ({
            name: c.name || c.color_name,
            hsl: c.hsl,
            hex: c.hex
        })));
        console.log('Hue tolerance:', this.hueTolerance);
        console.log('Selected hue:', this.selectedHue);
        this.generateGrid();
        if (this.selectedColor && this.selectedColor.hsl) {
            this.selectedHue = this.selectedColor.hsl.h;
        }
    },
    
    methods: {
        generateGrid() {
            console.log('generateGrid called, gridSize:', this.gridSize);
            const grid = [];
            const step = 100 / this.gridSize;
            
            for (let l = 100; l >= 0; l -= step) {
                const row = [];
                for (let s = 0; s <= 100; s += step) {
                    const cellHsl = { 
                        h: this.selectedHue, 
                        s: Math.round(s), 
                        l: Math.round(l) 
                    };
                    const cellRgb = typeof hslToRgb !== 'undefined' 
                        ? hslToRgb(this.selectedHue, s, l)
                        : { r: 128, g: 128, b: 128 };
                    
                    // Find colors that match this cell
                    const matchingColors = this.findMatchingColors(cellHsl);
                    
                    row.push({
                        hsl: cellHsl,
                        rgb: cellRgb,
                        hex: typeof rgbToHex !== 'undefined'
                            ? rgbToHex(cellRgb.r, cellRgb.g, cellRgb.b)
                            : '#808080',
                        colors: matchingColors
                    });
                }
                grid.push(row);
            }
            
            this.colorGrid = grid;
            console.log('Grid generated, rows:', grid.length, 'first row cells:', grid[0]?.length);
        },
        
        findMatchingColors(targetHsl) {
            // Dynamic tolerance based on grid size
            const tolerance = {
                h: this.hueTolerance,
                s: this.gridSize <= 5 ? 20 : this.gridSize <= 10 ? 15 : 10,
                l: this.gridSize <= 5 ? 20 : this.gridSize <= 10 ? 15 : 10
            };
            
            return this.colors.filter(color => {
                if (!color.hsl) return false;
                
                const hDiff = Math.abs(color.hsl.h - targetHsl.h);
                const sDiff = Math.abs(color.hsl.s - targetHsl.s);
                const lDiff = Math.abs(color.hsl.l - targetHsl.l);
                
                return Math.min(hDiff, 360 - hDiff) <= tolerance.h &&
                       sDiff <= tolerance.s &&
                       lDiff <= tolerance.l;
            });
        },
        
        getCellStyle(cell) {
            return {
                backgroundColor: cell.hex,
                border: this.hoveredCell === cell ? '2px solid #fff' : 'none'
            };
        },
        
        getCellTooltip(cell) {
            const tooltip = `HSL: ${cell.hsl.h}°, ${cell.hsl.s}%, ${cell.hsl.l}%`;
            if (cell.colors.length > 0) {
                const names = cell.colors.map(c => c.name).join(', ');
                return `${tooltip}\n颜色: ${names}`;
            }
            return tooltip;
        },
        
        selectCell(cell) {
            if (cell.colors.length === 1) {
                this.selectColor(cell.colors[0]);
            } else if (cell.colors.length > 1) {
                // Show selection if multiple colors
                this.$message.info(`此位置有 ${cell.colors.length} 个颜色`);
            }
        },
        
        hoverCell(cell) {
            this.hoveredCell = cell;
            if (cell.colors.length === 1) {
                this.$emit('hover', cell.colors[0]);
            }
        },
        
        selectColor(color) {
            this.$emit('select', color);
        },
        
        isSelected(color) {
            return this.selectedColor && this.selectedColor.id === color.id;
        },
        
        getDotPosition(index, total) {
            // Position dots in a grid pattern within the cell
            if (total === 1) {
                return {}; // Center
            }
            if (total === 2) {
                return {
                    left: index === 0 ? '25%' : '75%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                };
            }
            if (total <= 4) {
                const positions = [
                    { left: '25%', top: '25%' },
                    { left: '75%', top: '25%' },
                    { left: '25%', top: '75%' },
                    { left: '75%', top: '75%' }
                ];
                return {
                    ...positions[index],
                    transform: 'translate(-50%, -50%)'
                };
            }
            return {}; // Default center for more than 4
        }
    }
};

// Color Wheel View Component (placeholder)
const ColorWheelView = {
    template: `
        <div class="color-wheel-view">
            <div class="wheel-container">
                <canvas 
                    ref="wheelCanvas" 
                    width="600" 
                    height="600"
                    @click="handleCanvasClick"
                    @mousemove="handleCanvasHover"
                ></canvas>
            </div>
            <div class="wheel-controls">
                <div class="control-row">
                    <label>邻近范围 (ΔE): {{ proximityRange }}</label>
                    <el-slider 
                        v-model="proximityRange" 
                        :min="0" 
                        :max="50"
                        :step="1"
                        @change="updateWheel"
                    ></el-slider>
                </div>
                <div class="control-row">
                    <el-checkbox v-model="showOnlyWithRGB" @change="updateWheel">
                        仅显示有RGB数据的颜色
                    </el-checkbox>
                </div>
                <div class="stats">
                    显示 {{ visibleColors.length }} / {{ filteredColors.length }} 个颜色
                </div>
            </div>
            <div class="selected-colors" v-if="nearbyColors.length > 0">
                <h4>邻近颜色 (ΔE ≤ {{ proximityRange }})</h4>
                <div class="color-chips">
                    <span 
                        v-for="color in nearbyColors" 
                        :key="color.id"
                        class="color-chip"
                        :style="{ backgroundColor: color.hex }"
                        @click="$emit('select', color)"
                        :title="color.color_code"
                    >
                        {{ color.color_code }}
                    </span>
                </div>
            </div>
        </div>
    `,
    props: {
        colors: Array,
        selectedColor: Object
    },
    data() {
        return {
            proximityRange: 15,
            wheelCanvas: null,
            ctx: null,
            centerX: 300,
            centerY: 300,
            radius: 280,
            showOnlyWithRGB: false,
            hoveredColor: null,
            nearbyColors: [],
            colorPositions: [] // Store color positions for click detection
        };
    },
    computed: {
        filteredColors() {
            if (this.showOnlyWithRGB) {
                return this.colors.filter(c => c.hasValidRGB);
            }
            return this.colors;
        },
        visibleColors() {
            // Colors visible based on proximity filter
            if (!this.selectedColor || this.proximityRange === 50) {
                return this.filteredColors;
            }
            
            return this.filteredColors.filter(color => {
                const deltaE = this.calculateDeltaE(this.selectedColor, color);
                return deltaE <= this.proximityRange;
            });
        }
    },
    mounted() {
        this.wheelCanvas = this.$refs.wheelCanvas;
        this.ctx = this.wheelCanvas.getContext('2d');
        this.initWheel();
    },
    watch: {
        colors() {
            this.updateWheel();
        },
        selectedColor() {
            this.updateWheel();
            this.updateNearbyColors();
        }
    },
    methods: {
        initWheel() {
            this.drawWheelBackground();
            this.plotColors();
        },
        
        drawWheelBackground() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, 600, 600);
            
            // Draw the color wheel background
            const imageData = ctx.createImageData(600, 600);
            const data = imageData.data;
            
            for (let x = 0; x < 600; x++) {
                for (let y = 0; y < 600; y++) {
                    const dx = x - this.centerX;
                    const dy = y - this.centerY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance <= this.radius) {
                        // Calculate hue from angle
                        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
                        if (angle < 0) angle += 360;
                        
                        // Calculate saturation from distance
                        const saturation = (distance / this.radius) * 100;
                        
                        // Fixed lightness at 50% for wheel
                        const lightness = 50;
                        
                        // Convert HSL to RGB
                        const rgb = this.hslToRgb(angle, saturation, lightness);
                        
                        const index = (y * 600 + x) * 4;
                        data[index] = rgb.r;
                        data[index + 1] = rgb.g;
                        data[index + 2] = rgb.b;
                        data[index + 3] = 255;
                    }
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            // Draw border
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.radius, 0, 2 * Math.PI);
            ctx.stroke();
        },
        
        plotColors() {
            const ctx = this.ctx;
            this.colorPositions = [];
            
            // Plot each color as a dot
            this.visibleColors.forEach(color => {
                if (!color.hsl) return;
                
                const pos = this.mapColorToWheel(color.hsl);
                this.colorPositions.push({
                    color: color,
                    x: pos.x,
                    y: pos.y,
                    size: pos.size
                });
                
                // Draw outer white ring
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, pos.size + 2, 0, 2 * Math.PI);
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // Draw inner color circle
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, pos.size, 0, 2 * Math.PI);
                ctx.fillStyle = color.hex || '#888';
                ctx.fill();
                
                // Highlight selected color
                if (this.selectedColor && this.selectedColor.id === color.id) {
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, pos.size + 4, 0, 2 * Math.PI);
                    ctx.stroke();
                }
            });
        },
        
        mapColorToWheel(hsl) {
            // Map HSL to wheel position
            const angle = hsl.h * Math.PI / 180;
            const distance = (hsl.s / 100) * this.radius * 0.9; // 0.9 to keep dots inside
            
            const x = this.centerX + distance * Math.cos(angle);
            const y = this.centerY + distance * Math.sin(angle);
            
            // Size based on lightness (darker = smaller, lighter = larger)
            const size = 3 + (hsl.l / 100) * 5;
            
            return { x, y, size };
        },
        
        hslToRgb(h, s, l) {
            s /= 100;
            l /= 100;
            
            const c = (1 - Math.abs(2 * l - 1)) * s;
            const x = c * (1 - Math.abs((h / 60) % 2 - 1));
            const m = l - c / 2;
            
            let r = 0, g = 0, b = 0;
            
            if (h >= 0 && h < 60) {
                r = c; g = x; b = 0;
            } else if (h >= 60 && h < 120) {
                r = x; g = c; b = 0;
            } else if (h >= 120 && h < 180) {
                r = 0; g = c; b = x;
            } else if (h >= 180 && h < 240) {
                r = 0; g = x; b = c;
            } else if (h >= 240 && h < 300) {
                r = x; g = 0; b = c;
            } else if (h >= 300 && h < 360) {
                r = c; g = 0; b = x;
            }
            
            return {
                r: Math.round((r + m) * 255),
                g: Math.round((g + m) * 255),
                b: Math.round((b + m) * 255)
            };
        },
        
        calculateDeltaE(color1, color2) {
            if (!color1.lab || !color2.lab) {
                // Fallback to simple RGB distance if LAB not available
                if (!color1.rgb || !color2.rgb) return 100;
                
                const dr = color1.rgb.r - color2.rgb.r;
                const dg = color1.rgb.g - color2.rgb.g;
                const db = color1.rgb.b - color2.rgb.b;
                return Math.sqrt(dr * dr + dg * dg + db * db) / 4.41; // Normalize to roughly 0-100
            }
            
            // Simple CIE76 Delta E calculation
            const dL = color1.lab.L - color2.lab.L;
            const da = color1.lab.a - color2.lab.a;
            const db = color1.lab.b - color2.lab.b;
            
            return Math.sqrt(dL * dL + da * da + db * db);
        },
        
        handleCanvasClick(event) {
            const rect = this.wheelCanvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Find clicked color
            let minDistance = Infinity;
            let clickedColor = null;
            
            this.colorPositions.forEach(pos => {
                const distance = Math.sqrt(
                    Math.pow(x - pos.x, 2) + 
                    Math.pow(y - pos.y, 2)
                );
                
                if (distance < pos.size + 5 && distance < minDistance) {
                    minDistance = distance;
                    clickedColor = pos.color;
                }
            });
            
            if (clickedColor) {
                this.$emit('select', clickedColor);
            }
        },
        
        handleCanvasHover(event) {
            const rect = this.wheelCanvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Find hovered color
            let hoveredColor = null;
            
            this.colorPositions.forEach(pos => {
                const distance = Math.sqrt(
                    Math.pow(x - pos.x, 2) + 
                    Math.pow(y - pos.y, 2)
                );
                
                if (distance < pos.size + 5) {
                    hoveredColor = pos.color;
                }
            });
            
            if (hoveredColor !== this.hoveredColor) {
                this.hoveredColor = hoveredColor;
                if (hoveredColor) {
                    this.$emit('hover', hoveredColor);
                    this.wheelCanvas.style.cursor = 'pointer';
                } else {
                    this.wheelCanvas.style.cursor = 'default';
                }
            }
        },
        
        updateWheel() {
            this.drawWheelBackground();
            this.plotColors();
        },
        
        updateNearbyColors() {
            if (!this.selectedColor) {
                this.nearbyColors = [];
                return;
            }
            
            this.nearbyColors = this.filteredColors
                .filter(color => {
                    if (color.id === this.selectedColor.id) return false;
                    const deltaE = this.calculateDeltaE(this.selectedColor, color);
                    return deltaE <= this.proximityRange;
                })
                .sort((a, b) => {
                    const deltaA = this.calculateDeltaE(this.selectedColor, a);
                    const deltaB = this.calculateDeltaE(this.selectedColor, b);
                    return deltaA - deltaB;
                })
                .slice(0, 12); // Show max 12 nearby colors
        }
    }
};

// Enhanced List View Component with full features
const EnhancedListView = {
    template: `
        <div class="enhanced-list-view">
            <div class="list-controls">
                <div class="control-row">
                    <el-select v-model="sortBy" placeholder="排序方式" @change="handleSortChange">
                        <el-option label="按色相" value="hue"></el-option>
                        <el-option label="按明度" value="lightness"></el-option>
                        <el-option label="按饱和度" value="saturation"></el-option>
                        <el-option label="按名称" value="name"></el-option>
                        <el-option label="按时间" value="date"></el-option>
                    </el-select>
                    <el-select v-model="filterCategory" placeholder="筛选分类" clearable @change="handleFilterChange">
                        <el-option 
                            v-for="cat in categories" 
                            :key="cat.id"
                            :label="cat.name" 
                            :value="cat.id"
                        ></el-option>
                    </el-select>
                    <el-checkbox v-model="showOnlyWithRGB" @change="handleFilterChange">
                        仅显示有RGB数据
                    </el-checkbox>
                </div>
                <div class="search-row">
                    <el-input 
                        v-model="searchTerm" 
                        placeholder="搜索颜色编码或配方"
                        clearable
                        @input="handleSearch"
                    >
                        <template #prefix>
                            <i class="el-icon-search"></i>
                        </template>
                    </el-input>
                </div>
                <div class="stats-row">
                    显示 {{ filteredColors.length }} / {{ colors.length }} 个颜色
                </div>
            </div>
            
            <div class="color-list-container">
                <div class="view-toggle">
                    <el-radio-group v-model="viewMode" size="small">
                        <el-radio-button label="grid">网格</el-radio-button>
                        <el-radio-button label="list">列表</el-radio-button>
                        <el-radio-button label="compact">紧凑</el-radio-button>
                    </el-radio-group>
                </div>
                
                <!-- Grid View -->
                <div v-if="viewMode === 'grid'" class="color-grid">
                    <div 
                        v-for="color in paginatedColors"
                        :key="color.id"
                        class="color-grid-item"
                        :class="{ 
                            'selected': selectedColor && selectedColor.id === color.id,
                            'has-rgb': color.hasValidRGB 
                        }"
                        @click="handleSelect(color)"
                        @mouseenter="handleHover(color)"
                        @mouseleave="handleHoverEnd"
                    >
                        <div class="color-preview" :style="{ backgroundColor: color.hex || getCategoryColor(color) }">
                            <div v-if="!color.hasValidRGB" class="no-rgb-indicator">?</div>
                        </div>
                        <div class="color-label">{{ color.color_code }}</div>
                        <div class="color-hsl" v-if="color.hsl">
                            H:{{ Math.round(color.hsl.h) }}° S:{{ Math.round(color.hsl.s) }}%
                        </div>
                    </div>
                </div>
                
                <!-- List View -->
                <div v-else-if="viewMode === 'list'" class="color-list">
                    <div 
                        v-for="color in paginatedColors"
                        :key="color.id"
                        class="color-list-item"
                        :class="{ 'selected': selectedColor && selectedColor.id === color.id }"
                        @click="handleSelect(color)"
                        @mouseenter="handleHover(color)"
                        @mouseleave="handleHoverEnd"
                    >
                        <div class="color-swatch" :style="{ backgroundColor: color.hex || getCategoryColor(color) }"></div>
                        <div class="color-info">
                            <div class="color-header">
                                <span class="color-code">{{ color.color_code }}</span>
                                <span class="color-category">{{ getCategoryName(color.category_id) }}</span>
                            </div>
                            <div class="color-formula">{{ color.formula }}</div>
                            <div class="color-values" v-if="color.hasValidRGB">
                                <span v-if="color.rgb">RGB: {{ color.rgb.r }}, {{ color.rgb.g }}, {{ color.rgb.b }}</span>
                                <span v-if="color.hsl">HSL: {{ Math.round(color.hsl.h) }}°, {{ Math.round(color.hsl.s) }}%, {{ Math.round(color.hsl.l) }}%</span>
                            </div>
                        </div>
                        <div class="color-wheel-position" v-if="color.hsl">
                            <svg width="30" height="30" viewBox="0 0 30 30">
                                <circle cx="15" cy="15" r="14" fill="none" stroke="#ddd" stroke-width="1"/>
                                <circle 
                                    :cx="15 + 12 * Math.cos(color.hsl.h * Math.PI / 180) * (color.hsl.s / 100)"
                                    :cy="15 + 12 * Math.sin(color.hsl.h * Math.PI / 180) * (color.hsl.s / 100)"
                                    r="3" 
                                    :fill="color.hex || '#888'"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
                
                <!-- Compact View -->
                <div v-else class="color-compact">
                    <span 
                        v-for="color in paginatedColors"
                        :key="color.id"
                        class="color-chip"
                        :class="{ 'selected': selectedColor && selectedColor.id === color.id }"
                        :style="{ backgroundColor: color.hex || getCategoryColor(color) }"
                        :title="color.color_code + ' - ' + color.formula"
                        @click="handleSelect(color)"
                        @mouseenter="handleHover(color)"
                        @mouseleave="handleHoverEnd"
                    >
                        {{ color.color_code }}
                    </span>
                </div>
            </div>
            
            <!-- Pagination -->
            <div class="pagination-controls" v-if="totalPages > 1">
                <el-pagination
                    v-model:current-page="currentPage"
                    :page-size="pageSize"
                    :total="filteredColors.length"
                    :page-sizes="[20, 50, 100, 200]"
                    layout="total, sizes, prev, pager, next"
                    @size-change="handleSizeChange"
                    @current-change="handlePageChange"
                />
            </div>
        </div>
    `,
    props: {
        colors: Array,
        selectedColor: Object,
        categories: Array
    },
    data() {
        return {
            sortBy: 'hue',
            filterCategory: null,
            showOnlyWithRGB: false,
            searchTerm: '',
            viewMode: 'grid',
            currentPage: 1,
            pageSize: 50,
            hoveredColor: null
        };
    },
    computed: {
        filteredColors() {
            let filtered = this.colors;
            
            // Category filter
            if (this.filterCategory) {
                filtered = filtered.filter(c => c.category_id === this.filterCategory);
            }
            
            // RGB filter
            if (this.showOnlyWithRGB) {
                filtered = filtered.filter(c => c.hasValidRGB);
            }
            
            // Search filter
            if (this.searchTerm) {
                const term = this.searchTerm.toLowerCase();
                filtered = filtered.filter(c => 
                    c.color_code.toLowerCase().includes(term) ||
                    c.formula.toLowerCase().includes(term) ||
                    (c.name && c.name.toLowerCase().includes(term))
                );
            }
            
            // Sorting
            return filtered.sort((a, b) => {
                switch(this.sortBy) {
                    case 'hue':
                        return (a.hsl?.h || 360) - (b.hsl?.h || 360);
                    case 'lightness':
                        return (a.hsl?.l || 0) - (b.hsl?.l || 0);
                    case 'saturation':
                        return (a.hsl?.s || 0) - (b.hsl?.s || 0);
                    case 'name':
                        return (a.color_code || '').localeCompare(b.color_code || '');
                    case 'date':
                        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
                    default:
                        return 0;
                }
            });
        },
        
        paginatedColors() {
            const start = (this.currentPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            return this.filteredColors.slice(start, end);
        },
        
        totalPages() {
            return Math.ceil(this.filteredColors.length / this.pageSize);
        }
    },
    
    watch: {
        selectedColor(newVal) {
            // Auto-scroll to selected color
            if (newVal) {
                const index = this.filteredColors.findIndex(c => c.id === newVal.id);
                if (index >= 0) {
                    const page = Math.floor(index / this.pageSize) + 1;
                    if (page !== this.currentPage) {
                        this.currentPage = page;
                    }
                }
            }
        }
    },
    
    methods: {
        handleSelect(color) {
            this.$emit('select', color);
        },
        
        handleHover(color) {
            this.hoveredColor = color;
            this.$emit('hover', color);
        },
        
        handleHoverEnd() {
            this.hoveredColor = null;
        },
        
        handleSortChange() {
            this.currentPage = 1;
        },
        
        handleFilterChange() {
            this.currentPage = 1;
        },
        
        handleSearch() {
            this.currentPage = 1;
        },
        
        handlePageChange(page) {
            this.currentPage = page;
        },
        
        handleSizeChange(size) {
            this.pageSize = size;
            this.currentPage = 1;
        },
        
        getCategoryColor(color) {
            const categoryColors = {
                1: '#4A90E2', // 蓝色系
                2: '#F5D547', // 黄色系
                3: '#E85D75', // 红色系
                4: '#7FBA40', // 绿色系
                5: '#9B59B6', // 紫色系
                6: '#FF6B6B', // 色精
                7: '#95A5A6'  // 其他
            };
            return categoryColors[color.category_id] || '#CCCCCC';
        },
        
        getCategoryName(categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            return category ? category.name : '';
        }
    }
};

// Register child components to ColorPaletteDialog
ColorPaletteDialog.components = {
    'hsl-color-space-view': HslColorSpaceView,
    'color-wheel-view': ColorWheelView,
    'enhanced-list-view': EnhancedListView
};