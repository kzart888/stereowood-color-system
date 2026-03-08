// 自配颜色管理组件 - Enhanced Version with RGB/CMYK/HEX/Pantone
// 文件路径: frontend/js/components/custom-colors.js
// 定义全局变量 CustomColorsComponent，被 app.js 引用并注册

const CustomColorsComponent = {
    props: {
        sortMode: { type: String, default: 'time' } // time | name
    },
    
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
                        <div class="scheme-thumbnail"
                             :class="swatchThumbnailClass(color)"
                             :style="getSwatchStyle(color)"
                             @click="previewColorSwatch($event, color)">
                            <template v-if="swatchIsImage(color)">
                                <img :src="getSwatchImage(color)" @error="onSwatchImageError($event, color)" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                            </template>
                            <span v-else-if="swatchIsEmpty(color)" class="blank-text">未上传图片</span>
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
                        <div class="color-sample-grid">
                            <div class="color-sample-card">
                                <div class="scheme-thumbnail"
                                     :class="{ 'no-image': !form.imagePreview }"
                                     @click="form.imagePreview && $thumbPreview && $thumbPreview.show($event, form.imagePreview)">
                                    <template v-if="!form.imagePreview">未上传图片</template>
                                    <img v-else :src="form.imagePreview" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                                </div>
                                <div class="color-sample-actions">
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
                            <div class="color-sample-card">
                                <div class="scheme-thumbnail pure-thumbnail"
                                     :class="{ 'no-image': !hasPureColor }"
                                     @click="openPurePreview($event)">
                                    <template v-if="hasPureColor">
                                        <img :src="form.pureColor.previewDataUrl" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" alt="平均色缩略图" />
                                    </template>
                                    <span v-else class="blank-text">待计算</span>
                                </div>
                                <div class="color-sample-actions">
                                    <el-button 
                                        size="small" 
                                        type="primary" 
                                        :disabled="!hasImageAvailable || computingPureColor"
                                        @click="computePureColor">
                                        <el-icon><Brush /></el-icon>
                                        计算平均色
                                    </el-button>
                                    <el-button 
                                        size="small" 
                                        :disabled="!hasPureColor"
                                        @click="clearPureColor">
                                        <el-icon><Delete /></el-icon>
                                        清除平均色
                                    </el-button>
                                </div>
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
            _colorItemRefs: new Map(),
            _listState: null,
            _dialogGuard: null,
            
            // Pagination
            currentPage: 1,
            itemsPerPage: 24,  // Default, will be updated from app config
            highlightCode: null,
            refreshKey: 0,
            extracting: false,
            computingPureColor: false,
            
            // Card selection
            selectedColorId: null,
            
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
                pantone_uncoated: null,
                pureColor: null,
                pureColorCleared: false
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
            
            // Duplicate detection
            showDuplicateDialog: false,
            duplicateGroups: [],
            duplicateSelections: {},
            deletionPending: false,
            mergingPending: false,
            
            // Conflict resolution
            showConflictDialog: false,
            conflictData: null,
            pendingFormData: null,
            
            // Color palette
        };
    },
    
    ...(window.CustomColorsComponentOptions || {})

};

// Expose to global scope
window.CustomColorsComponent = CustomColorsComponent;
