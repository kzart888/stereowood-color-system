// 自配颜色管理组件
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
                            <div v-if="filteredColors.length === 0" class="empty-message">暂无自配色，点击右上角“新自配色”添加</div>
                            <div v-for="color in filteredColors" :key="color.id + '-' + refreshKey" class="artwork-bar" :ref="setColorItemRef(color)" :class="{'highlight-pulse': highlightCode === color.color_code}">
                                <div class="artwork-header">
                                    <div class="artwork-title">{{ color.color_code }}</div>
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
                                        <div class="meta-text" v-if="!color.formula">（未指定配方）</div>
                                        <div class="meta-text" v-else>配方：
                                            <span class="usage-chips">
                                                <span v-for="(seg,i) in formulaUtils.segments(color.formula)" :key="'ccf'+color.id+'-'+i" class="mf-chip">{{ seg }}</span>
                                            </span>
                                        </div>
                                        <button v-if="color.formula" class="calc-mini-btn" @click.stop="$calc && $calc.open(color.color_code, color.formula||'', $event.currentTarget)" title="快速计算" style="position:absolute; top:0; right:0;">算</button>
                                        <div class="meta-text">分类：{{ categoryName(color) }}</div>
                                        <div class="meta-text" v-if="color.updated_at">更新：{{ $helpers.formatDate(color.updated_at) }}</div>
                                        <div class="meta-text">适用层：
                                            <template v-if="usageGroups(color).length">
                                                <span class="usage-chips">
                                                    <span v-for="g in usageGroups(color)" :key="'ug'+color.id+g.display" class="mf-chip usage-chip" style="cursor:pointer;" @click="$root && $root.focusArtworkScheme && $root.focusArtworkScheme(g)">{{ g.display }}</span>
                                                </span>
                                            </template>
                                            <span v-else>（未使用）</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- 添加/编辑对话框 -->
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
                        <el-select v-model="form.category_id" placeholder="请选择" @change="onCategoryChange">
                            <el-option 
                                v-for="cat in categoriesWithOther" 
                                :key="cat.id || 'other'"
                                :label="cat.name" 
                                :value="cat.id || 'other'"
                            ></el-option>
                        </el-select>
                    </el-form-item>
                    <el-form-item label="颜色编号" prop="color_code">
                        <div class="dup-inline-row">
                            <el-input 
                                v-model="form.color_code" 
                                placeholder="例如: BU001"
                                @input="onColorCodeInput"
                                class="short-inline-input"
                            ></el-input>
                            <span v-if="colorCodeDuplicate" class="dup-msg">编号重复</span>
                        </div>
                    </el-form-item>
                    <el-form-item label="配方">
                        <formula-editor 
                            v-if="showAddDialog"
                            v-model="form.formula"
                            :mont-marte-colors="montMarteColors"
                        />
                    </el-form-item>
                    <!-- 适用画层改为自动统计，不再手动输入 -->
                    <el-form-item label="颜色样本">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <!-- 缩略图预览区域 -->
                            <div class="scheme-thumbnail" 
                                 :class="{ 'no-image': !form.imagePreview }" 
                                 style="width: 80px; height: 80px; flex-shrink: 0;"
                                 @click="form.imagePreview && $thumbPreview && $thumbPreview.show($event, form.imagePreview)">
                                <template v-if="!form.imagePreview">未上传图片</template>
                                <img v-else :src="form.imagePreview" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                            </div>
                            
                            <!-- 操作按钮区域 -->
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <el-upload
                                    :auto-upload="false"
                                    :show-file-list="false"
                                    :on-change="handleImageChange"
                                    accept="image/*"
                                >
                                    <el-button size="small" type="primary">
                                        <el-icon><Upload /></el-icon>
                                        选择图片
                                    </el-button>
                                </el-upload>
                                
                                <el-button 
                                    v-if="form.imagePreview" 
                                    size="small" 
                                    type="danger" 
                                    @click="clearImage"
                                >
                                    <el-icon><Delete /></el-icon>
                                    清除图片
                                </el-button>
                            </div>
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
            <!-- 查重对话框 (比例查重 阶段A) -->
            <el-dialog
                v-model="showDuplicateDialog"
                class="dup-groups-dialog"
                title="重复配方处理（比例等价）"
                width="760px"
                :close-on-click-modal="false"
                :close-on-press-escape="false"
            >
                <div v-if="deletionPending" style="margin-bottom:8px;">
                    <el-alert type="info" title="正在删除..." show-icon></el-alert>
                </div>
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
                        <div class="dup-group-foot meta-text" v-if="!duplicateSelections[grp.signature]">请选择要保留的记录</div>
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

            <!-- 冲突解决对话框 -->
            <conflict-resolver
                v-model:visible="showConflictDialog"
                :conflict-data="conflictData"
                :my-data="getMyFormData()"
                :latest-data="conflictData?.latestData || {}"
                @resolve="handleConflictResolve"
            />

            <!-- 色彩列表对话框 -->
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
                            <el-button type="primary" size="small" @click="printColorPalette">
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
    
    // 注入全局数据
    inject: ['globalData'],
    
    data() {
        return {
            loading: false,
            activeCategory: 'all',
            showAddDialog: false,
            editingColor: null,
            _colorItemRefs: new Map(),
            highlightCode: null,
            refreshKey: 0, // Force re-render when data updates
            // 查重
            showDuplicateDialog: false,
            duplicateGroups: [],
            duplicateSelections: {}, // signature -> recordId
            deletionPending: false,
            mergingPending: false,
            form: {
                category_id: '',
                color_code: '',
                formula: '',
                imageFile: null,
                imagePreview: null
            },
            rules: {
                category_id: [{ required: true, message: '请选择分类', trigger: 'change' }],
                color_code: [
                    { required: true, message: '请输入颜色编号', trigger: 'blur' }
                ]
            },
            _originalColorFormSnapshot: null,
            _escHandler: null,
            // 冲突解决
            showConflictDialog: false,
            conflictData: null,
            pendingFormData: null,
            // 色彩列表对话框
            showColorPaletteDialog: false,
            paletteGroups: [] // 添加一个data属性来存储分组数据
        };
    },
    
    computed: {
        // Expose formulaUtils to template
        formulaUtils() {
            return window.formulaUtils;
        },
        // 从注入的全局数据获取基础URL
        baseURL() {
            return this.globalData.baseURL;
        },
        // 从注入的全局数据获取分类列表
        categories() {
            return this.globalData.categories.value || [];
        },
        sjCategoryId() { // 色精分类 id（可能不存在）
            const sj = this.categories.find(c=>c.code==='SJ');
            return sj ? sj.id : null;
        },
        // 排序 + 插入“色精”(SJ) 位置在 黄色系(YE) 之后，“其他” 之前
        orderedCategoriesWithOther() {
            const raw = [...(this.categories||[])];
            // 找到 SJ 是否已存在
            // categories 表里应有 code = 'SJ' name = '色精'
            // 先按 code 原顺序（假设 code 的首两位区分）
            raw.sort((a,b)=> (a.code||'').localeCompare(b.code||''));
            const result = [];
            raw.forEach(cat => {
                result.push(cat);
                if (cat.code === 'YE') {
                    // 确保 SJ 在 YE 后面且不重复
                    if (!raw.some(c=>c.code==='SJ')) {
                        // 若未出现在原始数据中，跳过插入（后端保证存在）
                    }
                }
            });
            // 如果 SJ 存在但顺序不正确，重排：先移除再重新插入
            const sjIndex = result.findIndex(c=>c.code==='SJ');
            if (sjIndex !== -1) {
                const sjCat = result.splice(sjIndex,1)[0];
                const yeIndex = result.findIndex(c=>c.code==='YE');
                if (yeIndex !== -1) result.splice(yeIndex+1,0,sjCat); else result.push(sjCat);
            }
            // 添加“其他”
            result.push({ id: 'other', name: '其他', code: 'OTHER' });
            return result;
        },
        // 供对话框选择使用（不包含自动追加的“其他”逻辑重复 — 这里仍附带 other 选项以便选择）
        categoriesWithOther() {
            // 复用排序逻辑，但保持数据引用独立
            return this.orderedCategoriesWithOther.map(c=>c);
        },
        // 从注入的全局数据获取自配颜色列表
        customColors() {
            return this.globalData.customColors.value || [];
        },
        canDeleteAny(){
            if(!this.duplicateGroups || !this.duplicateGroups.length) return false;
            for(const g of this.duplicateGroups){
                const keepId = this.duplicateSelections[g.signature];
                if(!keepId) continue;
                // 是否存在可删（未引用且不是保留项）
                if(g.records.some(r=> r.id!==keepId && !this.isColorReferenced(r))) return true;
            }
            return false;
        },
        canForceMerge(){
            if(!this.duplicateGroups || !this.duplicateGroups.length) return false;
            return this.duplicateGroups.some(g=> g.records.length>1 && this.duplicateSelections[g.signature]);
        },
        // 根据当前选中的分类过滤颜色
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
            // 本页搜索过滤（阶段4）：仅自配色名称匹配
            const q = (this.$root && this.$root.globalSearchQuery || '').trim().toLowerCase();
            if (q && this.$root.activeTab === 'custom-colors') {
                list = list.filter(c => ((c.name||'').toLowerCase().includes(q)) || ((c.color_code||'').toLowerCase().includes(q)) );
            }
            // 排序
            if (this.sortMode === 'name') {
                list.sort((a,b) => (a.color_code||'').localeCompare(b.color_code||''));
            } else { // time 默认
                list.sort((a,b) => new Date(b.updated_at||b.created_at||0) - new Date(a.updated_at||a.created_at||0));
            }
            return list;
        },
        // 从注入的全局数据获取颜色原料库
        montMarteColors() {
            return this.globalData.montMarteColors.value || [];
        },
        colorCodeDuplicate() {
            const val = (this.form.color_code || '').trim();
            if (!val) return false;
            return this.customColors.some(c => c.color_code === val && c.id !== (this.editingColor?.id || null));
        }
    },
    
    methods: {
        setColorItemRef(color) {
            return (el) => {
                if (el) this._colorItemRefs.set(color.color_code, el); else this._colorItemRefs.delete(color.color_code);
            };
        },
        focusCustomColor(code) {
            // 确保在“全部”标签下便于查找
            if (this.activeCategory !== 'all') this.activeCategory = 'all';
            this.$nextTick(() => {
                const el = this._colorItemRefs.get(code);
                if (el && el.scrollIntoView) {
                    // 居中尝试：计算位置
                    try {
                        const rect = el.getBoundingClientRect();
                        const vh = window.innerHeight || document.documentElement.clientHeight;
                        const current = window.pageYOffset || document.documentElement.scrollTop;
                        const targetScroll = current + rect.top - (vh/2 - rect.height/2);
                        window.scrollTo(0, Math.max(0, targetScroll));
                    } catch(e) { el.scrollIntoView(); }
                    this.highlightCode = code;
                    setTimeout(()=>{ this.highlightCode = null; }, 2000);
                }
            });
        },
        usageGroups(color) {
            if (!color) return [];
            const code = color.color_code;
            if (!code) return [];
            const artworks = (this.globalData.artworks?.value) || [];
            const groups = [];
            artworks.forEach(a => {
                (a.schemes || []).forEach(s => {
                    const layers = [];
                    (s.layers || []).forEach(l => {
                        if (l.colorCode === code) {
                            const num = Number(l.layer);
                            if (Number.isFinite(num)) layers.push(num);
                        }
                    });
                    if (layers.length) {
                        layers.sort((x,y)=>x-y);
                        const schemeName = s.name || s.scheme_name || '-';
                        const header = `${this.$helpers.formatArtworkTitle(a)}-[${schemeName}]`;
                        const suffix = layers.map(n=>`(${n})`).join('');
                        groups.push({
                            display: header + suffix,
                            artworkId: a.id,
                            schemeId: s.id,
                            layers: layers.slice(),
                            colorCode: code,
                            schemeName
                        });
                    }
                });
            });
            return groups;
        },
        categoryName(color) {
            if (!color) return '-';
            const cat = this.categories.find(c => c.id === color.category_id);
            if (cat) return cat.name;
            // 前缀推断
            const prefix = (color.color_code || '').substring(0,2).toUpperCase();
            const byPrefix = this.categories.find(c => c.code === prefix);
            return byPrefix ? byPrefix.name : '其他';
        },
        // Formula segments method removed - using shared formulaUtils.segments instead
    // 打开添加对话框
        openAddDialog() {
            // 重置编辑状态
            this.editingColor = null;
            
            // 如果当前不在"全部"标签页，自动填充对应分类
            if (this.activeCategory !== 'all') {
                if (this.activeCategory === 'other') {
                    // 在"其他"标签页时，设置分类为"其他"
                    this.form.category_id = 'other';
                    this.form.color_code = '';
                } else {
                    const categoryId = parseInt(this.activeCategory);
                    this.form.category_id = categoryId;
                    // 自动生成颜色编号
                    this.generateColorCode(categoryId);
                }
            } else {
                // 在"全部"标签页时，分类保持为空
                this.form.category_id = '';
                this.form.color_code = '';
            }
            
            // 清空其他字段
            this.form.formula = '';
            this.form.imageFile = null;
            this.form.imagePreview = null;
            
            // 打开对话框
            this.showAddDialog = true;
        },
        onOpenColorDialog() {
            // 复用原逻辑
            this.initForm();
            // 建立初始快照
            this._originalColorFormSnapshot = JSON.stringify(this._normalizedColorForm());
            // 绑定 ESC
            this._bindEscForDialog();
        },
        _normalizedColorForm() {
            return {
                category_id: this.form.category_id || '',
                color_code: this.form.color_code || '',
                formula: this.form.formula || '',
                imagePreview: this.form.imagePreview ? '1' : '' // 只关心是否有图
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
            if (this._escHandler) return;
            this._escHandler = (e) => {
                if (e.key === 'Escape' && this.showAddDialog) {
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
        
        // 颜色编号输入时智能识别分类
        onColorCodeInput(value) {
            // 规则：
            // 1. 编辑模式不自动分类
            // 2. 当前分类若为 "色精"(SJ) 或 "其他" 则不再自动切换
            // 3. 若首字符为 酒/沙/红/黑/蓝 => 设置分类为 色精(SJ)
            // 4. 否则按前两位字母 BU GN RD VT YE 识别；无匹配 => 其他
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
                return; // 不再继续字母前缀匹配
            }

            if (value.length >= 2) {
                const prefix = value.substring(0,2).toUpperCase();
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
        
        // 验证颜色编号唯一性
        validateColorCode(rule, value, callback) {
            if (value) {
                const exists = this.customColors.some(color => 
                    color.color_code === value && color.id !== (this.editingColor?.id || null)
                );
                if (exists) {
                    callback(new Error('该颜色编号已存在！'));
                } else {
                    callback();
                }
            } else {
                callback();
            }
        },
        
        // 初始化表单（对话框打开时）
        initForm() {
            // 只在编辑模式下或已有分类时生成编号
            if (!this.editingColor && this.form.category_id && this.form.category_id !== 'other' && this.form.category_id !== this.sjCategoryId) {
                this.generateColorCode(this.form.category_id);
            }
        },
        
        // 分类改变时自动生成编号
        onCategoryChange(categoryId) {
            if (!this.editingColor && categoryId && categoryId !== 'other' && categoryId !== this.sjCategoryId) {
                this.generateColorCode(categoryId);
            } else if (categoryId === 'other' || categoryId === this.sjCategoryId) {
                // 选择"其他"分类时清空编号，让用户自行输入
                this.form.color_code = '';
            }
        },
        
        // 生成颜色编号
        generateColorCode(categoryId) {
            if (!categoryId || categoryId === 'other' || categoryId === this.sjCategoryId) return; // 色精与其他不自动编号
            const code = helpers.generateColorCode(this.categories, this.customColors, categoryId);
            this.form.color_code = code;
        },
        
        // 处理图片选择
        handleImageChange(file) {
            this.form.imageFile = file.raw;
            this.form.imagePreview = URL.createObjectURL(file.raw);
        },
        
        // 清除图片
        clearImage() {
            this.form.imageFile = null;
            if (this.form.imagePreview) {
                URL.revokeObjectURL(this.form.imagePreview);
                this.form.imagePreview = null;
            }
        },
        
        // 保存颜色（新增或修改）
        async saveColor() {
            const valid = await this.$refs.formRef.validate().catch(() => false);
            if (!valid) return;
            if (this.colorCodeDuplicate) {
                // 统一查重提示：仅右侧内联 .dup-msg，不再弹出全局提示
                return;
            }
            
            try {
                const formData = new FormData();
                
                // 处理分类ID（"其他"分类特殊处理）
                let actualCategoryId = this.form.category_id;
                if (actualCategoryId === 'other') {
                    // 对于"其他"分类，尝试根据编号前缀找到正确的分类
                    const prefix = this.form.color_code.substring(0, 2).toUpperCase();
                    const matchedCategory = this.categories.find(cat => cat.code === prefix);
                    if (matchedCategory) {
                        actualCategoryId = matchedCategory.id;
                    } else {
                        // 如果确实无法匹配，使用第一个分类或创建特殊标记
                        actualCategoryId = this.categories[0]?.id || 1;
                    }
                }
                
                formData.append('category_id', actualCategoryId);
                formData.append('color_code', this.form.color_code);
                formData.append('formula', this.form.formula);
                if (this.form.imageFile) {
                    formData.append('image', this.form.imageFile);
                }
                
                if (this.editingColor) {
                    // 如果没有新图片但有旧图片，保留旧图片路径
                    if (!this.form.imageFile && this.editingColor.image_path) {
                        formData.append('existingImagePath', this.editingColor.image_path);
                    }
                    // 添加版本信息用于乐观锁
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
                // 先刷新自配色，再刷新作品（同步更新作品方案中引用的自配色编号）
                await this.globalData.loadCustomColors();
                await this.globalData.loadArtworks();
                // Force component refresh to show updated data immediately
                this.refreshKey++;
                // 保存后自动比例查重
                if (window.duplicateDetector) {
                    const saved = (this.globalData.customColors?.value||[]).find(c=> c.color_code === this.form.color_code);
                    if (saved) {
                        const grp = window.duplicateDetector.detectOnSave(saved, this.globalData.customColors.value);
                        if (grp) {
                            msg.warning('发现重复配方（比例等价）');
                            // 直接打开对话框
                            this.runDuplicateCheck(grp.signature, saved.id);
                        }
                    }
                }
            } catch (error) {
                if (error.response?.status === 409 && error.response?.data?.code === 'VERSION_CONFLICT') {
                    // 处理版本冲突
                    this.handleVersionConflict(error.response.data, formData);
                } else {
                    msg.error('操作失败');
                }
            }
        },
        
        // 编辑颜色
        editColor(color) {
            this.editingColor = color;
            
            // 判断颜色是否属于"其他"分类
            const prefix = color.color_code.substring(0, 2).toUpperCase();
            const matchedCategory = this.categories.find(cat => cat.code === prefix);
            
            this.form = {
                category_id: matchedCategory ? color.category_id : 'other',
                color_code: color.color_code,
                formula: color.formula,
                imageFile: null,
                imagePreview: color.image_path ? this.$helpers.buildUploadURL(this.baseURL, color.image_path) : null
            };
            this.showAddDialog = true;
        },
        
        // 删除颜色
        async deleteColor(color) {
            const ok = await this.$helpers.doubleDangerConfirm({
                firstMessage: `确定删除 ${color.color_code} 吗？`,
                secondMessage: '删除后将无法恢复，确认最终删除？',
                secondConfirmText: '永久删除'
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
                } else if (raw.includes('不存在')) {
                    msg.error('该自配色不存在');
                } else if (raw) {
                    msg.error(raw);
                } else if (error?.response?.status === 404) {
                    msg.error('删除功能暂不可用');
                } else if (error?.request) {
                    msg.error('网络异常，删除失败');
                } else {
                    msg.error('删除失败');
                }
            }
        },
        isColorReferenced(color) {
            if (!color) return false;
            const code = color.color_code;
            if (!code) return false;
            const artworks = (this.globalData.artworks?.value) || [];
            for (const a of artworks) {
                for (const s of (a.schemes||[])) {
                    for (const l of (s.layers||[])) {
                        if (l.colorCode === code) return true;
                    }
                }
            }
            return false;
        },
        
        // 查看历史（待实现）
        viewHistory(color) {
            msg.info('历史功能待实现');
        },
        
        // 重置表单
        resetForm() {
            this.editingColor = null;
            this.form = {
                category_id: '',
                color_code: '',
                formula: '',
                imageFile: null,
                imagePreview: null
            };
            if (this.$refs.formRef) {
                this.$refs.formRef.resetFields();
            }
            this._originalColorFormSnapshot = null;
            this._unbindEsc();
        },
        
        // 解析配方字符串为标签数组
        parseFormulaToTags(formulaString) {
            if (!formulaString || formulaString.trim() === '') {
                return [];
            }
            
            const tags = [];
            const parts = formulaString.trim().split(/\s+/);
            
            // 解析格式如："钛白 15g 天蓝update1 3g 深绿 1g"
            for (let i = 0; i < parts.length; i++) {
                // 检查当前项是否是数量+单位
                const amountMatch = parts[i].match(/^([\d.]+)([a-zA-Z\u4e00-\u9fa5]+)$/);
                
                if (amountMatch) {
                    // 如果是数量+单位，与前一个颜色名组合
                    if (tags.length > 0 && !tags[tags.length - 1].amount) {
                        const lastTag = tags[tags.length - 1];
                        lastTag.amount = amountMatch[1];
                        lastTag.unit = amountMatch[2];
                        lastTag.fullText = `${lastTag.colorName} ${amountMatch[1]}${amountMatch[2]}`;
                    }
                } else {
                    // 否则作为新的颜色名
                    tags.push({
                        colorName: parts[i],
                        amount: '',
                        unit: '',
                        fullText: parts[i]
                    });
                }
            }
            
            return tags;
        },
        runDuplicateCheck(focusSignature=null, preferredKeepId=null){
            if(!window.duplicateDetector){ msg.info('查重模块未加载'); return; }
            const list = this.globalData.customColors?.value || [];
            const map = window.duplicateDetector.groupByRatioSignature(list);
            const sigs = Object.keys(map);
            if(!sigs.length){ msg.success('未发现重复配方'); this.showDuplicateDialog=false; return; }
            // 构造组数据
            this.duplicateGroups = sigs.map(sig=>{
                const recs = map[sig].slice().sort((a,b)=> new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0));
                const parsed = window.duplicateDetector.parseRatio(sig);
                return { signature:sig, records:recs, parsed };
            });
            this.duplicateSelections = {};
            // 默认选中：刚保存记录所在组，否则各组选更新时间最新一条
            this.duplicateGroups.forEach(g=>{
                if (focusSignature && g.signature===focusSignature && preferredKeepId){
                    this.duplicateSelections[g.signature]=preferredKeepId;
                } else if(g.records.length){
                    this.duplicateSelections[g.signature]=g.records[0].id; // 最新
                }
            });
            this.showDuplicateDialog=true;
            msg.warning(`发现 ${sigs.length} 组重复配方`);
        },
        keepAllDuplicates(){
            this.showDuplicateDialog=false;
            msg.info('已保留全部重复记录');
        },
        async performDuplicateDeletion(){
            if(this.deletionPending) return;
            const toDelete=[];
            this.duplicateGroups.forEach(g=>{
                const keepId = this.duplicateSelections[g.signature];
                if(!keepId) return;
                g.records.forEach(r=>{ if(r.id!==keepId && !this.isColorReferenced(r)) toDelete.push(r); });
            });
            if(!toDelete.length){ msg.info('没有可删除的记录'); return; }
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
            msg.success(`删除完成：成功 ${ok} 条，失败 ${fail} 条`);
            // 重新检测
            this.runDuplicateCheck();
        },
        async confirmForceMerge(){
            if(this.mergingPending || this.deletionPending) return;
            const candidates = this.duplicateGroups.filter(g=> g.records.length>1 && this.duplicateSelections[g.signature]);
            if(!candidates.length){ msg.info('请选择要保留的记录'); return; }
            const g = candidates[0];
            const keepId = this.duplicateSelections[g.signature];
            if(!keepId){ msg.info('请先选择要保留的记录'); return; }
            const removeIds = g.records.filter(r=> r.id!==keepId).map(r=> r.id);
            if(!removeIds.length){ msg.info('该组没有其它记录'); return; }
            let referenced=0; g.records.forEach(r=>{ if(r.id!==keepId && this.isColorReferenced(r)) referenced++; });
            const msg = `将合并该组：保留 1 条，删除 ${removeIds.length} 条；其中 ${referenced} 条被引用，其引用将更新到保留记录。确认继续？`;
            try { await ElementPlus.ElMessageBox.confirm(msg, '强制合并确认', { type:'warning', confirmButtonText:'执行合并', cancelButtonText:'取消' }); } catch(e){ return; }
            this.executeForceMerge({ keepId, removeIds, signature: g.signature });
        },
        async executeForceMerge(payload){
            if(this.mergingPending) return;
            this.mergingPending = true;
            try {
                const resp = await api.customColors.forceMerge(payload);
                const updated = resp?.updatedLayers ?? resp?.data?.updatedLayers ?? 0;
                const deleted = resp?.deleted ?? resp?.data?.deleted ?? payload.removeIds.length;
                msg.success(`强制合并完成：更新引用 ${updated} 个，删除 ${deleted} 条`);
                await this.globalData.loadCustomColors();
                await this.globalData.loadArtworks();
                this.runDuplicateCheck();
                if(!this.duplicateGroups.length){ this.showDuplicateDialog=false; }
            } catch(err){
                const raw = err?.response?.data?.error || '';
                if(raw){ msg.error('合并失败: '+raw); }
                else if(err?.request){ msg.error('网络错误，合并失败'); }
                else { msg.error('合并失败'); }
            } finally {
                this.mergingPending = false;
            }
        },

        // 冲突处理相关方法
        handleVersionConflict(conflictData, formData) {
            this.conflictData = conflictData;
            this.pendingFormData = formData;
            this.showConflictDialog = true;
        },

        getMyFormData() {
            const categoryName = this.categories.find(c => c.id == this.form.category_id)?.name || '其他';
            return {
                color_code: this.form.color_code,
                formula: this.form.formula,
                category_name: categoryName,
                image_path: this.form.imageFile ? '新上传图片' : null
            };
        },

        async handleConflictResolve(resolution) {
            const { action } = resolution;
            this.showConflictDialog = false;

            try {
                switch (action) {
                    case 'overwrite':
                        // 强制覆盖：忽略版本检查
                        await this.forceUpdateColor();
                        break;
                    
                    case 'merge':
                        // 手动合并：用最新数据填充表单
                        this.mergeLatestData();
                        break;
                    
                    case 'refresh':
                        // 刷新数据：丢弃修改，重新加载
                        await this.refreshColorData();
                        break;
                }
            } catch (error) {
                msg.error('冲突处理失败');
            }

            // 清理状态
            this.conflictData = null;
            this.pendingFormData = null;
        },

        async forceUpdateColor() {
            if (!this.pendingFormData || !this.editingColor) return;
            
            try {
                // 移除版本检查，强制更新
                this.pendingFormData.delete('version');
                await api.customColors.update(this.editingColor.id, this.pendingFormData);
                
                msg.success('强制覆盖成功');
                this.showAddDialog = false;
                this.resetForm();
                await this.globalData.loadCustomColors();
                await this.globalData.loadArtworks();
            } catch (error) {
                msg.error('强制覆盖失败');
            }
        },

        mergeLatestData() {
            if (!this.conflictData?.latestData) return;
            
            const latest = this.conflictData.latestData;
            
            // 用最新数据更新表单，但保持用户的图片修改
            const keepImageChange = this.form.imageFile !== null;
            
            this.form.color_code = latest.color_code;
            this.form.formula = latest.formula;
            this.form.category_id = latest.category_id;
            
            if (!keepImageChange && latest.image_path) {
                this.form.imagePreview = this.$helpers.buildUploadURL(this.baseURL, latest.image_path);
            }
            
            // 更新编辑状态为最新版本
            this.editingColor = { ...this.editingColor, ...latest };
            
            msg.info('已用最新数据填充表单，请检查后重新保存');
        },

        async refreshColorData() {
            await this.globalData.loadCustomColors();
            this.showAddDialog = false;
            this.resetForm();
            msg.info('已刷新到最新数据');
        },

        // 显示色彩列表对话框
        async showColorPalette() {
            try {
                // 打开对话框前刷新数据
                await this.globalData.loadCustomColors();
                await this.globalData.loadCategories();
                
                // 使用真实数据创建分组
                const categories = this.globalData.categories?.value || [];
                const customColors = this.globalData.customColors?.value || [];
                
                const groups = [];
                
                if (customColors.length === 0) {
                    this.paletteGroups = [];
                    this.showColorPaletteDialog = true;
                    return;
                }
                
                if (categories.length === 0) {
                    // 没有分类，创建一个默认分组
                    groups.push({
                        categoryName: '所有自配色',
                        categoryCode: 'ALL',
                        colors: customColors
                    });
                } else {
                    // 按分类分组
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
                    
                    // 按分类创建分组
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
                    
                    // 添加未分类的颜色
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

        // 打印色彩列表
        printColorPalette() {
            // 添加打印提示
            msg.info('正在准备打印，请稍候...');
            
            this.$nextTick(() => {
                setTimeout(() => {
                    this.createPrintWindow();
                }, 300);
            });
        },

        // 创建打印窗口
        createPrintWindow() {
            // 构建打印内容HTML
            const printContent = this.generatePrintHTML();
            
            // 创建新窗口
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // 等待内容加载后打印
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            };
        },

        // 生成打印HTML内容
        generatePrintHTML() {
            const colorCount = (this.globalData.customColors?.value || []).length;
            const groupCount = this.paletteGroups.length;
            
            // 确保baseURL存在
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

            // 添加每个分组的内容
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
    }
};