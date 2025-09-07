/**
 * Color Dictionary Component
 * 独立的颜色字典页面，提供三种视图浏览所有自配色
 */

const ColorDictionaryComponent = {
    template: `
        <div class="color-dictionary-page">
            <!-- Header Color Info Bar -->
            <div class="header-color-info" :class="{inactive: !selectedColor}">
                <div class="color-preview-80">
                    <div v-if="selectedColor" 
                         class="color-swatch-preview" 
                         :style="{background: getColorStyle(selectedColor)}">
                    </div>
                    <div v-else class="empty-preview">
                        <el-icon><Palette /></el-icon>
                        <span>未选择颜色</span>
                    </div>
                </div>
                
                <div class="color-details-grid" v-if="selectedColor">
                    <div class="detail-row">
                        <div class="detail-item">
                            <label>名称:</label>
                            <strong>{{ selectedColor.color_code }}</strong>
                        </div>
                        <div class="detail-item">
                            <label>分类:</label>
                            <span>{{ getCategoryName(selectedColor.category_id) }}</span>
                        </div>
                        <div class="detail-item">
                            <label>更新时间:</label>
                            <span>{{ formatDate(selectedColor.updated_at) }}</span>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-item">
                            <label>RGB:</label>
                            <span v-if="selectedColor.rgb_r != null">
                                {{ selectedColor.rgb_r }}, {{ selectedColor.rgb_g }}, {{ selectedColor.rgb_b }}
                            </span>
                            <span v-else class="empty-value">未填写</span>
                        </div>
                        <div class="detail-item">
                            <label>CMYK:</label>
                            <span v-if="selectedColor.cmyk_c != null">
                                {{ selectedColor.cmyk_c }}, {{ selectedColor.cmyk_m }}, {{ selectedColor.cmyk_y }}, {{ selectedColor.cmyk_k }}
                            </span>
                            <span v-else class="empty-value">未填写</span>
                        </div>
                        <div class="detail-item">
                            <label>HEX:</label>
                            <span v-if="selectedColor.hex_color">{{ selectedColor.hex_color }}</span>
                            <span v-else class="empty-value">未填写</span>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-item">
                            <label>HSL:</label>
                            <span v-if="selectedColor.hsl">
                                {{ Math.round(selectedColor.hsl.h) }}°, {{ Math.round(selectedColor.hsl.s) }}%, {{ Math.round(selectedColor.hsl.l) }}%
                            </span>
                            <span v-else class="empty-value">未计算</span>
                        </div>
                        <div class="detail-item">
                            <label>Pantone C:</label>
                            <span v-if="selectedColor.pantone_c">{{ selectedColor.pantone_c }}</span>
                            <span v-else class="empty-value">未填写</span>
                        </div>
                        <div class="detail-item">
                            <label>Pantone U:</label>
                            <span v-if="selectedColor.pantone_u">{{ selectedColor.pantone_u }}</span>
                            <span v-else class="empty-value">未填写</span>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-item full-width">
                            <label>配方:</label>
                            <span v-if="selectedColor.formula">{{ selectedColor.formula }}</span>
                            <span v-else class="empty-value">未指定配方</span>
                        </div>
                    </div>
                </div>
                
                <div class="info-actions">
                    <el-button 
                        v-if="selectedColor"
                        type="primary"
                        size="small"
                        @click="navigateToColor"
                    >
                        <el-icon><View /></el-icon>
                        在自配色管理中查看
                    </el-button>
                    <el-button 
                        size="small"
                        @click="printColors"
                    >
                        <el-icon><Printer /></el-icon>
                        打印列表
                    </el-button>
                </div>
            </div>
            
            <!-- View Navigation -->
            <div class="category-switch-group view-navigation">
                <button 
                    type="button" 
                    class="category-switch" 
                    :class="{active: viewMode === 'list'}"
                    @click="viewMode = 'list'"
                >
                    列表导航
                </button>
                <button 
                    type="button" 
                    class="category-switch" 
                    :class="{active: viewMode === 'hsl'}"
                    @click="viewMode = 'hsl'"
                >
                    HSL导航
                </button>
                <button 
                    type="button" 
                    class="category-switch" 
                    :class="{active: viewMode === 'wheel'}"
                    @click="viewMode = 'wheel'"
                >
                    色轮导航
                </button>
                
                <!-- Sort mode for list view -->
                <div class="sort-toggle" v-if="viewMode === 'list'">
                    <span class="sort-label">排序:</span>
                    <button 
                        type="button" 
                        class="category-switch" 
                        :class="{active: listSortMode === 'name'}"
                        @click="listSortMode = 'name'"
                    >
                        按名称
                    </button>
                    <button 
                        type="button" 
                        class="category-switch" 
                        :class="{active: listSortMode === 'color'}"
                        @click="listSortMode = 'color'"
                    >
                        按色彩
                    </button>
                </div>
                
                <button 
                    type="button"
                    class="help-btn"
                    @click="showHelp = true"
                    title="使用帮助"
                >
                    <el-icon><QuestionFilled /></el-icon>
                    使用帮助
                </button>
            </div>
            
            <!-- View Content -->
            <div class="view-content">
                <!-- List View -->
                <simplified-list-view
                    v-if="viewMode === 'list'"
                    :colors="enrichedColors"
                    :categories="categories"
                    :selected-color-id="selectedColorId"
                    :sort-mode="listSortMode"
                    @select="handleColorSelect"
                />
                
                <!-- HSL View -->
                <hsl-color-space-view
                    v-if="viewMode === 'hsl'"
                    :colors="enrichedColors"
                    :selected-color="selectedColor"
                    @select="handleColorSelect"
                    @hover="handleColorHover"
                />
                
                <!-- Color Wheel View -->
                <color-wheel-view
                    v-if="viewMode === 'wheel'"
                    :colors="enrichedColors"
                    :selected-color="selectedColor"
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
                    <h4>列表导航</h4>
                    <ul>
                        <li>按分类查看所有颜色</li>
                        <li>支持按名称或色彩排序</li>
                        <li>点击颜色块选择颜色</li>
                        <li>所有颜色一次性加载，无分页</li>
                    </ul>
                    
                    <h4>HSL导航</h4>
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
                    
                    <h4>快捷键</h4>
                    <ul>
                        <li><kbd>ESC</kbd> - 取消当前选择</li>
                        <li>点击空白处 - 取消当前选择</li>
                    </ul>
                    
                    <h4>打印功能</h4>
                    <ul>
                        <li>点击"打印列表"按钮生成打印预览</li>
                        <li>自动按分类组织颜色</li>
                        <li>包含颜色预览和详细信息</li>
                    </ul>
                </div>
            </el-dialog>
        </div>
    `,
    
    data() {
        return {
            colors: [],
            categories: [],
            enrichedColors: [],
            selectedColorId: null,
            hoveredColor: null,
            viewMode: 'list', // list | hsl | wheel
            listSortMode: 'name', // name | color
            showHelp: false,
            loading: false
        };
    },
    
    computed: {
        selectedColor() {
            if (!this.selectedColorId) return null;
            return this.enrichedColors.find(c => c.id === this.selectedColorId);
        }
    },
    
    watch: {
        viewMode(val) {
            // Save view mode preference
            try {
                localStorage.setItem('color-dict-view', val);
            } catch(e) {
                console.error('Failed to save view mode:', e);
            }
        },
        
        listSortMode(val) {
            // Save sort mode preference
            try {
                localStorage.setItem('color-dict-sort', val);
            } catch(e) {
                console.error('Failed to save sort mode:', e);
            }
        }
    },
    
    async mounted() {
        // Restore view preferences
        this.restoreViewState();
        
        // Add keyboard and click event handlers
        this.setupEventHandlers();
        
        // Load data
        await this.loadCategories();
        await this.loadColors();
        
        // Sync categories with custom colors page
        this.syncCategories();
    },
    
    beforeUnmount() {
        this.removeEventHandlers();
    },
    
    methods: {
        async loadCategories() {
            try {
                const response = await fetch('/api/categories');
                const data = await response.json();
                this.categories = data || [];
            } catch (error) {
                console.error('Failed to load categories:', error);
                this.categories = [];
            }
        },
        
        async loadColors() {
            this.loading = true;
            try {
                const response = await fetch('/api/custom-colors');
                const data = await response.json();
                this.colors = data || [];
                this.enrichColors();
            } catch (error) {
                console.error('Failed to load colors:', error);
                this.$message.error('加载颜色数据失败');
            } finally {
                this.loading = false;
            }
        },
        
        enrichColors() {
            this.enrichedColors = this.colors.map(color => {
                const enriched = { ...color };
                
                // Calculate RGB if needed
                let rgb = null;
                if (color.hex_color && color.hex_color !== '未填写' && color.hex_color !== '') {
                    const hex = color.hex_color.startsWith('#') ? color.hex_color : '#' + color.hex_color;
                    rgb = hexToRgb(hex);
                } else if (color.rgb_r != null && color.rgb_g != null && color.rgb_b != null) {
                    rgb = {
                        r: parseInt(color.rgb_r) || 0,
                        g: parseInt(color.rgb_g) || 0,
                        b: parseInt(color.rgb_b) || 0
                    };
                    enriched.hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                } else {
                    // Use category default color
                    rgb = this.getDefaultColorForCategory(color.category_id);
                    enriched.hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                }
                
                enriched.rgb = rgb;
                
                // Calculate HSL and LAB
                if (rgb) {
                    enriched.hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                    enriched.lab = rgbToLab(rgb.r, rgb.g, rgb.b);
                }
                
                return enriched;
            });
        },
        
        getDefaultColorForCategory(categoryId) {
            const categoryColors = {
                1: { r: 70, g: 130, b: 180 },  // 蓝
                2: { r: 255, g: 215, b: 0 },   // 黄
                3: { r: 220, g: 20, b: 60 },   // 红
                4: { r: 34, g: 139, b: 34 },   // 绿
                5: { r: 128, g: 0, b: 128 },   // 紫
                6: { r: 139, g: 69, b: 19 },   // 色精
                7: { r: 255, g: 140, b: 0 }    // 其他
            };
            return categoryColors[categoryId] || { r: 128, g: 128, b: 128 };
        },
        
        getCategoryName(categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            return category ? category.name : '未分类';
        },
        
        getColorStyle(color) {
            if (!color) return '#f5f5f5';
            if (color.hex) return color.hex;
            if (color.rgb) {
                return `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
            }
            if (color.rgb_r != null && color.rgb_g != null && color.rgb_b != null) {
                return `rgb(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b})`;
            }
            return '#808080';
        },
        
        formatDate(dateStr) {
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            return date.toLocaleDateString('zh-CN');
        },
        
        handleColorSelect(color) {
            if (color && color.id) {
                this.selectedColorId = color.id === this.selectedColorId ? null : color.id;
            }
        },
        
        handleColorHover(color) {
            this.hoveredColor = color;
        },
        
        navigateToColor() {
            if (!this.selectedColor) return;
            
            // Switch to custom colors page
            this.$root.activeTab = 'custom-colors';
            
            // Highlight the color
            this.$nextTick(() => {
                const customColorsRef = this.$root.$refs.customColorsRef;
                if (customColorsRef && customColorsRef.highlightColor) {
                    customColorsRef.highlightColor(this.selectedColor.color_code);
                }
            });
        },
        
        printColors() {
            const printWindow = window.open('', '_blank');
            const date = new Date();
            
            const html = `
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <title>自配色列表 - ${date.toLocaleDateString('zh-CN')}</title>
                    <style>
                        @media print {
                            body { 
                                margin: 0; 
                                font-family: Arial, 'Microsoft YaHei', sans-serif;
                                font-size: 12px;
                            }
                            .header {
                                text-align: center;
                                margin-bottom: 20px;
                                padding-bottom: 10px;
                                border-bottom: 2px solid #333;
                            }
                            .header h1 {
                                margin: 10px 0;
                                font-size: 24px;
                            }
                            .header p {
                                margin: 5px 0;
                                color: #666;
                            }
                            .category-section {
                                margin-bottom: 20px;
                                page-break-inside: avoid;
                            }
                            .category-title {
                                font-size: 16px;
                                font-weight: bold;
                                margin-bottom: 10px;
                                padding: 5px;
                                background: #f0f0f0;
                            }
                            .color-grid {
                                display: grid;
                                grid-template-columns: repeat(6, 1fr);
                                gap: 10px;
                            }
                            .color-item {
                                border: 1px solid #ddd;
                                padding: 5px;
                                text-align: center;
                                page-break-inside: avoid;
                            }
                            .color-swatch {
                                width: 60px;
                                height: 60px;
                                margin: 0 auto 5px;
                                border: 1px solid #ccc;
                            }
                            .color-code {
                                font-weight: bold;
                                font-size: 11px;
                            }
                            .color-info {
                                font-size: 10px;
                                color: #666;
                                margin-top: 3px;
                            }
                        }
                        * {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>STEREOWOOD 自配色列表</h1>
                        <p>打印日期：${date.toLocaleString('zh-CN')}</p>
                        <p>共 ${this.enrichedColors.length} 个颜色</p>
                    </div>
                    ${this.generatePrintContent()}
                </body>
                </html>
            `;
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Wait for content to load then print
            printWindow.onload = () => {
                printWindow.print();
            };
        },
        
        generatePrintContent() {
            let html = '';
            
            // Group colors by category
            const colorsByCategory = {};
            this.enrichedColors.forEach(color => {
                const catId = color.category_id || 'other';
                if (!colorsByCategory[catId]) {
                    colorsByCategory[catId] = [];
                }
                colorsByCategory[catId].push(color);
            });
            
            // Generate HTML for each category
            this.categories.forEach(category => {
                const colors = colorsByCategory[category.id] || [];
                if (colors.length === 0) return;
                
                html += `
                    <div class="category-section">
                        <div class="category-title">${category.name} (${colors.length}个)</div>
                        <div class="color-grid">
                `;
                
                colors.forEach(color => {
                    const rgb = color.rgb || { r: 128, g: 128, b: 128 };
                    const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                    
                    html += `
                        <div class="color-item">
                            <div class="color-swatch" style="background: ${rgbStr}"></div>
                            <div class="color-code">${color.color_code}</div>
                            <div class="color-info">
                                ${color.formula ? color.formula.substring(0, 20) + (color.formula.length > 20 ? '...' : '') : '无配方'}
                            </div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            return html;
        },
        
        syncCategories() {
            // Listen for category updates from custom colors page
            window.addEventListener('categories-updated', (event) => {
                this.categories = event.detail || [];
            });
        },
        
        restoreViewState() {
            try {
                // Restore view mode
                const savedView = localStorage.getItem('color-dict-view');
                if (savedView && ['list', 'hsl', 'wheel'].includes(savedView)) {
                    this.viewMode = savedView;
                }
                
                // Restore sort mode
                const savedSort = localStorage.getItem('color-dict-sort');
                if (savedSort && ['name', 'color'].includes(savedSort)) {
                    this.listSortMode = savedSort;
                }
            } catch(e) {
                console.error('Failed to restore view state:', e);
            }
        },
        
        setupEventHandlers() {
            // ESC key handler
            this.handleKeyDown = (event) => {
                if (event.key === 'Escape' && this.selectedColorId) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.selectedColorId = null;
                }
            };
            window.addEventListener('keydown', this.handleKeyDown);
            
            // Click outside handler
            this.handleClickOutside = (event) => {
                const target = event.target;
                // Check if click is on empty area
                if (target.classList.contains('color-dictionary-page') || 
                    target.classList.contains('view-content')) {
                    this.selectedColorId = null;
                }
            };
            this.$el.addEventListener('click', this.handleClickOutside);
        },
        
        removeEventHandlers() {
            if (this.handleKeyDown) {
                window.removeEventListener('keydown', this.handleKeyDown);
            }
            if (this.handleClickOutside) {
                this.$el.removeEventListener('click', this.handleClickOutside);
            }
        }
    },
    
    components: {
        // Will be registered after definition
    }
};

