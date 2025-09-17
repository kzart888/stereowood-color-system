(function(window) {
    'use strict';

    const ColorDictionaryHelpers = {
        /**
         * Normalize color information into a CSS background string.
         * Falls back through the available representations without mutating the source object.
         * @param {Object} color
         * @returns {string|null}
         */
        getColorStyle(color) {
            if (!color) return null;

            const normalizeHex = (value) => {
                if (!value || value === '未填写') return '';
                const trimmed = String(value).trim();
                if (!trimmed) return '';
                return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
            };

            const hexFromApi = normalizeHex(color.hex_color);
            if (hexFromApi) return hexFromApi;

            const enrichedHex = normalizeHex(color.hex);
            if (enrichedHex) return enrichedHex;

            if (color.rgb && typeof color.rgb === 'object') {
                const { r, g, b } = color.rgb;
                if ([r, g, b].every(v => v !== undefined && v !== null && !Number.isNaN(Number(v)))) {
                    return `rgb(${Number(r)}, ${Number(g)}, ${Number(b)})`;
                }
            }

            const components = [color.rgb_r, color.rgb_g, color.rgb_b];
            if (components.every(v => v !== undefined && v !== null && !Number.isNaN(Number(v)))) {
                const [r, g, b] = components.map(Number);
                return `rgb(${r}, ${g}, ${b})`;
            }

            return null;
        }
    };

    window.ColorDictionaryHelpers = ColorDictionaryHelpers;
})(window);
