(function (window) {
    const DEFAULT_CATEGORY_NAME = '未分类';
    const EMPTY_FIELD_FLAG = '未填写';
    const BLANK_PLACEHOLDER = '无';

    const CATEGORY_COLOR_MAP = {
        1: { r: 70, g: 130, b: 180 },
        2: { r: 255, g: 215, b: 0 },
        3: { r: 220, g: 20, b: 60 },
        4: { r: 34, g: 139, b: 34 },
        5: { r: 128, g: 0, b: 128 },
        6: { r: 139, g: 69, b: 19 },
        7: { r: 255, g: 140, b: 0 }
    };

    const PRINT_CATEGORY_ORDER = ['蓝色系', '黄色系', '红色系', '绿色系', '紫色系', '色精', '黑白灰色系', '其他'];

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function toNumber(value) {
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    }

    function hasExplicitRgb(color) {
        return color && color.rgb_r != null && color.rgb_g != null && color.rgb_b != null;
    }

    function ensureHex(value) {
        if (!value) {
            return null;
        }
        const trimmed = String(value).trim();
        if (!trimmed || trimmed === EMPTY_FIELD_FLAG) {
            return null;
        }
        return trimmed.startsWith('#') ? trimmed : '#' + trimmed;
    }

    function extractRgb(color) {
        if (!color) {
            return null;
        }

        if (color.rgb && toNumber(color.rgb.r) != null && toNumber(color.rgb.g) != null && toNumber(color.rgb.b) != null) {
            return {
                r: toNumber(color.rgb.r),
                g: toNumber(color.rgb.g),
                b: toNumber(color.rgb.b)
            };
        }

        if (hasExplicitRgb(color)) {
            return {
                r: toNumber(color.rgb_r) ?? 0,
                g: toNumber(color.rgb_g) ?? 0,
                b: toNumber(color.rgb_b) ?? 0
            };
        }

        const hexCandidate = ensureHex(color.hex || color.hex_color);
        if (hexCandidate && typeof hexToRgb === 'function') {
            try {
                return hexToRgb(hexCandidate);
            } catch (error) {
                console.warn('Failed to parse hex color', hexCandidate, error);
            }
        }

        return null;
    }

    function extractLab(color) {
        if (!color) {
            return null;
        }
        if (color.lab) {
            return color.lab;
        }
        const rgb = extractRgb(color);
        if (!rgb || typeof rgbToLab !== 'function') {
            return null;
        }
        return rgbToLab(rgb.r, rgb.g, rgb.b);
    }

    function enrichColor(color) {
        const enriched = { ...color };
        const rgb = extractRgb(color);
        let hex = ensureHex(color.hex || color.hex_color);
        let hsl = color.hsl || null;
        let lab = color.lab || null;

        if (rgb) {
            const sanitizedRgb = {
                r: clamp(Math.round(rgb.r), 0, 255),
                g: clamp(Math.round(rgb.g), 0, 255),
                b: clamp(Math.round(rgb.b), 0, 255)
            };
            enriched.rgb = sanitizedRgb;

            if (!hex && typeof rgbToHex === 'function') {
                hex = rgbToHex(sanitizedRgb.r, sanitizedRgb.g, sanitizedRgb.b);
            }

            if (!hsl && typeof rgbToHsl === 'function') {
                hsl = rgbToHsl(sanitizedRgb.r, sanitizedRgb.g, sanitizedRgb.b);
            }

            if (!lab && typeof rgbToLab === 'function') {
                lab = rgbToLab(sanitizedRgb.r, sanitizedRgb.g, sanitizedRgb.b);
            }
        } else {
            enriched.rgb = null;
        }

        enriched.hex = ensureHex(hex);
        enriched.hsl = hsl || null;
        if (lab) {
            enriched.lab = lab;
        } else {
            delete enriched.lab;
        }

        return enriched;
    }

    function enrichColors(colors) {
        if (!Array.isArray(colors)) {
            return [];
        }
        return colors.map(enrichColor);
    }

    function getDefaultColorForCategory(categoryId) {
        return CATEGORY_COLOR_MAP[categoryId] || { r: 128, g: 128, b: 128 };
    }

    function getCategoryName(categories, categoryId) {
        if (Array.isArray(categories)) {
            const matched = categories.find((category) => category.id === categoryId);
            if (matched && matched.name) {
                return matched.name;
            }
        }
        return DEFAULT_CATEGORY_NAME;
    }

    function getColorStyle(color) {
        if (!color) {
            return null;
        }

        const hex = ensureHex(color.hex || color.hex_color);
        if (hex) {
            return hex;
        }

        const rgb = color.rgb || (hasExplicitRgb(color) ? {
            r: color.rgb_r,
            g: color.rgb_g,
            b: color.rgb_b
        } : null);

        if (rgb) {
            const r = toNumber(rgb.r);
            const g = toNumber(rgb.g);
            const b = toNumber(rgb.b);
            if (r != null && g != null && b != null) {
                return `rgb(${r}, ${g}, ${b})`;
            }
        }

        return null;
    }

    function formatDate(dateStr) {
        if (!dateStr) {
            return '-';
        }
        try {
            return new Date(dateStr).toLocaleDateString('zh-CN');
        } catch (error) {
            console.warn('Failed to format date', dateStr, error);
            return dateStr;
        }
    }

    function sortColors(colors, mode = 'name') {
        const list = Array.isArray(colors) ? [...colors] : [];
        if (mode === 'color') {
            return list.sort((a, b) => {
                if (!a.hsl || !b.hsl) {
                    return 0;
                }
                const lightGroupA = Math.floor((a.hsl.l ?? 0) / 10);
                const lightGroupB = Math.floor((b.hsl.l ?? 0) / 10);
                if (lightGroupA !== lightGroupB) {
                    return lightGroupA - lightGroupB;
                }

                const satGroupA = Math.floor((a.hsl.s ?? 0) / 10);
                const satGroupB = Math.floor((b.hsl.s ?? 0) / 10);
                if (satGroupA !== satGroupB) {
                    return satGroupA - satGroupB;
                }
                return (a.hsl.h ?? 0) - (b.hsl.h ?? 0);
            });
        }

        return list.sort((a, b) => {
            const codeA = (a.color_code || '').toString();
            const codeB = (b.color_code || '').toString();
            return codeA.localeCompare(codeB, 'zh-CN', { numeric: true, sensitivity: 'base' });
        });
    }

    function groupColorsByCategory(colors, categories) {
        const grouped = new Map();
        if (Array.isArray(categories)) {
            categories.forEach((category) => {
                grouped.set(category.id, []);
            });
        }

        const uncategorized = [];
        (colors || []).forEach((color) => {
            if (!color) {
                return;
            }
            const bucket = grouped.get(color.category_id);
            if (bucket) {
                bucket.push(color);
            } else {
                uncategorized.push(color);
            }
        });

        const ordered = Array.isArray(categories)
            ? categories.map((category) => ({
                id: category.id,
                name: category.name,
                colors: grouped.get(category.id) || []
            }))
            : [];

        return { ordered, uncategorized };
    }

    function generatePrintContent(enrichedColors, categories) {
        const colors = Array.isArray(enrichedColors) ? enrichedColors : [];
        const colorsByCategory = {};
        colors.forEach((color) => {
            const name = getCategoryName(categories, color.category_id);
            if (!colorsByCategory[name]) {
                colorsByCategory[name] = [];
            }
            colorsByCategory[name].push(color);
        });

        const sortedCategories = PRINT_CATEGORY_ORDER.filter((name) => colorsByCategory[name]);
        Object.keys(colorsByCategory).forEach((name) => {
            if (!sortedCategories.includes(name)) {
                sortedCategories.push(name);
            }
        });

        let html = '<div class="print-container">';
        html += '<div class="all-colors">';
        sortedCategories.forEach((name) => {
            const categoryColors = colorsByCategory[name] || [];
            if (categoryColors.length === 0) {
                return;
            }
            html += `<div style="width: 100%; clear: both; margin: 15px 0 10px 0;">` +
                `<div class="category-label">${name}</div>` +
                `</div>`;
            categoryColors.forEach((color) => {
                const bgStyle = getColorStyle(color);
                html += `
                    <div class="print-color-chip">
                        <div class="color-preview${bgStyle ? '' : ' blank-color'}"${bgStyle ? ` style="background: ${bgStyle}"` : ''}>
                            ${bgStyle ? '' : `<span>${BLANK_PLACEHOLDER}</span>`}
                        </div>
                        <div class="color-label">${color.color_code || ''}</div>
                    </div>
                `;
            });
        });

        html += '</div></div>';
        return html;
    }

    function getPrintStyles(dateStr) {
        return `
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Microsoft YaHei', Arial, sans-serif;
                    font-size: 12px;
                    line-height: 1.4;
                    margin: 0;
                    padding: 0;
                }

                .print-container {
                    padding: 0;
                    margin: 0;
                }

                .all-colors {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    padding: 0;
                    margin: 0;
                }

                .category-label {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    margin-top: 15px;
                    color: #333;
                    width: 100%;
                    page-break-after: avoid;
                }

                .print-color-chip {
                    width: 80px;
                    text-align: center;
                    page-break-inside: avoid;
                    break-inside: avoid;
                }

                .color-preview {
                    width: 80px;
                    height: 80px;
                    margin-bottom: 4px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .color-preview.blank-color {
                    background: #f5f5f5;
                    border: 2px dashed #d9d9d9;
                }

                .color-preview span {
                    color: #999;
                    font-size: 12px;
                }

                .color-label {
                    font-size: 12px;
                    color: #666;
                    line-height: 1.2;
                    margin-bottom: 4px;
                }

                @page {
                    size: A4;
                    margin: 10mm 8mm 15mm 8mm;

                    @bottom-left {
                        content: '${dateStr}';
                        font-size: 10px;
                        color: #000;
                    }

                    @bottom-right {
                        content: counter(page);
                        font-size: 10px;
                        color: #000;
                    }
                }

                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }

                    @page:first {
                        margin-top: 10mm;
                    }
                }
            `;
    }

    function calculateDeltaE(colorA, colorB, options = {}) {
        const method = options.method || '2000';
        const labA = extractLab(colorA);
        const labB = extractLab(colorB);

        if (labA && labB) {
            if (method === '94' && typeof deltaE94 === 'function') {
                return deltaE94(labA, labB, options.weights);
            }
            if (method === '76' && typeof deltaE76 === 'function') {
                return deltaE76(labA, labB);
            }
            if (typeof deltaE2000 === 'function') {
                return deltaE2000(labA, labB, options.weights);
            }
        }

        const rgbA = extractRgb(colorA);
        const rgbB = extractRgb(colorB);
        if (!rgbA || !rgbB) {
            return Number.POSITIVE_INFINITY;
        }
        const dr = rgbA.r - rgbB.r;
        const dg = rgbA.g - rgbB.g;
        const db = rgbA.b - rgbB.b;
        return Math.sqrt(dr * dr + dg * dg + db * db) * 0.4;
    }

    window.ColorDictionaryService = {
        enrichColor,
        enrichColors,
        getDefaultColorForCategory,
        getCategoryName,
        getColorStyle,
        formatDate,
        sortColors,
        groupColorsByCategory,
        generatePrintContent,
        getPrintStyles,
        calculateDeltaE
    };
})(window);
