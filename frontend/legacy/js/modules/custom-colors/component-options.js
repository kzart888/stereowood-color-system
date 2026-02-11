(function (window) {
  window.CustomColorsComponentOptions = {
    computed: {
        formulaUtils() {
            return window.formulaUtils || { segments: (f) => f ? f.split(/\s+/) : [] };
        },

        isDevelopmentMode() {
            return this.globalData &&
                   this.globalData.appConfig &&
                   this.globalData.appConfig.value &&
                   this.globalData.appConfig.value.mode === 'test';
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
        
        orderedCategoriesWithOther() {
            const raw = [...(this.categories||[])];
            // Sort by display_order to match backend ordering
            raw.sort((a,b)=> (a.display_order || 999) - (b.display_order || 999));
            return raw;
        },
        
        categoriesWithOther() {
            return this.orderedCategoriesWithOther.map(c=>c);
        },
        
        esCategoryId() {
            const es = this.categories.find(c=>c.code==='ES');
            return es ? es.id : null;
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

        hasPureColor() {
            return !!(this.form.pureColor && this.form.pureColor.hex);
        },

        pureColorHex() {
            const hex = this.form.pureColor && this.form.pureColor.hex;
            const normalizer = window.CustomColorSwatch && window.CustomColorSwatch.normalizeHex;
            return hex ? (normalizer ? normalizer(hex) : hex) : null;
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
        // Category management
        async handleCategoriesUpdated() {
            // Reload categories and colors after changes
            await this.globalData.loadCategories();
            await this.globalData.loadCustomColors();
            this.getMsg().success('分类已更新');
        },
        
        // Pagination methods
        goToPage(page) {
            if (this._listState && typeof this._listState.goToPage === 'function') {
                this._listState.goToPage(page);
                return;
            }
            if (page === '...') return;
            if (page < 1 || page > this.totalPages) return;
            this.currentPage = page;
            this.$nextTick(() => {
                const container = this.$el.querySelector('.color-cards-grid');
                if (container) {
                    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            try { localStorage.setItem('sw-colors-page', page); } catch(e) {}
        },
        
        onItemsPerPageChange() {
            if (this._listState && typeof this._listState.onItemsPerPageChange === 'function') {
                this._listState.onItemsPerPageChange();
                return;
            }
            this.currentPage = 1;
            try { localStorage.setItem('sw-colors-items-per-page', this.itemsPerPage); } catch(e) {}
        },
        
        restorePaginationState() {
            if (this._listState && typeof this._listState.restorePaginationState === 'function') {
                this._listState.restorePaginationState();
                return;
            }
            try {
                const savedPage = localStorage.getItem('sw-colors-page');
                const savedItems = localStorage.getItem('sw-colors-items-per-page');
                
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
        
        // Update pagination based on app config
        updatePaginationFromConfig() {
            if (this._listState && typeof this._listState.updatePaginationFromConfig === 'function') {
                this._listState.updatePaginationFromConfig();
                return;
            }
            if (this.globalData && this.globalData.appConfig && this.globalData.appConfig.value) {
                const config = this.globalData.appConfig.value;
                
                // Get saved items per page preference
                let savedItems = null;
                try {
                    const saved = localStorage.getItem('sw-colors-items-per-page');
                    if (saved) savedItems = parseInt(saved);
                } catch(e) {}
                
                // Use ConfigHelper to determine items per page
                this.itemsPerPage = window.ConfigHelper.getItemsPerPage(
                    config, 
                    'custom-colors', 
                    savedItems
                );
            }
        },
        
        // Card selection methods
        toggleColorSelection(colorId, event) {
            if (this._listState && typeof this._listState.toggleSelection === 'function') {
                this._listState.toggleSelection(colorId, event || window.event);
                return;
            }
            if (event && typeof event.stopPropagation === 'function') {
                event.stopPropagation();
            }
            this.selectedColorId = this.selectedColorId === colorId ? null : colorId;
        },
        
        clearSelection() {
            if (this._listState && typeof this._listState.clearSelection === 'function') {
                this._listState.clearSelection();
                return;
            }
            this.selectedColorId = null;
        },
        
        handleGlobalClick(event) {
            if (this._listState && typeof this._listState.handleGlobalClick === 'function') {
                this._listState.handleGlobalClick(event);
                return;
            }
            // Clear selection if clicking outside the cards
            if (!event.target.closest('.artwork-bar')) {
                this.clearSelection();
            }
        },
        
        handleEscKey(event) {
            if (this._listState && typeof this._listState.handleEscKey === 'function') {
                this._listState.handleEscKey(event);
                return;
            }
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
        
        // Helper to get message service
        getMsg() {
            if (window.msg) return window.msg;
            if (!window.__swMsgNoop) {
                const noop = () => {};
                window.__swMsgNoop = {
                    success: noop,
                    error: noop,
                    warning: noop,
                    info: noop
                };
            }
            return window.__swMsgNoop;
        },
        
        setColorItemRef(color) {
            return (el) => {
                if (el) this._colorItemRefs.set(color.color_code, el); 
                else this._colorItemRefs.delete(color.color_code);
            };
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
            const cat = this.categories.find(c => c.id === color.category_id);
            if (cat) return cat.name;
            const prefix = (color.color_code || '').substring(0,2).toUpperCase();
            const byPrefix = this.categories.find(c => c.code === prefix);
            return byPrefix ? byPrefix.name : '其他';
        },
        

        resolveColorSwatch(color, options = {}) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.resolveColorSwatch === 'function') {
                return window.CustomColorsDomainUtils.resolveColorSwatch(color, {
                    ...options,
                    baseURL: options.baseURL || this.baseURL || window.location.origin,
                    buildUploadURL: this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                        ? this.$helpers.buildUploadURL
                        : undefined
                });
            }
            if (!color || !window.CustomColorSwatch) {
                return null;
            }
            const baseURL = options.baseURL || this.baseURL || window.location.origin;
            const resolver = window.CustomColorSwatch.resolveSwatch;
            if (typeof resolver !== 'function') {
                return null;
            }
            const buildURL = this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                ? this.$helpers.buildUploadURL
                : ((base, path) => `${base.replace(/\/$/, '')}/uploads/${path}`);
            return resolver(color, {
                baseURL,
                buildURL,
                includeColorConcentrate: !!options.includeColorConcentrate,
                forceOriginal: !!options.forceOriginal
            });
        },

        getSwatchStyle(color, options = {}) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.getSwatchStyle === 'function') {
                return window.CustomColorsDomainUtils.getSwatchStyle(color, {
                    ...options,
                    baseURL: options.baseURL || this.baseURL || window.location.origin,
                    buildUploadURL: this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                        ? this.$helpers.buildUploadURL
                        : undefined
                });
            }
            const swatch = this.resolveColorSwatch(color, options);
            if (!swatch) return {};
            if (swatch.type === 'image') {
                return {};
            }
            return swatch.style || {};
        },

        swatchIsImage(color, options = {}) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.swatchIsImage === 'function') {
                return window.CustomColorsDomainUtils.swatchIsImage(color, {
                    ...options,
                    baseURL: options.baseURL || this.baseURL || window.location.origin,
                    buildUploadURL: this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                        ? this.$helpers.buildUploadURL
                        : undefined
                });
            }
            const swatch = this.resolveColorSwatch(color, options);
            return !!(swatch && swatch.type === 'image' && swatch.imageUrl);
        },

        swatchIsEmpty(color, options = {}) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.swatchIsEmpty === 'function') {
                return window.CustomColorsDomainUtils.swatchIsEmpty(color, {
                    ...options,
                    baseURL: options.baseURL || this.baseURL || window.location.origin,
                    buildUploadURL: this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                        ? this.$helpers.buildUploadURL
                        : undefined
                });
            }
            const swatch = this.resolveColorSwatch(color, options);
            return !swatch || swatch.type === 'empty';
        },

        swatchThumbnailClass(color, options = {}) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.swatchThumbnailClass === 'function') {
                return window.CustomColorsDomainUtils.swatchThumbnailClass(color, {
                    ...options,
                    baseURL: options.baseURL || this.baseURL || window.location.origin,
                    buildUploadURL: this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                        ? this.$helpers.buildUploadURL
                        : undefined
                });
            }
            return { 'no-image': this.swatchIsEmpty(color, options) };
        },

        getSwatchImage(color, options = {}) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.getSwatchImage === 'function') {
                return window.CustomColorsDomainUtils.getSwatchImage(color, {
                    ...options,
                    baseURL: options.baseURL || this.baseURL || window.location.origin,
                    buildUploadURL: this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                        ? this.$helpers.buildUploadURL
                        : undefined
                });
            }
            const swatch = this.resolveColorSwatch(color, options);
            return swatch && swatch.type === 'image' ? swatch.imageUrl : null;
        },

        previewColorSwatch(event, color, options = {}) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.previewColorSwatch === 'function') {
                const handled = window.CustomColorsDomainUtils.previewColorSwatch(event, color, {
                    ...options,
                    baseURL: options.baseURL || this.baseURL || window.location.origin,
                    buildUploadURL: this.$helpers && typeof this.$helpers.buildUploadURL === 'function'
                        ? this.$helpers.buildUploadURL
                        : undefined,
                    thumbPreview: this.$thumbPreview,
                    pureColorUtils: window.PureColorUtils
                });
                if (handled) return;
            }
            const swatch = this.resolveColorSwatch(color, options);
            if (!swatch || !this.$thumbPreview) {
                return;
            }
            if (swatch.type === 'image' && swatch.imageUrl) {
                this.$thumbPreview.show(event, swatch.imageUrl);
                return;
            }
            const hex = swatch && swatch.hex ? swatch.hex : (swatch && swatch.style && (swatch.style.background || swatch.style.backgroundColor));
            if (hex && window.PureColorUtils && typeof window.PureColorUtils.createSolidSwatchDataUrl === 'function') {
                const dataUrl = window.PureColorUtils.createSolidSwatchDataUrl(hex);
                this.$thumbPreview.show(event, dataUrl);
            }
        },

        normalizePantoneCode(value) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.normalizePantoneCode === 'function') {
                return window.CustomColorsDomainUtils.normalizePantoneCode(value, {
                    normalizePantoneCode: (this.$helpers && this.$helpers.normalizePantoneCode) || (window.helpers && window.helpers.normalizePantoneCode)
                });
            }
            const helperFn = (this.$helpers && this.$helpers.normalizePantoneCode) || (window.helpers && window.helpers.normalizePantoneCode);
            if (typeof helperFn === 'function') {
                return helperFn(value);
            }
            if (value === null || value === undefined) {
                return null;
            }
            const raw = String(value).trim();
            if (!raw) {
                return null;
            }
            let code = raw.replace(/^PANTON(E)?\s+/i, '');
            code = code.replace(/\s+/g, ' ').trim();
            const suffixMatch = code.match(/^(.*?)(\s+)?([cCuU])$/);
            if (suffixMatch) {
                const base = suffixMatch[1].trim();
                const suffix = suffixMatch[3].toUpperCase();
                const baseCompact = base.replace(/\s+/g, '');
                if (/^\d+[A-Z]?$/i.test(baseCompact)) {
                    return `${baseCompact.toUpperCase()}${suffix}`;
                }
                return `${base} ${suffix}`.replace(/\s+/g, ' ').trim();
            }
            return code;
        },

        handleImageChange(file) {
            this.form.imageFile = file.raw;
            if (this.form.imagePreview) {
                URL.revokeObjectURL(this.form.imagePreview);
            }
            this.form.imagePreview = URL.createObjectURL(file.raw);
            this.resetPureColorState({ markCleared: true });
        },
        
        clearImage() {
            this.form.imageFile = null;
            if (this.form.imagePreview) {
                URL.revokeObjectURL(this.form.imagePreview);
                this.form.imagePreview = null;
            }
            this.resetPureColorState({ markCleared: true });
        },
        
        // Keep pure-color flags aligned with image actions
        resetPureColorState({ markCleared = false } = {}) {
            if (!this.form) return;
            this.form.pureColor = null;
            this.form.pureColorCleared = !!markCleared;
        },
        
        // Standardize hex for downstream modules
        normalizeHexValue(hex) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.normalizeHexValue === 'function') {
                return window.CustomColorsDomainUtils.normalizeHexValue(hex, {
                    customColorSwatch: window.CustomColorSwatch,
                    colorConverter: window.ColorConverter
                });
            }
            if (!hex) return null;
            const swatch = window.CustomColorSwatch;
            if (swatch && typeof swatch.normalizeHex === 'function') {
                return swatch.normalizeHex(hex);
            }
            if (window.ColorConverter && typeof window.ColorConverter.formatHex === 'function') {
                return window.ColorConverter.formatHex(hex);
            }
            const trimmed = String(hex).trim();
            if (!trimmed) return null;
            return trimmed.startsWith('#') ? trimmed.toUpperCase() : ('#' + trimmed.toUpperCase());
        },
        
        // Hydrate dialog state from backend pure-color fields
        buildPureColorStateFromExisting(color) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.buildPureColorStateFromExisting === 'function') {
                return window.CustomColorsDomainUtils.buildPureColorStateFromExisting(color, {
                    customColorSwatch: window.CustomColorSwatch,
                    colorConverter: window.ColorConverter,
                    pureColorUtils: window.PureColorUtils
                });
            }
            if (!color) return null;
            const hex = this.normalizeHexValue(color.pure_hex_color);
            if (!hex) return null;
            const converter = window.ColorConverter;
            let rgb = null;
            if ([color.pure_rgb_r, color.pure_rgb_g, color.pure_rgb_b].every(v => v !== null && v !== undefined)) {
                rgb = {
                    r: Number(color.pure_rgb_r),
                    g: Number(color.pure_rgb_g),
                    b: Number(color.pure_rgb_b)
                };
            } else if (converter && typeof converter.hexToRgb === 'function') {
                const converted = converter.hexToRgb(hex);
                if (converted) {
                    rgb = {
                        r: Number(converted.r),
                        g: Number(converted.g),
                        b: Number(converted.b)
                    };
                }
            }
            let cmyk = null;
            if (converter && rgb && typeof converter.rgbToCmyk === 'function') {
                cmyk = converter.rgbToCmyk(rgb.r, rgb.g, rgb.b);
            }
            const previewDataUrl = window.PureColorUtils && typeof window.PureColorUtils.createSolidSwatchDataUrl === 'function'
                ? window.PureColorUtils.createSolidSwatchDataUrl(hex)
                : null;
            return {
                hex,
                rgb,
                cmyk,
                generatedAt: color.pure_generated_at || null,
                previewDataUrl
            };
        },
        
        // Prefer original upload but gracefully fall back to existing previews
        async resolveImageFileForProcessing() {
            if (this.form && this.form.imageFile) {
                return this.form.imageFile;
            }
            if (this.form && this.form.imagePreview) {
                const fetched = await this.fetchImageAsFile(this.form.imagePreview);
                if (fetched) {
                    return fetched;
                }
            }
            if (this.editingColor && this.editingColor.image_path) {
                const imageUrl = this.$helpers.buildUploadURL(this.baseURL, this.editingColor.image_path);
                const fetched = await this.fetchImageAsFile(imageUrl);
                if (fetched) {
                    return fetched;
                }
            }
            return null;
        },
        
        // Copy computed averages into user-visible color fields
        applyPureColorToFormFields(pureColor, { silent = false } = {}) {
            if (!pureColor) return;
            const converter = window.ColorConverter;
            let rgb = pureColor.rgb;
            if ((!rgb || rgb.r == null || rgb.g == null || rgb.b == null) && converter && typeof converter.hexToRgb === 'function' && pureColor.hex) {
                const converted = converter.hexToRgb(pureColor.hex);
                if (converted) {
                    rgb = { r: Number(converted.r), g: Number(converted.g), b: Number(converted.b) };
                }
            }
            if (rgb) {
                this.form.rgb_r = Math.round(rgb.r);
                this.form.rgb_g = Math.round(rgb.g);
                this.form.rgb_b = Math.round(rgb.b);
            }
            let cmyk = pureColor.cmyk;
            if ((!cmyk || cmyk.c == null) && converter && rgb && typeof converter.rgbToCmyk === 'function') {
                cmyk = converter.rgbToCmyk(Math.round(rgb.r), Math.round(rgb.g), Math.round(rgb.b));
            }
            if (cmyk) {
                this.form.cmyk_c = Math.round(cmyk.c);
                this.form.cmyk_m = Math.round(cmyk.m);
                this.form.cmyk_y = Math.round(cmyk.y);
                this.form.cmyk_k = Math.round(cmyk.k);
            }
            let resolvedHex = pureColor.hex;
            if (!resolvedHex && converter && rgb && typeof converter.rgbToHex === 'function') {
                resolvedHex = converter.rgbToHex(Math.round(rgb.r), Math.round(rgb.g), Math.round(rgb.b));
            }
            if (resolvedHex) {
                this.form.hex_color = this.normalizeHexValue(resolvedHex);
            }
            if (!silent) {
                const msg = this.getMsg();
                msg.success('已根据平均色填充颜色值');
            }
        },
        
        // Generate and persist the averaged swatch backing all calculations
        async computePureColor({ silent = false, force = false } = {}) {
            if (this.computingPureColor && !force) {
                return this.form.pureColor;
            }
            const msg = this.getMsg();
            const utils = window.PureColorUtils;
            if (!utils || typeof utils.computeAverageColorFromFile !== 'function') {
                msg.error('平均色工具未加载');
                return null;
            }
            const imageFile = await this.resolveImageFileForProcessing();
            if (!imageFile) {
                msg.warning('请先上传颜色样本');
                return null;
            }
            this.computingPureColor = true;
            try {
                const result = await utils.computeAverageColorFromFile(imageFile);
                const converter = window.ColorConverter;
                let rgb = null;
                if (result.rgb && typeof result.rgb === 'object') {
                    rgb = {
                        r: Math.round(result.rgb.r),
                        g: Math.round(result.rgb.g),
                        b: Math.round(result.rgb.b)
                    };
                }
                const hex = this.normalizeHexValue(result.hex || (converter && rgb && typeof converter.rgbToHex === 'function' ? converter.rgbToHex(rgb.r, rgb.g, rgb.b) : null));
                if (!hex) {
                    throw new Error('无法生成有效的平均色 HEX 值');
                }
                let cmyk = null;
                if (result.cmyk && typeof result.cmyk === 'object') {
                    cmyk = {
                        c: Number(result.cmyk.c),
                        m: Number(result.cmyk.m),
                        y: Number(result.cmyk.y),
                        k: Number(result.cmyk.k)
                    };
                } else if (converter && rgb && typeof converter.rgbToCmyk === 'function') {
                    cmyk = converter.rgbToCmyk(rgb.r, rgb.g, rgb.b);
                }
                const previewDataUrl = result.previewDataUrl || (utils.createSolidSwatchDataUrl ? utils.createSolidSwatchDataUrl(hex) : null);
                const pureColor = {
                    hex,
                    rgb,
                    cmyk,
                    previewDataUrl,
                    generatedAt: new Date().toISOString()
                };
                this.form.pureColor = pureColor;
                this.form.pureColorCleared = false;
                this.applyPureColorToFormFields(pureColor, { silent: true });
                if (!silent) {
                    msg.success('平均色已计算');
                }
                return pureColor;
            } catch (error) {
                console.warn('computePureColor failed:', error);
                msg.error('计算平均色失败');
                return null;
            } finally {
                this.computingPureColor = false;
            }
        },
        
        // Shared gate that reuses cached pure color when possible
        async ensurePureColor({ silent = false, force = false } = {}) {
            if (this.hasPureColor && !force) {
                return this.form.pureColor;
            }
            return await this.computePureColor({ silent, force });
        },
        
        // Manual reset keeps persisted metadata aligned with the dialog
        clearPureColor() {
            if (!this.hasPureColor && !this.form.pureColorCleared) {
                return;
            }
            this.resetPureColorState({ markCleared: true });
            const msg = this.getMsg();
            msg.success('已清除平均色');
        },
        
        // Reuse the global preview layer to inspect the averaged swatch
        openPurePreview(event) {
            if (!this.hasPureColor || !this.form.pureColor || !this.form.pureColor.previewDataUrl) {
                return;
            }
            if (!this.$thumbPreview) return;
            this.$thumbPreview.show(event, this.form.pureColor.previewDataUrl);
        },
        
        async fetchImageAsFile(imageUrl) {
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                return new File([blob], 'image.jpg', { type: blob.type });
            } catch (error) {
                // Error fetching image - silently handle
                return null;
            }
        },
        
        async extractColorFromImage() {
            const pureColor = await this.ensurePureColor({ silent: true });
            if (!pureColor) {
                return;
            }
            this.applyPureColorToFormFields(pureColor, { silent: false });
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
            const pureColor = await this.ensurePureColor({ silent: true });
            if (!pureColor) {
                return;
            }
            this.applyPureColorToFormFields(pureColor, { silent: true });

            if (this.form.rgb_r === null || this.form.rgb_g === null || this.form.rgb_b === null) {
                msg.warning('请先生成平均色以获取 RGB 值');
                return;
            }

            try {
                const rgb = {
                    r: parseInt(this.form.rgb_r, 10),
                    g: parseInt(this.form.rgb_g, 10),
                    b: parseInt(this.form.rgb_b, 10)
                };

                if (!ColorConverter || typeof ColorConverter.isValidRGB !== 'function' || !ColorConverter.isValidRGB(rgb.r, rgb.g, rgb.b)) {
                    msg.error('平均色 RGB 值无效');
                    return;
                }

                let coatedMatch = null;
                let uncoatedMatch = null;

                if (window.PantoneHelper) {
                    coatedMatch = window.PantoneHelper.findClosest(rgb, 'coated');
                    uncoatedMatch = window.PantoneHelper.findClosest(rgb, 'uncoated');
                } else if (ColorConverter && typeof ColorConverter.findClosestPantone === 'function') {
                    const fullDb = window.PANTONE_COLORS_FULL || [];
                    const coatedDb = fullDb.filter ? fullDb.filter(p => p.type === 'coated') : [];
                    const uncoatedDb = fullDb.filter ? fullDb.filter(p => p.type === 'uncoated') : [];
                    coatedMatch = ColorConverter.findClosestPantone(rgb, coatedDb.length ? coatedDb : fullDb);
                    uncoatedMatch = ColorConverter.findClosestPantone(rgb, uncoatedDb.length ? uncoatedDb : fullDb);
                }

                if (coatedMatch) {
                    const cleanName = this.normalizePantoneCode(coatedMatch.name) || coatedMatch.name;
                    this.form.pantone_coated = cleanName;
                }
                if (uncoatedMatch) {
                    const cleanName = this.normalizePantoneCode(uncoatedMatch.name) || uncoatedMatch.name;
                    this.form.pantone_uncoated = cleanName;
                }

                const coatedDisplay = coatedMatch ? (this.normalizePantoneCode(coatedMatch.name) || coatedMatch.name) : '无';
                const uncoatedDisplay = uncoatedMatch ? (this.normalizePantoneCode(uncoatedMatch.name) || uncoatedMatch.name) : '无';
                msg.success(`已匹配潘通色号：${coatedDisplay} / ${uncoatedDisplay}`);
            } catch (error) {
                console.warn('findPantoneMatch failed:', error);
                msg.error('匹配潘通色号失败');
            }
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
            
            this.resetPureColorState({ markCleared: false });
            this.computingPureColor = false;
            
            this.showAddDialog = true;
        },
        
        editColor(color) {
            this.editingColor = color;
            
            // Disable auto-sync for editing (user has control)
            this.autoSyncDisabled = true;
            
            const prefix = color.color_code.substring(0, 2).toUpperCase();
            const matchedCategory = this.categories.find(cat => cat.code === prefix);
            
            const imagePreview = color.image_path ? this.$helpers.buildUploadURL(this.baseURL, color.image_path) : null;
            const pureColorState = this.buildPureColorStateFromExisting(color);
            
            this.form = {
                category_id: color.category_id, // Use the actual category_id from database
                color_code: color.color_code,
                formula: color.formula,
                imageFile: null,
                imagePreview,
                // Load color values
                rgb_r: color.rgb_r,
                rgb_g: color.rgb_g,
                rgb_b: color.rgb_b,
                cmyk_c: color.cmyk_c,
                cmyk_m: color.cmyk_m,
                cmyk_y: color.cmyk_y,
                cmyk_k: color.cmyk_k,
                hex_color: color.hex_color,
                pantone_coated: this.normalizePantoneCode(color.pantone_coated) || color.pantone_coated,
                pantone_uncoated: this.normalizePantoneCode(color.pantone_uncoated) || color.pantone_uncoated,
                pureColor: pureColorState,
                pureColorCleared: false
            };
            
            this.computingPureColor = false;
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
                const normalizedPantoneCoated = this.normalizePantoneCode(this.form.pantone_coated);
                if (normalizedPantoneCoated) {
                    formData.append('pantone_coated', normalizedPantoneCoated);
                    this.form.pantone_coated = normalizedPantoneCoated;
                }
                const normalizedPantoneUncoated = this.normalizePantoneCode(this.form.pantone_uncoated);
                if (normalizedPantoneUncoated) {
                    formData.append('pantone_uncoated', normalizedPantoneUncoated);
                    this.form.pantone_uncoated = normalizedPantoneUncoated;
                }
                
                if (this.form.pureColor && this.form.pureColor.hex) {
                    const pure = this.form.pureColor;
                    let rgb = pure.rgb;
                    if ((!rgb || rgb.r == null || rgb.g == null || rgb.b == null) && typeof ColorConverter !== 'undefined' && ColorConverter && typeof ColorConverter.hexToRgb === 'function') {
                        const converted = ColorConverter.hexToRgb(pure.hex);
                        if (converted) {
                            rgb = { r: Math.round(converted.r), g: Math.round(converted.g), b: Math.round(converted.b) };
                        }
                    }
                    if (rgb) {
                        formData.append('pure_rgb_r', Math.round(rgb.r));
                        formData.append('pure_rgb_g', Math.round(rgb.g));
                        formData.append('pure_rgb_b', Math.round(rgb.b));
                    }
                    formData.append('pure_hex_color', pure.hex);
                    if (pure.generatedAt) {
                        formData.append('pure_generated_at', pure.generatedAt);
                    }
                } else if (this.form.pureColorCleared) {
                    formData.append('clear_pure_color', '1');
                }

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
                const conflictAdapter = window.conflictAdapter;
                if (conflictAdapter && conflictAdapter.isVersionConflict && conflictAdapter.isVersionConflict(error, 'custom_color')) {
                    const conflict = conflictAdapter.extract(error, { entityType: 'custom_color' });
                    this.handleVersionConflict(conflict, formData);
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
                pantone_uncoated: null,
                pureColor: null,
                pureColorCleared: false
            };
            this.computingPureColor = false;
            if (this.$refs.formRef) {
                this.$refs.formRef.resetFields();
            }
            if (this._dialogGuard && typeof this._dialogGuard.clearSnapshot === 'function') {
                this._dialogGuard.clearSnapshot();
            } else {
                this._originalColorFormSnapshot = null;
            }
            this._unbindEsc();
        },
        

        // Other methods remain the same...
        onOpenColorDialog() {
            this.initForm();
            if (this._dialogGuard && typeof this._dialogGuard.setSnapshot === 'function') {
                this._dialogGuard.setSnapshot(this._normalizedColorForm());
                this._dialogGuard.bindEsc(() => this.attemptCloseAddDialog());
            } else {
                this._originalColorFormSnapshot = JSON.stringify(this._normalizedColorForm());
                this._bindEscForDialog();
            }
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
            if (this._dialogGuard && typeof this._dialogGuard.isDirty === 'function') {
                return this._dialogGuard.isDirty(this._normalizedColorForm());
            }
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
            if (this._dialogGuard && typeof this._dialogGuard.bindEsc === 'function') {
                this._dialogGuard.bindEsc(() => this.attemptCloseAddDialog());
                return;
            }
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
            if (this._dialogGuard && typeof this._dialogGuard.unbindEsc === 'function') {
                this._dialogGuard.unbindEsc();
                return;
            }
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
        
        focusCustomColor(code) {
            if (this.activeCategory !== 'all') this.activeCategory = 'all';
            
            // Find the color in filtered colors (which determines pagination)
            const targetIndex = this.filteredColors.findIndex(c => c.color_code === code);
            
            if (targetIndex === -1) return;
            
            // Calculate which page the color is on based on filtered list
            const targetPage = this.itemsPerPage === 0 ? 1 : Math.floor(targetIndex / this.itemsPerPage) + 1;
            
            // Navigate to the correct page if needed
            if (targetPage !== this.currentPage) {
                this.currentPage = targetPage;
            }
            
            this.$nextTick(() => {
                const el = this._colorItemRefs.get(code);
                if (el && el.scrollIntoView) {
                    // Instant scroll to element (no animation for efficiency)
                    const rect = el.getBoundingClientRect();
                    const current = window.pageYOffset || document.documentElement.scrollTop;
                    const targetScroll = current + rect.top - 100; // 100px offset from top
                    window.scrollTo({
                        top: Math.max(0, targetScroll),
                        behavior: 'instant' // No animation for factory efficiency
                    });
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
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.getCMYKColor === 'function') {
                return window.CustomColorsDomainUtils.getCMYKColor(c, m, y, k, {
                    colorConverter: window.ColorConverter
                });
            }
            if (window.ColorConverter) {
                const rgb = window.ColorConverter.cmykToRgb(c, m, y, k);
                return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
            }
            return '#f5f5f5';
        },
        
        // Helper method to get Pantone swatch style
        getPantoneSwatchStyle(pantoneCode) {
            if (window.CustomColorsDomainUtils && typeof window.CustomColorsDomainUtils.getPantoneSwatchStyle === 'function') {
                return window.CustomColorsDomainUtils.getPantoneSwatchStyle(pantoneCode, {
                    pantoneHelper: window.PantoneHelper,
                    normalizePantoneCode: (this.$helpers && this.$helpers.normalizePantoneCode) || (window.helpers && window.helpers.normalizePantoneCode)
                });
            }
            if (!pantoneCode || !window.PantoneHelper) {
                return { background: '#f5f5f5', border: '1px dashed #ccc' };
            }

            const normalized = this.normalizePantoneCode(pantoneCode) || pantoneCode;
            let color = window.PantoneHelper.getColorByName(normalized);
            if (!color && normalized !== pantoneCode) {
                color = window.PantoneHelper.getColorByName(pantoneCode);
            }
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
        
        // Show color palette method - now uses the new advanced dialog
        // Color palette functionality moved to standalone Color Dictionary page
        // Users should navigate to 自配色字典 from the main navigation
        
        // Keep all duplicates
        keepAllDuplicates(){
            this.showDuplicateDialog=false;
            const notifier = this.getMsg();
            notifier.info('已保留全部重复记录');
        },
        
        // Perform duplicate deletion - original from v0.5.6
        async performDuplicateDeletion(){
            if(this.deletionPending) return;
            const notifier = this.getMsg();
            const toDelete=[];
            this.duplicateGroups.forEach(g=>{
                const keepId = this.duplicateSelections[g.signature];
                if(!keepId) return;
                g.records.forEach(r=>{ if(r.id!==keepId && !this.isColorReferenced(r)) toDelete.push(r); });
            });
            if(!toDelete.length){ notifier.info('没有可删除的记录'); return; }
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
            notifier.success(`删除完成：成功 ${ok} 条，失败 ${fail} 条`);
            // 重新检测
            this.runDuplicateCheck();
        },
        
        // Confirm force merge - original from v0.5.6
        async confirmForceMerge(){
            if(this.mergingPending || this.deletionPending) return;
            const notifier = this.getMsg();
            const candidates = this.duplicateGroups.filter(g=> g.records.length>1 && this.duplicateSelections[g.signature]);
            if(!candidates.length){ notifier.info('请选择要保留的记录'); return; }
            const g = candidates[0];
            const keepId = this.duplicateSelections[g.signature];
            if(!keepId){ notifier.info('请先选择要保留的记录'); return; }
            const removeIds = g.records.filter(r=> r.id!==keepId).map(r=> r.id);
            if(!removeIds.length){ notifier.info('该组没有其它记录'); return; }
            let referenced=0; g.records.forEach(r=>{ if(r.id!==keepId && this.isColorReferenced(r)) referenced++; });
            const confirmText = `将合并该组：保留 1 条，删除 ${removeIds.length} 条；其中 ${referenced} 条被引用，其引用将更新到保留记录。确认继续？`;
            try { await ElementPlus.ElMessageBox.confirm(confirmText, '强制合并确认', { type:'warning', confirmButtonText:'执行合并', cancelButtonText:'取消' }); } catch(e){ return; }
            this.executeForceMerge({ keepId, removeIds, signature: g.signature });
        },
        
        // Execute force merge - original from v0.5.6
        async executeForceMerge(payload){
            if(this.mergingPending) return;
            const notifier = this.getMsg();
            this.mergingPending = true;
            try {
                const resp = await api.customColors.forceMerge(payload);
                const updated = resp?.updatedLayers ?? resp?.data?.updatedLayers ?? 0;
                const deleted = resp?.deleted ?? resp?.data?.deleted ?? payload.removeIds.length;
                notifier.success(`强制合并完成：更新引用 ${updated} 个，删除 ${deleted} 条`);
                await this.globalData.loadCustomColors();
                await this.globalData.loadArtworks();
                this.runDuplicateCheck();
                if(!this.duplicateGroups.length){ this.showDuplicateDialog=false; }
            } catch(err){
                const raw = err?.response?.data?.error || '';
                if(raw){ notifier.error('合并失败: '+raw); }
                else if(err?.request){ notifier.error('网络错误，合并失败'); }
                else { notifier.error('合并失败'); }
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
        .print-color-solid {
            width: 100%;
            height: 100%;
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
                    const swatch = window.CustomColorSwatch && typeof window.CustomColorSwatch.resolveSwatch === 'function'
                        ? window.CustomColorSwatch.resolveSwatch(color, {
                            baseURL,
                            buildURL: (base, path) => `${base.replace(/\/$/, '')}/uploads/${path}`
                        })
                        : null;
                    let swatchHtml;
                    if (swatch && swatch.type === 'image' && swatch.imageUrl) {
                        swatchHtml = `<img src="${swatch.imageUrl}" class="print-color-image" onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=\'print-no-image\'>图像加载失败</div>'" />`;
                    } else if (swatch && (swatch.type === 'pure' || swatch.type === 'color') && swatch.hex) {
                        swatchHtml = `<div class="print-color-solid" style="background:${swatch.hex};"></div>`;
                    } else {
                        swatchHtml = `<div class="print-no-image">未上传<br/>图片</div>`;
                    }
                    
                    html += `
                <div class="print-color-item">
                    <div class="print-color-block">${swatchHtml}</div>
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
        activeCategory() {
            this.currentPage = 1;
        },
        
        totalPages(newVal) {
            // Adjust current page if it exceeds total pages
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
        colorCodeDuplicate(val) {
            if (val && this.$refs.formRef) {
                this.$refs.formRef.clearValidate('color_code');
            }
        }
    },
    
    // Restore pagination state on mount
    mounted() {
        if (window.LegacyListState && typeof window.LegacyListState.create === 'function') {
            this._listState = window.LegacyListState.create({
                vm: this,
                selectedKey: 'selectedColorId',
                pageKey: 'sw-colors-page',
                itemsKey: 'sw-colors-items-per-page',
                listSelector: '.color-cards-grid',
                configSection: 'custom-colors'
            });
        }
        if (window.LegacyDialogGuard && typeof window.LegacyDialogGuard.create === 'function') {
            this._dialogGuard = window.LegacyDialogGuard.create({
                vm: this,
                snapshotKey: '_originalColorFormSnapshot',
                escHandlerKey: '_escHandler'
            });
        }

        // Update items per page based on app config
        this.updatePaginationFromConfig();
        
        this.restorePaginationState();
        
        if (this._listState && typeof this._listState.bindGlobalEvents === 'function') {
            this._listState.bindGlobalEvents();
        } else {
            // Add global event listeners for selection
            document.addEventListener('click', this.handleGlobalClick);
            document.addEventListener('keydown', this.handleEscKey);
        }
    },
    
    beforeUnmount() {
        if (this._listState && typeof this._listState.unbindGlobalEvents === 'function') {
            this._listState.unbindGlobalEvents();
        } else {
            // Clean up event listeners
            document.removeEventListener('click', this.handleGlobalClick);
            document.removeEventListener('keydown', this.handleEscKey);
        }
        this._unbindEsc();
    }
  };
})(window);
