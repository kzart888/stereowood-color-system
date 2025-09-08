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
                    <div v-if="selectedColor" 
                         class="color-swatch-preview" 
                         :style="{background: getColorStyle(selectedColor)}">
                    </div>
                    <div v-else class="empty-preview">
                        <span>请选择颜色</span>
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
                        <li><kbd>1</kbd> - 切换到列表导航</li>
                        <li><kbd>2</kbd> - 切换到HSL导航</li>
                        <li><kbd>3</kbd> - 切换到色轮导航</li>
                        <li><kbd>←</kbd> <kbd>→</kbd> - 在列表中左右移动选择</li>
                        <li><kbd>↑</kbd> <kbd>↓</kbd> - 在列表中上下移动选择（跳行）</li>
                        <li><kbd>Enter</kbd> - 在自配色管理中查看选中的颜色</li>
                        <li><kbd>Ctrl/Cmd + P</kbd> - 打印颜色列表</li>
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
            
            <!-- Print Options Dialog -->
            <el-dialog
                v-model="showPrintOptions"
                title="打印选项"
                width="500px"
                append-to-body
            >
                <div class="print-options-form">
                    <h4>选择要包含的信息</h4>
                    <el-checkbox v-model="printOptions.includeFormulas">包含配方</el-checkbox>
                    <el-checkbox v-model="printOptions.includeRGB">包含RGB值</el-checkbox>
                    <el-checkbox v-model="printOptions.includeCMYK">包含CMYK值</el-checkbox>
                    <el-checkbox v-model="printOptions.includeHEX">包含HEX值</el-checkbox>
                    <el-checkbox v-model="printOptions.includePantone">包含Pantone值</el-checkbox>
                    <el-checkbox v-model="printOptions.includeApplicableLayers">包含适用层</el-checkbox>
                    
                    <h4 style="margin-top: 20px;">布局设置</h4>
                    <div class="form-item">
                        <label>每页列数：</label>
                        <el-input-number 
                            v-model="printOptions.columnsPerPage" 
                            :min="3" 
                            :max="8" 
                            :step="1"
                        />
                    </div>
                    <el-checkbox v-model="printOptions.pageBreakBetweenCategories">
                        分类之间分页
                    </el-checkbox>
                </div>
                <template #footer>
                    <el-button @click="showPrintOptions = false">取消</el-button>
                    <el-button type="primary" @click="confirmPrint">确认打印</el-button>
                </template>
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
            showPrintOptions: false,
            printOptions: {
                includeFormulas: true,
                includeRGB: true,
                includeCMYK: false,
                includeHEX: true,
                includePantone: false,
                includeApplicableLayers: false,
                columnsPerPage: 6,
                pageBreakBetweenCategories: true
            }
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
            // Show print options dialog
            this.showPrintOptions = true;
        },
        
        confirmPrint() {
            this.showPrintOptions = false;
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
                            @page {
                                margin: 1cm;
                                size: A4;
                            }
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
                                grid-template-columns: repeat(${this.printOptions.columnsPerPage}, 1fr);
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
                    `;
                    
                    // Add optional information based on print options
                    const infoItems = [];
                    
                    if (this.printOptions.includeFormulas && color.formula) {
                        const formula = color.formula.length > 30 
                            ? color.formula.substring(0, 30) + '...' 
                            : color.formula;
                        infoItems.push(`配方: ${formula}`);
                    }
                    
                    if (this.printOptions.includeRGB && color.rgb) {
                        infoItems.push(`RGB: ${color.rgb.r},${color.rgb.g},${color.rgb.b}`);
                    }
                    
                    if (this.printOptions.includeCMYK && color.cmyk_c != null) {
                        infoItems.push(`CMYK: ${color.cmyk_c},${color.cmyk_m},${color.cmyk_y},${color.cmyk_k}`);
                    }
                    
                    if (this.printOptions.includeHEX && color.hex_color) {
                        infoItems.push(`HEX: ${color.hex_color}`);
                    }
                    
                    if (this.printOptions.includePantone) {
                        if (color.pantone_c) infoItems.push(`Pantone C: ${color.pantone_c}`);
                        if (color.pantone_u) infoItems.push(`Pantone U: ${color.pantone_u}`);
                    }
                    
                    if (this.printOptions.includeApplicableLayers && color.applicable_layers) {
                        infoItems.push(`适用层: ${color.applicable_layers}`);
                    }
                    
                    if (infoItems.length > 0) {
                        html += `<div class="color-info">${infoItems.join('<br>')}</div>`;
                    }
                    
                    html += `</div>`;
                });
                
                html += `
                        </div>
                    </div>
                `;
                
                // Add page break between categories if option is enabled
                if (this.printOptions.pageBreakBetweenCategories) {
                    html += `<div style="page-break-after: always;"></div>`;
                }
            });
            
            return html;
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
                // ESC key - deselect
                if (event.key === 'Escape' && this.selectedColorId) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.selectedColorId = null;
                    return;
                }
                
                // Ctrl/Cmd + P for printing
                if (event.key === 'p' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    this.printColors();
                    return;
                }
                
                // View switching with number keys
                if (event.key === '1' && !event.ctrlKey && !event.metaKey) {
                    event.preventDefault();
                    this.viewMode = 'list';
                    return;
                }
                if (event.key === '2' && !event.ctrlKey && !event.metaKey) {
                    event.preventDefault();
                    this.viewMode = 'hsl';
                    return;
                }
                if (event.key === '3' && !event.ctrlKey && !event.metaKey) {
                    event.preventDefault();
                    this.viewMode = 'wheel';
                    return;
                }
                
                // Arrow key navigation (only in list view)
                if (this.viewMode === 'list' && this.enrichedColors.length > 0) {
                    const handleArrowNavigation = () => {
                        const currentIndex = this.enrichedColors.findIndex(c => c.id === this.selectedColorId);
                        let newIndex = -1;
                        
                        switch(event.key) {
                            case 'ArrowRight':
                                event.preventDefault();
                                newIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, this.enrichedColors.length - 1);
                                break;
                            case 'ArrowLeft':
                                event.preventDefault();
                                newIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
                                break;
                            case 'ArrowDown':
                                event.preventDefault();
                                // Move down by approximate row width (10 items)
                                newIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 10, this.enrichedColors.length - 1);
                                break;
                            case 'ArrowUp':
                                event.preventDefault();
                                // Move up by approximate row width (10 items)
                                newIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 10, 0);
                                break;
                            case 'Enter':
                                if (this.selectedColorId) {
                                    event.preventDefault();
                                    // Navigate to color in management page
                                    this.navigateToColor();
                                }
                                return;
                        }
                        
                        if (newIndex >= 0 && newIndex < this.enrichedColors.length) {
                            this.selectedColorId = this.enrichedColors[newIndex].id;
                            // Scroll into view if needed
                            this.$nextTick(() => {
                                const element = this.$el.querySelector(`.color-chip-80[data-color-id="${this.selectedColorId}"]`);
                                if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            });
                        }
                    };
                    
                    if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
                        handleArrowNavigation();
                    }
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
                             :data-color-id="color.id"
                             tabindex="0"
                             @click="$emit('select', color)"
                             @mouseenter="$emit('hover', color)"
                             @mouseleave="$emit('hover', null)">
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