(function(window) {
    'use strict';

    const CustomColorListView = {
        name: 'CustomColorListView',
        components: {
            'category-switch-group': window.CategorySwitchGroup,
            'paginated-card-grid': window.PaginatedCardGrid
        },
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
            getPantoneSwatchStyleFn: { type: Function, default: null },
            itemsPerPageOptions: { type: Array, default: () => [] }
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
                const colorId = color && typeof color === 'object' ? color.id : color;
                this.$emit('toggle-selection', colorId, event);
            },
            handleItemsPerPageChange(value) {
                this.$emit('update:itemsPerPage', value);
            },
            gridCardClass(color) {
                if (!color) return null;
                return {
                    'highlight-pulse': this.highlightCode === color.color_code,
                    selected: this.selectedColorId === color.id
                };
            },
            gridCardProps(color) {
                if (!color) return {};
                const props = {
                    'data-color-id': color.id,
                    'data-color-code': color.color_code
                };

                const refFn = this.colorItemRef(color);
                if (refFn) {
                    props.ref = refFn;
                }

                return props;
            },
            cardKeyFn(color, index) {
                if (color && typeof color === 'object' && 'id' in color) {
                    return `${color.id}-${this.refreshKey}-${index}`;
                }
                return index;
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
                <paginated-card-grid
                    :loading="loading"
                    :items="paginatedColors"
                    :filtered-count="filteredCount"
                    :start-item="startItem"
                    :end-item="endItem"
                    :visible-pages="visiblePages"
                    :current-page="currentPage"
                    :total-pages="totalPages"
                    :items-per-page="itemsPerPage"
                    :items-per-page-options="itemsPerPageOptions"
                    empty-message='暂无自配色，点击右上角"新自配色"添加'
                    :card-class-fn="gridCardClass"
                    :card-props-fn="gridCardProps"
                    :item-key-fn="cardKeyFn"
                    @go-to-page="$emit('go-to-page', $event)"
                    @update:itemsPerPage="handleItemsPerPageChange"
                    @card-click="handleToggleSelection"
                >
                    <template #category-switch>
                        <category-switch-group
                            :active-category="activeCategory"
                            :categories="orderedCategories"
                            aria-label="颜色分类筛选"
                            show-settings-button
                            settings-title="管理分类"
                            @update:activeCategory="$emit('update:activeCategory', $event)"
                            @open-settings="$emit('open-category-manager')"
                        >
                            <template #category="{ category }">
                                {{ category.name }}
                            </template>
                        </category-switch-group>
                    </template>

                    <template #empty>
                        <div class="empty-message">暂无自配色，点击右上角"新自配色"添加</div>
                    </template>

                    <template #default="{ item }">
                        <div class="artwork-header" style="display:flex; padding:8px; align-items:center; justify-content:space-between;">
                            <div style="display:flex; align-items:center;">
                                <div class="artwork-title" style="width:88px; flex-shrink:0;">
                                    {{ item.color_code }}
                                </div>
                                <div class="header-meta-group" style="margin-left:12px;">
                                    <span class="header-meta">分类: {{ categoryName(item) }}</span>
                                    <span class="header-meta" v-if="item.updated_at">更新: {{ $helpers.formatDate(item.updated_at) }}</span>
                                </div>
                            </div>
                            <div class="color-actions">
                                <el-button size="small" @click.stop="$calc && $calc.open(item.color_code, item.formula||'', $event.currentTarget)"><el-icon><ScaleToOriginal /></el-icon> 计算</el-button>
                                <el-button size="small" type="primary" @click.stop="$emit('edit', item)"><el-icon><Edit /></el-icon> 修改</el-button>
                                <el-button size="small" @click.stop="$emit('view-history', item)" disabled><el-icon><Clock /></el-icon> 历史</el-button>
                                <template v-if="isColorReferenced(item)">
                                    <el-tooltip content="该自配色已被引用，无法删除" placement="top">
                                        <span>
                                            <el-button size="small" type="danger" disabled><el-icon><Delete /></el-icon> 删除</el-button>
                                        </span>
                                    </el-tooltip>
                                </template>
                                <el-button v-else size="small" type="danger" @click.stop="$emit('delete', item)"><el-icon><Delete /></el-icon> 删除</el-button>
                            </div>
                        </div>

                        <div style="display:flex; gap:12px; padding:8px; align-items:stretch;">
                            <div
                                class="scheme-thumbnail"
                                :class="{ 'no-image': !item.image_path }"
                                @click="item.image_path && $thumbPreview && $thumbPreview.show($event, buildImageUrl(item.image_path))"
                            >
                                <template v-if="!item.image_path">未上传图片</template>
                                <img v-else :src="buildImageUrl(item.image_path)" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                            </div>

                            <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; position:relative;">
                                <div class="meta-text" v-if="!item.formula">配方: (未指定配方)</div>
                                <div class="meta-text" v-else>配方：
                                    <span class="usage-chips">
                                        <span v-for="(seg,i) in formulaUtils.segments(item.formula)" :key="'ccf'+item.id+'-'+i" class="mf-chip">{{ seg }}</span>
                                    </span>
                                </div>

                                <div class="meta-text color-info-row">
                                    <span class="color-value-group">
                                        <span v-if="item.rgb_r != null || item.rgb_g != null || item.rgb_b != null" class="color-swatch-inline" :style="{background: 'rgb(' + (item.rgb_r||0) + ', ' + (item.rgb_g||0) + ', ' + (item.rgb_b||0) + ')'}"></span>
                                        <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                        <span class="color-label-inline">RGB:</span>
                                        <span v-if="item.rgb_r != null || item.rgb_g != null || item.rgb_b != null">
                                            {{ item.rgb_r || 0 }}, {{ item.rgb_g || 0 }}, {{ item.rgb_b || 0 }}
                                        </span>
                                        <span v-else class="color-value-empty">未填写</span>
                                    </span>
                                    <span class="color-value-group">
                                        <span v-if="item.cmyk_c != null || item.cmyk_m != null || item.cmyk_y != null || item.cmyk_k != null" class="color-swatch-inline" :style="{background: getCmykColor(item.cmyk_c || 0, item.cmyk_m || 0, item.cmyk_y || 0, item.cmyk_k || 0)}"></span>
                                        <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                        <span class="color-label-inline">CMYK:</span>
                                        <span v-if="item.cmyk_c != null || item.cmyk_m != null || item.cmyk_y != null || item.cmyk_k != null">
                                            {{ item.cmyk_c || 0 }}, {{ item.cmyk_m || 0 }}, {{ item.cmyk_y || 0 }}, {{ item.cmyk_k || 0 }}
                                        </span>
                                        <span v-else class="color-value-empty">未填写</span>
                                    </span>
                                    <span class="color-value-group">
                                        <span v-if="item.hex_color" class="color-swatch-inline" :style="{background: item.hex_color}"></span>
                                        <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                        <span class="color-label-inline">HEX:</span>
                                        <span v-if="item.hex_color">
                                            {{ item.hex_color }}
                                        </span>
                                        <span v-else class="color-value-empty">未填写</span>
                                    </span>
                                </div>

                                <div class="meta-text color-info-row pantone-row">
                                    <span class="color-value-group pantone-c-group">
                                        <span v-if="item.pantone_coated" class="color-swatch-inline" :style="getPantoneSwatchStyle(item.pantone_coated)"></span>
                                        <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                        <span class="color-label-inline">Pantone C:</span>
                                        <span v-if="item.pantone_coated">{{ item.pantone_coated }}</span>
                                        <span v-else class="color-value-empty">未填写</span>
                                    </span>
                                    <span class="color-value-group pantone-u-group">
                                        <span v-if="item.pantone_uncoated" class="color-swatch-inline" :style="getPantoneSwatchStyle(item.pantone_uncoated)"></span>
                                        <span v-else class="color-swatch-inline" style="background: #f5f5f5; border: 1px dashed #ccc;"></span>
                                        <span class="color-label-inline">Pantone U:</span>
                                        <span v-if="item.pantone_uncoated">{{ item.pantone_uncoated }}</span>
                                        <span v-else class="color-value-empty">未填写</span>
                                    </span>
                                </div>

                                <div class="meta-text color-info-row">
                                    <span class="color-label-inline">使用情况：</span>
                                    <template v-if="usageGroups(item).length">
                                        <span class="usage-chips">
                                            <a
                                                v-for="group in usageGroups(item)"
                                                :key="group.display"
                                                class="mf-chip usage-chip"
                                                :href="group.artworkId ? ($helpers.buildArtworkURL ? $helpers.buildArtworkURL(group.artworkId, group.schemeId) : '#') : '#""
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                {{ group.display }}
                                            </a>
                                        </span>
                                    </template>
                                    <template v-else>
                                        <span class="color-value-empty">未被引用</span>
                                    </template>
                                </div>
                            </div>
                        </div>
                    </template>
                </paginated-card-grid>
            </div>

        `
    };

    window.CustomColorListView = CustomColorListView;
})(window);
