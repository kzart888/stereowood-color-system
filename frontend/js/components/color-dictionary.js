/**
 * Color Dictionary Component
 * @component ColorDictionary
 * @description Standalone page for browsing and selecting colors
 * @since v1.0.0
 * 
 * Features:
 * - Three view modes: List, HSL Grid, Color Wheel
 * - Category filtering and synchronization
 * - Advanced print options with customizable layout
 * - Keyboard navigation support
 * - Lazy loading for performance optimization
 * - Real-time sync with custom colors database
 */

const ColorDictionaryComponent = {
    template: `
        <div class="color-dictionary-page">
            <!-- Loading Overlay -->
            <div v-if="loading" class="loading-overlay">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span class="loading-text">加载颜色数据中...</span>
            </div>
            
            <!-- Header Color Info Bar -->
            <div class="header-color-info">
                <div class="color-preview-80">
                    <div v-if="selectedColor && getColorStyle(selectedColor)" 
                         class="color-swatch-preview" 
                         :style="{background: getColorStyle(selectedColor)}">
                    </div>
                    <div v-else class="empty-preview">
                        <span>{{ selectedColor ? '无色值' : '请选择颜色' }}</span>
                    </div>
                </div>
                
                <div class="color-details-grid">
                    <template v-if="selectedColor">
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
                            <span v-if="selectedColor.pantone_coated">{{ selectedColor.pantone_coated }}</span>
                            <span v-else class="empty-value">未填写</span>
                        </div>
                        <div class="detail-item">
                            <label>Pantone U:</label>
                            <span v-if="selectedColor.pantone_uncoated">{{ selectedColor.pantone_uncoated }}</span>
                            <span v-else class="empty-value">未填写</span>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-item">
                            <label>配方:</label>
                            <span v-if="selectedColor.formula" class="formula-text">{{ selectedColor.formula }}</span>
                            <span v-else class="empty-value">未指定配方</span>
                        </div>
                        <div class="detail-item">
                            <label>适用层:</label>
                            <span v-if="selectedColor.applicable_layers">{{ selectedColor.applicable_layers }}</span>
                            <span v-else class="empty-value">未指定</span>
                        </div>
                    </div>
                    </template>
                    <template v-else>
                        <div class="detail-row">
                            <div class="detail-item">
                                <label>名称:</label>
                                <span class="empty-value">未选择</span>
                            </div>
                            <div class="detail-item">
                                <label>分类:</label>
                                <span class="empty-value">空</span>
                            </div>
                            <div class="detail-item">
                                <label>更新时间:</label>
                                <span class="empty-value">空</span>
                            </div>
                        </div>
                    
                        <div class="detail-row">
                            <div class="detail-item">
                                <label>RGB:</label>
                                <span class="empty-value">空</span>
                            </div>
                            <div class="detail-item">
                                <label>CMYK:</label>
                                <span class="empty-value">空</span>
                            </div>
                            <div class="detail-item">
                                <label>HEX:</label>
                                <span class="empty-value">空</span>
                            </div>
                        </div>
                    
                        <div class="detail-row">
                            <div class="detail-item">
                                <label>HSL:</label>
                                <span class="empty-value">空</span>
                            </div>
                            <div class="detail-item">
                                <label>Pantone C:</label>
                                <span class="empty-value">空</span>
                            </div>
                            <div class="detail-item">
                                <label>Pantone U:</label>
                                <span class="empty-value">空</span>
                            </div>
                        </div>
                    
                        <div class="detail-row">
                            <div class="detail-item">
                                <label>配方:</label>
                                <span class="empty-value">空</span>
                            </div>
                            <div class="detail-item">
                                <label>适用层:</label>
                                <span class="empty-value">空</span>
                            </div>
                        </div>
                    </template>
                </div>
                
                <div class="info-actions">
                    <el-button 
                        type="primary"
                        size="small"
                        @click="navigateToColor"
                        :disabled="!selectedColor"
                    >
                        <el-icon><Edit /></el-icon>
                        修改自配色
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
                
                <div style="margin-left: auto; display: flex; gap: 8px;">
                    <el-button 
                        size="small"
                        @click="printColors"
                    >
                        <el-icon><Printer /></el-icon>
                        打印列表
                    </el-button>
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
            </div>
            
            <!-- View Content -->
            <div class="view-content">
                <!-- Empty State -->
                <div v-if="!enrichedColors || enrichedColors.length === 0" class="empty-state">
                    <div class="empty-state-icon">
                        <el-icon><Collection /></el-icon>
                    </div>
                    <div class="empty-state-title">暂无自配色数据</div>
                    <div class="empty-state-message">
                        还没有创建任何自配色。<br>
                        请前往自配色管理页面添加您的第一个颜色配方。
                    </div>
                    <div class="empty-state-hint">
                        <el-icon><InfoFilled /></el-icon>
                        提示：您可以通过点击顶部的"在自配色管理中查看"按钮来添加新颜色
                    </div>
                </div>
                
                <!-- List View -->
                <simplified-list-view
                    v-else-if="viewMode === 'list'"
                    :colors="enrichedColors"
                    :categories="categories"
                    :selected-color-id="selectedColorId"
                    :sort-mode="listSortMode"
                    @select="handleColorSelect"
                    @hover="handleColorHover"
                />
                
                <!-- HSL View -->
                <hsl-color-space-view
                    v-else-if="viewMode === 'hsl'"
                    :colors="enrichedColors"
                    :selected-color="selectedColor"
                    @select="handleColorSelect"
                    @hover="handleColorHover"
                />
                
                <!-- Color Wheel View -->
                <color-wheel-view
                    v-else-if="viewMode === 'wheel'"
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
                    
                    <h4>键盘快捷键</h4>
                    <ul>
                        <li><kbd>ESC</kbd> - 取消当前选择</li>
                        <li><kbd>Ctrl/Cmd + P</kbd> - 打印颜色列表</li>
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
            loading: false,
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
        
        // Sync categories and colors with custom colors page
        this.syncCategories();
        this.syncColors();
        
        // Setup lazy loading for images (performance optimization)
        this.$nextTick(() => {
            this.setupLazyLoading();
        });
    },
    
    beforeUnmount() {
        this.removeEventHandlers();
        // Cleanup image observer
        if (this._imageObserver) {
            this._imageObserver.disconnect();
        }
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
                
                // Only calculate what's actually needed
                if (color.rgb_r != null && color.rgb_g != null && color.rgb_b != null) {
                    // Has RGB values - calculate hex and HSL
                    enriched.hex = rgbToHex(color.rgb_r, color.rgb_g, color.rgb_b);
                    enriched.hsl = rgbToHsl(color.rgb_r, color.rgb_g, color.rgb_b);
                    enriched.rgb = {
                        r: parseInt(color.rgb_r) || 0,
                        g: parseInt(color.rgb_g) || 0,
                        b: parseInt(color.rgb_b) || 0
                    };
                } else if (color.hex_color && color.hex_color !== '未填写' && color.hex_color !== '') {
                    // Has hex color - calculate RGB and HSL
                    const hex = color.hex_color.startsWith('#') ? color.hex_color : '#' + color.hex_color;
                    const rgb = hexToRgb(hex);
                    if (rgb) {
                        enriched.rgb = rgb;
                        enriched.hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                        enriched.hex = hex;
                    }
                } else {
                    // No color data - leave blank
                    enriched.hex = null;
                    enriched.hsl = null;
                    enriched.rgb = null;
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
            if (!color) return null;
            
            // Check hex_color first (from API)
            if (color.hex_color && color.hex_color !== '未填写' && color.hex_color !== '') {
                return color.hex_color.startsWith('#') ? color.hex_color : '#' + color.hex_color;
            }
            
            // Check enriched hex
            if (color.hex) return color.hex;
            
            // Check RGB object
            if (color.rgb) {
                return `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
            }
            
            // Check individual RGB values
            if (color.rgb_r != null && color.rgb_g != null && color.rgb_b != null) {
                return `rgb(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b})`;
            }
            
            // Return null for truly blank colors
            return null;
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
            
            // Use the root's focusCustomColor method which handles everything properly
            if (this.$root && this.$root.focusCustomColor) {
                this.$root.focusCustomColor(this.selectedColor.color_code);
            }
        },
        
        printColors() {
            // Directly print the list view without options dialog
            const printWindow = window.open('', '_blank');
            const printContent = this.generatePrintContent();
            const date = new Date();
            const dateStr = `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
            
            const html = `
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <title>STEREOWOOD 自配色列表</title>
                    <style>
                        ${this.getPrintStyles(dateStr)}
                    </style>
                </head>
                <body>
                    ${printContent}
                </body>
                </html>
            `;
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Wait for content to load then print
            // Add a small delay to ensure content is fully rendered
            setTimeout(() => {
                try {
                    printWindow.focus();
                    printWindow.print();
                    
                    // Close window after print dialog is closed
                    printWindow.onafterprint = () => {
                        printWindow.close();
                    };
                    
                    // Also close after a timeout if onafterprint doesn't fire
                    setTimeout(() => {
                        if (!printWindow.closed) {
                            printWindow.close();
                        }
                    }, 10000); // Close after 10 seconds if still open
                } catch (error) {
                    console.error('Print error:', error);
                    if (printWindow && !printWindow.closed) {
                        printWindow.close();
                    }
                }
            }, 500); // Wait 500ms for content to render
        },
        
        generatePrintContent() {
            // Generate HTML with continuous flow of all colors
            let html = '<div class="print-container">';
            const date = new Date();
            
            // Create one continuous grid with all colors
            html += '<div class="all-colors">';
            
            // Group colors by category but display in continuous flow
            const colorsByCategory = {};
            this.enrichedColors.forEach(color => {
                const categoryName = this.getCategoryName(color.category_id);
                if (!colorsByCategory[categoryName]) {
                    colorsByCategory[categoryName] = [];
                }
                colorsByCategory[categoryName].push(color);
            });
            
            // Sort categories to match list view order
            const categoryOrder = ['蓝色系', '黄色系', '红色系', '绿色系', '紫色系', '色精', '黑白灰色系', '其他'];
            const sortedCategories = categoryOrder.filter(cat => colorsByCategory[cat]);
            
            // Add any remaining categories not in the order
            Object.keys(colorsByCategory).forEach(cat => {
                if (!sortedCategories.includes(cat)) {
                    sortedCategories.push(cat);
                }
            });
            
            // Generate all colors in continuous flow
            sortedCategories.forEach(categoryName => {
                const colors = colorsByCategory[categoryName];
                
                // Add category label inline
                html += `<div style="width: 100%; clear: both; margin: 15px 0 10px 0;">
                    <div class="category-label">${categoryName}</div>
                </div>`;
                
                // Add colors for this category
                colors.forEach(color => {
                    const bgStyle = this.getColorStyle(color);
                    html += `
                        <div class="print-color-chip">
                            <div class="color-preview${!bgStyle ? ' blank-color' : ''}" ${bgStyle ? `style="background: ${bgStyle}"` : ''}>
                                ${!bgStyle ? '<span>无</span>' : ''}
                            </div>
                            <div class="color-label">${color.color_code}</div>
                        </div>
                    `;
                });
            });
            
            html += '</div>'; // close all-colors
            
            // Footer will be handled by CSS @page rules
            html += '</div>';
            return html;
        },
        
        getCategoryName(categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            return category ? category.name : '其他';
        },
        
        getPrintStyles(dateStr) {
            return `
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Microsoft YaHei', Arial, sans-serif;
                    font-size: 12px;
                    line-height: 1.4;
                    margin: 0;
                    padding: 0;
                }
                
                .print-container {
                    /* Reduced padding - half of original */
                    padding: 0;
                    margin: 0;
                }
                
                .all-colors {
                    /* Single continuous grid for all colors */
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    padding: 0;
                    margin: 0;
                }
                
                .category-label {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    margin-top: 15px;
                    color: #333;
                    width: 100%;
                    /* Prevent page break after category label */
                    page-break-after: avoid;
                }
                
                .print-color-chip {
                    width: 80px;
                    text-align: center;
                    /* Prevent color chips from being split across pages */
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                
                .color-preview {
                    width: 80px;
                    height: 80px;
                    margin-bottom: 4px;
                    /* Rounded corners */
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    /* No border for filled colors */
                }
                
                .color-preview.blank-color {
                    background: #f5f5f5;
                    /* Dotted border only for blank colors */
                    border: 2px dashed #d9d9d9;
                }
                
                .color-preview span {
                    color: #999;
                    font-size: 12px;
                }
                
                .color-label {
                    font-size: 12px;
                    color: #666;
                    line-height: 1.2;
                    margin-bottom: 4px;
                }
                
                @page {
                    size: A4;
                    /* Reduced margins - approximately half */
                    margin: 10mm 8mm 15mm 8mm; /* top right bottom left */
                    
                    @bottom-left {
                        content: "${dateStr}";
                        font-size: 10px;
                        color: #000; /* Changed to black */
                    }
                    
                    @bottom-right {
                        content: counter(page);
                        font-size: 10px;
                        color: #000; /* Changed to black */
                    }
                }
                
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    
                    /* Ensure first page content starts immediately */
                    @page:first {
                        margin-top: 10mm;
                    }
                }
            `;
        },
        
        syncCategories() {
            // Listen for category updates from custom colors page
            window.addEventListener('categories-updated', (event) => {
                this.categories = event.detail || [];
                // Re-enrich colors when categories change
                if (this.colors.length > 0) {
                    this.enrichColors();
                }
            });
            
            // Also sync with global data if available
            if (this.$root && this.$root.categories) {
                // Watch for category changes
                this.$watch(() => this.$root.categories, (newCategories) => {
                    if (newCategories && newCategories.length > 0) {
                        this.categories = newCategories;
                        // Re-enrich colors when categories change
                        if (this.colors.length > 0) {
                            this.enrichColors();
                        }
                    }
                }, { deep: true });
            }
        },
        
        syncColors() {
            // Listen for color updates
            window.addEventListener('colors-updated', (event) => {
                this.colors = event.detail || [];
                this.enrichColors();
            });
            
            // Also sync with global data if available
            if (this.$root && this.$root.customColors) {
                // Watch for color changes
                this.$watch(() => this.$root.customColors, (newColors) => {
                    if (newColors && newColors.length > 0) {
                        this.colors = newColors;
                        this.enrichColors();
                    }
                }, { deep: true });
            }
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
        
        setupLazyLoading() {
            // Lazy load images for performance
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src && !img.src) {
                            img.src = img.dataset.src;
                            img.onload = () => {
                                img.classList.add('loaded');
                            };
                        }
                        imageObserver.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px'
            });
            
            // Observe all lazy images
            this.$nextTick(() => {
                const lazyImages = this.$el.querySelectorAll('img[data-src]');
                lazyImages.forEach(img => imageObserver.observe(img));
            });
            
            // Store observer for cleanup
            this._imageObserver = imageObserver;
        },
        
        setupEventHandlers() {
            // Keyboard navigation handler
            this.handleKeyDown = (event) => {
                const target = event.target;
                if (target instanceof Element) {
                    const editableRoot = target.closest('input, textarea, [contenteditable="true"], .el-input__inner, .el-textarea__inner');
                    if (editableRoot) {
                        return;
                    }
                }

                if (event.key === 'Escape' && this.selectedColorId) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.selectedColorId = null;
                    return;
                }

                if (event.key === 'p' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    this.printColors();
                    return;
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
                             :data-color-id="color.id"
                             tabindex="0"
                             @click="$emit('select', color)"
                             @mouseenter="$emit('hover', color)"
                             @mouseleave="$emit('hover', null)">
                            <div class="color-preview" 
                                 :class="{ 'blank-color': !getColorStyle(color) }"
                                 :style="getColorStyle(color) ? { background: getColorStyle(color) } : {}">
                                <span v-if="!getColorStyle(color)" class="blank-text">无</span>
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
                             :data-color-id="color.id"
                             tabindex="0"
                             @click="$emit('select', color)"
                             @mouseenter="$emit('hover', color)"
                             @mouseleave="$emit('hover', null)">
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
                // Sort by HSL (brightness and saturation) - 2D arrangement
                return [...colors].sort((a, b) => {
                    if (!a.hsl || !b.hsl) return 0;
                    
                    // Group by lightness (10 levels)
                    const lightGroupA = Math.floor(a.hsl.l / 10);
                    const lightGroupB = Math.floor(b.hsl.l / 10);
                    
                    if (lightGroupA !== lightGroupB) {
                        return lightGroupA - lightGroupB;
                    }
                    
                    // Within same lightness, sort by saturation (high to low)
                    return b.hsl.s - a.hsl.s;
                });
            } else {
                // Sort by name (color_code) - extract numbers for proper sorting
                return [...colors].sort((a, b) => {
                    const codeA = a.color_code || '';
                    const codeB = b.color_code || '';
                    
                    // Extract prefix and number parts (e.g., "YE001" -> ["YE", "001"])
                    const matchA = codeA.match(/^([A-Z]+)(\d+)$/);
                    const matchB = codeB.match(/^([A-Z]+)(\d+)$/);
                    
                    if (matchA && matchB) {
                        // Compare prefixes first
                        const prefixCompare = matchA[1].localeCompare(matchB[1]);
                        if (prefixCompare !== 0) return prefixCompare;
                        
                        // If prefixes are same, compare numbers
                        return parseInt(matchA[2]) - parseInt(matchB[2]);
                    }
                    
                    // Fallback to regular string comparison
                    return codeA.localeCompare(codeB, 'zh-CN');
                });
            }
        },
        
        getColorStyle(color) {
            if (color.hex_color && color.hex_color !== '未填写' && color.hex_color !== '') {
                return color.hex_color.startsWith('#') ? color.hex_color : '#' + color.hex_color;
            }
            if (color.hex) return color.hex;
            if (color.rgb) {
                return `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
            }
            if (color.rgb_r != null && color.rgb_g != null && color.rgb_b != null) {
                return `rgb(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b})`;
            }
            return null; // Return null for blank colors
        }
    }
};

