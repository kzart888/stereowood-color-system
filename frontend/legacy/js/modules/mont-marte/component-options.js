(function (window) {
  window.MontMarteComponentOptions = {
    computed: {
    baseURL() { return window.location.origin; },

    isDevelopmentMode() {
        return this.globalData &&
               this.globalData.appConfig &&
               this.globalData.appConfig.value &&
               this.globalData.appConfig.value.mode === 'test';
    },
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
        // Category management
        async handleCategoriesUpdated() {
            // Reload categories after changes
            await this.loadMontMarteCategories();
            msg.success('分类已更新');
        },
        
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
                    const parsed = parseInt(savedItems);
                    this.itemsPerPage = window.ConfigHelper && typeof window.ConfigHelper.normalizeItemsPerPage === 'function'
                        ? window.ConfigHelper.normalizeItemsPerPage(parsed, this.itemsPerPage || 24)
                        : parsed;
                }
                
                if (savedPage) {
                    const page = parseInt(savedPage);
                    if (page <= this.totalPages) {
                        this.currentPage = page;
                    }
                }
            } catch(e) {}
        },
        
        // Update pagination based on app config
        updatePaginationFromConfig() {
            if (this.globalData && this.globalData.appConfig && this.globalData.appConfig.value) {
                const config = this.globalData.appConfig.value;
                
                // Get saved items per page preference
                let savedItems = null;
                try {
                    const saved = localStorage.getItem('sw-mont-marte-items-per-page');
                    if (saved) savedItems = parseInt(saved);
                } catch(e) {}
                
                // Use ConfigHelper to determine items per page
                this.itemsPerPage = window.ConfigHelper.getItemsPerPage(
                    config, 
                    'mont-marte', 
                    savedItems
                );

                if (savedItems !== null && savedItems !== this.itemsPerPage) {
                    try { localStorage.setItem('sw-mont-marte-items-per-page', this.itemsPerPage); } catch(e) {}
                }
            }
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
        materialThumbSrc(color) {
            const relativePath = color?.image_thumb_path || color?.image_path;
            return relativePath ? this.$helpers.buildUploadURL(this.baseURL, relativePath) : '';
        },
        materialPreviewSrc(color) {
            const relativePath = color?.image_path || color?.image_thumb_path;
            return relativePath ? this.$helpers.buildUploadURL(this.baseURL, relativePath) : '';
        },
        
        async loadMontMarteCategories() {
            try {
                const bridge = window.runtimeBridge || {};
                const gateway = window.apiGateway || bridge.apiGateway || null;
                if (!gateway || !gateway.montMarteCategories || typeof gateway.montMarteCategories.getAll !== 'function') {
                    throw new Error('montMarteCategories gateway is unavailable');
                }
                const response = await gateway.montMarteCategories.getAll(this.baseURL);
                this.montMarteCategories = Array.isArray(response.data) ? response.data : [];
            } catch (error) {
                console.error('Error loading Mont-Marte categories:', error);
                msg.error('加载原料分类失败');
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
        // Return custom-color codes that reference this material.
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
                    // 若下一个 token 是“数字+单位”，则当前 token 视为原料名
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
                    // 若 token 本身等于原料名且后面不是数量，也允许记录
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
        onMaterialThumbError(event, color) {
            const element = event?.currentTarget || event?.target;
            if (!element) return;
            const fallback = this.materialPreviewSrc(color);
            if (fallback && element.src !== fallback) {
                element.src = fallback;
                return;
            }
            this.onThumbError(event);
        },

        async refreshDictionaries() {
            await Promise.all([ this.globalData.loadSuppliers(), this.globalData.loadPurchaseLinks() ]);
        },
        _getDictionaryManager() {
            return window.MontMarteDictionaryManager || null;
        },
        _getSaveWorkflow() {
            return window.MontMarteSaveWorkflow || null;
        },
        _getDictionaryConfig(kind) {
            const dict = this._getDictionaryManager();
            const supplierKind = dict ? dict.KIND_SUPPLIER : 'supplier';
            if (kind === supplierKind) {
                return {
                    busyKey: 'supplierBusy',
                    formKey: 'supplier_id',
                    refName: 'supplierSelect',
                    loadFn: () => this.globalData.loadSuppliers(),
                    optionsGetter: () => this.supplierOptions,
                    createErrorLog: 'Failed to upsert supplier',
                    createErrorMsg: 'Failed to create supplier',
                    deleteSuccessMsg: '已删除供应商'
                };
            }
            return {
                busyKey: 'purchaseBusy',
                formKey: 'purchase_link_id',
                refName: 'purchaseSelect',
                loadFn: () => this.globalData.loadPurchaseLinks(),
                optionsGetter: () => this.purchaseLinkOptions,
                createErrorLog: 'Failed to upsert purchase link',
                createErrorMsg: '创建采购地址失败',
                deleteSuccessMsg: '已删除采购地址'
            };
        },
        async _handleDictionaryUpsert(kind, val) {
            const dict = this._getDictionaryManager();
            const config = this._getDictionaryConfig(kind);
            const supportsCreate = dict && typeof dict.shouldCreateFromSelection === 'function'
                ? dict.shouldCreateFromSelection(val)
                : typeof val === 'string';
            if (!supportsCreate) return;
            const normalized = dict && typeof dict.normalizeInput === 'function'
                ? dict.normalizeInput(val)
                : String(val || '').trim();
            if (!normalized) {
                this.form[config.formKey] = null;
                return;
            }
            try {
                this[config.busyKey] = true;
                const result = dict && typeof dict.upsertEntry === 'function'
                    ? await dict.upsertEntry({ kind, value: normalized, baseURL: this.baseURL })
                    : await (async () => {
                        const payload = kind === 'supplier' ? { name: normalized } : { url: normalized };
                        const endpoint = kind === 'supplier' ? '/api/suppliers/upsert' : '/api/purchase-links/upsert';
                        const { data } = await axios.post(`${this.baseURL}${endpoint}`, payload);
                        return { id: data && Object.prototype.hasOwnProperty.call(data, 'id') ? data.id : null };
                    })();
                await config.loadFn();
                await this.$nextTick();
                const options = config.optionsGetter();
                const found = options.find((option) => option.id === result.id);
                this.form[config.formKey] = found ? found.id : result.id;
                this.$nextTick(() => this.$refs[config.refName] && this.$refs[config.refName].blur && this.$refs[config.refName].blur());
            } catch (error) {
                console.error(config.createErrorLog, error);
                msg.error(config.createErrorMsg);
                this.form[config.formKey] = null;
            } finally {
                this[config.busyKey] = false;
            }
        },
        async _handleDictionaryDelete(kind, opt) {
            if (!opt || !opt.id) return;
            const dict = this._getDictionaryManager();
            const config = this._getDictionaryConfig(kind);
            try {
                if (dict && typeof dict.deleteEntry === 'function') {
                    await dict.deleteEntry({ kind, id: opt.id, baseURL: this.baseURL });
                } else {
                    const prefix = kind === 'supplier' ? '/api/suppliers/' : '/api/purchase-links/';
                    await axios.delete(`${this.baseURL}${prefix}${opt.id}`);
                }
                msg.success(config.deleteSuccessMsg);
                if (this.form[config.formKey] === opt.id) this.form[config.formKey] = null;
                await config.loadFn();
            } catch (error) {
                const status = dict && typeof dict.getErrorStatus === 'function'
                    ? dict.getErrorStatus(error)
                    : (error && error.response ? error.response.status : null);
                if (status === 409) {
                    const warning = dict && typeof dict.getErrorMessage === 'function'
                        ? dict.getErrorMessage(error, '存在引用，无法删除')
                        : (error && error.response && error.response.data && error.response.data.error) || '存在引用，无法删除';
                    msg.warning(warning);
                } else {
                    msg.error('删除失败');
                }
            }
        },

        openDialog() {
            this.editing = null;
            this.resetForm();
            this.showDialog = true;
        },
        editColor(row) {
            this.editing = row;
            this.form.id = row.id;
            this.form.version = Number.isInteger(row.version) ? row.version : null;
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
                    await ElementPlus.ElMessageBox.confirm('检测到未保存修改，确定放弃并关闭吗？', '未保存修改', {
                        confirmButtonText: '放弃修改',
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
                version: null,
                name: '',
                category_id: null,  // Changed from category to category_id
                supplier_id: null,
                purchase_link_id: null,
                imageFile: null,
                imagePreview: null
            };
            if (this.$refs.formRef) {
                this.$refs.formRef.clearValidate();
            }
        },

        // 选择器变更：当 val 为字符串时，表示创建新条目
        async onSupplierChange(val) {
            const dict = this._getDictionaryManager();
            const kind = dict ? dict.KIND_SUPPLIER : 'supplier';
            await this._handleDictionaryUpsert(kind, val);
        },
        async confirmSupplier() {
            if (typeof this.form.supplier_id === 'string' && !this.supplierBusy) {
                await this.onSupplierChange(this.form.supplier_id);
            }
        },

        async deleteSupplierOption(opt) {
            const dict = this._getDictionaryManager();
            const kind = dict ? dict.KIND_SUPPLIER : 'supplier';
            await this._handleDictionaryDelete(kind, opt);
        },

        async onPurchaseChange(val) {
            const dict = this._getDictionaryManager();
            const kind = dict ? dict.KIND_PURCHASE_LINK : 'purchase-link';
            await this._handleDictionaryUpsert(kind, val);
        },
        async confirmPurchase() {
            if (typeof this.form.purchase_link_id === 'string' && !this.purchaseBusy) {
                await this.onPurchaseChange(this.form.purchase_link_id);
            }
        },
        async deletePurchaseOption(opt) {
            const dict = this._getDictionaryManager();
            const kind = dict ? dict.KIND_PURCHASE_LINK : 'purchase-link';
            await this._handleDictionaryDelete(kind, opt);
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
            const valid = await this.$refs.formRef.validate().catch(() => false);
            if (!valid) return;
            if (this.nameDuplicate) {
                return;
            }
            try {
                if (typeof this.form.supplier_id === 'string') await this.onSupplierChange(this.form.supplier_id);
                if (typeof this.form.purchase_link_id === 'string') await this.onPurchaseChange(this.form.purchase_link_id);
            } catch(e) {
                return;
            }
            this.saving = true;
            try {
                const saveWorkflow = this._getSaveWorkflow();
                const res = saveWorkflow && typeof saveWorkflow.saveColor === 'function'
                    ? await saveWorkflow.saveColor({ baseURL: this.baseURL, form: this.form, editing: this.editing })
                    : Promise.reject(new Error('MontMarteSaveWorkflow.saveColor is unavailable'));

                if (this.editing) {
                    const n = res?.data?.updatedReferences || 0;
                    msg.success(n > 0 ? `保存成功，已更新 ${n} 条配方引用` : '保存成功');
                } else {
                    msg.success('原料已创建');
                }
                await Promise.all([
                    this.globalData.loadMontMarteColors(),
                    this.globalData.loadCustomColors()
                ]);
                this.showDialog = false;
            } catch (e) {
                const conflictAdapter = window.conflictAdapter;
                if (conflictAdapter && conflictAdapter.isVersionConflict && conflictAdapter.isVersionConflict(e, 'mont_marte_color')) {
                    const conflict = conflictAdapter.extract(e, { entityType: 'mont_marte_color' });
                    msg.warning(conflictAdapter.getMessage(conflict, '原料数据已更新，请确认最新内容后重试。'));
                    await Promise.all([
                        this.globalData.loadMontMarteColors(),
                        this.globalData.loadCustomColors()
                    ]);
                    if (conflict.latestData && this.editing) {
                        this.editColor(conflict.latestData);
                    }
                    return;
                }
                console.error('save failed (network/server)', e);
                msg.error('保存失败');
            } finally {
                this.saving = false;
            }
        },

        onFormEnter() {
            // 回车即保存
            this.saveColor();
        },

        
        async deleteColor(color) {
            const ok = await this.$helpers.doubleDangerConfirm({
                firstMessage: `确定删除 "${color.name}" 吗？`,
                secondMessage: '删除后将无法恢复，确认最终删除吗？',
                secondConfirmText: '永久删除'
            });
            if (!ok) return;
            try {
                await api.montMarteColors.delete(color.id);
                msg.success('删除成功');
                await this.globalData.loadMontMarteColors();
                // 同步刷新自配色，避免引用残留提示
                await this.globalData.loadCustomColors();
            } catch (error) {
                const errorMessage = error?.response?.data?.error || '删除失败';
                msg.error(errorMessage);
            }
        },
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
        
        // Watch for app config changes
        'globalData.appConfig.value': {
            handler(newConfig) {
                if (newConfig) {
                    this.updatePaginationFromConfig();
                }
            },
            deep: true
        },
        
        // Clear validation error when there's a duplicate
        nameDuplicate(val) {
            if (val && this.$refs.formRef) {
                this.$refs.formRef.clearValidate('name');
            }
        }
    },
    
    mounted() {
        // Update items per page based on app config
        this.updatePaginationFromConfig();
        
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
})(window);

