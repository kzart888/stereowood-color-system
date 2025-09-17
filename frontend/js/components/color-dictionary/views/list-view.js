(function(window) {
    'use strict';

    const helpers = window.ColorDictionaryHelpers || { getColorStyle: () => null };

    const SimplifiedListView = {
        template: `
        <div class="simplified-list-view">
            <div class="category-list-container">
                <div v-for="category in categories" :key="category.id" class="category-row">
                    <div class="category-label">{{ category.name }}</div>
                    <div class="category-colors">
                        <div v-for="color in getSortedCategoryColors(category.id)"
                             :key="color.id"
                             class="color-chip-80"
                             :class="{ selected: color.id === selectedColorId }"
                             :data-color-id="color.id"
                             tabindex="0"
                             @click="$emit('select', color)"
                             @mouseenter="$emit('hover', color)"
                             @mouseleave="$emit('hover', null)">
                            <div class="color-preview"
                                 :class="{ 'blank-color': !getColorStyle(color) }"
                                 :style="getColorStyle(color) ? { background: getColorStyle(color) } : {}">
                                <span v-if="!getColorStyle(color)" class="blank-text">无</span>
                            </div>
                            <div class="color-code">{{ color.color_code }}</div>
                        </div>
                    </div>
                </div>

                <div v-if="getUncategorizedColors().length > 0" class="category-row">
                    <div class="category-label">未分类</div>
                    <div class="category-colors">
                        <div v-for="color in getSortedUncategorizedColors()"
                             :key="color.id"
                             class="color-chip-80"
                             :class="{ selected: color.id === selectedColorId }"
                             :data-color-id="color.id"
                             tabindex="0"
                             @click="$emit('select', color)"
                             @mouseenter="$emit('hover', color)"
                             @mouseleave="$emit('hover', null)">
                            <div class="color-preview"
                                 :class="{ 'blank-color': !getColorStyle(color) }"
                                 :style="getColorStyle(color) ? { background: getColorStyle(color) } : {}">
                                <span v-if="!getColorStyle(color)" class="blank-text">无</span>
                            </div>
                            <div class="color-code">{{ color.color_code }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

        props: {
            colors: {
                type: Array,
                default: () => []
            },
            categories: {
                type: Array,
                default: () => []
            },
            selectedColorId: {
                type: Number,
                default: null
            },
            sortMode: {
                type: String,
                default: 'name'
            }
        },

        methods: {
            getCategoryColors(categoryId) {
                return this.colors.filter((c) => c.category_id === categoryId);
            },

            getUncategorizedColors() {
                const categoryIds = this.categories.map((c) => c.id);
                return this.colors.filter((c) => !categoryIds.includes(c.category_id));
            },

            getSortedCategoryColors(categoryId) {
                return this.sortColors(this.getCategoryColors(categoryId));
            },

            getSortedUncategorizedColors() {
                return this.sortColors(this.getUncategorizedColors());
            },

            sortColors(colors) {
                if (this.sortMode === 'color') {
                    return [...colors].sort((a, b) => {
                        if (!a.hsl || !b.hsl) return 0;
                        const lightGroupA = Math.floor(a.hsl.l / 10);
                        const lightGroupB = Math.floor(b.hsl.l / 10);
                        if (lightGroupA !== lightGroupB) return lightGroupA - lightGroupB;
                        return b.hsl.s - a.hsl.s;
                    });
                }

                return [...colors].sort((a, b) => {
                    const codeA = a.color_code || '';
                    const codeB = b.color_code || '';
                    const matchA = codeA.match(/^([A-Z]+)(\d+)$/);
                    const matchB = codeB.match(/^([A-Z]+)(\d+)$/);
                    if (matchA && matchB) {
                        const prefixCompare = matchA[1].localeCompare(matchB[1]);
                        if (prefixCompare !== 0) return prefixCompare;
                        return parseInt(matchA[2], 10) - parseInt(matchB[2], 10);
                    }
                    return codeA.localeCompare(codeB, 'zh-CN');
                });
            },

            getColorStyle(color) {
                return helpers.getColorStyle(color);
            }
        }
    };

    window.ColorDictionaryViews = window.ColorDictionaryViews || {};
    window.ColorDictionaryViews.SimplifiedListView = SimplifiedListView;
})(window);
