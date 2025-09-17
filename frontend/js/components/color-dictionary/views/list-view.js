(function(window) {
    'use strict';

    const helpers = window.ColorDictionaryHelpers || { getColorStyle: () => null };
    const processing = window.ColorProcessingUtils || {};

    const SimplifiedListView = {
        name: 'SimplifiedListView',
        template: `
        <div class="simplified-list-view" :class="{ 'is-advanced': enableAdvancedControls }">
            <div v-if="enableAdvancedControls" class="list-controls">
                <div class="control-row">
                    <el-select v-model="sortBy" placeholder="排序方式" @change="handleSortChange">
                        <el-option label="按色相" value="hue"></el-option>
                        <el-option label="按明度" value="lightness"></el-option>
                        <el-option label="按饱和度" value="saturation"></el-option>
                        <el-option label="按名称" value="name"></el-option>
                        <el-option label="按时间" value="date"></el-option>
                    </el-select>
                    <el-select v-model="filterCategory" placeholder="筛选分类" clearable @change="handleFilterChange">
                        <el-option
                            v-for="cat in categories"
                            :key="cat.id"
                            :label="cat.name"
                            :value="cat.id"
                        ></el-option>
                    </el-select>
                    <el-checkbox v-if="showRgbFilter" v-model="showOnlyWithRGB" @change="handleFilterChange">
                        仅显示有RGB数据
                    </el-checkbox>
                </div>
                <div v-if="showSearch" class="search-row">
                    <el-input
                        v-model="searchTerm"
                        placeholder="搜索颜色编码或配方"
                        clearable
                        @input="handleSearch"
                    >
                        <template #prefix>
                            <i class="el-icon-search"></i>
                        </template>
                    </el-input>
                </div>
                <div class="stats-row">
                    显示 {{ filteredColors.length }} / {{ colors.length }} 个颜色
                </div>
            </div>

            <div v-if="viewMode === 'categories'" class="category-list-container">
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

            <div v-else class="color-list-container">
                <div class="view-toggle">
                    <el-radio-group v-model="viewMode" size="small">
                        <el-radio-button label="grid">网格</el-radio-button>
                        <el-radio-button label="list">列表</el-radio-button>
                        <el-radio-button label="compact">紧凑</el-radio-button>
                    </el-radio-group>
                </div>

                <div v-if="viewMode === 'grid'" class="color-grid">
                    <div
                        v-for="color in paginatedColors"
                        :key="color.id"
                        class="color-grid-item"
                        :class="{
                            'selected': color.id === selectedColorId,
                            'has-rgb': color.hasValidRGB
                        }"
                        @click="handleSelect(color)"
                        @mouseenter="handleHover(color)"
                        @mouseleave="handleHoverEnd"
                    >
                        <div class="color-preview" :style="{ backgroundColor: getColorStyle(color) || getCategoryColor(color) }">
                            <div v-if="showRgbFilter && !color.hasValidRGB" class="no-rgb-indicator">?</div>
                        </div>
                        <div class="color-label">{{ color.color_code }}</div>
                        <div class="color-hsl" v-if="color.hsl">
                            H:{{ Math.round(color.hsl.h) }}° S:{{ Math.round(color.hsl.s) }}%
                        </div>
                    </div>
                </div>

                <div v-else-if="viewMode === 'list'" class="color-list">
                    <div
                        v-for="color in paginatedColors"
                        :key="color.id"
                        class="color-list-item"
                        :class="{ 'selected': color.id === selectedColorId }"
                        @click="handleSelect(color)"
                        @mouseenter="handleHover(color)"
                        @mouseleave="handleHoverEnd"
                    >
                        <div class="color-swatch" :style="{ backgroundColor: getColorStyle(color) || getCategoryColor(color) }"></div>
                        <div class="color-info">
                            <div class="color-header">
                                <span class="color-code">{{ color.color_code }}</span>
                                <span class="color-category">{{ getCategoryName(color.category_id) }}</span>
                            </div>
                            <div class="color-formula">{{ color.formula || '未填写配方' }}</div>
                            <div class="color-values" v-if="color.hasValidRGB">
                                <span v-if="color.rgb">RGB: {{ color.rgb.r }}, {{ color.rgb.g }}, {{ color.rgb.b }}</span>
                                <span v-if="color.hsl">HSL: {{ Math.round(color.hsl.h) }}°, {{ Math.round(color.hsl.s) }}%, {{ Math.round(color.hsl.l) }}%</span>
                            </div>
                        </div>
                        <div class="color-wheel-position" v-if="color.hsl">
                            <svg width="30" height="30" viewBox="0 0 30 30">
                                <circle cx="15" cy="15" r="14" fill="none" stroke="#ddd" stroke-width="1"/>
                                <circle
                                    :cx="15 + 12 * Math.cos(color.hsl.h * Math.PI / 180) * (color.hsl.s / 100)"
                                    :cy="15 + 12 * Math.sin(color.hsl.h * Math.PI / 180) * (color.hsl.s / 100)"
                                    r="3"
                                    :fill="getColorStyle(color) || '#888'"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <div v-else class="color-compact">
                    <span
                        v-for="color in paginatedColors"
                        :key="color.id"
                        class="color-chip"
                        :class="{ 'selected': color.id === selectedColorId }"
                        @click="handleSelect(color)"
                        @mouseenter="handleHover(color)"
                        @mouseleave="handleHoverEnd"
                        :style="{ backgroundColor: getColorStyle(color) || getCategoryColor(color) }"
                    >
                        {{ color.color_code }}
                    </span>
                </div>

                <div class="pagination-controls" v-if="totalPages > 1">
                    <el-pagination
                        background
                        layout="prev, pager, next, sizes"
                        :page-size="pageSize"
                        :current-page="currentPage"
                        :total="filteredColors.length"
                        :page-sizes="pageSizeOptions"
                        @current-change="handlePageChange"
                        @size-change="handleSizeChange"
                    />
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
            },
            enableAdvancedControls: {
                type: Boolean,
                default: false
            },
            defaultViewMode: {
                type: String,
                default: 'categories'
            },
            showRgbFilter: {
                type: Boolean,
                default: false
            },
            showSearch: {
                type: Boolean,
                default: false
            },
            pageSizeOptions: {
                type: Array,
                default: () => [24, 48, 96]
            },
            defaultPageSize: {
                type: Number,
                default: 24
            }
        },

        data() {
            return {
                viewMode: this.enableAdvancedControls ? this.defaultViewMode : 'categories',
                sortBy: 'hue',
                filterCategory: null,
                showOnlyWithRGB: false,
                searchTerm: '',
                currentPage: 1,
                pageSize: this.defaultPageSize,
                hoveredColor: null
            };
        },

        computed: {
            filteredColors() {
                if (!this.enableAdvancedControls) {
                    return [];
                }

                let filtered = Array.isArray(this.colors) ? [...this.colors] : [];

                if (this.filterCategory) {
                    filtered = filtered.filter(c => c.category_id === this.filterCategory);
                }

                if (this.showRgbFilter && this.showOnlyWithRGB) {
                    filtered = filtered.filter(c => c.hasValidRGB);
                }

                if (this.searchTerm) {
                    const term = this.searchTerm.toLowerCase();
                    filtered = filtered.filter(c => {
                        const code = (c.color_code || '').toLowerCase();
                        const formula = (c.formula || '').toLowerCase();
                        const name = (c.name || c.color_name || '').toLowerCase();
                        return code.includes(term) || formula.includes(term) || name.includes(term);
                    });
                }

                return this.sortAdvancedColors(filtered);
            },

            paginatedColors() {
                if (!this.enableAdvancedControls) return [];
                const start = (this.currentPage - 1) * this.pageSize;
                const end = start + this.pageSize;
                return this.filteredColors.slice(start, end);
            },

            totalPages() {
                if (!this.enableAdvancedControls) return 0;
                return Math.ceil(this.filteredColors.length / this.pageSize);
            }
        },

        watch: {
            selectedColorId(newVal) {
                if (!this.enableAdvancedControls || !newVal) return;
                const index = this.filteredColors.findIndex(c => c.id === newVal);
                if (index >= 0) {
                    const page = Math.floor(index / this.pageSize) + 1;
                    if (page !== this.currentPage) {
                        this.currentPage = page;
                    }
                }
            },
            enableAdvancedControls: {
                immediate: true,
                handler(value) {
                    if (!value) {
                        this.viewMode = 'categories';
                    } else {
                        this.viewMode = this.defaultViewMode;
                    }
                }
            }
        },

        methods: {
            getCategoryColors(categoryId) {
                return (this.colors || []).filter((c) => c.category_id === categoryId);
            },

            getUncategorizedColors() {
                const categoryIds = (this.categories || []).map((c) => c.id);
                return (this.colors || []).filter((c) => !categoryIds.includes(c.category_id));
            },

            getSortedCategoryColors(categoryId) {
                const colors = this.getCategoryColors(categoryId);
                return this.sortCategoryColors(colors);
            },

            getSortedUncategorizedColors() {
                const colors = this.getUncategorizedColors();
                return this.sortCategoryColors(colors);
            },

            sortCategoryColors(colors) {
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

            sortAdvancedColors(colors) {
                return [...colors].sort((a, b) => {
                    switch (this.sortBy) {
                        case 'hue':
                            return (a.hsl?.h ?? 360) - (b.hsl?.h ?? 360);
                        case 'lightness':
                            return (a.hsl?.l ?? 0) - (b.hsl?.l ?? 0);
                        case 'saturation':
                            return (a.hsl?.s ?? 0) - (b.hsl?.s ?? 0);
                        case 'date':
                            return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
                        case 'name':
                        default:
                            return (a.color_code || '').localeCompare(b.color_code || '');
                    }
                });
            },

            handleSelect(color) {
                this.$emit('select', color);
            },

            handleHover(color) {
                this.hoveredColor = color;
                this.$emit('hover', color);
            },

            handleHoverEnd() {
                this.hoveredColor = null;
                this.$emit('hover', null);
            },

            handleSortChange() {
                this.currentPage = 1;
            },

            handleFilterChange() {
                this.currentPage = 1;
            },

            handleSearch() {
                this.currentPage = 1;
            },

            handlePageChange(page) {
                this.currentPage = page;
            },

            handleSizeChange(size) {
                this.pageSize = size;
                this.currentPage = 1;
            },

            getCategoryColor(color) {
                if (processing && typeof processing.getDefaultColorForCategory === 'function') {
                    const fallback = processing.getDefaultColorForCategory(color.category_id);
                    return fallback ? `rgb(${fallback.r}, ${fallback.g}, ${fallback.b})` : '#CCCCCC';
                }
                const categoryColors = {
                    1: '#4A90E2',
                    2: '#F5D547',
                    3: '#E85D75',
                    4: '#7FBA40',
                    5: '#9B59B6',
                    6: '#FF6B6B',
                    7: '#95A5A6'
                };
                return categoryColors[color.category_id] || '#CCCCCC';
            },

            getCategoryName(categoryId) {
                const category = (this.categories || []).find(c => c.id === categoryId);
                return category ? category.name : '';
            },

            getColorStyle(color) {
                return helpers.getColorStyle(color);
            }
        }
    };

    window.ColorDictionaryViews = window.ColorDictionaryViews || {};
    window.ColorDictionaryViews.SimplifiedListView = SimplifiedListView;
})(window);
