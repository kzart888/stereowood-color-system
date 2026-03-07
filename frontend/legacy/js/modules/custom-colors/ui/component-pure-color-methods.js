(function (window) {
  window.CustomColorsPureColorMethods = {
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
  };
})(window);
