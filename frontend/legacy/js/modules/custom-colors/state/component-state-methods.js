(function (window) {
  window.CustomColorsStateMethods = {
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

                if (savedItems !== null && savedItems !== this.itemsPerPage) {
                    try { localStorage.setItem('sw-colors-items-per-page', this.itemsPerPage); } catch(e) {}
                }
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
  };
})(window);
