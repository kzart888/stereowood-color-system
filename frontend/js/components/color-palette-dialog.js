/**
 * Color Palette Dialog Component
 * Advanced color selection dialog with HSL and Color Wheel views
 */

const ColorPaletteDialog = {
    template: `
        <el-dialog
            :visible.sync="dialogVisible"
            :title="title"
            width="90%"
            :custom-class="'color-palette-dialog'"
            :close-on-click-modal="false"
            :destroy-on-close="true"
            @close="handleClose"
            :fullscreen="isMobile"
        >
            <!-- Tab Navigation -->
            <div class="color-palette-tabs">
                <el-tabs v-model="activeTab" type="card">
                    <el-tab-pane label="HSL色彩空间" name="hsl">
                        <hsl-color-space-view
                            v-if="activeTab === 'hsl'"
                            :colors="enrichedColors"
                            :selected-color="selectedColor"
                            @select="handleColorSelect"
                            @hover="handleColorHover"
                        />
                    </el-tab-pane>
                    
                    <el-tab-pane label="色轮导航" name="wheel">
                        <color-wheel-view
                            v-if="activeTab === 'wheel'"
                            :colors="enrichedColors"
                            :selected-color="selectedColor"
                            @select="handleColorSelect"
                            @hover="handleColorHover"
                        />
                    </el-tab-pane>
                    
                    <el-tab-pane label="列表视图" name="list">
                        <enhanced-list-view
                            v-if="activeTab === 'list'"
                            :colors="enrichedColors"
                            :selected-color="selectedColor"
                            :categories="categories"
                            @select="handleColorSelect"
                            @hover="handleColorHover"
                        />
                    </el-tab-pane>
                </el-tabs>
            </div>
            
            <!-- Color Info Panel -->
            <div class="color-info-panel" v-if="hoveredColor || selectedColor">
                <div class="color-preview-large"
                     :style="{ backgroundColor: getColorStyle(hoveredColor || selectedColor) }">
                </div>
                <div class="color-details">
                    <h4>{{ (hoveredColor || selectedColor).name }}</h4>
                    <p class="color-code">{{ (hoveredColor || selectedColor).color_code }}</p>
                    <div class="color-values">
                        <div v-if="(hoveredColor || selectedColor).rgb">
                            RGB: {{ formatRgb((hoveredColor || selectedColor).rgb) }}
                        </div>
                        <div v-if="(hoveredColor || selectedColor).hsl">
                            HSL: {{ formatHsl((hoveredColor || selectedColor).hsl) }}
                        </div>
                        <div v-if="(hoveredColor || selectedColor).formula">
                            配方: {{ (hoveredColor || selectedColor).formula }}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Dialog Footer -->
            <span slot="footer" class="dialog-footer">
                <el-button @click="handleClose">取消</el-button>
                <el-button 
                    type="primary" 
                    @click="handleConfirm"
                    :disabled="!selectedColor"
                >
                    确定选择
                </el-button>
            </span>
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
            if (val) {
                this.enrichColors();
            }
        },
        
        dialogVisible(val) {
            this.$emit('update:visible', val);
        },
        
        colors: {
            handler() {
                this.enrichColors();
            },
            deep: true
        }
    },
    
    mounted() {
        this.enrichColors();
        this.handleResize();
        window.addEventListener('resize', this.handleResize);
    },
    
    beforeDestroy() {
        window.removeEventListener('resize', this.handleResize);
    },
    
    methods: {
        // Enrich colors with calculated properties
        async enrichColors() {
            this.enrichedColors = await Promise.all(this.colors.map(async color => {
                const enriched = { ...color };
                
                // Extract RGB from image or use stored value
                if (color.rgb) {
                    enriched.rgb = color.rgb;
                } else if (color.image_path) {
                    enriched.rgb = await this.extractColorFromImage(color.image_path);
                } else {
                    // Default color if no image
                    enriched.rgb = { r: 128, g: 128, b: 128 };
                }
                
                // Calculate HSL and LAB
                enriched.hsl = rgbToHsl(enriched.rgb.r, enriched.rgb.g, enriched.rgb.b);
                enriched.lab = rgbToLab(enriched.rgb.r, enriched.rgb.g, enriched.rgb.b);
                enriched.hex = rgbToHex(enriched.rgb.r, enriched.rgb.g, enriched.rgb.b);
                
                return enriched;
            }));
        },
        
        // Extract dominant color from image
        async extractColorFromImage(imagePath) {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                img.onload = () => {
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
                };
                
                img.onerror = () => {
                    // Default gray if image fails to load
                    resolve({ r: 128, g: 128, b: 128 });
                };
                
                // Build proper image URL
                const baseUrl = window.location.origin;
                img.src = imagePath.startsWith('http') ? imagePath : `${baseUrl}/${imagePath}`;
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
            const cellSize = this.gridSize <= 5 ? 60 : this.gridSize <= 10 ? 40 : 30;
            return {
                gridTemplateColumns: `repeat(${this.gridSize}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${this.gridSize}, ${cellSize}px)`
            };
        },
        
        colorsInHue() {
            return this.colors.filter(color => {
                if (!color.hsl) return false;
                const hueDiff = Math.abs(color.hsl.h - this.selectedHue);
                return Math.min(hueDiff, 360 - hueDiff) <= this.hueTolerance;
            }).sort((a, b) => {
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
        this.generateGrid();
        if (this.selectedColor && this.selectedColor.hsl) {
            this.selectedHue = this.selectedColor.hsl.h;
        }
    },
    
    methods: {
        generateGrid() {
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
                <canvas ref="wheelCanvas" width="600" height="600"></canvas>
            </div>
            <div class="wheel-controls">
                <label>邻近范围 (ΔE): {{ proximityRange }}</label>
                <el-slider 
                    v-model="proximityRange" 
                    :min="0" 
                    :max="50"
                    :step="1"
                ></el-slider>
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
            ctx: null
        };
    },
    mounted() {
        this.initWheel();
    },
    methods: {
        initWheel() {
            // Wheel implementation will be added in Phase 3
            this.$message.info('色轮视图将在第3阶段实现');
        }
    }
};

// Enhanced List View Component (placeholder)
const EnhancedListView = {
    template: `
        <div class="enhanced-list-view">
            <div class="list-controls">
                <el-select v-model="sortBy" placeholder="排序方式">
                    <el-option label="按色相" value="hue"></el-option>
                    <el-option label="按明度" value="lightness"></el-option>
                    <el-option label="按饱和度" value="saturation"></el-option>
                    <el-option label="按名称" value="name"></el-option>
                </el-select>
                <el-select v-model="filterCategory" placeholder="筛选分类" clearable>
                    <el-option 
                        v-for="cat in categories" 
                        :key="cat.id"
                        :label="cat.name" 
                        :value="cat.id"
                    ></el-option>
                </el-select>
            </div>
            <div class="color-list">
                <div 
                    v-for="color in sortedColors"
                    :key="color.id"
                    class="color-list-item"
                    @click="$emit('select', color)"
                    @mouseenter="$emit('hover', color)"
                >
                    <div class="color-swatch" :style="{ backgroundColor: color.hex }"></div>
                    <div class="color-info">
                        <div class="color-name">{{ color.name }}</div>
                        <div class="color-code">{{ color.color_code }}</div>
                    </div>
                </div>
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
            filterCategory: null
        };
    },
    computed: {
        sortedColors() {
            let filtered = this.colors;
            
            if (this.filterCategory) {
                filtered = filtered.filter(c => c.category_id === this.filterCategory);
            }
            
            return filtered.sort((a, b) => {
                switch(this.sortBy) {
                    case 'hue':
                        return (a.hsl?.h || 0) - (b.hsl?.h || 0);
                    case 'lightness':
                        return (a.hsl?.l || 0) - (b.hsl?.l || 0);
                    case 'saturation':
                        return (a.hsl?.s || 0) - (b.hsl?.s || 0);
                    case 'name':
                        return a.name.localeCompare(b.name);
                    default:
                        return 0;
                }
            });
        }
    }
};