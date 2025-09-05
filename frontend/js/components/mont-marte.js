// 颜色原料管理组件（原“颜色原料库”）
// 文件路径: frontend/js/components/mont-marte.js
// 定义全局变量 MontMarteComponent，被 app.js 引用并注册

const MontMarteComponent = {
        props: {
            sortMode: { type: String, default: 'time' } // time | name
        },
        template: `
                <div>
                        <div class="category-switch-group" role="tablist" aria-label="原料类别筛选">
                            <button type="button" class="category-switch" :class="{active: activeCategory==='all'}" @click="activeCategory='all'" role="tab" :aria-selected="activeCategory==='all'">全部</button>
                            <button v-for="cat in montMarteCategories" :key="cat.id" type="button" class="category-switch" :class="{active: activeCategory===cat.id}" @click="activeCategory=cat.id" role="tab" :aria-selected="activeCategory===cat.id">{{ cat.name }}</button>
                        </div>
                        <div v-if="loading" class="loading">
                                <el-icon class="is-loading"><Loading /></el-icon> 加载中...
                        </div>
                        <div v-else>
                                <div v-if="montMarteColors.length === 0" class="empty-message">暂无原料，点击右上角"新原料"添加</div>
                                
                                <!-- Grid Container for Cards -->
                                <div class="color-cards-grid">
                                    <div v-for="color in paginatedColors" :key="color.id" class="artwork-bar" :data-raw-id="color.id" :class="{'selected': selectedColorId === color.id}" @click="toggleColorSelection(color.id)">
                                    <div class="artwork-header">
                                        <div class="artwork-title">{{ color.name }}</div>
                                        <div class="color-actions">
                                                <el-button size="small" type="primary" @click="editColor(color)">
                                                    <el-icon><Edit /></el-icon> 修改
                                                </el-button>
                                                <template v-if="rawUsageCodes(color).length">
                                                    <el-tooltip content="该颜色原料已被引用，无法删除" placement="top">
                                                        <span>
                                                            <el-button size="small" type="danger" disabled>
                                                                <el-icon><Delete /></el-icon> 删除
                                                            </el-button>
                                                        </span>
                                                    </el-tooltip>
                                                </template>
                                                <el-button v-else size="small" type="danger" @click="deleteColor(color)">
                                                    <el-icon><Delete /></el-icon> 删除
                                                </el-button>
                                        </div>
                                    </div>
                                    <div style="display:flex; gap:12px; padding:6px 4px 4px;">
                                                            <div class="scheme-thumbnail" :class="{ 'no-image': !color.image_path }" @click="color.image_path && $thumbPreview && $thumbPreview.show($event, $helpers.buildUploadURL(baseURL, color.image_path))">
                                                                <template v-if="!color.image_path">未上传图片</template>
                                                                <img v-else :src="$helpers.buildUploadURL(baseURL, color.image_path)" @error="onThumbError" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                                                            </div>
                                        <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;">
                                            <div class="meta-text" v-if="color.updated_at">更新：{{ $helpers.formatDate(color.updated_at) }}</div>
                                            <div class="meta-text">分类：<template v-if="color.category_id">{{ mapCategoryLabel(color.category_id) }}</template><template v-else>（未填）</template></div>
                                            <div class="meta-text">供应商：<template v-if="color.supplier_name">{{ color.supplier_name }}</template><template v-else>（未填）</template></div>
                                            <div class="meta-text" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" :title="color.purchase_link_url || ''">采购：<template v-if="color.purchase_link_url">{{ color.purchase_link_url }}</template><template v-else>（未填）</template></div>
                                            <div class="meta-text">适用色：
                                                <template v-if="rawUsageCodes(color).length">
                                                    <span class="usage-chips">
                                                        <span v-for="c in rawUsageCodes(color)" :key="c" class="mf-chip usage-chip" @click="handleColorChipClick(c)" style="cursor:pointer;">{{ c }}</span>
                                                    </span>
                                                </template>
                                                <template v-else>（未使用）</template>
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

            <!-- 新增/编辑对话框 -->
            <el-dialog
                class="scheme-dialog"
                v-model="showDialog"
                :title="editing ? '修改颜色原料' : '新增颜色原料'"
                width="640px"
                :close-on-click-modal="false"
                :close-on-press-escape="false"
                @open="onOpenDialog"
                @close="onCloseDialog"
            >
                <el-form
                    ref="formRef"
                    :model="form"
                    :rules="rules"
                    label-width="100px"
                    @submit.prevent
                    @keydown.enter.stop.prevent="onFormEnter"
                >
                    <el-form-item label="颜色名称" prop="name">
                        <div class="dup-inline-row">
                            <el-input v-model.trim="form.name" placeholder="例如：粉红" class="short-inline-input" />
                            <span v-if="nameDuplicate" class="dup-msg">名称重复</span>
                        </div>
                    </el-form-item>
                    <el-form-item label="原料类别" prop="category_id">
                        <el-select v-model="form.category_id" placeholder="请选择类别">
                            <el-option v-for="cat in montMarteCategories" :key="cat.id" :label="cat.name" :value="cat.id" />
                        </el-select>
                    </el-form-item>

                    <!-- 新增：供应商（可输入+创建+下拉） -->
                    <el-form-item label="供应商">
                        <div style="display:flex; gap:8px; align-items:center;">
                            <el-select
                                ref="supplierSelect"
                                v-model="form.supplier_id"
                                filterable
                                clearable
                                allow-create
                                default-first-option
                                automatic-dropdown
                                placeholder="选择或输入供应商"
                                style="width: 360px;"
                                @change="onSupplierChange"
                            >
                                <el-option
                                    v-for="opt in supplierOptions"
                                    :key="opt.id"
                                    :label="opt.name"
                                    :value="opt.id"
                                >
                                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                        <span>{{ opt.name }}</span>
                                        <el-icon
                                            style="color:#bbb; cursor:pointer;"
                                            title="删除该供应商"
                                            @click.stop="deleteSupplierOption(opt)"
                                        >
                                            <Delete />
                                        </el-icon>
                                    </div>
                                </el-option>
                            </el-select>
                            <el-button circle @click="confirmSupplier" :disabled="supplierBusy" :loading="supplierBusy" title="提交当前输入">
                                <el-icon><Check /></el-icon>
                            </el-button>
                        </div>
                    </el-form-item>

                    <!-- 新增：线上采购地址 -->
                    <el-form-item label="线上采购地址">
                        <div style="display:flex; gap:8px; align-items:center;">
                            <el-select
                                ref="purchaseSelect"
                                v-model="form.purchase_link_id"
                                filterable
                                clearable
                                allow-create
                                default-first-option
                                automatic-dropdown
                                placeholder="选择或输入采购地址"
                                style="width: 360px;"
                                @change="onPurchaseChange"
                            >
                                <el-option
                                    v-for="opt in purchaseLinkOptions"
                                    :key="opt.id"
                                    :label="opt.url"
                                    :value="opt.id"
                                >
                                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                        <span class="meta-text" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:460px;">{{ opt.url }}</span>
                                        <el-icon
                                            style="color:#bbb; cursor:pointer;"
                                            title="删除该地址"
                                            @click.stop="deletePurchaseOption(opt)"
                                        >
                                            <Delete />
                                        </el-icon>
                                    </div>
                                </el-option>
                            </el-select>
                            <el-button circle @click="confirmPurchase" :disabled="purchaseBusy" :loading="purchaseBusy" title="提交当前输入">
                                <el-icon><Check /></el-icon>
                            </el-button>
                        </div>
                    </el-form-item>

                    <el-form-item label="颜色样图">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <!-- 缩略图预览区域 -->
                            <div class="scheme-thumbnail" 
                                 :class="{ 'no-image': !form.imagePreview }" 
                                 style="width: 80px; height: 80px; flex-shrink: 0;"
                                 @click="form.imagePreview && $thumbPreview && $thumbPreview.show($event, form.imagePreview)">
                                <template v-if="!form.imagePreview">未上传图片</template>
                                <img v-else :src="form.imagePreview" @error="onThumbError" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                            </div>
                            
                            <!-- 操作按钮区域 -->
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <el-upload
                                    :auto-upload="false"
                                    :show-file-list="false"
                                    :on-change="onImageChange"
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
                    <el-button @click="attemptCloseDialog">
                        <el-icon><Close /></el-icon> 取消
                    </el-button>
                    <el-button type="primary" @click="saveColor" :disabled="nameDuplicate || saving">
                        <el-icon v-if="saving" class="is-loading"><Loading /></el-icon>
                        <el-icon v-else><Check /></el-icon>
                        {{ saving ? '保存中...' : '保存' }}
                    </el-button>
                </template>
            </el-dialog>
        </div>
    `,
    
    // 注入全局数据
    inject: ['globalData'],
    data() {
        // Smart pagination: detect test mode for reduced context usage
        const isTestMode = window.location.search.includes('test=true') || 
                          window.navigator.userAgent.includes('Playwright');
        
        return {
            // 当前原料类别筛选；'all' 表示不过滤
            activeCategory: 'all',
            loading: false,
            showDialog: false,
            editing: null, // 当前编辑的记录
            
            // Pagination
            currentPage: 1,
            itemsPerPage: isTestMode ? 3 : 12,  // 3 for test/automation, 12 for production
            
            // Card selection
            selectedColorId: null,

            form: {
                id: null,
                name: '',
                category_id: null,  // Changed from category to category_id
                supplier_id: null,
                purchase_link_id: null,
                imageFile: null,
                imagePreview: null
            },

            rules: {
                name: [{ required: true, message: '请输入颜色名称', trigger: 'blur' }],
                category_id: [{ required: true, message: '请选择原料类别', trigger: 'change' }]
            },

            supplierBusy: false,
            purchaseBusy: false,
            saving: false,
            _originalFormSnapshot: null,
            _escHandler: null,
            
            // Mont-Marte categories from API
            montMarteCategories: []
        };
    },
    computed: {
    baseURL() { return window.location.origin; },
        montMarteColors() {
            const list = (this.globalData.montMarteColors.value || []).slice();
            if (this.sortMode === 'name') {
                list.sort((a,b) => (a.name||'').localeCompare(b.name||''));
            } else {
                list.sort((a,b) => new Date(b.updated_at||b.created_at||0) - new Date(a.updated_at||a.created_at||0));
            }
            return list;
        },
        materialCategories() {
            return [
                { value: 'acrylic', label: '丙烯色' },
                { value: 'essence', label: '色精' },
                { value: 'water', label: '水性漆' },
                { value: 'oil', label: '油性漆' },
                { value: 'other', label: '其他' }
            ];
        },
        filteredColors() {
            let list = (this.activeCategory==='all') ? this.montMarteColors : this.montMarteColors.filter(c => c.category_id === this.activeCategory);
            const q = (this.$root && this.$root.globalSearchQuery || '').trim().toLowerCase();
            if (q && this.$root.activeTab === 'mont-marte') {
                list = list.filter(c => (c.name||'').toLowerCase().includes(q));
            }
            return list;
        },
        
        // Pagination computed properties
        totalPages() {
            if (this.itemsPerPage === 0) return 1;  // Show all
            return Math.ceil(this.filteredColors.length / this.itemsPerPage);
        },
        
        paginatedColors() {
            if (this.itemsPerPage === 0) {
                return this.filteredColors;  // Show all
            }
            
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.filteredColors.slice(start, end);
        },
        
        startItem() {
            if (this.filteredColors.length === 0) return 0;
            if (this.itemsPerPage === 0) return 1;
            return (this.currentPage - 1) * this.itemsPerPage + 1;
        },
        
        endItem() {
            if (this.itemsPerPage === 0) return this.filteredColors.length;
            return Math.min(
                this.currentPage * this.itemsPerPage,
                this.filteredColors.length
            );
        },
        
        visiblePages() {
            const pages = [];
            const maxVisible = 7;
            
            if (this.totalPages <= maxVisible) {
                for (let i = 1; i <= this.totalPages; i++) {
                    pages.push(i);
                }
            } else {
                if (this.currentPage <= 4) {
                    for (let i = 1; i <= 5; i++) pages.push(i);
                    pages.push('...');
                    pages.push(this.totalPages);
                } else if (this.currentPage >= this.totalPages - 3) {
                    pages.push(1);
                    pages.push('...');
                    for (let i = this.totalPages - 4; i <= this.totalPages; i++) {
                        pages.push(i);
                    }
                } else {
                    pages.push(1);
                    pages.push('...');
                    for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
                        pages.push(i);
                    }
                    pages.push('...');
                    pages.push(this.totalPages);
                }
            }
            
            return pages;
        },
        
        supplierOptions() { return this.globalData.suppliers.value || []; },
        purchaseLinkOptions() { return this.globalData.purchaseLinks.value || []; },
        nameDuplicate() {
            const n = (this.form.name || '').trim();
            if (!n) return false;
            return (this.montMarteColors || []).some(c => c.name === n && c.id !== this.form.id);
        }
    },
    methods: {
        // Pagination methods
        goToPage(page) {
            if (page === '...') return;
            if (page < 1 || page > this.totalPages) return;
            
            this.currentPage = page;
            
            // Scroll to top of content area
            this.$nextTick(() => {
                const container = this.$el.querySelector('.color-cards-grid');
                if (container) {
                    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            
            // Save preference
            try {
                localStorage.setItem('sw-mont-marte-page', page);
            } catch(e) {}
        },
        
        onItemsPerPageChange() {
            // Reset to first page when changing items per page
            this.currentPage = 1;
            
            // Save preference
            try {
                localStorage.setItem('sw-mont-marte-items-per-page', this.itemsPerPage);
            } catch(e) {}
        },
        
        restorePaginationState() {
            try {
                const savedPage = localStorage.getItem('sw-mont-marte-page');
                const savedItems = localStorage.getItem('sw-mont-marte-items-per-page');
                
                if (savedItems) {
                    this.itemsPerPage = parseInt(savedItems);
                }
                
                if (savedPage) {
                    const page = parseInt(savedPage);
                    if (page <= this.totalPages) {
                        this.currentPage = page;
                    }
                }
            } catch(e) {}
        },
        
        // Card selection methods
        toggleColorSelection(colorId) {
            // Prevent propagation to avoid conflicts with other handlers
            event.stopPropagation();
            
            // Toggle selection
            if (this.selectedColorId === colorId) {
                this.selectedColorId = null;
            } else {
                this.selectedColorId = colorId;
            }
        },
        
        clearSelection() {
            this.selectedColorId = null;
        },
        
        handleGlobalClick(event) {
            // Clear selection if clicking outside the cards
            if (!event.target.closest('.artwork-bar')) {
                this.clearSelection();
            }
        },
        
        handleEscKey(event) {
            // Only clear selection if ESC is pressed and no input is focused
            if (event.key === 'Escape') {
                // Check if any input, textarea, or select is focused
                const activeElement = document.activeElement;
                const isInputFocused = activeElement && (
                    activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.tagName === 'SELECT' ||
                    activeElement.classList.contains('el-input__inner')
                );
                
                // Clear selection only if no input is focused
                if (!isInputFocused && this.selectedColorId !== null) {
                    this.clearSelection();
                    event.preventDefault();
                }
            }
        },
        
        mapCategoryLabel(categoryId) {
            const cat = this.montMarteCategories.find(c => c.id === categoryId);
            return cat ? cat.name : '未分类';
        },
        
        async loadMontMarteCategories() {
            try {
                const response = await fetch(`${this.baseURL}/api/mont-marte-categories`);
                if (!response.ok) throw new Error('Failed to fetch categories');
                this.montMarteCategories = await response.json();
            } catch (error) {
                console.error('Error loading Mont-Marte categories:', error);
                this.$message.error('加载颜料分类失败');
            }
        },
        focusRawMaterial(id) {
            if (!id) return;
            this.$nextTick(()=>{
                const el = document.querySelector(`.artwork-bar[data-raw-id="${id}"]`);
                if (!el) return;
                try {
                    const rect = el.getBoundingClientRect();
                    const current = window.pageYOffset || document.documentElement.scrollTop;
                    const offset = current + rect.top - 20;
                    window.scrollTo(0, Math.max(0, offset));
                } catch(e) { el.scrollIntoView(); }
                el.classList.add('highlight-pulse');
                setTimeout(()=> el.classList.remove('highlight-pulse'), 2100);
            });
        },
        async saveColor() {
            // (legacy implementation removed; using unified logic later in file)
        },
        // 返回引用该原料的自配色编号列表（去重、按字母/数字排序）
        rawUsageCodes(color) {
            if (!color || !color.name) return [];
            const target = color.name.trim();
            if (!target) return [];
            const customList = (this.globalData.customColors?.value) || [];
            const set = new Set();
            customList.forEach(cc => {
                const formula = (cc.formula || '').trim();
                if (!formula) return;
                // 粗粒度匹配：按空白拆分，名称 token 后可能跟数量
                const tokens = formula.split(/\s+/);
                for (let i=0;i<tokens.length;i++) {
                    const t = tokens[i];
                    // 若下一个是数字+单位，则当前 t 视为原料名
                    const next = tokens[i+1] || '';
                    const amountMatch = next.match(/^([\d.]+)([a-zA-Z\u4e00-\u9fa5%]+)$/);
                    if (amountMatch) {
                        if (t === target) {
                            const code = cc.color_code || cc.code;
                            if (code) set.add(code);
                        }
                        i++; // 跳过数量 token
                        continue;
                    }
                    // 若 token 本身等于原料名且后面不是数量，也允许记一次
                    if (t === target) {
                        const code = cc.color_code || cc.code;
                        if (code) set.add(code);
                    }
                }
            });
            return Array.from(set).sort((a,b)=>a.localeCompare(b));
        },
        
        // Handle color chip click to navigate to custom colors
        handleColorChipClick(colorCode) {
            if (this.$root && this.$root.focusCustomColor) {
                this.$root.focusCustomColor(colorCode);
            }
        },
        
        onThumbError(e) {
            // 若加载失败，移除背景以显示占位文本
            const el = e.currentTarget;
            if (el) {
                el.classList.add('no-image');
            }
        },

        async refreshDictionaries() {
            await Promise.all([ this.globalData.loadSuppliers(), this.globalData.loadPurchaseLinks() ]);
        },

        openDialog() {
            this.editing = null;
            this.resetForm();
            this.showDialog = true;
        },
        editColor(row) {
            this.editing = row;
            this.form.id = row.id;
            this.form.name = row.name || '';
            this.form.category_id = row.category_id || null;  // Changed from category to category_id
            this.form.supplier_id = row.supplier_id || null;
            this.form.purchase_link_id = row.purchase_link_id || null;
            this.form.imageFile = null;
            this.form.imagePreview = row.image_path ? this.$helpers.buildUploadURL(this.baseURL, row.image_path) : null;
            this.showDialog = true;
        },
        closeDialog() {
            this.showDialog = false;
        },
        onOpenDialog() {
            // 打开时确保字典已加载
            this.refreshDictionaries();
            this._originalFormSnapshot = JSON.stringify(this._normalizedForm());
            this._bindEsc();
        },
        onCloseDialog() {
            this._originalFormSnapshot = null;
            this._unbindEsc();
        },
        _normalizedForm() {
            return {
                id: this.form.id || null,
                name: this.form.name || '',
                category_id: this.form.category_id || null,  // Changed from category to category_id
                supplier_id: this.form.supplier_id || '',
                purchase_link_id: this.form.purchase_link_id || '',
                image: this.form.imagePreview ? '1' : ''
            };
        },
        _isDirty() {
            if (!this._originalFormSnapshot) return false;
            return JSON.stringify(this._normalizedForm()) !== this._originalFormSnapshot;
        },
        async attemptCloseDialog() {
            if (this._isDirty()) {
                try {
                    await ElementPlus.ElMessageBox.confirm('检测到未保存的修改，确认丢弃吗？', '未保存的修改', {
                        confirmButtonText: '丢弃修改',
                        cancelButtonText: '继续编辑',
                        type: 'warning'
                    });
                } catch(e) { return; }
            }
            this.closeDialog();
        },
        _bindEsc() {
            if (this._escHandler) return;
            this._escHandler = (e)=>{ if (e.key === 'Escape' && this.showDialog) this.attemptCloseDialog(); };
            document.addEventListener('keydown', this._escHandler);
        },
        _unbindEsc() {
            if (this._escHandler) { document.removeEventListener('keydown', this._escHandler); this._escHandler = null; }
        },
        resetForm() {
            this.form = {
                id: null,
                name: '',
                category_id: null,  // Changed from category to category_id
                supplier_id: null,
                purchase_link_id: null,
                imageFile: null,
                imagePreview: null
            };
        },

        // 选择器变更：当 val 为字符串时，表示创建
        async onSupplierChange(val) {
            // 仅当为“新输入的字符串”时触发创建
            if (typeof val !== 'string') return;
            const name = val.trim();
            if (!name) { this.form.supplier_id = null; return; }
            try {
                this.supplierBusy = true;
                const { data } = await axios.post(`${window.location.origin}/api/suppliers/upsert`, { name });
                // 先刷新选项，再切换为 id，避免出现“数字选项”
                await this.globalData.loadSuppliers();
                await this.$nextTick();
                const found = this.supplierOptions.find(o => o.id === data.id);
                this.form.supplier_id = found ? found.id : data.id;
                // 可选：收起下拉，避免视觉闪烁
                this.$nextTick(() => this.$refs.supplierSelect?.blur?.());
            } catch (e) {
                console.error('创建供应商失败', e);
                msg.error('创建供应商失败');
                this.form.supplier_id = null;
            } finally {
                this.supplierBusy = false;
            }
        },
        async confirmSupplier() {
            if (typeof this.form.supplier_id === 'string' && !this.supplierBusy) {
                await this.onSupplierChange(this.form.supplier_id);
            }
        },

        async deleteSupplierOption(opt) {
            try {
                await axios.delete(`${window.location.origin}/api/suppliers/${opt.id}`);
                msg.success('已删除供应商');
                // 如果当前选中的是被删项，清空
                if (this.form.supplier_id === opt.id) this.form.supplier_id = null;
                await this.globalData.loadSuppliers();
            } catch (e) {
                if (e.response && e.response.status === 409) {
                    msg.warning(e.response.data?.error || '有引用，无法删除');
                } else {
                    msg.error('删除失败');
                }
            }
        },

        async onPurchaseChange(val) {
            if (typeof val !== 'string') return;
            const url = val.trim();
            if (!url) { this.form.purchase_link_id = null; return; }
            try {
                this.purchaseBusy = true;
                const { data } = await axios.post(`${window.location.origin}/api/purchase-links/upsert`, { url });
                await this.globalData.loadPurchaseLinks();
                await this.$nextTick();
                const found = this.purchaseLinkOptions.find(o => o.id === data.id);
                this.form.purchase_link_id = found ? found.id : data.id;
                this.$nextTick(() => this.$refs.purchaseSelect?.blur?.());
            } catch (e) {
                console.error('创建采购地址失败', e);
                msg.error('创建采购地址失败');
                this.form.purchase_link_id = null;
            } finally {
                this.purchaseBusy = false;
            }
        },
        async confirmPurchase() {
            if (typeof this.form.purchase_link_id === 'string' && !this.purchaseBusy) {
                await this.onPurchaseChange(this.form.purchase_link_id);
            }
        },
        async deletePurchaseOption(opt) {
            try {
                await axios.delete(`${window.location.origin}/api/purchase-links/${opt.id}`);
                msg.success('已删除采购地址');
                if (this.form.purchase_link_id === opt.id) this.form.purchase_link_id = null;
                await this.globalData.loadPurchaseLinks();
            } catch (e) {
                if (e.response && e.response.status === 409) {
                    msg.warning(e.response.data?.error || '有引用，无法删除');
                } else {
                    msg.error('删除失败');
                }
            }
        },

        onImageChange(file) {
            const raw = file.raw || file;
            this.form.imageFile = raw;
            const reader = new FileReader();
            reader.onload = () => { this.form.imagePreview = reader.result; };
            reader.readAsDataURL(raw);
        },
        
        clearImage() {
            this.form.imageFile = null;
            this.form.imagePreview = null;
        },

        async saveColor() {
            // 统一保存逻辑：先校验，失败不进入后端调用，也不显示“保存失败”误导信息
            const valid = await this.$refs.formRef.validate().catch(()=>false);
            if (!valid) return; // 表单已在各字段下方显示错误
            if (this.nameDuplicate) {
                // 统一查重提示：仅使用右侧内联 .dup-msg，不再弹出全局消息
                return;
            }
            // 处理可能的“新建”供应商 / 采购地址
            try {
                if (typeof this.form.supplier_id === 'string') await this.onSupplierChange(this.form.supplier_id);
                if (typeof this.form.purchase_link_id === 'string') await this.onPurchaseChange(this.form.purchase_link_id);
            } catch(e) {
                // 若创建关联记录失败，直接终止保存
                return;
            }
            this.saving = true;
            try {
                const fd = new FormData();
                fd.append('name', this.form.name.trim());
                fd.append('category', this.form.category || '');
                if (this.form.supplier_id) fd.append('supplier_id', this.form.supplier_id);
                if (this.form.purchase_link_id) fd.append('purchase_link_id', this.form.purchase_link_id);
                if (this.form.imageFile) fd.append('image', this.form.imageFile);
                if (!this.form.imageFile && this.form.imagePreview && this.editing && this.editing.image_path) {
                    fd.append('existingImagePath', this.editing.image_path);
                }
                if (this.editing) {
                    const res = await axios.put(`${window.location.origin}/api/mont-marte-colors/${this.form.id}`, fd);
                    const n = res?.data?.updatedReferences || 0;
                    msg.success(n>0 ? `已保存并同步更新 ${n} 处配方引用` : '已保存修改');
                } else {
                    await axios.post(`${window.location.origin}/api/mont-marte-colors`, fd);
                    msg.success('已新增颜色原料');
                }
                await Promise.all([
                    this.globalData.loadMontMarteColors(),
                    this.globalData.loadCustomColors()
                ]);
                this.showDialog = false;
            } catch(e) {
                console.error('保存失败(网络/服务器)', e);
                msg.error('保存失败');
            } finally { this.saving = false; }
        },
        
        onFormEnter() {
            // 回车即保存
            this.saveColor();
        },

        
        async deleteColor(color) {
            const ok = await this.$helpers.doubleDangerConfirm({
                firstMessage: `确定删除 "${color.name}" 吗？`,
                secondMessage: '删除后将无法恢复，确认最终删除？',
                secondConfirmText: '永久删除'
            });
            if (!ok) return;
            try {
                await api.montMarteColors.delete(color.id);
                msg.success('删除成功');
                await this.globalData.loadMontMarteColors();
                // 同步刷新自配色，避免引用残留提示（若后端允许删除未引用的）
                await this.globalData.loadCustomColors();
            } catch (error) {
                const msg = error?.response?.data?.error || '删除失败';
                msg.error(msg);
            }
        },
        
        resetForm() {
            this.editingColor = null;
            this.form = {
                name: '',
                imageFile: null,
                imagePreview: null
            };
            if (this.$refs.formRef) {
                this.$refs.formRef.resetFields();
            }
            this._originalFormSnapshot = null;
            this._unbindEsc();
        }
    },
    
    watch: {
        // Reset to page 1 when filter changes
        activeCategory() {
            this.currentPage = 1;
        },
        
        // Adjust current page if it exceeds total pages
        totalPages(newVal) {
            if (this.currentPage > newVal && newVal > 0) {
                this.currentPage = newVal;
            }
        },
        
        // Clear validation error when there's a duplicate
        nameDuplicate(val) {
            if (val && this.$refs.formRef) {
                this.$refs.formRef.clearValidate('name');
            }
        }
    },
    
    mounted() {
        // Load Mont-Marte categories from API
        this.loadMontMarteCategories();
        
        // Restore pagination state on mount
        this.restorePaginationState();
        
        // Add global event listeners for selection
        document.addEventListener('click', this.handleGlobalClick);
        document.addEventListener('keydown', this.handleEscKey);
    },
    
    beforeUnmount() {
        // Clean up event listeners
        document.removeEventListener('click', this.handleGlobalClick);
        document.removeEventListener('keydown', this.handleEscKey);
    }
};

// Expose to global scope for app.js to access
window.MontMarteComponent = MontMarteComponent;