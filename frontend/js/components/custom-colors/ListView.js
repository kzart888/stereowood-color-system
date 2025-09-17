(function(window) {
    'use strict';

    const CustomColorListView = {
        name: 'CustomColorListView',
        props: {
            loading: { type: Boolean, default: false },
            activeCategory: { type: String, default: 'all' },
            orderedCategories: { type: Array, default: () => [] },
            filteredCount: { type: Number, default: 0 },
            paginatedColors: { type: Array, default: () => [] },
            startItem: { type: Number, default: 0 },
            endItem: { type: Number, default: 0 },
            visiblePages: { type: Array, default: () => [] },
            currentPage: { type: Number, default: 1 },
            totalPages: { type: Number, default: 1 },
            itemsPerPage: { type: Number, default: 12 },
            isDevelopmentMode: { type: Boolean, default: false },
            highlightCode: { type: String, default: null },
            selectedColorId: { type: [Number, String], default: null },
            refreshKey: { type: Number, default: 0 },
            formulaUtils: { type: Object, default: () => ({ segments: (f) => f ? f.split(/\s+/) : [] }) },
            baseUrl: { type: String, default: '' },
            categoryNameFn: { type: Function, default: null },
            usageGroupsFn: { type: Function, default: null },
            setColorItemRef: { type: Function, default: null },
            isColorReferencedFn: { type: Function, default: null },
            getCmykColorFn: { type: Function, default: null },
            getPantoneSwatchStyleFn: { type: Function, default: null }
        },
        emits: [
            'update:activeCategory',
            'open-category-manager',
            'toggle-selection',
            'edit',
            'delete',
            'view-history',
            'go-to-page',
            'update:itemsPerPage'
        ],
        computed: {
            resolvedBaseUrl() {
                return this.baseUrl || (this.$root && this.$root.globalData ? this.$root.globalData.baseURL : window.location.origin);
            }
        },
        methods: {
            handleToggleSelection(color, event) {
                this.$emit('toggle-selection', color.id, event);
            },
            handleItemsPerPageChange(value) {
                this.$emit('update:itemsPerPage', value);
            },
            categoryName(color) {
                if (typeof this.categoryNameFn === 'function') {
                    return this.categoryNameFn(color);
                }
                return '';
            },
            usageGroups(color) {
                if (typeof this.usageGroupsFn === 'function') {
                    return this.usageGroupsFn(color) || [];
                }
                return [];
            },
            isColorReferenced(color) {
                if (typeof this.isColorReferencedFn === 'function') {
                    return !!this.isColorReferencedFn(color);
                }
                return false;
            },
            getCmykColor(c, m, y, k) {
                if (typeof this.getCmykColorFn === 'function') {
                    return this.getCmykColorFn(c, m, y, k);
                }
                return '#f5f5f5';
            },
            getPantoneSwatchStyle(code) {
                if (typeof this.getPantoneSwatchStyleFn === 'function') {
                    return this.getPantoneSwatchStyleFn(code);
                }
                return { background: '#f5f5f5', border: '1px dashed #ccc' };
            },
            colorItemRef(color) {
                if (typeof this.setColorItemRef === 'function') {
                    return this.setColorItemRef(color);
                }
                return null;
            },
            buildImageUrl(imagePath) {
                if (!imagePath) return null;
                if (this.$helpers && typeof this.$helpers.buildUploadURL === 'function') {
                    return this.$helpers.buildUploadURL(this.resolvedBaseUrl, imagePath);
                }
                return `${this.resolvedBaseUrl.replace(/\/$/, '')}/uploads/${imagePath}`;
            }
        },
        template: `
            <div class="custom-colors-page">
                <div class="category-switch-group" role="tablist" aria-label="颜色分类筛选">
                    <button
                        type="button"
                        class="category-switch"
                        :class="{active: activeCategory==='all'}"
                        @click="$emit('update:activeCategory', 'all')"
                        role="tab"
                        :aria-selected="activeCategory==='all'"
                    >全部</button>
                    <button
                        v-for="cat in orderedCategories"
                        :key="cat.id || 'other'"
                        type="button"
                        class="category-switch"
                        :class="{active: activeCategory===String(cat.id || 'other')}"
                        @click="$emit('update:activeCategory', String(cat.id || 'other'))"
                        role="tab"
                        :aria-selected="activeCategory===String(cat.id || 'other')"
                    >{{ cat.name }}</button>
                    <button
                        type="button"
                        class="category-settings-btn"
                        @click="$emit('open-category-manager')"
                        title="管理分类"
                    >
                        <el-icon><Setting /></el-icon>
                    </button>
                </div>

                <div v-if="loading" class="loading"><el-icon class="is-loading"><Loading /></el-icon> 加载中...</div>
                <div v-else>
                    <div v-if="filteredCount === 0" class="empty-message">暂无自配色，点击右上角"新自配色"添加</div>

                    <div v-else class="color-cards-grid">
                        <div
                            v-for="color in paginatedColors"
                            :key="color.id + '-' + refreshKey"
                            class="artwork-bar"
                            :ref="colorItemRef(color)"
                            :data-color-id="color.id"
                            :class="{ 'highlight-pulse': highlightCode === color.color_code, 'selected': selectedColorId === color.id }"
                            @click="handleToggleSelection(color, $event)"
                        >
                            <div class="artwork-header" style="display:flex; padding:8px; align-items:center; justify-content:space-between;">
                                <div style="display:flex; align-items:center;">
                                    <div class="artwork-title" style="width:88px; flex-shrink:0;">
                                        {{ color.color_code }}
                                    </div>
                                    <div class="header-meta-group" style="margin-left:12px;">
                                        <span class="header-meta">分类: {{ categoryName(color) }}</span>
                                        <span class="header-meta" v-if="color.updated_at">更新: {{ $helpers.formatDate(color.updated_at) }}</span>
                                    </div>
                                </div>
                                <div class="color-actions">
                                    <el-button size="small" @click.stop="$calc && $calc.open(color.color_code, color.formula||'', $event.currentTarget)"><el-icon><ScaleToOriginal /></el-icon> 计算</el-button>
                                    <el-button size="small" type="primary" @click.stop="$emit('edit', color)"><el-icon><Edit /></el-icon> 修改</el-button>
                                    <el-button size="small" @click.stop="$emit('view-history', color)" disabled><el-icon><Clock /></el-icon> 历史</el-button>
                                    <template v-if="isColorReferenced(color)">
                                        <el-tooltip content="该自配色已被引用，无法删除" placement="top">
                                            <span>
                                                <el-button size="small" type="danger" disabled><el-icon><Delete /></el-icon> 删除</el-button>
                                            </span>
                                        </el-tooltip>
                                    </template>
                                    <el-button v-else size="small" type="danger" @click.stop="$emit('delete', color)"><el-icon><Delete /></el-icon> 删除</el-button>
                                </div>
                            </div>

                            <div style="display:flex; gap:12px; padding:8px; align-items:stretch;">
                                <div
                                    class="scheme-thumbnail"
                                    :class="{ 'no-image': !color.image_path }"
                                    @click="color.image_path && $thumbPreview && $thumbPreview.show($event, buildImageUrl(color.image_path))"
                                >
                                    <template v-if="!color.image_path">未上传图片</template>
                                    <img v-else :src="buildImageUrl(color.image_path)" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                                </div>

                                <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; position:relative;">
                                    <div class="meta-text" v-if="!color.formula">配方: (未指定配方)</div>
                                    <div class="meta-text" v-else>配方：
                                        <span class="usage-chips">
                                            <span v-for="(seg,i) in formulaUtils.segments(color.formula)" :key="'ccf'+color.id+'-'+i" class="mf-chip">{{ seg }}</span>
                                        </span>
                                    </div>

                                    <div class="meta-text color-info-row">
                                        <span class="color-value-group">
                                            <span v-if="color.rgb_r != null || color.rgb_g != null || color.rgb_b != null" class="color-swatch-inline" :style="{background: 'rgb(' + (color.rgb_r||0) + ', ' + (color.rgb_g||0) + ', ' + (color.rgb_b||0) + ')'}"></span>
                                            <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                            <span class="color-label-inline">RGB:</span>
                                            <span v-if="color.rgb_r != null || color.rgb_g != null || color.rgb_b != null">
                                                {{ color.rgb_r || 0 }}, {{ color.rgb_g || 0 }}, {{ color.rgb_b || 0 }}
                                            </span>
                                            <span v-else class="color-value-empty">未填写</span>
                                        </span>
                                        <span class="color-value-group">
                                            <span v-if="color.cmyk_c != null || color.cmyk_m != null || color.cmyk_y != null || color.cmyk_k != null" class="color-swatch-inline" :style="{background: getCmykColor(color.cmyk_c || 0, color.cmyk_m || 0, color.cmyk_y || 0, color.cmyk_k || 0)}"></span>
                                            <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                            <span class="color-label-inline">CMYK:</span>
                                            <span v-if="color.cmyk_c != null || color.cmyk_m != null || color.cmyk_y != null || color.cmyk_k != null">
                                                {{ color.cmyk_c || 0 }}, {{ color.cmyk_m || 0 }}, {{ color.cmyk_y || 0 }}, {{ color.cmyk_k || 0 }}
                                            </span>
                                            <span v-else class="color-value-empty">未填写</span>
                                        </span>
                                        <span class="color-value-group">
                                            <span v-if="color.hex_color" class="color-swatch-inline" :style="{background: color.hex_color}"></span>
                                            <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                            <span class="color-label-inline">HEX:</span>
                                            <span v-if="color.hex_color">
                                                {{ color.hex_color }}
                                            </span>
                                            <span v-else class="color-value-empty">未填写</span>
                                        </span>
                                    </div>

                                    <div class="meta-text color-info-row pantone-row">
                                        <span class="color-value-group pantone-c-group">
                                            <span v-if="color.pantone_coated" class="color-swatch-inline" :style="getPantoneSwatchStyle(color.pantone_coated)"></span>
                                            <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                            <span class="color-label-inline">Pantone C:</span>
                                            <span v-if="color.pantone_coated">{{ color.pantone_coated }}</span>
                                            <span v-else class="color-value-empty">未填写</span>
                                        </span>
                                        <span class="color-value-group pantone-u-group">
                                            <span v-if="color.pantone_uncoated" class="color-swatch-inline" :style="getPantoneSwatchStyle(color.pantone_uncoated)"></span>
                                            <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                            <span class="color-label-inline">Pantone U:</span>
                                            <span v-if="color.pantone_uncoated">{{ color.pantone_uncoated }}</span>
                                            <span v-else class="color-value-empty">未填写</span>
                                        </span>
                                        <span class="pantone-spacer"></span>
                                    </div>

                                    <div class="meta-text">适用层：
                                        <template v-if="usageGroups(color).length">
                                            <span class="usage-chips">
                                                <span
                                                    v-for="g in usageGroups(color)"
                                                    :key="'ug'+color.id+g.display"
                                                    class="mf-chip usage-chip"
                                                    style="cursor:pointer;"
                                                    @click="$root && $root.focusArtworkScheme && $root.focusArtworkScheme(g)"
                                                >{{ g.display }}</span>
                                            </span>
                                        </template>
                                        <span v-else>(未使用)</span>
                                    </div>
                                </div>
                            </div>
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
                                @click="$emit('go-to-page', 1)"
                            >
                                <el-icon><DArrowLeft /></el-icon>
                                <span>首页</span>
                            </el-button>

                            <el-button
                                size="small"
                                :disabled="currentPage === 1"
                                @click="$emit('go-to-page', currentPage - 1)"
                            >
                                <el-icon><ArrowLeft /></el-icon>
                                <span>上一页</span>
                            </el-button>

                            <span class="page-numbers">
                                <button
                                    v-for="page in visiblePages"
                                    :key="page + '-' + currentPage"
                                    :class="{ active: page === currentPage, ellipsis: page === '...' }"
                                    :disabled="page === '...'"
                                    @click="$emit('go-to-page', page)"
                                >
                                    {{ page }}
                                </button>
                            </span>

                            <el-button
                                size="small"
                                :disabled="currentPage === totalPages"
                                @click="$emit('go-to-page', currentPage + 1)"
                            >
                                <span>下一页</span>
                                <el-icon><ArrowRight /></el-icon>
                            </el-button>

                            <el-button
                                size="small"
                                :disabled="currentPage === totalPages"
                                @click="$emit('go-to-page', totalPages)"
                            >
                                <span>末页</span>
                                <el-icon><DArrowRight /></el-icon>
                            </el-button>
                        </div>

                        <div class="items-per-page">
                            <span>每页显示：</span>
                            <el-select
                                size="small"
                                :model-value="itemsPerPage"
                                @change="handleItemsPerPageChange"
                            >
                                <el-option v-if="isDevelopmentMode" :value="2" label="2 项" />
                                <el-option :value="12" label="12 项" />
                                <el-option :value="24" label="24 项" />
                                <el-option :value="48" label="48 项" />
                                <el-option :value="0" label="全部" />
                            </el-select>
                        </div>
                    </div>
                </div>
            </div>
        `
    };

    window.CustomColorListView = CustomColorListView;
})(window);
