// 自配颜色管理组件 - Enhanced Version with RGB/CMYK/HEX/Pantone
// 文件路径: frontend/js/components/custom-colors.js
// 定义全局变量 CustomColorsComponent，被 app.js 引用并注册

const CustomColorsComponent = {
    props: {
        sortMode: { type: String, default: 'time' } // time | name
    },

    mixins: [
        window.CustomColorFilteringMixin,
        window.CustomColorPaginationMixin,
        window.CustomColorSelectionMixin,
        window.CustomColorMediaMixin,
        window.CustomColorDuplicateMixin
    ],

    template: `
        <div class="custom-colors-page">
            <div class="category-switch-group" role="tablist" aria-label="颜色分类筛选">
                <button type="button" class="category-switch" :class="{active: activeCategory==='all'}" @click="activeCategory='all'" role="tab" :aria-selected="activeCategory==='all'">全部</button>
                <button 
                    v-for="cat in orderedCategoriesWithOther" 
                    :key="cat.id || 'other'"
                    type="button"
                    class="category-switch"
                    :class="{active: activeCategory===String(cat.id || 'other')}"
                    @click="activeCategory=String(cat.id || 'other')"
                    role="tab"
                    :aria-selected="activeCategory===String(cat.id || 'other')"
                >{{ cat.name }}</button>
                <button 
                    type="button"
                    class="category-settings-btn"
                    @click="showCategoryManager = true"
                    title="管理分类"
                >
                    <el-icon><Setting /></el-icon>
                </button>
            </div>
            
            <div v-if="loading" class="loading"><el-icon class="is-loading"><Loading /></el-icon> 加载中...</div>
            <div v-else>
                <div v-if="filteredColors.length === 0" class="empty-message">暂无自配色，点击右上角"新自配色"添加</div>
                
                <!-- Grid Container for Cards -->
                <div class="color-cards-grid">
                    <div v-for="color in paginatedColors" :key="color.id + '-' + refreshKey" class="artwork-bar" :ref="setColorItemRef(color)" :data-color-id="color.id" :class="{'highlight-pulse': highlightCode === color.color_code, 'selected': selectedColorId === color.id}" @click="toggleColorSelection(color.id, $event)">
                    <div class="artwork-header" style="display:flex; padding:8px; align-items:center; justify-content:space-between;">
                        <div style="display:flex; align-items:center;">
                            <div class="artwork-title" style="width:88px; flex-shrink:0;">
                                {{ color.color_code }}
                            </div>
                            <div class="header-meta-group" style="margin-left:12px;">
                                <span class="header-meta">分类: {{ categoryName(color) }}</span>
                                <span class="header-meta" v-if="color.updated_at">更新: {{ $helpers.formatDate(color.updated_at) }}</span>
                            </div>
                        </div>
                        <div class="color-actions">
                            <el-button size="small" @click="$calc && $calc.open(color.color_code, color.formula||'', $event.currentTarget)"><el-icon><ScaleToOriginal /></el-icon> 计算</el-button>
                            <el-button size="small" type="primary" @click="editColor(color)"><el-icon><Edit /></el-icon> 修改</el-button>
                            <el-button size="small" @click="viewHistory(color)" disabled><el-icon><Clock /></el-icon> 历史</el-button>
                            <template v-if="isColorReferenced(color)">
                                <el-tooltip content="该自配色已被引用，无法删除" placement="top">
                                    <span>
                                        <el-button size="small" type="danger" disabled><el-icon><Delete /></el-icon> 删除</el-button>
                                    </span>
                                </el-tooltip>
                            </template>
                            <el-button v-else size="small" type="danger" @click="deleteColor(color)"><el-icon><Delete /></el-icon> 删除</el-button>
                        </div>
                    </div>
                    
                    <div style="display:flex; gap:12px; padding:8px; align-items:stretch;">
                        <div class="scheme-thumbnail" :class="{ 'no-image': !color.image_path }" @click="color.image_path && $thumbPreview && $thumbPreview.show($event, $helpers.buildUploadURL(baseURL, color.image_path))">
                            <template v-if="!color.image_path">未上传图片</template>
                            <img v-else :src="$helpers.buildUploadURL(baseURL, color.image_path)" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                        </div>
                        
                        <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; position:relative;">
                            
                            <div class="meta-text" v-if="!color.formula">配方: (未指定配方)</div>
                            <div class="meta-text" v-else>配方：
                                <span class="usage-chips">
                                    <span v-for="(seg,i) in formulaUtils.segments(color.formula)" :key="'ccf'+color.id+'-'+i" class="mf-chip">{{ seg }}</span>
                                </span>
                            </div>
                            
                            <!-- Color Information Row 1: RGB, CMYK, HEX -->
                            <div class="meta-text color-info-row">
                                <span class="color-value-group">
                                    <span v-if="color.rgb_r != null || color.rgb_g != null || color.rgb_b != null" class="color-swatch-inline" :style="{background: 'rgb(' + (color.rgb_r||0) + ', ' + (color.rgb_g||0) + ', ' + (color.rgb_b||0) + ')'}"></span>
                                    <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                    <span class="color-label-inline">RGB:</span>
                                    <span v-if="color.rgb_r != null || color.rgb_g != null || color.rgb_b != null">
                                        {{ color.rgb_r || 0 }}, {{ color.rgb_g || 0 }}, {{ color.rgb_b || 0 }}
                                    </span>
                                    <span v-else class="color-value-empty">未填写</span>
                                </span>
                                <span class="color-value-group">
                                    <span v-if="color.cmyk_c != null || color.cmyk_m != null || color.cmyk_y != null || color.cmyk_k != null" class="color-swatch-inline" :style="{background: getCMYKColor(color.cmyk_c || 0, color.cmyk_m || 0, color.cmyk_y || 0, color.cmyk_k || 0)}"></span>
                                    <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                    <span class="color-label-inline">CMYK:</span>
                                    <span v-if="color.cmyk_c != null || color.cmyk_m != null || color.cmyk_y != null || color.cmyk_k != null">
                                        {{ color.cmyk_c || 0 }}, {{ color.cmyk_m || 0 }}, {{ color.cmyk_y || 0 }}, {{ color.cmyk_k || 0 }}
                                    </span>
                                    <span v-else class="color-value-empty">未填写</span>
                                </span>
                                <span class="color-value-group">
                                    <span v-if="color.hex_color" class="color-swatch-inline" :style="{background: color.hex_color}"></span>
                                    <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                    <span class="color-label-inline">HEX:</span>
                                    <span v-if="color.hex_color">
                                        {{ color.hex_color }}
                                    </span>
                                    <span v-else class="color-value-empty">未填写</span>
                                </span>
                            </div>
                            
                            <!-- Color Information Row 2: Pantone (U aligned with CMYK) -->
                            <div class="meta-text color-info-row pantone-row">
                                <span class="color-value-group pantone-c-group">
                                    <span v-if="color.pantone_coated" class="color-swatch-inline" :style="getPantoneSwatchStyle(color.pantone_coated)"></span>
                                    <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                    <span class="color-label-inline">Pantone C:</span>
                                    <span v-if="color.pantone_coated">{{ color.pantone_coated }}</span>
                                    <span v-else class="color-value-empty">未填写</span>
                                </span>
                                <span class="color-value-group pantone-u-group">
                                    <span v-if="color.pantone_uncoated" class="color-swatch-inline" :style="getPantoneSwatchStyle(color.pantone_uncoated)"></span>
                                    <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                    <span class="color-label-inline">Pantone U:</span>
                                    <span v-if="color.pantone_uncoated">{{ color.pantone_uncoated }}</span>
                                    <span v-else class="color-value-empty">未填写</span>
                                </span>
                                <span class="pantone-spacer"></span> <!-- Spacer for third column -->
                            </div>
                            
                            <div class="meta-text">适用层：
                                <template v-if="usageGroups(color).length">
                                    <span class="usage-chips">
                                        <span v-for="g in usageGroups(color)" :key="'ug'+color.id+g.display" class="mf-chip usage-chip" style="cursor:pointer;" @click="$root && $root.focusArtworkScheme && $root.focusArtworkScheme(g)">{{ g.display }}</span>
                                    </span>
                                </template>
                                <span v-else>(未使用)</span>
                            </div>
                        </div>
                    </div>
                </div>
                </div><!-- End of color-cards-grid -->
                
                <!-- Pagination Controls -->
                <div v-if="filteredColors.length > 0" class="pagination-container">
                    <div class="pagination-info">
                        显示 {{ startItem }}-{{ endItem }} 共 {{ filteredColors.length }} 项
                    </div>
                    
                    <div class="pagination-controls">
                        <el-button 
                            size="small"
                            :disabled="currentPage === 1"
                            @click="goToPage(1)">
                            <el-icon><DArrowLeft /></el-icon>
                            <span>首页</span>
                        </el-button>
                        
                        <el-button 
                            size="small"
                            :disabled="currentPage === 1"
                            @click="goToPage(currentPage - 1)">
                            <el-icon><ArrowLeft /></el-icon>
                            <span>上一页</span>
                        </el-button>
                        
                        <span class="page-numbers">
                            <button 
                                v-for="page in visiblePages"
                                :key="page"
                                :class="{ active: page === currentPage, ellipsis: page === '...' }"
                                :disabled="page === '...'"
                                @click="goToPage(page)">
                                {{ page }}
                            </button>
                        </span>
                        
                        <el-button 
                            size="small"
                            :disabled="currentPage === totalPages"
                            @click="goToPage(currentPage + 1)">
                            <span>下一页</span>
                            <el-icon><ArrowRight /></el-icon>
                        </el-button>
                        
                        <el-button 
                            size="small"
                            :disabled="currentPage === totalPages"
                            @click="goToPage(totalPages)">
                            <span>末页</span>
                            <el-icon><DArrowRight /></el-icon>
                        </el-button>
                    </div>
                    
                    <div class="items-per-page">
                        <span>每页显示：</span>
                        <el-select v-model="itemsPerPage" @change="onItemsPerPageChange" size="small">
                            <el-option v-if="isDevelopmentMode" :value="2" label="2 项" />
                            <el-option :value="12" label="12 项" />
                            <el-option :value="24" label="24 项" />
                            <el-option :value="48" label="48 项" />
                            <el-option :value="0" label="全部" />
                        </el-select>
                    </div>
                </div>
            </div>
            
            <!-- Category Manager Dialog -->
            <category-manager
                :visible="showCategoryManager"
                @update:visible="showCategoryManager = $event"
                :categories="categories"
                category-type="colors"
                @updated="handleCategoriesUpdated"
            />
            
            <!-- Add/Edit Dialog -->
            <el-dialog 
                v-model="showAddDialog" 
                class="scheme-dialog"
                :title="editingColor ? '修改自配色' : '添加自配色'"
                width="600px"
                :close-on-click-modal="false"
                :close-on-press-escape="false"
                @open="onOpenColorDialog"
                @close="resetForm"
            >
                <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" @keydown.enter.stop.prevent="saveColor">
                    <el-form-item label="颜色分类" prop="category_id">
                        <el-select v-model="form.category_id" placeholder="选择分类" @change="onCategoryChange">
                            <el-option v-for="cat in categoriesWithOther" :key="cat.id || 'other'" :label="cat.name" :value="cat.id || 'other'" />
                        </el-select>
                    </el-form-item>
                    
                    <el-form-item label="颜色编号" prop="color_code">
                        <div class="dup-inline-row">
                            <el-input v-model="form.color_code" placeholder="如：BU001" @input="onColorCodeInput" />
                            <span v-if="colorCodeDuplicate" class="dup-msg">该编号已存在</span>
                        </div>
                    </el-form-item>
                    
                    <el-form-item label="配方">
                        <formula-editor 
                            v-if="showAddDialog"
                            v-model="form.formula"
                            :mont-marte-colors="montMarteColors"
                        />
                    </el-form-item>
                    
                    <el-form-item label="颜色样本">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="scheme-thumbnail" 
                                 :class="{ 'no-image': !form.imagePreview }" 
                                 style="width: 80px; height: 80px; flex-shrink: 0;"
                                 @click="form.imagePreview && $thumbPreview && $thumbPreview.show($event, form.imagePreview)">
                                <template v-if="!form.imagePreview">未上传图片</template>
                                <img v-else :src="form.imagePreview" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                            </div>
                            
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <el-upload
                                    :auto-upload="false"
                                    :show-file-list="false"
                                    :on-change="handleImageChange"
                                    accept="image/*"
                                >
                                    <el-button size="small" type="primary">
                                        <el-icon><Upload /></el-icon>
                                        {{ form.imagePreview ? '更换图片' : '上传图片' }}
                                    </el-button>
                                </el-upload>
                                
                                <el-button 
                                    v-if="form.imagePreview"
                                    size="small"
                                    @click="clearImage"
                                >
                                    <el-icon><Delete /></el-icon>
                                    清除图片
                                </el-button>
                            </div>
                        </div>
                    </el-form-item>
                    
                    <!-- Color Information Section -->
                    <el-form-item label="颜色信息" class="color-info-header">
                        <div class="color-action-buttons">
                            <el-button 
                                size="small" 
                                type="primary" 
                                @click="extractColorFromImage"
                                :disabled="!hasImageAvailable">
                                <el-icon><Camera /></el-icon>
                                计算基础色值
                            </el-button>
                            <el-button 
                                size="small" 
                                @click="findPantoneMatch"
                                :disabled="!(form.rgb_r != null && form.rgb_g != null && form.rgb_b != null)">
                                <el-icon><Search /></el-icon>
                                匹配潘通色号
                            </el-button>
                            <el-button 
                                size="small" 
                                type="warning"
                                @click="clearColorValues">
                                <el-icon><Delete /></el-icon>
                                清除色值
                            </el-button>
                        </div>
                    </el-form-item>
                    
                    <!-- RGB Input -->
                    <el-form-item label="RGB:">
                        <div class="color-input-row">
                            <div class="color-swatch-wrapper">
                                <div class="color-swatch" :style="rgbSwatchStyle"></div>
                                <span v-if="!hasRGBValue" class="swatch-empty-text">未</span>
                            </div>
                            <el-input v-model.number="form.rgb_r" placeholder="R" class="color-input-small" :min="0" :max="255" />
                            <el-input v-model.number="form.rgb_g" placeholder="G" class="color-input-small" :min="0" :max="255" />
                            <el-input v-model.number="form.rgb_b" placeholder="B" class="color-input-small" :min="0" :max="255" />
                        </div>
                    </el-form-item>
                    
                    <!-- CMYK Input -->
                    <el-form-item label="CMYK:">
                        <div class="color-input-row">
                            <div class="color-swatch-wrapper">
                                <div class="color-swatch" :style="cmykSwatchStyle"></div>
                                <span v-if="!hasCMYKValue" class="swatch-empty-text">未</span>
                            </div>
                            <el-input v-model.number="form.cmyk_c" placeholder="C" class="color-input-small" :min="0" :max="100" />
                            <el-input v-model.number="form.cmyk_m" placeholder="M" class="color-input-small" :min="0" :max="100" />
                            <el-input v-model.number="form.cmyk_y" placeholder="Y" class="color-input-small" :min="0" :max="100" />
                            <el-input v-model.number="form.cmyk_k" placeholder="K" class="color-input-small" :min="0" :max="100" />
                        </div>
                    </el-form-item>
                    
                    <!-- HEX Input -->
                    <el-form-item label="HEX:">
                        <div class="color-input-row">
                            <div class="color-swatch-wrapper">
                                <div class="color-swatch" :style="hexSwatchStyle"></div>
                                <span v-if="!hasHEXValue" class="swatch-empty-text">未</span>
                            </div>
                            <el-input v-model="form.hex_color" placeholder="#000000" class="color-input-hex" />
                        </div>
                    </el-form-item>
                    
                    <!-- Pantone Coated -->
                    <el-form-item label="Pantone C:">
                        <div class="color-input-row">
                            <div class="color-swatch-wrapper">
                                <div class="color-swatch" :style="pantoneCoatedSwatchStyle"></div>
                                <span v-if="!hasPantoneCoatedValue" class="swatch-empty-text">未</span>
                            </div>
                            <el-input v-model="form.pantone_coated" placeholder="如: 185 C" class="color-input-pantone" />
                        </div>
                    </el-form-item>
                    
                    <!-- Pantone Uncoated -->
                    <el-form-item label="Pantone U:">
                        <div class="color-input-row">
                            <div class="color-swatch-wrapper">
                                <div class="color-swatch" :style="pantoneUncoatedSwatchStyle"></div>
                                <span v-if="!hasPantoneUncoatedValue" class="swatch-empty-text">未</span>
                            </div>
                            <el-input v-model="form.pantone_uncoated" placeholder="如: 185 U" class="color-input-pantone" />
                        </div>
                    </el-form-item>
                </el-form>
                
                <template #footer>
                    <el-button @click="attemptCloseAddDialog">取消</el-button>
                    <el-button type="primary" @click="saveColor" :disabled="colorCodeDuplicate || saving">
                        <el-icon v-if="saving" class="is-loading"><Loading /></el-icon>
                        {{ saving ? '保存中...' : '保存' }}
                    </el-button>
                </template>
            </el-dialog>
            
            <!-- Duplicate Check Dialog -->
            <el-dialog
                v-model="showDuplicateDialog"
                class="dup-groups-dialog"
                title="重复配方处理(比例等价)"
                width="760px"
                :close-on-click-modal="false"
                :close-on-press-escape="false"
            >
                <div v-if="!duplicateGroups.length" class="meta-text">暂无重复组</div>
                <div v-else class="dup-groups-wrapper">
                    <div class="dup-group-block" v-for="grp in duplicateGroups" :key="grp.signature">
                        <div class="dup-group-head">
                            <span class="dup-group-badge">{{ grp.records.length }} 条</span>
                            <span class="dup-group-formula">
                                <el-tag v-for="it in grp.parsed.items" :key="it.name+'-'+it.unit" size="small" disable-transitions>
                                    {{ it.name }} {{ it.ratio }}
                                </el-tag>
                            </span>
                        </div>
                        <div class="dup-records">
                            <div class="dup-record-row" v-for="rec in grp.records" :key="rec.id" :class="{ 'is-referenced': isColorReferenced(rec) }">
                                <label class="keep-radio">
                                    <input type="radio" :name="'keep-'+grp.signature" :value="rec.id" v-model="duplicateSelections[grp.signature]" />
                                    <span>保留</span>
                                </label>
                                <span class="code" @click="focusCustomColor(rec.color_code)">{{ rec.color_code }}</span>
                                <span class="meta" v-if="rec.updated_at">{{ $helpers.formatDate(rec.updated_at) }}</span>
                                <span class="ref-flag" v-if="isColorReferenced(rec)">被引用</span>
                            </div>
                        </div>
                    </div>
                </div>
                <template #footer>
                    <el-button @click="keepAllDuplicates" :disabled="deletionPending">全部保留</el-button>
                    <el-button type="primary" :disabled="!canDeleteAny || deletionPending" @click="performDuplicateDeletion">保留所选并删除其它</el-button>
                    <el-tooltip content="更新引用到保留记录后删除其它（包括已被引用的记录）" placement="top">
                        <span>
                            <el-button type="danger" :disabled="!canForceMerge || deletionPending || mergingPending" :loading="mergingPending" @click="confirmForceMerge">强制合并（更新引用）</el-button>
                        </span>
                    </el-tooltip>
                </template>
            </el-dialog>
            
            <!-- Color Palette Dialog removed - now using standalone Color Dictionary page -->
        </div>
    `,
    
    inject: ['globalData'],
    
    data() {
        // Initial items per page - will be updated from app config in mounted
        
        return {
            loading: false,
            activeCategory: 'all',
            showAddDialog: false,
            showCategoryManager: false,
            editingColor: null,
            saving: false,
            refreshKey: 0,

            // Form data with color fields
            form: {
                category_id: '',
                color_code: '',
                formula: '',
                imageFile: null,
                imagePreview: null,
                // Color fields
                rgb_r: null,
                rgb_g: null,
                rgb_b: null,
                cmyk_c: null,
                cmyk_m: null,
                cmyk_y: null,
                cmyk_k: null,
                hex_color: null,
                pantone_coated: null,
                pantone_uncoated: null
            },
            
            rules: {
                category_id: [{ required: true, message: '请选择分类', trigger: 'change' }],
                color_code: [
                    { required: true, message: '请输入颜色编号', trigger: 'blur' }
                ]
            },
            
            // Flag to disable auto-sync after first manual change
            autoSyncDisabled: false,
            
            _originalColorFormSnapshot: null,
            _escHandler: null,

            // Conflict resolution
            showConflictDialog: false,
            conflictData: null,
            pendingFormData: null,
            
            // Color palette
        };
    },
    
    computed: {
        formulaUtils() {
            return window.formulaUtils || { segments: (f) => f ? f.split(/\s+/) : [] };
        },

        baseURL() {
            return this.globalData.baseURL;
        },

        esCategoryId() {
            const es = this.categories.find(c => c.code === 'ES');
            return es ? es.id : null;
        },

        colorCodeDuplicate() {
            const val = (this.form.color_code || '').trim();
            if (!val) return false;
            return this.customColors.some(c => c.color_code === val && c.id !== (this.editingColor?.id || null));
        }
    },
    methods: {
        // Category management
        async handleCategoriesUpdated() {
            // Reload categories and colors after changes
            await this.globalData.loadCategories();
            await this.globalData.loadCustomColors();
            this.$message.success('分类已更新');
        },
        
        // Helper to get message service
        getMsg() {
            return ElementPlus.ElMessage;
        },
        
        openAddDialog() {
            this.editingColor = null;
            
            // Reset auto-sync flag for new dialog
            this.autoSyncDisabled = false;
            
            if (this.activeCategory !== 'all') {
                const categoryId = parseInt(this.activeCategory);
                this.form.category_id = categoryId;
                // For ES category, don't auto-generate code
                if (categoryId === this.esCategoryId) {
                    this.form.color_code = '';
                } else {
                    this.generateColorCode(categoryId);
                }
            } else {
                this.form.category_id = '';
                this.form.color_code = '';
            }
            
            this.form.formula = '';
            this.form.imageFile = null;
            this.form.imagePreview = null;
            
            // Clear color fields
            this.form.rgb_r = null;
            this.form.rgb_g = null;
            this.form.rgb_b = null;
            this.form.cmyk_c = null;
            this.form.cmyk_m = null;
            this.form.cmyk_y = null;
            this.form.cmyk_k = null;
            this.form.hex_color = null;
            this.form.pantone_coated = null;
            this.form.pantone_uncoated = null;
            
            this.showAddDialog = true;
        },
        
        editColor(color) {
            this.editingColor = color;
            
            // Disable auto-sync for editing (user has control)
            this.autoSyncDisabled = true;
            
            const prefix = color.color_code.substring(0, 2).toUpperCase();
            const matchedCategory = this.categories.find(cat => cat.code === prefix);
            
            this.form = {
                category_id: color.category_id, // Use the actual category_id from database
                color_code: color.color_code,
                formula: color.formula,
                imageFile: null,
                imagePreview: color.image_path ? this.$helpers.buildUploadURL(this.baseURL, color.image_path) : null,
                // Load color values
                rgb_r: color.rgb_r,
                rgb_g: color.rgb_g,
                rgb_b: color.rgb_b,
                cmyk_c: color.cmyk_c,
                cmyk_m: color.cmyk_m,
                cmyk_y: color.cmyk_y,
                cmyk_k: color.cmyk_k,
                hex_color: color.hex_color,
                pantone_coated: color.pantone_coated,
                pantone_uncoated: color.pantone_uncoated
            };
            
            this.showAddDialog = true;
        },
        
        async saveColor() {
            const msg = this.getMsg();
            const valid = await this.$refs.formRef.validate().catch(() => false);
            if (!valid) return;
            if (this.colorCodeDuplicate) return;
            
            try {
                this.saving = true;
                const formData = new FormData();
                
                // Use the actual category_id from form
                let actualCategoryId = this.form.category_id;
                
                formData.append('category_id', actualCategoryId);
                formData.append('color_code', this.form.color_code);
                formData.append('formula', this.form.formula);
                
                if (this.form.imageFile) {
                    formData.append('image', this.form.imageFile);
                }
                
                // Add color fields to FormData
                if (this.form.rgb_r != null) formData.append('rgb_r', this.form.rgb_r);
                if (this.form.rgb_g != null) formData.append('rgb_g', this.form.rgb_g);
                if (this.form.rgb_b != null) formData.append('rgb_b', this.form.rgb_b);
                if (this.form.cmyk_c != null) formData.append('cmyk_c', this.form.cmyk_c);
                if (this.form.cmyk_m != null) formData.append('cmyk_m', this.form.cmyk_m);
                if (this.form.cmyk_y != null) formData.append('cmyk_y', this.form.cmyk_y);
                if (this.form.cmyk_k != null) formData.append('cmyk_k', this.form.cmyk_k);
                if (this.form.hex_color) formData.append('hex_color', this.form.hex_color);
                if (this.form.pantone_coated) formData.append('pantone_coated', this.form.pantone_coated);
                if (this.form.pantone_uncoated) formData.append('pantone_uncoated', this.form.pantone_uncoated);
                
                if (this.editingColor) {
                    if (!this.form.imageFile && this.editingColor.image_path) {
                        formData.append('existingImagePath', this.editingColor.image_path);
                    }
                    if (this.editingColor.version) {
                        formData.append('version', this.editingColor.version);
                    }
                    await api.customColors.update(this.editingColor.id, formData);
                    msg.success('修改成功');
                } else {
                    await api.customColors.create(formData);
                    msg.success('添加成功');
                }
                
                this.showAddDialog = false;
                this.resetForm();
                await this.globalData.loadCustomColors();
                await this.globalData.loadArtworks();
                this.refreshKey++;
                
            } catch (error) {
                if (error.response?.status === 409 && error.response?.data?.code === 'VERSION_CONFLICT') {
                    this.handleVersionConflict(error.response.data, formData);
                } else {
                    msg.error(error.response?.data?.error || '保存失败');
                }
            } finally {
                this.saving = false;
            }
        },
        
        resetForm() {
            this.editingColor = null;
            this.form = {
                category_id: '',
                color_code: '',
                formula: '',
                imageFile: null,
                imagePreview: null,
                rgb_r: null,
                rgb_g: null,
                rgb_b: null,
                cmyk_c: null,
                cmyk_m: null,
                cmyk_y: null,
                cmyk_k: null,
                hex_color: null,
                pantone_coated: null,
                pantone_uncoated: null
            };
            if (this.$refs.formRef) {
                this.$refs.formRef.resetFields();
            }
            this._originalColorFormSnapshot = null;
            this._unbindEsc();
        },
        
        // Other methods remain the same...
        onOpenColorDialog() {
            this.initForm();
            this._originalColorFormSnapshot = JSON.stringify(this._normalizedColorForm());
            this._bindEscForDialog();
        },
        
        _normalizedColorForm() {
            return {
                category_id: this.form.category_id || '',
                color_code: this.form.color_code || '',
                formula: this.form.formula || '',
                imagePreview: this.form.imagePreview ? '1' : ''
            };
        },
        
        _isColorFormDirty() {
            if (!this._originalColorFormSnapshot) return false;
            return JSON.stringify(this._normalizedColorForm()) !== this._originalColorFormSnapshot;
        },
        
        async attemptCloseAddDialog() {
            if (this._isColorFormDirty()) {
                try {
                    await ElementPlus.ElMessageBox.confirm('检测到未保存的修改，确认丢弃吗？', '未保存的修改', {
                        confirmButtonText: '丢弃修改',
                        cancelButtonText: '继续编辑',
                        type: 'warning'
                    });
                } catch(e) { return; }
            }
            this.showAddDialog = false;
        },
        
        _bindEscForDialog() {
            this._unbindEsc();
            this._escHandler = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.attemptCloseAddDialog();
                }
            };
            document.addEventListener('keydown', this._escHandler);
        },
        
        _unbindEsc() {
            if (this._escHandler) {
                document.removeEventListener('keydown', this._escHandler);
                this._escHandler = null;
            }
        },
        
        onColorCodeInput(value) {
            const msg = this.getMsg();
            if (this.editingColor) return;
            
            // Skip auto-sync if disabled (user has made manual changes)
            if (this.autoSyncDisabled) return;
            
            const esId = this.esCategoryId;
            if (esId && this.form.category_id === esId) return;
            if (!value) return;
            
            const firstChar = value.charAt(0);
            const esTriggers = ['酒','沙','红','黑','蓝']; // Triggers for ES (色精)
            if (esId && esTriggers.includes(firstChar)) {
                if (this.form.category_id !== esId) {
                    this.form.category_id = esId;
                    msg.info('已自动识别为 色精');
                    // Disable further auto-sync after first automation
                    this.autoSyncDisabled = true;
                }
                return;
            }
            
            if (value.length >= 2) {
                const prefix = value.substring(0, 2).toUpperCase();
                const matchedCategory = this.categories.find(cat => cat.code === prefix);
                
                if (matchedCategory) {
                    if (this.form.category_id !== matchedCategory.id) {
                        this.form.category_id = matchedCategory.id;
                        msg.info(`已自动切换到 ${matchedCategory.name}`);
                        // Disable further auto-sync after first automation
                        this.autoSyncDisabled = true;
                    }
                }
                // No auto-switch for unrecognized prefixes
            }
        },
        
        initForm() {
            const esId = this.esCategoryId;
            if (!this.editingColor && this.form.category_id && this.form.category_id !== esId) {
                this.generateColorCode(this.form.category_id);
            }
        },
        
        onCategoryChange(categoryId) {
            // Skip auto-sync if disabled (user has made manual changes)
            if (this.autoSyncDisabled) return;
            
            const esId = this.esCategoryId;
            
            if (!this.editingColor && categoryId && categoryId !== esId) {
                this.generateColorCode(categoryId);
                // Disable further auto-sync after first automation
                this.autoSyncDisabled = true;
            } else if (categoryId === esId) {
                this.form.color_code = '';
                // Also disable auto-sync when user selects 色精
                this.autoSyncDisabled = true;
            }
        },
        
        generateColorCode(categoryId) {
            const esId = this.esCategoryId;
            if (!categoryId || categoryId === esId) return;
            const code = helpers.generateColorCode(this.categories, this.customColors, categoryId);
            if (code) {
                this.form.color_code = code;
            }
        },
        
        async deleteColor(color) {
            const msg = this.getMsg();
            const ok = await this.$helpers.doubleDangerConfirm({
                firstMessage: `确定删除 ${color.color_code} 吗？`,
                firstConfirmText: '确定',
                firstCancelText: '取消',
                secondMessage: `真的要删除 ${color.color_code} 吗？此操作不可恢复！`,
                secondConfirmText: '删除',
                secondCancelText: '取消',
                confirmType: 'danger'
            });
            
            if (!ok) return;
            
            try {
                await api.customColors.delete(color.id);
                msg.success('删除成功');
                await this.globalData.loadCustomColors();
                await this.globalData.loadArtworks();
            } catch (error) {
                const raw = error?.response?.data?.error || '';
                if (raw.includes('配色方案使用')) {
                    msg.warning('该自配色已被引用，无法删除');
                } else {
                    msg.error(raw || '删除失败');
                }
            }
        },
        
        isColorReferenced(color) {
            if (!color) return false;
            const code = color.color_code;
            const artworks = this.globalData.artworks?.value || [];
            for (const artwork of artworks) {
                for (const s of (artwork.schemes||[])) {
                    for (const l of (s.layers||[])) {
                        if (l.colorCode === code) return true;
                    }
                }
            }
            return false;
        },
        
        viewHistory(color) {
            const msg = this.getMsg();
            msg.info('历史功能待实现');
        },
        
        handleVersionConflict(conflictData, formData) {
            this.conflictData = conflictData;
            this.pendingFormData = formData;
            this.showConflictDialog = true;
        },
        
        // Show color palette method - now uses the new advanced dialog
        // Color palette functionality moved to standalone Color Dictionary page
        // Users should navigate to 自配色字典 from the main navigation
        
        // Keep all duplicates
        keepAllDuplicates(){
            this.showDuplicateDialog=false;
            ElementPlus.ElMessage.info('已保留全部重复记录');
        },
        
        // Perform duplicate deletion - original from v0.5.6
        async performDuplicateDeletion(){
            if(this.deletionPending) return;
            const toDelete=[];
            this.duplicateGroups.forEach(g=>{
                const keepId = this.duplicateSelections[g.signature];
                if(!keepId) return;
                g.records.forEach(r=>{ if(r.id!==keepId && !this.isColorReferenced(r)) toDelete.push(r); });
            });
            if(!toDelete.length){ ElementPlus.ElMessage.info('没有可删除的记录'); return; }
            try { await ElementPlus.ElMessageBox.confirm(`将删除 ${toDelete.length} 条记录，确认继续？`, '删除确认', { type:'warning', confirmButtonText:'确认删除', cancelButtonText:'取消' }); } catch(e){ return; }
            this.deletionPending=true;
            let ok=0, fail=0;
            for(const rec of toDelete){
                try { await api.customColors.delete(rec.id); ok++; }
                catch(e){ fail++; break; }
            }
            this.deletionPending=false;
            await this.globalData.loadCustomColors();
            await this.globalData.loadArtworks();
            ElementPlus.ElMessage.success(`删除完成：成功 ${ok} 条，失败 ${fail} 条`);
            // 重新检测
            this.runDuplicateCheck();
        },
        
        // Confirm force merge - original from v0.5.6
        async confirmForceMerge(){
            if(this.mergingPending || this.deletionPending) return;
            const candidates = this.duplicateGroups.filter(g=> g.records.length>1 && this.duplicateSelections[g.signature]);
            if(!candidates.length){ ElementPlus.ElMessage.info('请选择要保留的记录'); return; }
            const g = candidates[0];
            const keepId = this.duplicateSelections[g.signature];
            if(!keepId){ ElementPlus.ElMessage.info('请先选择要保留的记录'); return; }
            const removeIds = g.records.filter(r=> r.id!==keepId).map(r=> r.id);
            if(!removeIds.length){ ElementPlus.ElMessage.info('该组没有其它记录'); return; }
            let referenced=0; g.records.forEach(r=>{ if(r.id!==keepId && this.isColorReferenced(r)) referenced++; });
            const msg = `将合并该组：保留 1 条，删除 ${removeIds.length} 条；其中 ${referenced} 条被引用，其引用将更新到保留记录。确认继续？`;
            try { await ElementPlus.ElMessageBox.confirm(msg, '强制合并确认', { type:'warning', confirmButtonText:'执行合并', cancelButtonText:'取消' }); } catch(e){ return; }
            this.executeForceMerge({ keepId, removeIds, signature: g.signature });
        },
        
        // Execute force merge - original from v0.5.6
        async executeForceMerge(payload){
            if(this.mergingPending) return;
            this.mergingPending = true;
            try {
                const resp = await api.customColors.forceMerge(payload);
                const updated = resp?.updatedLayers ?? resp?.data?.updatedLayers ?? 0;
                const deleted = resp?.deleted ?? resp?.data?.deleted ?? payload.removeIds.length;
                ElementPlus.ElMessage.success(`强制合并完成：更新引用 ${updated} 个，删除 ${deleted} 条`);
                await this.globalData.loadCustomColors();
                await this.globalData.loadArtworks();
                this.runDuplicateCheck();
                if(!this.duplicateGroups.length){ this.showDuplicateDialog=false; }
            } catch(err){
                const raw = err?.response?.data?.error || '';
                if(raw){ ElementPlus.ElMessage.error('合并失败: '+raw); }
                else if(err?.request){ ElementPlus.ElMessage.error('网络错误，合并失败'); }
                else { ElementPlus.ElMessage.error('合并失败'); }
            } finally {
                this.mergingPending = false;
            }
        },
        
        // Print color palette
        printColorPalette() {
            const msg = this.getMsg();
            msg.info('正在准备打印，请稍候...');
            
            this.$nextTick(() => {
                setTimeout(() => {
                    this.createPrintWindow();
                }, 300);
            });
        },
        
        // Create print window
        createPrintWindow() {
            const printContent = this.generatePrintHTML();
            
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            };
        },
        
        // Generate print HTML
        generatePrintHTML() {
            const colorCount = (this.globalData.customColors?.value || []).length;
            const groupCount = this.paletteGroups.length;
            const baseURL = this.baseURL || window.location.origin;
            
            let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>自配色列表</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            background: white;
        }
        .print-header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .print-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .print-stats {
            font-size: 14px;
            color: #666;
        }
        .print-main {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .print-group {
            display: grid;
            grid-template-columns: 30px 1fr;
            gap: 12px;
            margin: 0;
        }
        .print-group.group-spacing {
            margin-top: 8px;
        }
        .print-group-label {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            font-size: 13px;
            font-weight: 600;
            color: #333;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f9fa;
            padding: 8px 4px;
            border-radius: 4px;
            min-height: 100px;
        }
        .print-colors {
            display: grid;
            grid-template-columns: repeat(10, 80px);
            gap: 8px;
            padding: 0;
        }
        .print-color-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }
        .print-color-block {
            width: 80px;
            height: 80px;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
        }
        .print-color-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .print-no-image {
            color: #999;
            font-size: 10px;
            text-align: center;
            padding: 4px;
        }
        .print-color-name {
            font-size: 11px;
            font-weight: 500;
            text-align: center;
            max-width: 80px;
            word-wrap: break-word;
        }
        @media print {
            body {
                margin: 0;
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="print-header">
        <div class="print-title">自配色列表</div>
        <div class="print-stats">共${colorCount}个颜色，${groupCount}个分类</div>
    </div>
    <div class="print-main">`;
    
            this.paletteGroups.forEach((group, groupIndex) => {
                html += `
        <div class="print-group${groupIndex > 0 ? ' group-spacing' : ''}">
            <div class="print-group-label">${group.categoryName}</div>
            <div class="print-colors">`;
                
                group.colors.forEach(color => {
                    const imageUrl = color.image_path ? `${baseURL}/uploads/${color.image_path}` : null;
                    const imageHtml = imageUrl 
                        ? `<img src="${imageUrl}" class="print-color-image" onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=\\'print-no-image\\'>图片加载失败</div>'" />`
                        : `<div class="print-no-image">未上传<br/>图片</div>`;
                    
                    html += `
                <div class="print-color-item">
                    <div class="print-color-block">${imageHtml}</div>
                    <div class="print-color-name">${color.color_code}</div>
                </div>`;
                });
                
                html += `
            </div>
        </div>`;
            });
            
            html += `
    </div>
</body>
</html>`;
            return html;
        }
    },
    
    // Watch for category changes to reset pagination
    watch: {
        // Clear validation error when there's a duplicate
        colorCodeDuplicate(val) {
            if (val && this.$refs.formRef) {
                this.$refs.formRef.clearValidate('color_code');
            }
        }
    },

};

// Expose to global scope
window.CustomColorsComponent = CustomColorsComponent;