(function(window) {
    'use strict';

    const PaginatedCardGrid = {
        name: 'PaginatedCardGrid',
        props: {
            loading: {
                type: Boolean,
                default: false
            },
            items: {
                type: Array,
                default: () => []
            },
            filteredCount: {
                type: Number,
                default: 0
            },
            startItem: {
                type: Number,
                default: 0
            },
            endItem: {
                type: Number,
                default: 0
            },
            visiblePages: {
                type: Array,
                default: () => []
            },
            currentPage: {
                type: Number,
                default: 1
            },
            totalPages: {
                type: Number,
                default: 1
            },
            itemsPerPage: {
                type: Number,
                default: 12
            },
            itemsPerPageOptions: {
                type: Array,
                default: () => []
            },
            emptyMessage: {
                type: String,
                default: '暂无数据'
            },
            gridClass: {
                type: String,
                default: 'color-cards-grid'
            },
            cardClassFn: {
                type: Function,
                default: null
            },
            cardPropsFn: {
                type: Function,
                default: null
            },
            itemKeyFn: {
                type: Function,
                default(item, index) {
                    if (item && typeof item === 'object' && 'id' in item) {
                        return item.id;
                    }
                    return index;
                }
            }
        },
        emits: ['go-to-page', 'update:itemsPerPage', 'card-click'],
        computed: {
            resolvedOptions() {
                return (this.itemsPerPageOptions || []).map((option) => {
                    if (typeof option === 'number') {
                        return {
                            value: option,
                            label: option === 0 ? '全部' : `${option} 项`
                        };
                    }

                    if (option && typeof option === 'object') {
                        return {
                            value: option.value,
                            label: option.label || (option.value === 0 ? '全部' : `${option.value} 项`)
                        };
                    }

                    return { value: option, label: String(option) };
                });
            }
        },
        methods: {
            resolveCardClass(item, index) {
                if (typeof this.cardClassFn === 'function') {
                    return this.cardClassFn(item, index);
                }
                return null;
            },
            resolveCardProps(item, index) {
                if (typeof this.cardPropsFn === 'function') {
                    const props = this.cardPropsFn(item, index) || {};
                    return props;
                }
                return {};
            },
            handleCardClick(item, event) {
                this.$emit('card-click', item, event);
            },
            handleGoToPage(page) {
                this.$emit('go-to-page', page);
            },
            handleItemsPerPageChange(value) {
                this.$emit('update:itemsPerPage', value);
            },
            optionDisabled(page) {
                return page === '...';
            },
            cardKey(item, index) {
                if (typeof this.itemKeyFn === 'function') {
                    return this.itemKeyFn(item, index);
                }
                return index;
            }
        },
        template: `
            <div class="paginated-card-grid">
                <slot name="category-switch"></slot>

                <div v-if="loading" class="loading">
                    <el-icon class="is-loading"><Loading /></el-icon> 加载中...
                </div>

                <div v-else>
                    <div v-if="filteredCount === 0" class="empty-message">
                        <slot name="empty">{{ emptyMessage }}</slot>
                    </div>

                    <div v-else :class="gridClass">
                        <div
                            v-for="(item, index) in items"
                            :key="cardKey(item, index)"
                            class="artwork-bar"
                            :class="resolveCardClass(item, index)"
                            v-bind="resolveCardProps(item, index)"
                            @click="handleCardClick(item, $event)"
                        >
                            <slot :item="item" :index="index"></slot>
                        </div>
                    </div>

                    <div v-if="filteredCount > 0" class="pagination-container">
                        <div class="pagination-info">
                            显示 {{ startItem }}-{{ endItem }} 共 {{ filteredCount }} 项
                        </div>

                        <div class="pagination-controls">
                            <el-button
                                size="small"
                                :disabled="currentPage === 1"
                                @click="handleGoToPage(1)"
                            >
                                <el-icon><DArrowLeft /></el-icon>
                                <span>首页</span>
                            </el-button>

                            <el-button
                                size="small"
                                :disabled="currentPage === 1"
                                @click="handleGoToPage(currentPage - 1)"
                            >
                                <el-icon><ArrowLeft /></el-icon>
                                <span>上一页</span>
                            </el-button>

                            <span class="page-numbers">
                                <button
                                    v-for="page in visiblePages"
                                    :key="page + '-' + currentPage"
                                    :class="{ active: page === currentPage, ellipsis: page === '...' }"
                                    :disabled="optionDisabled(page)"
                                    @click="handleGoToPage(page)"
                                >
                                    {{ page }}
                                </button>
                            </span>

                            <el-button
                                size="small"
                                :disabled="currentPage === totalPages"
                                @click="handleGoToPage(currentPage + 1)"
                            >
                                <span>下一页</span>
                                <el-icon><ArrowRight /></el-icon>
                            </el-button>

                            <el-button
                                size="small"
                                :disabled="currentPage === totalPages"
                                @click="handleGoToPage(totalPages)"
                            >
                                <span>末页</span>
                                <el-icon><DArrowRight /></el-icon>
                            </el-button>
                        </div>

                        <div class="items-per-page">
                            <span>每页显示：</span>
                            <el-select
                                :model-value="itemsPerPage"
                                @change="handleItemsPerPageChange"
                                size="small"
                            >
                                <el-option
                                    v-for="option in resolvedOptions"
                                    :key="option.value"
                                    :value="option.value"
                                    :label="option.label"
                                />
                            </el-select>
                        </div>
                    </div>
                </div>
            </div>
        `
    };

    window.PaginatedCardGrid = PaginatedCardGrid;
})(window);
