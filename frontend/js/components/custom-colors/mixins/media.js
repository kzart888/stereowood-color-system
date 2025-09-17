(function(window) {
    'use strict';

    const CustomColorMediaMixin = {
        computed: {
            hasImageAvailable() {
                return !!(this.form.imageFile || (this.editingColor && this.editingColor.image_path) || this.form.imagePreview);
            },

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
            }
        },

        methods: {
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
                    return null;
                }
            },

            async extractColorFromImage() {
                const msg = this.getMsg();
                const converter = window.ColorConverter;
                if (!converter) {
                    msg.error('色值工具未加载');
                    return;
                }

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
                    const color = await converter.extractColorFromImage(imageToProcess);
                    this.form.rgb_r = color.r;
                    this.form.rgb_g = color.g;
                    this.form.rgb_b = color.b;

                    const cmyk = converter.rgbToCmyk(color.r, color.g, color.b);
                    this.form.cmyk_c = cmyk.c;
                    this.form.cmyk_m = cmyk.m;
                    this.form.cmyk_y = cmyk.y;
                    this.form.cmyk_k = cmyk.k;

                    this.form.hex_color = converter.rgbToHex(color.r, color.g, color.b);

                    msg.success('已提取颜色值');
                } catch (error) {
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
                const converter = window.ColorConverter;
                if (this.form.rgb_r === null || this.form.rgb_g === null || this.form.rgb_b === null) {
                    msg.warning('请先输入或提取 RGB 颜色值');
                    return;
                }

                if (!converter) {
                    msg.error('色值工具未加载');
                    return;
                }

                const rgb = {
                    r: parseInt(this.form.rgb_r),
                    g: parseInt(this.form.rgb_g),
                    b: parseInt(this.form.rgb_b)
                };

                if (!converter.isValidRGB(rgb.r, rgb.g, rgb.b)) {
                    msg.error('RGB 值无效，请检查输入');
                    return;
                }

                let coatedMatch, uncoatedMatch;

                if (window.PantoneHelper) {
                    coatedMatch = window.PantoneHelper.findClosest(rgb, 'coated');
                    uncoatedMatch = window.PantoneHelper.findClosest(rgb, 'uncoated');
                } else {
                    const pantoneColors = Array.isArray(window.PANTONE_COLORS) ? window.PANTONE_COLORS : [];
                    const coatedPalette = pantoneColors.filter(color => (color.type || '').toLowerCase() === 'coated');
                    const uncoatedPalette = pantoneColors.filter(color => (color.type || '').toLowerCase() === 'uncoated');
                    coatedMatch = converter.findClosestPantone(rgb, coatedPalette);
                    uncoatedMatch = converter.findClosestPantone(rgb, uncoatedPalette);
                }

                if (coatedMatch) {
                    const cleanName = coatedMatch.name.replace(/^PANTONE\s+/i, '').replace(/\s+C$/i, 'C');
                    this.form.pantone_coated = cleanName;
                }
                if (uncoatedMatch) {
                    const cleanName = uncoatedMatch.name.replace(/^PANTONE\s+/i, '').replace(/\s+U$/i, 'U');
                    this.form.pantone_uncoated = cleanName;
                }

                const coatedDisplay = coatedMatch ? coatedMatch.name.replace(/^PANTONE\s+/i, '').replace(/\s+C$/i, 'C') : '无';
                const uncoatedDisplay = uncoatedMatch ? uncoatedMatch.name.replace(/^PANTONE\s+/i, '').replace(/\s+U$/i, 'U') : '无';
                msg.success(`已匹配潘通色号: ${coatedDisplay} / ${uncoatedDisplay}`);
            },

            getCMYKColor(c, m, y, k) {
                if (window.ColorConverter) {
                    const rgb = window.ColorConverter.cmykToRgb(c, m, y, k);
                    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                }
                return '#f5f5f5';
            },

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
            }
        }
    };

    window.CustomColorMediaMixin = CustomColorMediaMixin;
})(window);
