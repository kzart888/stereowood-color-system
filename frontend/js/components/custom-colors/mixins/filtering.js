(function(window) {
    'use strict';

    const CustomColorFilteringMixin = {
        computed: {
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

                const q = (this.$root && this.$root.globalSearchQuery || '').trim().toLowerCase();
                if (q && this.$root.activeTab === 'custom-colors') {
                    list = list.filter(c => ((c.name || '').toLowerCase().includes(q)) || ((c.color_code || '').toLowerCase().includes(q)));
                }

                if (this.sortMode === 'name') {
                    list.sort((a, b) => (a.color_code || '').localeCompare(b.color_code || ''));
                } else {
                    list.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
                }

                return list;
            },

            orderedCategoriesWithOther() {
                const raw = [...(this.categories || [])];
                raw.sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
                return raw;
            },

            categoriesWithOther() {
                return this.orderedCategoriesWithOther.map(c => c);
            },

            paletteGroups() {
                const groups = [];
                const ordered = this.orderedCategoriesWithOther.filter(cat => cat && cat.id);
                const knownIds = new Set();

                ordered.forEach(cat => {
                    knownIds.add(cat.id);
                    const colors = this.customColors.filter(color => color.category_id === cat.id);
                    if (colors.length) {
                        groups.push({
                            categoryId: cat.id,
                            categoryName: cat.name,
                            colors
                        });
                    }
                });

                const otherColors = this.customColors.filter(color => !knownIds.has(color.category_id));
                if (otherColors.length) {
                    groups.push({
                        categoryId: 'other',
                        categoryName: '其他',
                        colors: otherColors
                    });
                }

                return groups;
            }
        },

        methods: {
            categoryName(color) {
                const cat = this.categories.find(c => c.id === color.category_id);
                if (cat) return cat.name;

                const prefix = (color.color_code || '').substring(0, 2).toUpperCase();
                const byPrefix = this.categories.find(c => c.code === prefix);
                return byPrefix ? byPrefix.name : '其他';
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
                            layers.sort((x, y) => x - y);
                            const schemeName = s.name || s.scheme_name || '-';
                            const header = `${this.$helpers.formatArtworkTitle(a)}-[${schemeName}]`;
                            const suffix = layers.map(n => `(${n})`).join('');
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

            isColorReferenced(color) {
                if (!color) return false;
                const code = color.color_code;
                const artworks = this.globalData.artworks?.value || [];
                for (const artwork of artworks) {
                    for (const scheme of (artwork.schemes || [])) {
                        for (const layer of (scheme.layers || [])) {
                            if (layer.colorCode === code) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            }
        }
    };

    window.CustomColorFilteringMixin = CustomColorFilteringMixin;
})(window);
