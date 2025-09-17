(function(window) {
    'use strict';

    const ColorDictionaryHelpers = window.ColorDictionaryHelpers || {};

    const DEFAULT_CATEGORY_COLORS = {
        1: { r: 70, g: 130, b: 180 },  // 蓝 - Blue
        2: { r: 255, g: 215, b: 0 },   // 黄 - Yellow
        3: { r: 220, g: 20, b: 60 },   // 红 - Red
        4: { r: 34, g: 139, b: 34 },   // 绿 - Green
        5: { r: 128, g: 0, b: 128 },   // 紫 - Purple
        6: { r: 139, g: 69, b: 19 },   // 色精 - Brown
        7: { r: 255, g: 140, b: 0 }    // 其他 - Orange
    };

    function normalizeHexValue(value) {
        if (!value || value === '未填写') return '';
        const trimmed = String(value).trim();
        if (!trimmed) return '';
        return trimmed.startsWith('#') ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`;
    }

    function ensureRgb(color, options) {
        const normalized = normalizeHexValue(color.hex_color || color.hex);
        if (normalized) {
            const rgb = typeof hexToRgb === 'function' ? hexToRgb(normalized) : null;
            if (rgb) {
                return { rgb, hex: normalized, hasValidRGB: true };
            }
        }

        const components = [color.rgb_r, color.rgb_g, color.rgb_b]
            .map((value) => (value !== undefined && value !== null ? parseInt(value, 10) : null));
        if (components.every((value) => Number.isFinite(value))) {
            const [r, g, b] = components;
            const hex = typeof rgbToHex === 'function' ? rgbToHex(r, g, b) : null;
            return {
                rgb: { r, g, b },
                hex: hex || normalized || null,
                hasValidRGB: true
            };
        }

        if (options && options.fallbackByCategory) {
            const fallback = options.fallbackByCategory(color.category_id);
            if (fallback) {
                const hex = typeof rgbToHex === 'function'
                    ? rgbToHex(fallback.r, fallback.g, fallback.b)
                    : null;
                return {
                    rgb: fallback,
                    hex,
                    hasValidRGB: false
                };
            }
        }

        return {
            rgb: null,
            hex: normalized || null,
            hasValidRGB: false
        };
    }

    function ensureLab(rgb) {
        if (!rgb) return null;
        if (typeof rgbToLab === 'function') {
            return rgbToLab(rgb.r, rgb.g, rgb.b);
        }
        return null;
    }

    function enrichColor(color, index, options = {}) {
        const enriched = { ...color };

        const { rgb, hex, hasValidRGB } = ensureRgb(color, options);
        if (rgb) {
            enriched.rgb = rgb;
        }
        if (hex) {
            enriched.hex = hex;
        }
        enriched.hasValidRGB = Boolean(hasValidRGB);

        if (rgb && typeof rgbToHsl === 'function') {
            enriched.hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        } else if (!enriched.hsl && options.defaultHsl) {
            enriched.hsl = { ...options.defaultHsl };
        }

        if (rgb) {
            enriched.lab = ensureLab(rgb);
        }

        if (!enriched.name) {
            enriched.name = color.color_code || color.color_name || `Color ${index + 1}`;
        }

        return enriched;
    }

    function enrichColors(colors, options = {}) {
        if (!Array.isArray(colors)) return [];
        const fallback = options.fallbackByCategory || ((categoryId) => DEFAULT_CATEGORY_COLORS[categoryId] || { r: 128, g: 128, b: 128 });

        return colors.map((color, index) => {
            return enrichColor(color, index, {
                fallbackByCategory: fallback,
                defaultHsl: options.defaultHsl
            });
        });
    }

    function ensureLabFromColor(color) {
        if (!color) return null;
        if (color.lab) return color.lab;
        if (color.rgb) return ensureLab(color.rgb);
        if (color.rgb_r != null && color.rgb_g != null && color.rgb_b != null) {
            return ensureLab({
                r: Number(color.rgb_r),
                g: Number(color.rgb_g),
                b: Number(color.rgb_b)
            });
        }
        const style = ColorDictionaryHelpers.getColorStyle
            ? ColorDictionaryHelpers.getColorStyle(color)
            : null;
        if (style && typeof window.parseColorString === 'function') {
            const parsed = window.parseColorString(style);
            if (parsed && parsed.rgb) {
                return ensureLab(parsed.rgb);
            }
        }
        return null;
    }

    function calculateDeltaE(color1, color2, options = {}) {
        if (!color1 || !color2) return Number.POSITIVE_INFINITY;

        const lab1 = ensureLabFromColor(color1);
        const lab2 = ensureLabFromColor(color2);
        const algorithm = (options && options.algorithm) || '2000';

        if (lab1 && lab2) {
            if (algorithm === '94' && typeof window.deltaE94 === 'function') {
                return window.deltaE94(lab1, lab2, options.weights);
            }
            if (algorithm === '76' && typeof window.deltaE76 === 'function') {
                return window.deltaE76(lab1, lab2);
            }
            if (typeof window.deltaE2000 === 'function') {
                return window.deltaE2000(lab1, lab2, options.weights);
            }
            if (typeof window.deltaE94 === 'function') {
                return window.deltaE94(lab1, lab2, options.weights);
            }
            if (typeof window.deltaE76 === 'function') {
                return window.deltaE76(lab1, lab2);
            }
        }

        const rgb1 = color1.rgb || (color1.rgb_r != null ? { r: Number(color1.rgb_r), g: Number(color1.rgb_g), b: Number(color1.rgb_b) } : null);
        const rgb2 = color2.rgb || (color2.rgb_r != null ? { r: Number(color2.rgb_r), g: Number(color2.rgb_g), b: Number(color2.rgb_b) } : null);
        if (rgb1 && rgb2) {
            const dr = rgb1.r - rgb2.r;
            const dg = rgb1.g - rgb2.g;
            const db = rgb1.b - rgb2.b;
            return Math.sqrt(dr * dr + dg * dg + db * db) * 0.4;
        }

        return Number.POSITIVE_INFINITY;
    }

    function getDefaultColorForCategory(categoryId) {
        return DEFAULT_CATEGORY_COLORS[categoryId] || { r: 128, g: 128, b: 128 };
    }

    window.ColorProcessingUtils = {
        enrichColors,
        calculateDeltaE,
        getDefaultColorForCategory
    };
})(window);
