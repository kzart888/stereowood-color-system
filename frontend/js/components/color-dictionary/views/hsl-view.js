(function(window) {
    'use strict';

    const helpers = window.ColorDictionaryHelpers || { getColorStyle: () => null };

    const HslDictionaryView = {
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
                <span class="grid-info" style="margin-left: 10px;">{{ colorsInHue.length }} 个颜色在此色相范围</span>
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
                            :title="getCellTooltip(cell)"
                            :class="{ 
                                'has-colors': cell.colors.length > 0
                            }"
                        >
                            <!-- Individual color dots -->
                            <div class="cell-dots-container">
                                <div 
                                    v-for="(color, idx) in cell.colors"
                                    :key="color.id"
                                    class="cell-color-dot"
                                    :style="getDotStyle(color, idx, cell.colors.length)"
                                    @click.stop="selectColor(color)"
                                    :title="color.color_code + ' - ' + (color.color_name || '未命名')"
                                    :class="{ 'selected': selectedColor && selectedColor.id === color.id }"
                                >
                                </div>
                            </div>
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
            
            <!-- Color matches in current hue with fixed thumbnails -->
            <div class="hue-colors" v-if="colorsInHue.length > 0">
                <div class="hue-colors-header">
                    <h4>当前色相范围的颜色 ({{ selectedHue - 15 }}° - {{ selectedHue + 15 }}°)</h4>
                </div>
                <div class="color-chips">
                    <div 
                        v-for="color in colorsInHue"
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
            gridSize: 10,
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
            // Ensure grid maintains fixed size with correct divisions
            // Cells will automatically fill the space (1fr = equal fraction)
            return {
                gridTemplateColumns: `repeat(${this.gridSize}, 1fr)`,
                gridTemplateRows: `repeat(${this.gridSize}, 1fr)`,
                width: '520px',
                height: '520px',
                padding: '0',
                gap: '0'
            };
        },
        
        colorGrid() {
            const grid = [];
            for (let l = 0; l < this.gridSize; l++) {
                const row = [];
                for (let s = 0; s < this.gridSize; s++) {
                    const saturation = (s / (this.gridSize - 1)) * 100;
                    const lightness = 100 - (l / (this.gridSize - 1)) * 100;
                    
                    // Find colors that match this cell
                    const matchingColors = this.colorsInHue.filter(color => {
                        if (!color.hsl) return false;
                        const sDiff = Math.abs(color.hsl.s - saturation);
                        const lDiff = Math.abs(color.hsl.l - lightness);
                        return sDiff <= (100 / this.gridSize / 2) && lDiff <= (100 / this.gridSize / 2);
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
            const tolerance = 15;
            return this.colors.filter(color => {
                if (!color.hsl || color.hsl.h === undefined) return false;
                const hueDiff = Math.abs(color.hsl.h - this.selectedHue);
                // Handle hue wrapping around 360
                return Math.min(hueDiff, 360 - hueDiff) <= tolerance;
            });
        }
    },
    
    methods: {
        getCellStyle(cell) {
            // Always show the HSL gradient background for the cell
            const bgColor = `hsl(${this.selectedHue}, ${cell.saturation}%, ${cell.lightness}%)`;
            
            return {
                background: bgColor,
                // Cells now have consistent thin borders
                width: '100%',
                height: '100%',
                display: 'block',
                position: 'relative'
            };
        },
        
        getDotStyle(color, index, total) {
            // Calculate dot position within the cell
            const dotSize = this.calculateDotSize(total);
            const position = this.calculateDotPosition(index, total, dotSize);
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
        
        calculateDotSize(total) {
            // Calculate appropriate dot size based on grid size and number of colors
            const cellSize = 520 / this.gridSize; // Size of each cell
            
            if (total === 1) {
                return Math.min(30, cellSize * 0.6);
            } else if (total <= 4) {
                return Math.min(20, cellSize * 0.4);
            } else {
                return Math.min(15, cellSize * 0.3);
            }
        },
        
        calculateDotPosition(index, total, dotSize) {
            const cellSize = 520 / this.gridSize;
            const centerX = cellSize / 2;
            const centerY = cellSize / 2;
            
            if (total === 1) {
                // Center single dot
                return {
                    x: centerX - dotSize / 2,
                    y: centerY - dotSize / 2
                };
            } else if (total <= 4) {
                // Arrange in 2x2 grid
                const row = Math.floor(index / 2);
                const col = index % 2;
                const spacing = cellSize * 0.25;
                return {
                    x: centerX - dotSize + col * (dotSize + spacing/2),
                    y: centerY - dotSize + row * (dotSize + spacing/2)
                };
            } else {
                // Arrange in circular pattern
                const angle = (index / total) * Math.PI * 2;
                const radius = Math.min(20, cellSize * 0.3);
                return {
                    x: centerX + Math.cos(angle) * radius - dotSize / 2,
                    y: centerY + Math.sin(angle) * radius - dotSize / 2
                };
            }
        },
        
        getCellTooltip(cell) {
            if (cell.colors.length === 0) {
                return `S: ${Math.round(cell.saturation)}%, L: ${Math.round(cell.lightness)}%`;
            }
            return cell.colors.map(c => c.color_code).join(', ');
        },
        
        selectCell(cell) {
            if (cell.colors.length === 1) {
                this.selectColor(cell.colors[0]);
            } else if (cell.colors.length > 1) {
                // If multiple colors, select the first one
                this.selectColor(cell.colors[0]);
            }
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
