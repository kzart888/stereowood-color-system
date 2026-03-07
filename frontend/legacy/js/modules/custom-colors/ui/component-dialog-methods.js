(function (window) {
  window.CustomColorsDialogMethods = {
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
  };
})(window);
