// 分类筛选组件
// frontend/js/components/custom-colors/CategoryFilter.js

export const CategoryFilter = {
    props: {
        modelValue: { type: String, default: 'all' },
        categories: { type: Array, default: () => [] },
        colors: { type: Array, default: () => [] }
    },
    emits: ['update:modelValue'],
    computed: {
        categoryCounts() {
            const counts = { all: this.colors.length };
            
            // 初始化所有分类计数
            this.categories.forEach(cat => {
                const id = cat.id || 'other';
                counts[id] = 0;
            });
            
            // 统计每个分类的颜色数量
            this.colors.forEach(color => {
                const catId = color.category_id || 'other';
                if (!counts[catId]) {
                    counts[catId] = 0;
                }
                counts[catId]++;
            });
            
            return counts;
        }
    },
    methods: {
        selectCategory(categoryId) {
            this.$emit('update:modelValue', String(categoryId));
        },
        getCategoryCount(categoryId) {
            return this.categoryCounts[categoryId] || 0;
        }
    },
    template: `
        <div class="category-switch-group" role="tablist" aria-label="颜色分类筛选">
            <button 
                type="button" 
                class="category-chip" 
                :class="{active: modelValue === 'all'}"
                @click="selectCategory('all')"
                role="tab"
                :aria-selected="modelValue === 'all'">
                全部
                <span class="count">{{ getCategoryCount('all') }}</span>
            </button>
            
            <button 
                v-for="cat in categories" 
                :key="cat.id || 'other'"
                type="button"
                class="category-chip"
                :class="{active: modelValue === String(cat.id || 'other')}"
                @click="selectCategory(cat.id || 'other')"
                role="tab"
                :aria-selected="modelValue === String(cat.id || 'other')">
                {{ cat.name }}
                <span class="count">{{ getCategoryCount(cat.id || 'other') }}</span>
            </button>
        </div>
    `
};

export default CategoryFilter;