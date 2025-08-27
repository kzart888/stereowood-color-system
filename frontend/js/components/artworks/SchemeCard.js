// 配色方案卡片组件
// frontend/js/components/artworks/SchemeCard.js

export const SchemeCard = {
    props: {
        artwork: { type: Object, required: true },
        scheme: { type: Object, required: true },
        viewMode: { type: String, default: 'byLayer' },
        colors: { type: Array, default: () => [] },
        baseURL: { type: String, required: true },
        highlightSchemeId: { type: Number, default: null },
        highlightLayers: { type: Array, default: () => [] },
        highlightColorCode: { type: String, default: '' }
    },
    emits: ['edit', 'delete', 'show-history'],
    inject: ['$helpers', '$calc', '$thumbPreview'],
    computed: {
        displayName() {
            return this.$helpers.formatSchemeName(this.artwork, this.scheme);
        },
        thumbnailUrl() {
            if (!this.scheme.thumbnail_path) return '';
            return this.$helpers.buildUploadURL(this.baseURL, this.scheme.thumbnail_path);
        },
        layerCount() {
            return this.scheme.layers ? this.scheme.layers.length : 0;
        },
        isHighlighted() {
            return this.artwork._swFocusSingle || false;
        },
        normalizedMappings() {
            return this.$helpers.normalizeMappings(this.scheme);
        }
    },
    methods: {
        handleThumbnailClick() {
            if (this.scheme.thumbnail_path && this.$thumbPreview) {
                this.$thumbPreview.show(event, this.thumbnailUrl);
            }
        },
        handleEdit() {
            this.$emit('edit', this.scheme);
        },
        handleDelete() {
            this.$emit('delete', this.scheme);
        },
        handleShowHistory() {
            this.$emit('show-history', this.scheme);
        },
        colorByCode(colorCode) {
            if (!colorCode) return null;
            return this.colors.find(c => c.color_code === colorCode);
        },
        structuredFormula(formula) {
            return this.$helpers.structureFormula(formula);
        },
        dupCountFor(layerNumber) {
            return this.$helpers.calculateDuplicateCount(this.scheme, layerNumber);
        },
        dupBadgeColor(layerNumber) {
            return this.$helpers.getDuplicateBadgeColor(layerNumber);
        },
        isLayerHighlighted(mapping) {
            return this.highlightSchemeId === this.scheme.id && 
                   this.highlightLayers.includes(mapping.layer) && 
                   (!this.highlightColorCode || mapping.colorCode === this.highlightColorCode);
        },
        handleCalcClick(colorCode, formula, event) {
            if (this.$calc) {
                this.$calc.open(colorCode, formula || '', event.currentTarget);
            }
        }
    },
    template: `
        <div class="scheme-bar" :class="{ 'highlight-pulse': isHighlighted }">
            <div class="scheme-header">
                <div class="scheme-thumbnail" 
                     :class="{ 'no-image': !scheme.thumbnail_path }"
                     @click="handleThumbnailClick">
                    <template v-if="!scheme.thumbnail_path">未上传图片</template>
                    <img v-else :src="thumbnailUrl" 
                         style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                </div>
                
                <div style="flex: 1;">
                    <div class="scheme-name">{{ displayName }}</div>
                    <div class="meta-text">层数：{{ layerCount }}</div>
                    <div class="meta-text" v-if="scheme.updated_at">
                        更新：{{ $helpers.formatDate(scheme.updated_at) }}
                    </div>
                </div>
                
                <div class="color-actions">
                    <el-button size="small" type="primary" @click="handleEdit">
                        <el-icon><Edit /></el-icon> 修改
                    </el-button>
                    <el-button size="small" @click="handleShowHistory" disabled>
                        <el-icon><Clock /></el-icon> 历史
                    </el-button>
                    <el-button size="small" type="danger" @click="handleDelete">
                        <el-icon><Delete /></el-icon> 删除
                    </el-button>
                </div>
            </div>
            
            <!-- 矩阵视图 -->
            <layer-matrix-view
                v-if="viewMode === 'byLayer'"
                :scheme="scheme"
                :mappings="normalizedMappings"
                :colors="colors"
                :highlight-scheme-id="highlightSchemeId"
                :highlight-layers="highlightLayers"
                :highlight-color-code="highlightColorCode"
                @calc-click="handleCalcClick" />
            
            <!-- 颜色优先视图 -->
            <color-priority-view
                v-else
                :scheme="scheme"
                :mappings="normalizedMappings"
                :colors="colors"
                :highlight-scheme-id="highlightSchemeId"
                :highlight-layers="highlightLayers"
                :highlight-color-code="highlightColorCode"
                @calc-click="handleCalcClick" />
        </div>
    `
};

export default SchemeCard;