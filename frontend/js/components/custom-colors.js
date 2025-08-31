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
            </div>
            
            <div v-if="loading" class="loading"><el-icon class="is-loading"><Loading /></el-icon> 加载中...</div>
            <div v-else>
                <div v-if="filteredColors.length === 0" class="empty-message">暂无自配色，点击右上角"新自配色"添加</div>
                <div v-for="color in filteredColors" :key="color.id + '-' + refreshKey" class="artwork-bar" :ref="setColorItemRef(color)" :class="{'highlight-pulse': highlightCode === color.color_code}">
                    <div class="artwork-header" style="display:flex; gap:12px; padding:8px; align-items:center;">
                        <div class="artwork-title" style="width:88px; flex-shrink:0;">
                            {{ color.color_code }}
                        </div>
                        <div style="flex:1; min-width:0; display:flex; align-items:center; justify-content:space-between;">
                            <div class="header-meta-group">
                                <span class="header-meta">分类: {{ categoryName(color) }}</span>
                                <span class="header-meta" v-if="color.updated_at">更新: {{ $helpers.formatDate(color.updated_at) }}</span>
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
                            
                            <!-- Color Information Row 2: Pantone -->
                            <div class="meta-text color-info-row">
                                <span class="color-value-group">
                                    <span v-if="color.pantone_coated" class="color-swatch-inline" :style="getPantoneSwatchStyle(color.pantone_coated)"></span>
                                    <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                    <span class="color-label-inline">Pantone C:</span>
                                    <span v-if="color.pantone_coated">{{ color.pantone_coated }}</span>
                                    <span v-else class="color-value-empty">未填写</span>
                                </span>
                                <span class="color-value-group">
                                    <span v-if="color.pantone_uncoated" class="color-swatch-inline" :style="getPantoneSwatchStyle(color.pantone_uncoated)"></span>
                                    <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                    <span class="color-label-inline">Pantone U:</span>
                                    <span v-if="color.pantone_uncoated">{{ color.pantone_uncoated }}</span>
                                    <span v-else class="color-value-empty">未填写</span>
                                </span>
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
            </div>
            
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
                        <el-input v-model="form.color_code" placeholder="如：BU001" @input="onColorCodeInput" />
                        <div v-if="colorCodeDuplicate" class="dup-msg">该编号已存在</div>
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
            
            <!-- Color Palette Dialog -->
            <el-dialog
                v-model="showColorPaletteDialog"
                width="95%"
                :close-on-click-modal="false"
                class="color-palette-dialog"
                :show-close="false"
            >
                <template #header>
                    <div class="custom-dialog-header">
                        <div class="palette-title">自配色列表</div>
                        <div class="palette-header-right">
                            <span class="palette-stats">共{{ (globalData.customColors && globalData.customColors.value) ? globalData.customColors.value.length : 0 }}个颜色，{{ paletteGroups.length }}个分类</span>
                            <el-button size="small" type="primary" @click="printColorPalette">
                                <el-icon><Printer /></el-icon>
                                打印
                            </el-button>
                            <el-button size="small" @click="showColorPaletteDialog = false" class="close-btn">
                                <el-icon><Close /></el-icon>
                            </el-button>
                        </div>
                    </div>
                </template>
                
                <div class="color-palette-content">
                    <div v-if="paletteGroups.length === 0" class="empty-palette">
                        暂无自配色数据
                    </div>
                    <div v-else class="palette-main">
                        <div v-for="(group, groupIndex) in paletteGroups" :key="group.categoryCode" class="palette-group" :class="{ 'group-spacing': groupIndex > 0 }">
                            <div class="group-layout">
                                <div class="group-label">{{ group.categoryName }}</div>
                                <div class="group-colors">
                                    <div v-for="color in group.colors" :key="color.id" class="color-item">
                                        <div class="color-block">
                                            <img 
                                                v-if="color.image_path" 
                                                :src="$helpers.buildUploadURL(baseURL, color.image_path)" 
                                                class="color-preview-image"
                                                @error="$event.target.style.display='none'"
                                            />
                                            <div v-if="!color.image_path" class="no-image-placeholder">未上传图片</div>
                                        </div>
                                        <div class="color-name">{{ color.color_code }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </el-dialog>
        </div>
    `,
    
    inject: ['globalData'],
    
    data() {
        return {
            loading: false,
            activeCategory: 'all',
            showAddDialog: false,
            editingColor: null,
            saving: false,
            _colorItemRefs: new Map(),
            highlightCode: null,
            refreshKey: 0,
            extracting: false,
            
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
            showColorPaletteDialog: false,
            paletteGroups: []
        };
    },
    
    computed: {
        formulaUtils() {
            return window.formulaUtils || { segments: (f) => f ? f.split(/\s+/) : [] };
        },
        
        baseURL() {
            return this.globalData.baseURL;
        },
        
        categories() {
            return this.globalData.categories.value || [];
        },
        
        customColors() {
            return this.globalData.customColors.value || [];
        },
        
        montMarteColors() {
            return this.globalData.montMarteColors.value || [];
        },
        
        filteredColors() {
            let list;
            if (this.activeCategory === 'all') {
                list = this.customColors.slice();
            } else if (this.activeCategory === 'other') {
                list = this.customColors.filter(color => {
                    const prefix = color.color_code.substring(0, 2).toUpperCase();
                    const matchedCategory = this.categories.find(cat => cat.code === prefix);
                    return !matchedCategory;
                });
            } else {
                list = this.customColors.filter(c => c.category_id === parseInt(this.activeCategory));
            }
            
            // Search filter
            const q = (this.$root && this.$root.globalSearchQuery || '').trim().toLowerCase();
            if (q && this.$root.activeTab === 'custom-colors') {
                list = list.filter(c => ((c.name||'').toLowerCase().includes(q)) || ((c.color_code||'').toLowerCase().includes(q)));
            }
            
            // Sort
            if (this.sortMode === 'name') {
                list.sort((a,b) => (a.color_code||'').localeCompare(b.color_code||''));
            } else {
                list.sort((a,b) => new Date(b.updated_at||b.created_at||0) - new Date(a.updated_at||a.created_at||0));
            }
            
            return list;
        },
        
        orderedCategoriesWithOther() {
            const raw = [...(this.categories||[])];
            raw.sort((a,b)=> (a.code||'').localeCompare(b.code||''));
            const result = [];
            raw.forEach(cat => {
                result.push(cat);
                if (cat.code === 'YE') {
                    if (!raw.some(c=>c.code==='SJ')) {
                        // SJ should exist from backend
                    }
                }
            });
            
            const sjIndex = result.findIndex(c=>c.code==='SJ');
            if (sjIndex !== -1) {
                const sjCat = result.splice(sjIndex,1)[0];
                const yeIndex = result.findIndex(c=>c.code==='YE');
                if (yeIndex !== -1) result.splice(yeIndex+1,0,sjCat); else result.push(sjCat);
            }
            
            result.push({ id: 'other', name: '其他', code: 'OTHER' });
            return result;
        },
        
        categoriesWithOther() {
            return this.orderedCategoriesWithOther.map(c=>c);
        },
        
        // Computed properties for duplicate checking
        canDeleteAny() {
            if(!this.duplicateGroups || !this.duplicateGroups.length) return false;
            for(const g of this.duplicateGroups){
                const keepId = this.duplicateSelections[g.signature];
                if(!keepId) continue;
                if(g.records.some(r=> r.id!==keepId && !this.isColorReferenced(r))) return true;
            }
            return false;
        },
        
        canForceMerge() {
            if(!this.duplicateGroups || !this.duplicateGroups.length) return false;
            return this.duplicateGroups.some(g=> g.records.length>1 && this.duplicateSelections[g.signature]);
        },
        
        sjCategoryId() {
            const sj = this.categories.find(c=>c.code==='SJ');
            return sj ? sj.id : null;
        },
        
        colorCodeDuplicate() {
            const val = (this.form.color_code || '').trim();
            if (!val) return false;
            return this.customColors.some(c => c.color_code === val && c.id !== (this.editingColor?.id || null));
        },
        
        // Image availability check
        hasImageAvailable() {
            return !!(this.form.imageFile || (this.editingColor && this.editingColor.image_path) || this.form.imagePreview);
        },
        
        // Color value checks
        hasRGBValue() {
            return this.form.rgb_r != null && this.form.rgb_g != null && this.form.rgb_b != null;
        },
        
        hasCMYKValue() {
            return this.form.cmyk_c != null || this.form.cmyk_m != null || this.form.cmyk_y != null || this.form.cmyk_k != null;
        },
        
        hasHEXValue() {
            return !!this.form.hex_color;
        },
        
        hasPantoneCoatedValue() {
            return !!this.form.pantone_coated;
        },
        
        hasPantoneUncoatedValue() {
            return !!this.form.pantone_uncoated;
        },
        
        // Color swatch styles
        rgbSwatchStyle() {
            if (this.hasRGBValue) {
                return {
                    backgroundColor: `rgb(${this.form.rgb_r}, ${this.form.rgb_g}, ${this.form.rgb_b})`,
                    border: '1px solid rgba(0, 0, 0, 0.15)'
                };
            }
            return {
                backgroundColor: '#f5f5f5',
                border: '1px dashed #ccc'
            };
        },
        
        cmykSwatchStyle() {
            if (this.hasCMYKValue && window.ColorConverter) {
                const rgb = window.ColorConverter.cmykToRgb(
                    this.form.cmyk_c || 0,
                    this.form.cmyk_m || 0,
                    this.form.cmyk_y || 0,
                    this.form.cmyk_k || 0
                );
                return {
                    backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
                    border: '1px solid rgba(0, 0, 0, 0.15)'
                };
            }
            return {
                backgroundColor: '#f5f5f5',
                border: '1px dashed #ccc'
            };
        },
        
        hexSwatchStyle() {
            if (this.hasHEXValue) {
                return {
                    backgroundColor: this.form.hex_color,
                    border: '1px solid rgba(0, 0, 0, 0.15)'
                };
            }
            return {
                backgroundColor: '#f5f5f5',
                border: '1px dashed #ccc'
            };
        },
        
        pantoneCoatedSwatchStyle() {
            if (this.hasPantoneCoatedValue && window.PantoneHelper) {
                const color = window.PantoneHelper.getColorByName(this.form.pantone_coated);
                if (color) {
                    return {
                        backgroundColor: `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`,
                        border: '1px solid rgba(0, 0, 0, 0.15)'
                    };
                }
            }
            return {
                backgroundColor: '#f5f5f5',
                border: '1px dashed #ccc'
            };
        },
        
        pantoneUncoatedSwatchStyle() {
            if (this.hasPantoneUncoatedValue && window.PantoneHelper) {
                const color = window.PantoneHelper.getColorByName(this.form.pantone_uncoated);
                if (color) {
                    return {
                        backgroundColor: `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`,
                        border: '1px solid rgba(0, 0, 0, 0.15)'
                    };
                }
            }
            return {
                backgroundColor: '#f5f5f5',
                border: '1px dashed #ccc'
            };
        },
        
        canDeleteAny() {
            if(!this.duplicateGroups || !this.duplicateGroups.length) return false;
            for(const g of this.duplicateGroups){
                const keepId = this.duplicateSelections[g.signature];
                if(!keepId) continue;
                if(g.records.some(r=> r.id!==keepId && !this.isColorReferenced(r))) return true;
            }
            return false;
        },
        
        canForceMerge() {
            if(!this.duplicateGroups || !this.duplicateGroups.length) return false;
            return this.duplicateGroups.some(g=> g.records.length>1 && this.duplicateSelections[g.signature]);
        }
    },
    
    methods: {
        // Helper to get message service
        getMsg() {
            return ElementPlus.ElMessage;
        },
        
        setColorItemRef(color) {
            return (el) => {
                if (el) this._colorItemRefs.set(color.color_code, el); 
                else this._colorItemRefs.delete(color.color_code);
            };
        },
        
        usageGroups(color) {
            const artworks = this.globalData.artworks?.value || [];
            const groups = [];
            for (const artwork of artworks) {
                for (const scheme of (artwork.schemes || [])) {
                    for (const layer of (scheme.layers || [])) {
                        if (layer.colorCode === color.color_code) {
                            groups.push({
                                artworkId: artwork.id,
                                schemeId: scheme.id,
                                display: `${artwork.code}/${scheme.name}`
                            });
                            break;
                        }
                    }
                }
            }
            return groups;
        },
        
        categoryName(color) {
            const cat = this.categories.find(c => c.id === color.category_id);
            if (cat) return cat.name;
            const prefix = (color.color_code || '').substring(0,2).toUpperCase();
            const byPrefix = this.categories.find(c => c.code === prefix);
            return byPrefix ? byPrefix.name : '其他';
        },
        
        handleImageChange(file) {
            this.form.imageFile = file.raw;
            if (this.form.imagePreview) {
                URL.revokeObjectURL(this.form.imagePreview);
            }
            this.form.imagePreview = URL.createObjectURL(file.raw);
        },
        
        clearImage() {
            this.form.imageFile = null;
            if (this.form.imagePreview) {
                URL.revokeObjectURL(this.form.imagePreview);
                this.form.imagePreview = null;
            }
        },
        
        async fetchImageAsFile(imageUrl) {
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                return new File([blob], 'image.jpg', { type: blob.type });
            } catch (error) {
                console.error('Failed to fetch image:', error);
                return null;
            }
        },
        
        async extractColorFromImage() {
            const msg = this.getMsg();
            let imageToProcess = null;
            
            if (this.form.imageFile) {
                imageToProcess = this.form.imageFile;
            } else if (this.editingColor && this.editingColor.image_path) {
                const imageUrl = this.$helpers.buildUploadURL(this.baseURL, this.editingColor.image_path);
                imageToProcess = await this.fetchImageAsFile(imageUrl);
            } else if (this.form.imagePreview) {
                imageToProcess = await this.fetchImageAsFile(this.form.imagePreview);
            }
            
            if (!imageToProcess) {
                msg.warning('没有可用的图片');
                return;
            }
            
            try {
                const color = await ColorConverter.extractColorFromImage(imageToProcess);
                
                // ColorConverter returns {r, g, b} directly
                this.form.rgb_r = color.r;
                this.form.rgb_g = color.g;
                this.form.rgb_b = color.b;
                
                const cmyk = ColorConverter.rgbToCmyk(color.r, color.g, color.b);
                this.form.cmyk_c = cmyk.c;
                this.form.cmyk_m = cmyk.m;
                this.form.cmyk_y = cmyk.y;
                this.form.cmyk_k = cmyk.k;
                
                this.form.hex_color = ColorConverter.rgbToHex(color.r, color.g, color.b);
                
                msg.success('已提取颜色值');
            } catch (error) {
                console.error('Error extracting color:', error);
                msg.error('提取颜色失败');
            }
        },
        
        clearColorValues() {
            const msg = this.getMsg();
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
            msg.success('色值已清除');
        },
        
        async findPantoneMatch() {
            const msg = this.getMsg();
            if (this.form.rgb_r === null || this.form.rgb_g === null || this.form.rgb_b === null) {
                msg.warning('请先输入或提取 RGB 颜色值');
                return;
            }
            
            try {
                const rgb = {
                    r: parseInt(this.form.rgb_r),
                    g: parseInt(this.form.rgb_g),
                    b: parseInt(this.form.rgb_b)
                };
                
                if (!ColorConverter.isValidRGB(rgb.r, rgb.g, rgb.b)) {
                    msg.error('RGB 值无效，请检查输入');
                    return;
                }
                
                let coatedMatch, uncoatedMatch;
                
                if (window.PantoneHelper) {
                    coatedMatch = window.PantoneHelper.findClosest(rgb, 'coated');
                    uncoatedMatch = window.PantoneHelper.findClosest(rgb, 'uncoated');
                } else {
                    const pantoneResult = ColorConverter.findClosestPantone(rgb);
                    coatedMatch = pantoneResult.coated;
                    uncoatedMatch = pantoneResult.uncoated;
                }
                
                if (coatedMatch) {
                    // Format: Remove "PANTONE" prefix and keep only number + C
                    const cleanName = coatedMatch.name.replace(/^PANTONE\s+/i, '').replace(/\s+C$/i, 'C');
                    this.form.pantone_coated = cleanName;
                }
                if (uncoatedMatch) {
                    // Format: Remove "PANTONE" prefix and keep only number + U
                    const cleanName = uncoatedMatch.name.replace(/^PANTONE\s+/i, '').replace(/\s+U$/i, 'U');
                    this.form.pantone_uncoated = cleanName;
                }
                
                const coatedDisplay = coatedMatch ? coatedMatch.name.replace(/^PANTONE\s+/i, '').replace(/\s+C$/i, 'C') : '无';
                const uncoatedDisplay = uncoatedMatch ? uncoatedMatch.name.replace(/^PANTONE\s+/i, '').replace(/\s+U$/i, 'U') : '无';
                msg.success(`已匹配潘通色号: ${coatedDisplay} / ${uncoatedDisplay}`);
            } catch (error) {
                console.error('Error finding Pantone match:', error);
                msg.error('匹配潘通色号失败');
            }
        },
        
        openAddDialog() {
            this.editingColor = null;
            
            if (this.activeCategory !== 'all') {
                if (this.activeCategory === 'other') {
                    this.form.category_id = 'other';
                    this.form.color_code = '';
                } else {
                    const categoryId = parseInt(this.activeCategory);
                    this.form.category_id = categoryId;
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
            
            const prefix = color.color_code.substring(0, 2).toUpperCase();
            const matchedCategory = this.categories.find(cat => cat.code === prefix);
            
            this.form = {
                category_id: matchedCategory ? color.category_id : 'other',
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
                
                let actualCategoryId = this.form.category_id;
                if (actualCategoryId === 'other') {
                    const prefix = this.form.color_code.substring(0, 2).toUpperCase();
                    const matchedCategory = this.categories.find(cat => cat.code === prefix);
                    if (matchedCategory) {
                        actualCategoryId = matchedCategory.id;
                    } else {
                        actualCategoryId = this.categories[0]?.id || 1;
                    }
                }
                
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
            const sjId = this.sjCategoryId;
            if (this.form.category_id === 'other' || (sjId && this.form.category_id === sjId)) return;
            if (!value) return;
            
            const firstChar = value.charAt(0);
            const sjTriggers = ['酒','沙','红','黑','蓝'];
            if (sjId && sjTriggers.includes(firstChar)) {
                if (this.form.category_id !== sjId) {
                    this.form.category_id = sjId;
                    msg.info('已自动识别为 色精');
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
                    }
                } else {
                    if (this.form.category_id !== 'other') {
                        this.form.category_id = 'other';
                        msg.warning('无法识别的前缀，已切换到"其他"');
                    }
                }
            }
        },
        
        initForm() {
            if (!this.editingColor && this.form.category_id && this.form.category_id !== 'other' && this.form.category_id !== this.sjCategoryId) {
                this.generateColorCode(this.form.category_id);
            }
        },
        
        onCategoryChange(categoryId) {
            if (!this.editingColor && categoryId && categoryId !== 'other' && categoryId !== this.sjCategoryId) {
                this.generateColorCode(categoryId);
            } else if (categoryId === 'other' || categoryId === this.sjCategoryId) {
                this.form.color_code = '';
            }
        },
        
        generateColorCode(categoryId) {
            if (!categoryId || categoryId === 'other' || categoryId === this.sjCategoryId) return;
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
        
        focusCustomColor(code) {
            if (this.activeCategory !== 'all') this.activeCategory = 'all';
            this.$nextTick(() => {
                const el = this._colorItemRefs.get(code);
                if (el && el.scrollIntoView) {
                    try {
                        const rect = el.getBoundingClientRect();
                        const vh = window.innerHeight || document.documentElement.clientHeight;
                        const current = window.pageYOffset || document.documentElement.scrollTop;
                        const targetScroll = current + rect.top - (vh/2 - rect.height/2);
                        window.scrollTo(0, Math.max(0, targetScroll));
                    } catch(e) { 
                        el.scrollIntoView(); 
                    }
                    this.highlightCode = code;
                    setTimeout(()=>{ this.highlightCode = null; }, 2000);
                }
            });
        },
        
        handleVersionConflict(conflictData, formData) {
            this.conflictData = conflictData;
            this.pendingFormData = formData;
            this.showConflictDialog = true;
        },
        
        // Helper method to get CMYK color as RGB string
        getCMYKColor(c, m, y, k) {
            if (window.ColorConverter) {
                const rgb = window.ColorConverter.cmykToRgb(c, m, y, k);
                return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
            }
            return '#f5f5f5';
        },
        
        // Helper method to get Pantone swatch style
        getPantoneSwatchStyle(pantoneCode) {
            if (!pantoneCode || !window.PantoneHelper) {
                return { background: '#f5f5f5', border: '1px dashed #ccc' };
            }
            
            const color = window.PantoneHelper.getColorByName(pantoneCode);
            if (color && color.rgb) {
                return { 
                    background: `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`,
                    border: '1px solid rgba(0, 0, 0, 0.15)'
                };
            }
            return { background: '#f5f5f5', border: '1px dashed #ccc' };
        },
        
        // Duplicate check method
        runDuplicateCheck(focusSignature=null, preferredKeepId=null) {
            const msg = this.getMsg();
            if(!window.duplicateDetector) { 
                msg.info('查重模块未加载'); 
                return; 
            }
            const list = this.globalData.customColors?.value || [];
            const map = window.duplicateDetector.groupByRatioSignature(list);
            const sigs = Object.keys(map);
            if(!sigs.length) { 
                msg.success('未发现重复配方'); 
                this.showDuplicateDialog = false; 
                return; 
            }
            
            // Construct group data
            this.duplicateGroups = sigs.map(sig => {
                const recs = map[sig].slice().sort((a,b) => new Date(b.updated_at||b.created_at||0) - new Date(a.updated_at||a.created_at||0));
                const parsed = window.duplicateDetector.parseRatio(sig);
                return { signature: sig, records: recs, parsed };
            });
            
            this.duplicateSelections = {};
            // Default selection
            this.duplicateGroups.forEach(g => {
                if (focusSignature && g.signature === focusSignature && preferredKeepId) {
                    this.duplicateSelections[g.signature] = preferredKeepId;
                } else if(g.records.length) {
                    this.duplicateSelections[g.signature] = g.records[0].id;
                }
            });
            
            this.showDuplicateDialog = true;
            msg.warning(`发现 ${sigs.length} 组重复配方`);
        },
        
        // Show color palette method
        async showColorPalette() {
            const msg = this.getMsg();
            try {
                // Refresh data before opening dialog
                await this.globalData.loadCustomColors();
                await this.globalData.loadCategories();
                
                // Create groups using real data
                const categories = this.globalData.categories?.value || [];
                const customColors = this.globalData.customColors?.value || [];
                const groups = [];
                
                if (customColors.length === 0) {
                    this.paletteGroups = [];
                    this.showColorPaletteDialog = true;
                    return;
                }
                
                if (categories.length === 0) {
                    // No categories, create a default group
                    groups.push({
                        categoryName: '所有自配色',
                        categoryCode: 'ALL',
                        colors: customColors
                    });
                } else {
                    // Group by category
                    const colorsByCategory = {};
                    const unCategorized = [];
                    
                    customColors.forEach(color => {
                        if (!color.category_id) {
                            unCategorized.push(color);
                        } else {
                            if (!colorsByCategory[color.category_id]) {
                                colorsByCategory[color.category_id] = [];
                            }
                            colorsByCategory[color.category_id].push(color);
                        }
                    });
                    
                    // Create groups by category
                    categories.forEach(category => {
                        const categoryColors = colorsByCategory[category.id] || [];
                        if (categoryColors.length > 0) {
                            groups.push({
                                categoryName: category.name,
                                categoryCode: category.code || category.id,
                                colors: categoryColors
                            });
                        }
                    });
                    
                    // Add uncategorized if any
                    if (unCategorized.length > 0) {
                        groups.push({
                            categoryName: '其他',
                            categoryCode: 'OTHER',
                            colors: unCategorized
                        });
                    }
                }
                
                this.paletteGroups = groups;
                this.showColorPaletteDialog = true;
                
            } catch (error) {
                console.error('加载色彩数据失败:', error);
                msg.error('加载数据失败，请重试');
            }
        },
        
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
            const printWindow = window.open('', '_blank');
            
            // Build HTML content for printing
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>自配色列表 - 打印</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { text-align: center; margin-bottom: 20px; font-size: 24px; }
                        .print-info { text-align: center; margin-bottom: 20px; color: #666; font-size: 12px; }
                        .category-section { margin-bottom: 30px; page-break-inside: avoid; }
                        .category-title { 
                            font-size: 18px; 
                            font-weight: bold; 
                            margin-bottom: 10px; 
                            padding: 5px 10px; 
                            background: #f0f0f0; 
                            border-left: 4px solid #333;
                        }
                        .colors-grid { 
                            display: grid; 
                            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); 
                            gap: 10px; 
                            margin-bottom: 20px;
                        }
                        .color-item { 
                            text-align: center; 
                            padding: 5px;
                            border: 1px solid #ddd;
                            page-break-inside: avoid;
                        }
                        .color-preview { 
                            width: 80px; 
                            height: 80px; 
                            margin: 0 auto 5px; 
                            border: 1px solid #ccc;
                            background: #f9f9f9;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 10px;
                            color: #999;
                        }
                        .color-preview img { 
                            width: 100%; 
                            height: 100%; 
                            object-fit: cover; 
                        }
                        .color-code { 
                            font-weight: bold; 
                            font-size: 12px;
                            margin-bottom: 2px;
                        }
                        .color-name { 
                            font-size: 10px; 
                            color: #666;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }
                        @media print {
                            .category-section { page-break-inside: avoid; }
                            body { padding: 10px; }
                        }
                    </style>
                </head>
                <body>
                    <h1>STEREOWOOD 自配色列表</h1>
                    <div class="print-info">
                        打印时间：${new Date().toLocaleString('zh-CN')} | 
                        共 ${this.globalData.customColors?.value?.length || 0} 个颜色，${this.paletteGroups.length} 个分类
                    </div>
            `;
            
            let categoriesHtml = '';
            this.paletteGroups.forEach(group => {
                categoriesHtml += `
                    <div class="category-section">
                        <div class="category-title">${group.categoryName} (${group.colors.length}个)</div>
                        <div class="colors-grid">
                `;
                
                group.colors.forEach(color => {
                    const imageUrl = color.image_path ? 
                        `${this.baseURL}/uploads/${color.image_path}` : '';
                    
                    categoriesHtml += `
                        <div class="color-item">
                            <div class="color-preview">
                                ${imageUrl ? 
                                    `<img src="${imageUrl}" alt="${color.color_code}" />` : 
                                    '无图片'
                                }
                            </div>
                            <div class="color-code">${color.color_code}</div>
                            ${color.name ? `<div class="color-name">${color.name}</div>` : ''}
                        </div>
                    `;
                });
                
                categoriesHtml += `
                        </div>
                    </div>
                `;
            });
            
            const finalHtml = htmlContent + categoriesHtml + '</body></html>';
            
            // Write to print window and print
            printWindow.document.write(finalHtml);
            printWindow.document.close();
            
            // Wait for images to load before printing
            printWindow.onload = function() {
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            };
        },
        
        // Helper method to check if color is referenced
        isColorReferenced(color) {
            // Check if this color is used in any artwork schemes
            // This would need actual implementation based on your data structure
            // For now, returning false as placeholder
            return false;
        },
        
        // Helper method to focus on a specific color
        focusCustomColor(colorCode) {
            // Close dialog and scroll to the color
            this.showDuplicateDialog = false;
            
            // Find and focus the color in the list
            this.$nextTick(() => {
                const colorElement = document.querySelector(`[data-color-code="${colorCode}"]`);
                if (colorElement) {
                    colorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    colorElement.classList.add('highlight-pulse');
                    setTimeout(() => {
                        colorElement.classList.remove('highlight-pulse');
                    }, 2000);
                }
            });
        }
    }
};

// Expose to global scope
window.CustomColorsComponent = CustomColorsComponent;