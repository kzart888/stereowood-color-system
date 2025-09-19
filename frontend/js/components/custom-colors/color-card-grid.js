const ColorCardGrid = {
    name: 'ColorCardGrid',
    inject: ['customColorsStore'],
    emits: ['edit-color', 'delete-color', 'view-history'],
    template: `
        <div>
            <div v-if="filteredColors.length === 0" class="empty-message">暂无自配色，点击右上角"新自配色"添加</div>

            <div v-else>
                <div class="color-cards-grid">
                    <div
                        v-for="color in paginatedColors"
                        :key="color.id + '-' + refreshKey"
                        class="artwork-bar"
                        :ref="setColorItemRef(color)"
                        :data-color-id="color.id"
                        :class="{ 'highlight-pulse': highlightCode === color.color_code, 'selected': selectedColorId === color.id }"
                        @click="toggleColorSelection(color.id, $event)"
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
                                <el-button size="small" type="primary" @click.stop="onEdit(color)"><el-icon><Edit /></el-icon> 修改</el-button>
                                <el-button size="small" @click.stop="onViewHistory(color)" disabled><el-icon><Clock /></el-icon> 历史</el-button>
                                <template v-if="isColorReferenced(color)">
                                    <el-tooltip content="该自配色已被引用，无法删除" placement="top">
                                        <span>
                                            <el-button size="small" type="danger" disabled><el-icon><Delete /></el-icon> 删除</el-button>
                                        </span>
                                    </el-tooltip>
                                </template>
                                <el-button v-else size="small" type="danger" @click.stop="onDelete(color)"><el-icon><Delete /></el-icon> 删除</el-button>
                            </div>
                        </div>

                        <div style="display:flex; gap:12px; padding:8px; align-items:stretch;">
                            <div class="scheme-thumbnail" :class="{ 'no-image': !color.image_path }" @click.stop="color.image_path && $thumbPreview && $thumbPreview.show($event, $helpers.buildUploadURL(baseURL, color.image_path))">
                                <template v-if="!color.image_path">未上传图片</template>
                                <img v-else :src="$helpers.buildUploadURL(baseURL, color.image_path)" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                            </div>

                            <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; position:relative;">
                                <div class="meta-text" v-if="!color.formula">配方: (未指定配方)</div>
                                <div class="meta-text" v-else>配方：
                                    <span class="usage-chips">
                                        <span v-for="(seg,i) in formulaSegments(color.formula)" :key="'ccf'+color.id+'-'+i" class="mf-chip">{{ seg }}</span>
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
                                        <span v-if="color.cmyk_c != null || color.cmyk_m != null || color.cmyk_y != null || color.cmyk_k != null" class="color-swatch-inline" :style="{background: getCMYKColor(color.cmyk_c || 0, color.cmyk_m || 0, color.cmyk_y || 0, color.cmyk_k || 0)}"></span>
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
                                                @click.stop="$root && $root.focusArtworkScheme && $root.focusArtworkScheme(g)"
                                            >{{ g.display }}</span>
                                        </span>
                                    </template>
                                    <span v-else>(未使用)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="filteredColors.length > 0" class="pagination-container">
                    <div class="pagination-info">
                        显示 {{ startItem }}-{{ endItem }} 共 {{ filteredColors.length }} 项
                    </div>

                    <div class="pagination-controls">
                        <el-button
                            size="small"
                            :disabled="currentPage === 1"
                            @click="goToPage(1)">
                            <el-icon><DArrowLeft /></el-icon>
                            <span>首页</span>
                        </el-button>

                        <el-button
                            size="small"
                            :disabled="currentPage === 1"
                            @click="goToPage(currentPage - 1)">
                            <el-icon><ArrowLeft /></el-icon>
                            <span>上一页</span>
                        </el-button>

                        <span class="page-numbers">
                            <button
                                v-for="page in visiblePages"
                                :key="page"
                                :class="{ active: page === currentPage, ellipsis: page === '...' }"
                                :disabled="page === '...'"
                                @click="goToPage(page)">
                                {{ page }}
                            </button>
                        </span>

                        <el-button
                            size="small"
                            :disabled="currentPage === totalPages"
                            @click="goToPage(currentPage + 1)">
                            <span>下一页</span>
                            <el-icon><ArrowRight /></el-icon>
                        </el-button>

                        <el-button
                            size="small"
                            :disabled="currentPage === totalPages"
                            @click="goToPage(totalPages)">
                            <span>末页</span>
                            <el-icon><DArrowRight /></el-icon>
                        </el-button>
                    </div>

                    <div class="items-per-page">
                        <span>每页显示：</span>
                        <el-select v-model="pagination.itemsPerPage" @change="onItemsPerPageChange" size="small">
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
    `,
    computed: {
        store() {
            return this.customColorsStore;
        },
        filteredColors() {
            return this.store.filteredColors.value;
        },
        paginatedColors() {
            return this.store.paginatedColors.value;
        },
        currentPage() {
            return this.store.pagination.currentPage;
        },
        totalPages() {
            return this.store.totalPages.value;
        },
        visiblePages() {
            return this.store.visiblePages.value;
        },
        startItem() {
            return this.store.startItem.value;
        },
        endItem() {
            return this.store.endItem.value;
        },
        pagination() {
            return this.store.pagination;
        },
        baseURL() {
            return this.store.baseURL.value;
        },
        formulaUtils() {
            return this.store.formulaUtils.value;
        },
        refreshKey() {
            return this.store.refreshKey.value;
        },
        highlightCode() {
            return this.store.highlightCode.value;
        },
        selectedColorId() {
            return this.store.selectedColorId.value;
        },
        isDevelopmentMode() {
            return !!this.store.isDevelopmentMode.value;
        }
    },
    methods: {
        goToPage(page) {
            this.store.goToPage(page);
        },
        onItemsPerPageChange(value) {
            this.store.setItemsPerPage(value);
        },
        toggleColorSelection(colorId, event) {
            this.store.toggleColorSelection(colorId, event);
        },
        setColorItemRef(color) {
            return this.store.setColorItemRef(color);
        },
        usageGroups(color) {
            return this.store.usageGroups(color);
        },
        categoryName(color) {
            return this.store.categoryName(color);
        },
        getCMYKColor(c, m, y, k) {
            return this.store.getCMYKColor(c, m, y, k);
        },
        getPantoneSwatchStyle(code) {
            return this.store.getPantoneSwatchStyle(code);
        },
        isColorReferenced(color) {
            return this.store.isColorReferenced(color);
        },
        formulaSegments(formula) {
            return this.formulaUtils.segments(formula);
        },
        onEdit(color) {
            this.$emit('edit-color', color);
        },
        onDelete(color) {
            this.$emit('delete-color', color);
        },
        onViewHistory(color) {
            this.$emit('view-history', color);
        }
    }
};

window.ColorCardGrid = ColorCardGrid;
