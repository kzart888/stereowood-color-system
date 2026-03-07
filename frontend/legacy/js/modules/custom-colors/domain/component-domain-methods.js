(function (window) {
  window.CustomColorsDomainMethods = {
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

        generateColorCode(categoryId) {
            const esId = this.esCategoryId;
            if (!categoryId || categoryId === esId) return;
            const code = helpers.generateColorCode(this.categories, this.customColors, categoryId);
            if (code) {
                this.form.color_code = code;
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
  };
})(window);