// HSL View Component for Color Dictionary - Fixed with original UI
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
            if (!color) return null;
            // Check hex_color first (from API)
            if (color.hex_color && color.hex_color !== '未填写' && color.hex_color !== '') {
                return color.hex_color.startsWith('#') ? color.hex_color : '#' + color.hex_color;
            }
            // Then check enriched hex
            if (color.hex) {
                return color.hex;
            }
            // Check RGB values
            if (color.rgb_r != null && color.rgb_g != null && color.rgb_b != null) {
                return `rgb(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b})`;
            }
            return null;
        }
    }
};

// Wheel View Component for Color Dictionary - Fixed with color previews and click detection
const WheelDictionaryView = {
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
                <!-- Overlay color dots on the wheel -->
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
                        :title="color.color_code + ' - ' + color.color_name"
                    >
                        <span v-if="!getColorStyle(color)" class="blank-dot">×</span>
                    </div>
                </div>
                <!-- Click indicator -->
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
            
            <!-- Matched colors section -->
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
        colors: Array,
        selectedColor: Object
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
            let filtered = this.colors;
            
            if (this.showOnlyWithRGB) {
                filtered = filtered.filter(c => 
                    c.rgb_r != null && c.rgb_g != null && c.rgb_b != null
                );
            }
            
            return filtered;
        },
        
        positionedColors() {
            // Position colors on the wheel based on their HSL values
            return this.visibleColors.map(color => {
                if (!color.hsl || color.hsl.h === undefined) {
                    // Place colors without HSL in the center
                    return {
                        ...color,
                        x: this.centerX + (Math.random() - 0.5) * 40,
                        y: this.centerY + (Math.random() - 0.5) * 40
                    };
                }
                
                // Calculate position based on hue and saturation
                const angle = (color.hsl.h * Math.PI) / 180;
                const distance = (color.hsl.s / 100) * this.radius * 0.9; // 90% of radius max
                
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
            // Recalculate matched colors when range changes
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
            
            // Clear canvas
            ctx.clearRect(0, 0, 600, 600);
            
            // Draw color wheel gradient
            for (let angle = 0; angle < 360; angle += 2) {
                const startAngle = (angle - 1) * Math.PI / 180;
                const endAngle = (angle + 1) * Math.PI / 180;
                
                // Create gradient from center to edge
                const gradient = ctx.createRadialGradient(
                    this.centerX, this.centerY, 0,
                    this.centerX, this.centerY, this.radius
                );
                
                // HSL color at this angle
                gradient.addColorStop(0, `hsl(${angle}, 0%, 50%)`);
                gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
                
                // Draw wedge
                ctx.beginPath();
                ctx.moveTo(this.centerX, this.centerY);
                ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();
            }
            
            // Draw border
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
            if (!color) return null;
            // Check hex_color first (from API)
            if (color.hex_color && color.hex_color !== '未填写' && color.hex_color !== '') {
                return color.hex_color.startsWith('#') ? color.hex_color : '#' + color.hex_color;
            }
            // Then check enriched hex
            if (color.hex) {
                return color.hex;
            }
            // Check RGB values
            if (color.rgb_r != null && color.rgb_g != null && color.rgb_b != null) {
                return `rgb(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b})`;
            }
            return null;
        },
        
        handleMouseDown(event) {
            const rect = this.wheelCanvas.getBoundingClientRect();
            // Calculate the scale factor between actual canvas size and CSS display size
            const scaleX = this.wheelCanvas.width / rect.width;
            const scaleY = this.wheelCanvas.height / rect.height;
            
            // Apply scale correction to get accurate canvas coordinates
            const x = (event.clientX - rect.left) * scaleX;
            const y = (event.clientY - rect.top) * scaleY;
            
            // Check if click is within the wheel
            const dx = x - this.centerX;
            const dy = y - this.centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > this.radius) {
                // Click outside the wheel
                this.clickedPoint = null;
                this.clickedColor = null;
                this.matchedColors = [];
                return;
            }
            
            // Store clicked point and start dragging
            this.clickedPoint = { x, y };
            this.isDragging = true;
            this.dragStart = { x: event.clientX, y: event.clientY };
            
            // Update color at this position
            this.updateColorAtPosition(x, y);
        },
        
        handleMouseMove(event) {
            if (!this.isDragging || !this.clickedPoint) return;
            
            const rect = this.wheelCanvas.getBoundingClientRect();
            const scaleX = this.wheelCanvas.width / rect.width;
            const scaleY = this.wheelCanvas.height / rect.height;
            
            const x = (event.clientX - rect.left) * scaleX;
            const y = (event.clientY - rect.top) * scaleY;
            
            // Check if new position is within the wheel
            const dx = x - this.centerX;
            const dy = y - this.centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.radius) {
                // Update position
                this.clickedPoint = { x, y };
                
                // Update color at new position
                this.updateColorAtPosition(x, y);
            }
        },
        
        handleMouseUp(event) {
            this.isDragging = false;
            this.dragStart = null;
        },
        
        handleMouseLeave(event) {
            this.isDragging = false;
            this.dragStart = null;
        },
        
        updateColorAtPosition(x, y) {
            // Calculate HSL from position
            const dx = x - this.centerX;
            const dy = y - this.centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const angle = Math.atan2(dy, dx);
            const hue = (angle * 180 / Math.PI + 360) % 360;
            const saturation = (distance / this.radius) * 100;
            const lightness = 50; // Fixed lightness for wheel
            
            // Create clicked color object
            this.clickedColor = {
                hsl: { h: hue, s: saturation, l: lightness },
                hex: `hsl(${hue}, ${saturation}%, ${lightness}%)`
            };
            
            // Convert to RGB for delta E calculation
            const rgb = this.hslToRgb(hue / 360, saturation / 100, lightness / 100);
            this.clickedColor.rgb_r = Math.round(rgb.r * 255);
            this.clickedColor.rgb_g = Math.round(rgb.g * 255);
            this.clickedColor.rgb_b = Math.round(rgb.b * 255);
            
            // Find matched colors
            this.updateMatchedColors();
            
            // Draw click indicator
            this.drawClickIndicator();
        },
        
        updateMatchedColors() {
            if (!this.clickedColor) {
                this.matchedColors = [];
                return;
            }
            
            // Calculate delta E for all visible colors
            const matched = [];
            
            for (const color of this.visibleColors) {
                if (color.rgb_r != null && color.rgb_g != null && color.rgb_b != null) {
                    const deltaE = this.calculateDeltaE(
                        this.clickedColor,
                        color
                    );
                    
                    if (deltaE <= this.proximityRange) {
                        matched.push({
                            ...color,
                            deltaE: deltaE
                        });
                    }
                }
            }
            
            // Sort by delta E
            matched.sort((a, b) => a.deltaE - b.deltaE);
            
            this.matchedColors = matched;
        },
        
        isMatched(color) {
            return this.matchedColors.some(m => m.id === color.id);
        },
        
        calculateDeltaE(color1, color2) {
            // Using CIE76 formula for simplicity
            // Convert RGB to LAB would be more accurate but this is sufficient
            const r1 = color1.rgb_r || 0;
            const g1 = color1.rgb_g || 0;
            const b1 = color1.rgb_b || 0;
            
            const r2 = color2.rgb_r || 0;
            const g2 = color2.rgb_g || 0;
            const b2 = color2.rgb_b || 0;
            
            // Simple Euclidean distance in RGB space
            // Scale to approximate delta E range (0-100)
            const dr = r1 - r2;
            const dg = g1 - g2;
            const db = b1 - b2;
            
            return Math.sqrt(dr * dr + dg * dg + db * db) * 0.4;
        },
        
        hslToRgb(h, s, l) {
            let r, g, b;
            
            if (s === 0) {
                r = g = b = l; // achromatic
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
        
        drawClickIndicator() {
            // Remove canvas drawing - we're using the div indicator instead
            // Just redraw the wheel background to clear any previous canvas marks
            if (this.ctx) {
                this.drawWheelBackground();
            }
        }
    }
};

// Register child components (use existing components from color-palette-dialog.js)
ColorDictionaryComponent.components = {
    'simplified-list-view': SimplifiedListView,
    'hsl-color-space-view': HslDictionaryView,  // Use our new HSL view
    'color-wheel-view': WheelDictionaryView  // Use our new Wheel view
};