// Simplified List View Component
const SimplifiedListView = {
    template: `
        <div class="simplified-list-view">
            <div class="category-list-container">
                <div v-for="category in categories" :key="category.id" class="category-row">
                    <div class="category-label">{{ category.name }}</div>
                    <div class="category-colors">
                        <div v-for="color in getSortedCategoryColors(category.id)" 
                             :key="color.id"
                             class="color-chip-80"
                             :class="{ selected: color.id === selectedColorId }"
                             @click="$emit('select', color)">
                            <div class="color-preview" 
                                 :style="{ background: getColorStyle(color) }">
                            </div>
                            <div class="color-code">{{ color.color_code }}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Uncategorized colors -->
                <div v-if="getUncategorizedColors().length > 0" class="category-row">
                    <div class="category-label">未分类</div>
                    <div class="category-colors">
                        <div v-for="color in getSortedUncategorizedColors()" 
                             :key="color.id"
                             class="color-chip-80"
                             :class="{ selected: color.id === selectedColorId }"
                             @click="$emit('select', color)">
                            <div class="color-preview" 
                                 :style="{ background: getColorStyle(color) }">
                            </div>
                            <div class="color-code">{{ color.color_code }}</div>
                        </div>
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
        categories: {
            type: Array,
            default: () => []
        },
        selectedColorId: {
            type: Number,
            default: null
        },
        sortMode: {
            type: String,
            default: 'name' // name | color
        }
    },
    
    methods: {
        getCategoryColors(categoryId) {
            return this.colors.filter(c => c.category_id === categoryId);
        },
        
        getUncategorizedColors() {
            const categoryIds = this.categories.map(c => c.id);
            return this.colors.filter(c => !categoryIds.includes(c.category_id));
        },
        
        getSortedCategoryColors(categoryId) {
            const colors = this.getCategoryColors(categoryId);
            return this.sortColors(colors);
        },
        
        getSortedUncategorizedColors() {
            const colors = this.getUncategorizedColors();
            return this.sortColors(colors);
        },
        
        sortColors(colors) {
            if (this.sortMode === 'color') {
                // Sort by HSL (brightness and saturation)
                return [...colors].sort((a, b) => {
                    if (!a.hsl || !b.hsl) return 0;
                    
                    // Group by lightness (10 levels)
                    const lightGroupA = Math.floor(a.hsl.l / 10);
                    const lightGroupB = Math.floor(b.hsl.l / 10);
                    
                    if (lightGroupA !== lightGroupB) {
                        return lightGroupA - lightGroupB;
                    }
                    
                    // Within same lightness, sort by saturation
                    return b.hsl.s - a.hsl.s;
                });
            } else {
                // Sort by name (color_code)
                return [...colors].sort((a, b) => {
                    const codeA = a.color_code || '';
                    const codeB = b.color_code || '';
                    return codeA.localeCompare(codeB, 'zh-CN');
                });
            }
        },
        
        getColorStyle(color) {
            if (color.hex) return color.hex;
            if (color.rgb) {
                return `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
            }
            if (color.rgb_r != null && color.rgb_g != null && color.rgb_b != null) {
                return `rgb(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b})`;
            }
            return '#808080';
        }
    }
};

// Register child components
ColorDictionaryComponent.components = {
    'simplified-list-view': SimplifiedListView,
    'hsl-color-space-view': typeof HslColorSpaceView !== 'undefined' ? HslColorSpaceView : {},
    'color-wheel-view': typeof ColorWheelView !== 'undefined' ? ColorWheelView : {}
};