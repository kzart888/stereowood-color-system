(function(window) {
    'use strict';

    const helpers = window.ColorDictionaryHelpers || { getColorStyle: () => null };

    const ColorDictionaryDataMixin = {
        methods: {
            async loadCategories() {
                try {
                    const response = await fetch('/api/categories');
                    const data = await response.json();
                    this.categories = Array.isArray(data) ? data : [];
                } catch (error) {
                    console.error('Failed to load categories:', error);
                    this.categories = [];
                }
            },

            async loadColors() {
                this.loading = true;
                try {
                    const response = await fetch('/api/custom-colors');
                    const data = await response.json();
                    this.colors = Array.isArray(data) ? data : [];
                    this.enrichColors();
                } catch (error) {
                    console.error('Failed to load colors:', error);
                    if (this.$message && typeof this.$message.error === 'function') {
                        this.$message.error('加载颜色数据失败');
                    }
                } finally {
                    this.loading = false;
                }
            },

            enrichColors() {
                const utils = window.ColorProcessingUtils;
                if (utils && typeof utils.enrichColors === 'function') {
                    const fallback = (categoryId) => {
                        if (utils && typeof utils.getDefaultColorForCategory === 'function') {
                            return utils.getDefaultColorForCategory(categoryId);
                        }
                        return this.getDefaultColorForCategory(categoryId);
                    };
                    this.enrichedColors = utils.enrichColors(this.colors, {
                        fallbackByCategory: fallback
                    });
                    return;
                }

                this.enrichedColors = this.colors.map((color) => {
                    const enriched = { ...color };

                    if (color.rgb_r != null && color.rgb_g != null && color.rgb_b != null) {
                        enriched.hex = rgbToHex(color.rgb_r, color.rgb_g, color.rgb_b);
                        enriched.hsl = rgbToHsl(color.rgb_r, color.rgb_g, color.rgb_b);
                        enriched.rgb = {
                            r: parseInt(color.rgb_r, 10) || 0,
                            g: parseInt(color.rgb_g, 10) || 0,
                            b: parseInt(color.rgb_b, 10) || 0
                        };
                        return enriched;
                    }

                    if (color.hex_color && color.hex_color !== '未填写' && color.hex_color !== '') {
                        const hex = color.hex_color.startsWith('#') ? color.hex_color : `#${color.hex_color}`;
                        const rgb = hexToRgb(hex);
                        if (rgb) {
                            enriched.rgb = rgb;
                            enriched.hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                            enriched.hex = hex;
                        }
                        return enriched;
                    }

                    enriched.hex = null;
                    enriched.hsl = null;
                    enriched.rgb = null;
                    return enriched;
                });
            },

            getDefaultColorForCategory(categoryId) {
                const categoryColors = {
                    1: { r: 70, g: 130, b: 180 },
                    2: { r: 255, g: 215, b: 0 },
                    3: { r: 220, g: 20, b: 60 },
                    4: { r: 34, g: 139, b: 34 },
                    5: { r: 128, g: 0, b: 128 },
                    6: { r: 139, g: 69, b: 19 },
                    7: { r: 255, g: 140, b: 0 }
                };
                return categoryColors[categoryId] || { r: 128, g: 128, b: 128 };
            },

            getCategoryName(categoryId) {
                const category = (this.categories || []).find((c) => c.id === categoryId);
                return category ? category.name : '未分类';
            },

            getColorStyle(color) {
                return helpers.getColorStyle(color);
            },

            formatDate(dateStr) {
                if (!dateStr) return '-';
                const date = new Date(dateStr);
                return date.toLocaleDateString('zh-CN');
            },

            initializeCategorySync() {
                if (!this._categoryUpdateHandler) {
                    this._categoryUpdateHandler = (event) => {
                        this.categories = Array.isArray(event.detail) ? event.detail : [];
                        if (this.colors.length > 0) {
                            this.enrichColors();
                        }
                    };
                    window.addEventListener('categories-updated', this._categoryUpdateHandler);
                }

                if (!this._unwatchCategories && this.$watch && this.$root) {
                    this._unwatchCategories = this.$watch(
                        () => this.$root.categories,
                        (newCategories) => {
                            if (Array.isArray(newCategories) && newCategories.length > 0) {
                                this.categories = newCategories;
                                if (this.colors.length > 0) {
                                    this.enrichColors();
                                }
                            }
                        },
                        { deep: true }
                    );
                }
            },

            initializeColorSync() {
                if (!this._colorUpdateHandler) {
                    this._colorUpdateHandler = (event) => {
                        this.colors = Array.isArray(event.detail) ? event.detail : [];
                        this.enrichColors();
                    };
                    window.addEventListener('colors-updated', this._colorUpdateHandler);
                }

                if (!this._unwatchColors && this.$watch && this.$root) {
                    this._unwatchColors = this.$watch(
                        () => this.$root.customColors,
                        (newColors) => {
                            if (Array.isArray(newColors) && newColors.length > 0) {
                                this.colors = newColors;
                                this.enrichColors();
                            }
                        },
                        { deep: true }
                    );
                }
            },

            teardownSyncListeners() {
                if (this._categoryUpdateHandler) {
                    window.removeEventListener('categories-updated', this._categoryUpdateHandler);
                    this._categoryUpdateHandler = null;
                }

                if (this._colorUpdateHandler) {
                    window.removeEventListener('colors-updated', this._colorUpdateHandler);
                    this._colorUpdateHandler = null;
                }

                if (this._unwatchCategories) {
                    this._unwatchCategories();
                    this._unwatchCategories = null;
                }

                if (this._unwatchColors) {
                    this._unwatchColors();
                    this._unwatchColors = null;
                }
            }
        }
    };

    window.ColorDictionaryMixins = window.ColorDictionaryMixins || {};
    window.ColorDictionaryMixins.data = ColorDictionaryDataMixin;
})(window);
