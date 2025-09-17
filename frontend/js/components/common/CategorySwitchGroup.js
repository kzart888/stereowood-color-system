(function(window) {
    'use strict';

    const CategorySwitchGroup = {
        name: 'CategorySwitchGroup',
        props: {
            activeCategory: {
                type: [String, Number, Object],
                default: 'all'
            },
            categories: {
                type: Array,
                default: () => []
            },
            includeAll: {
                type: Boolean,
                default: true
            },
            allLabel: {
                type: String,
                default: '全部'
            },
            ariaLabel: {
                type: String,
                default: '分类筛选'
            },
            showSettingsButton: {
                type: Boolean,
                default: false
            },
            settingsTitle: {
                type: String,
                default: '管理分类'
            },
            categoryIdField: {
                type: String,
                default: 'id'
            },
            categoryLabelField: {
                type: String,
                default: 'name'
            }
        },
        emits: ['update:activeCategory', 'open-settings'],
        computed: {
            normalizedCategories() {
                return (this.categories || []).map((category, index) => {
                    if (category && typeof category === 'object') {
                        return {
                            raw: category,
                            value: category[this.categoryIdField],
                            label: category[this.categoryLabelField] || category.name || category.label || `分类 ${index + 1}`
                        };
                    }

                    return {
                        raw: category,
                        value: category,
                        label: String(category)
                    };
                });
            }
        },
        methods: {
            isActive(value) {
                return value === this.activeCategory;
            },
            emitCategory(category) {
                this.$emit('update:activeCategory', category);
            },
            openSettings() {
                this.$emit('open-settings');
            }
        },
        template: `
            <div class="category-switch-group" role="tablist" :aria-label="ariaLabel">
                <button
                    v-if="includeAll"
                    type="button"
                    class="category-switch"
                    :class="{ active: isActive('all') }"
                    @click="emitCategory('all')"
                    role="tab"
                    :aria-selected="isActive('all')"
                >{{ allLabel }}</button>

                <button
                    v-for="category in normalizedCategories"
                    :key="category.value ?? category.label"
                    type="button"
                    class="category-switch"
                    :class="{ active: isActive(category.value) }"
                    @click="emitCategory(category.value)"
                    role="tab"
                    :aria-selected="isActive(category.value)"
                >
                    <slot name="category" :category="category.raw">{{ category.label }}</slot>
                </button>

                <button
                    v-if="showSettingsButton"
                    type="button"
                    class="category-settings-btn"
                    @click="openSettings"
                    :title="settingsTitle"
                >
                    <el-icon><Setting /></el-icon>
                </button>
            </div>
        `
    };

    window.CategorySwitchGroup = CategorySwitchGroup;
})(window);
