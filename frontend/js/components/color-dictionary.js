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

const ColorDictionaryService = window.ColorDictionaryService;

if (!ColorDictionaryService) {
    console.error('ColorDictionaryService is not available.');
}

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
                <button 
                    type="button" 
                    class="category-switch" 
                    :class="{active: viewMode === 'matcher'}"
                    @click="viewMode = 'matcher'"
                >
                    智能匹配
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
                
                <!-- Matcher View -->
                <color-matcher-view
                    v-else-if="viewMode === 'matcher'"
                    :colors="enrichedColors"
                    :categories="categories"
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
                    
                    <h4>智能匹配</h4>
                    <ul>
                        <li>输入 RGB / CMYK / HEX / HSL 任意组合</li>
                        <li>系统自动换算其余色彩数值</li>
                        <li>基于 ΔE 排序展示最近似的自配色</li>
                        <li>可在自动与手动匹配模式之间切换</li>
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
            viewMode: 'list', // list | hsl | wheel | matcher
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
            if (!ColorDictionaryService || !ColorDictionaryService.enrichColors) {
                this.enrichedColors = Array.isArray(this.colors) ? [...this.colors] : [];
                return;
            }
            this.enrichedColors = ColorDictionaryService.enrichColors(this.colors);
        },
        
        getDefaultColorForCategory(categoryId) {
            if (ColorDictionaryService && ColorDictionaryService.getDefaultColorForCategory) {
                return ColorDictionaryService.getDefaultColorForCategory(categoryId);
            }
            return { r: 128, g: 128, b: 128 };
        },
        
        getCategoryName(categoryId) {
            if (ColorDictionaryService && ColorDictionaryService.getCategoryName) {
                return ColorDictionaryService.getCategoryName(this.categories, categoryId);
            }
            const category = this.categories.find(c => c.id === categoryId);
            return category ? category.name : '未分类';
        },
        
        getColorStyle(color) {
            if (ColorDictionaryService && ColorDictionaryService.getColorStyle) {
                return ColorDictionaryService.getColorStyle(color);
            }
            if (!color) return null;
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
            return null;
        },
        
        formatDate(dateStr) {
            if (ColorDictionaryService && ColorDictionaryService.formatDate) {
                return ColorDictionaryService.formatDate(dateStr);
            }
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            return date.toLocaleDateString('zh-CN');
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
                if (savedView && ['list', 'hsl', 'wheel', 'matcher'].includes(savedView)) {
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
        
        generatePrintContent() {
            if (ColorDictionaryService && ColorDictionaryService.generatePrintContent) {
                return ColorDictionaryService.generatePrintContent(this.enrichedColors, this.categories);
            }
            return '';
        },

        getPrintStyles(dateStr) {
            if (ColorDictionaryService && ColorDictionaryService.getPrintStyles) {
                return ColorDictionaryService.getPrintStyles(dateStr);
            }
            return '';
        },



        handleColorSelect(color) {
            if (color && color.id) {
                this.selectedColorId = color.id === this.selectedColorId ? null : color.id;
            }
        },

        handleColorHover(color) {
            this.hoveredColor = color || null;
        },

        navigateToColor() {
            if (!this.selectedColor) {
                return;
            }
            if (this.$root && typeof this.$root.focusCustomColor === 'function') {
                this.$root.focusCustomColor(this.selectedColor.color_code);
            }
        },

        printColors() {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                if (this.$message && typeof this.$message.error === 'function') {
                    this.$message.error('无法打开打印窗口');
                }
                return;
            }

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

            setTimeout(() => {
                try {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.onafterprint = () => printWindow.close();
                    setTimeout(() => {
                        if (!printWindow.closed) {
                            printWindow.close();
                        }
                    }, 2000);
                } catch (error) {
                    console.error('Failed to print colors:', error);
                    printWindow.close();
                }
            }, 300);
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

ColorDictionaryComponent.components = {
    'simplified-list-view': window.ColorDictionaryListView,
    'hsl-color-space-view': window.ColorDictionaryHslView,
    'color-wheel-view': window.ColorDictionaryWheelView,
    'color-matcher-view': window.ColorDictionaryMatcherView
};
