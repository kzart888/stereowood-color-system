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

const colorDictionaryMixins = window.ColorDictionaryMixins || {};
const colorDictionaryViews = window.ColorDictionaryViews || {};
const colorDictionaryChildComponents = {};
if (colorDictionaryViews.SimplifiedListView) {
    colorDictionaryChildComponents['simplified-list-view'] = colorDictionaryViews.SimplifiedListView;
}
if (colorDictionaryViews.HslDictionaryView) {
    colorDictionaryChildComponents['hsl-color-space-view'] = colorDictionaryViews.HslDictionaryView;
}
if (colorDictionaryViews.WheelDictionaryView) {
    colorDictionaryChildComponents['color-wheel-view'] = colorDictionaryViews.WheelDictionaryView;
}

const ColorDictionaryComponent = {
    mixins: [
        colorDictionaryMixins.data,
        colorDictionaryMixins.interactions
    ].filter(Boolean),

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
        this.initializeCategorySync();
        this.initializeColorSync();
        
        // Setup lazy loading for images (performance optimization)
        this.$nextTick(() => {
            this.setupLazyLoading();
        });
    },
    

    beforeUnmount() {
        this.removeEventHandlers();
        this.teardownSyncListeners();
        // Cleanup image observer
        if (this._imageObserver) {
            this._imageObserver.disconnect();
        }
    },
    
    components: colorDictionaryChildComponents
};

window.ColorDictionaryComponent = ColorDictionaryComponent;
