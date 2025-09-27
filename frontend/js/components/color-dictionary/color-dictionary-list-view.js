
(function (window) {
    const service = window.ColorDictionaryService;

    if (!service) {
        console.error('ColorDictionaryService is required for ColorDictionaryListView');
        return;
    }

    const ColorDictionaryListView = {
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
                return (this.colors || []).filter((color) => color.category_id === categoryId);
            },

            getUncategorizedColors() {
                const categoryIds = new Set((this.categories || []).map((category) => category.id));
                return (this.colors || []).filter((color) => !categoryIds.has(color.category_id));
            },

            getSortedCategoryColors(categoryId) {
                return service.sortColors(this.getCategoryColors(categoryId), this.sortMode);
            },

            getSortedUncategorizedColors() {
                return service.sortColors(this.getUncategorizedColors(), this.sortMode);
            },

            getColorStyle(color) {
                return service.getColorStyle(color);
            }
        }
    };

    window.ColorDictionaryListView = ColorDictionaryListView;
})(window);
