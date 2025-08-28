// 自配色管理主组件 - 整合所有子组件
// frontend/js/components/custom-colors/index.js

import { ColorCard } from './ColorCard.js';
import { ColorDialog } from './ColorDialog.js';
import { CategoryFilter } from './CategoryFilter.js';
import { ColorService } from '../../services/ColorService.js';

export const CustomColorsComponent = {
    components: {
        ColorCard,
        ColorDialog,
        CategoryFilter
    },
    props: {
        sortMode: { type: String, default: 'time' } // time | name
    },
    inject: ['$api', '$helpers', '$calc', '$thumbPreview', '$root'],
    data() {
        return {
            colors: [],
            categories: [],
            artworks: [],
            loading: false,
            activeCategory: 'all',
            showAddDialog: false,
            editingColor: null,
            highlightCode: '',
            baseURL: window.BASE_URL || '',
            colorService: null,
            colorItemRefs: {}
        };
    },
    computed: {
        orderedCategoriesWithOther() {
            const ordered = [...this.categories];
            if (!ordered.some(c => c.name === '其他')) {
                ordered.push({ id: 'other', name: '其他' });
            }
            return ordered;
        },
        filteredColors() {
            let filtered = [...this.colors];
            
            // 分类筛选
            if (this.activeCategory !== 'all') {
                if (this.activeCategory === 'other') {
                    filtered = filtered.filter(c => 
                        !c.category_id || c.category_id === 'other'
                    );
                } else {
                    const catId = parseInt(this.activeCategory);
                    filtered = filtered.filter(c => c.category_id === catId);
                }
            }
            
            // 排序
            if (this.sortMode === 'name') {
                filtered.sort((a, b) => a.color_code.localeCompare(b.color_code));
            } else {
                filtered.sort((a, b) => {
                    const dateA = new Date(a.updated_at || a.created_at);
                    const dateB = new Date(b.updated_at || b.created_at);
                    return dateB - dateA;
                });
            }
            
            return filtered;
        }
    },
    created() {
        this.colorService = new ColorService(this.$api);
        this.loadData();
    },
    methods: {
        async loadData() {
            this.loading = true;
            try {
                const [colors, categories, artworks] = await Promise.all([
                    this.colorService.loadColors(),
                    this.colorService.loadCategories(),
                    this.loadArtworks()
                ]);
                
                this.colors = colors;
                this.categories = categories;
                this.artworks = artworks;
            } catch (error) {
                this.$message.error('加载数据失败: ' + error.message);
            } finally {
                this.loading = false;
            }
        },
        async loadArtworks() {
            try {
                const response = await this.$api.getArtworks();
                return response.data || [];
            } catch (error) {
                console.error('加载作品失败:', error);
                return [];
            }
        },
        categoryName(color) {
            if (!color.category_id || color.category_id === 'other') {
                return '其他';
            }
            const cat = this.categories.find(c => c.id === color.category_id);
            return cat ? cat.name : '未知分类';
        },
        isColorReferenced(color) {
            return this.colorService.isColorReferenced(color, this.artworks);
        },
        usageGroups(color) {
            return this.colorService.getColorUsageGroups(color, this.artworks);
        },
        formulaSegments(formula) {
            return this.colorService.parseFormula(formula);
        },
        async addColor() {
            this.editingColor = null;
            this.showAddDialog = true;
        },
        editColor(color) {
            this.editingColor = color;
            this.showAddDialog = true;
        },
        async saveColor(formData) {
            try {
                const data = new FormData();
                data.append('category_id', formData.category_id === 'other' ? '' : formData.category_id);
                data.append('color_code', formData.color_code);
                data.append('formula', formData.formula || '');
                data.append('description', formData.description || '');
                
                if (formData.image) {
                    data.append('image', formData.image);
                }
                
                if (this.editingColor) {
                    await this.colorService.updateColor(this.editingColor.id, data);
                    this.$message.success('修改成功');
                } else {
                    await this.colorService.createColor(data);
                    this.$message.success('添加成功');
                }
                
                this.showAddDialog = false;
                await this.loadData();
            } catch (error) {
                this.$message.error('保存失败: ' + error.message);
            }
        },
        async deleteColor(color) {
            try {
                await this.$confirm(
                    `确定要删除自配色 "${color.color_code}" 吗？`,
                    '删除确认',
                    {
                        confirmButtonText: '确定',
                        cancelButtonText: '取消',
                        type: 'warning'
                    }
                );
                
                await this.colorService.deleteColor(color.id);
                this.$message.success('删除成功');
                await this.loadData();
            } catch (error) {
                if (error !== 'cancel') {
                    this.$message.error('删除失败: ' + error.message);
                }
            }
        },
        viewHistory(color) {
            // TODO: 实现历史记录功能
            this.$message.info('历史记录功能开发中');
        },
        focusColor(colorCode) {
            this.highlightCode = colorCode;
            
            // 查找对应的颜色
            const color = this.colors.find(c => c.color_code === colorCode);
            if (color && this.colorItemRefs[color.id]) {
                const element = this.colorItemRefs[color.id];
                element.scrollIntoView({ behavior: 'instant', block: 'center' });
                
                // 3秒后清除高亮
                setTimeout(() => {
                    this.highlightCode = '';
                }, 3000);
            }
        },
        setColorItemRef(color) {
            return (el) => {
                if (el) {
                    this.colorItemRefs[color.id] = el;
                }
            };
        }
    },
    template: `
        <div>
            <category-filter
                v-model="activeCategory"
                :categories="orderedCategoriesWithOther"
                :colors="colors" />
            
            <div v-if="loading" class="loading">
                <el-icon class="is-loading"><Loading /></el-icon> 加载中...
            </div>
            
            <div v-else>
                <div v-if="filteredColors.length === 0" class="empty-message">
                    暂无自配色，点击右上角"新自配色"添加
                </div>
                
                <color-card
                    v-for="color in filteredColors"
                    :key="color.id"
                    :ref="setColorItemRef(color)"
                    :color="color"
                    :base-url="baseURL"
                    :category-name="categoryName(color)"
                    :usage-groups="usageGroups(color)"
                    :highlight-code="highlightCode"
                    :is-referenced="isColorReferenced(color)"
                    @edit="editColor"
                    @delete="deleteColor"
                    @view-history="viewHistory" />
            </div>
            
            <color-dialog
                v-model="showAddDialog"
                :editing-color="editingColor"
                :categories="categories"
                :base-url="baseURL"
                @save="saveColor" />
        </div>
    `
};

// 保持向后兼容
window.CustomColorsComponent = CustomColorsComponent;

export default CustomColorsComponent;