// 作品卡片组件 - 显示单个作品及其配色方案
// frontend/js/components/artworks/ArtworkCard.js

export const ArtworkCard = {
    props: {
        artwork: { type: Object, required: true },
        viewMode: { type: String, default: 'byLayer' },
        colors: { type: Array, default: () => [] },
        baseURL: { type: String, required: true },
        highlightSchemeId: { type: Number, default: null },
        highlightLayers: { type: Array, default: () => [] },
        highlightColorCode: { type: String, default: '' }
    },
    emits: ['add-scheme', 'edit-scheme', 'delete-scheme', 'delete-artwork', 'show-history'],
    inject: ['$helpers', '$calc', '$thumbPreview'],
    computed: {
        hasSchemes() {
            return this.artwork.schemes && this.artwork.schemes.length > 0;
        },
        canDeleteArtwork() {
            return !this.hasSchemes;
        },
        formattedTitle() {
            return this.$helpers.formatArtworkTitle(this.artwork);
        }
    },
    methods: {
        handleAddScheme() {
            this.$emit('add-scheme', this.artwork);
        },
        handleDeleteArtwork() {
            this.$emit('delete-artwork', this.artwork);
        },
        handleEditScheme(scheme) {
            this.$emit('edit-scheme', this.artwork, scheme);
        },
        handleDeleteScheme(scheme) {
            this.$emit('delete-scheme', this.artwork, scheme);
        },
        handleShowHistory(scheme) {
            this.$emit('show-history', this.artwork, scheme);
        },
        displaySchemeName(scheme) {
            return this.$helpers.formatSchemeName(this.artwork, scheme);
        },
        setSchemeRef(scheme) {
            return (el) => {
                if (el && scheme._scrollIntoView) {
                    // 直接跳转，无动画
                    el.scrollIntoView({ behavior: 'instant', block: 'center' });
                    scheme._scrollIntoView = false;
                }
            };
        }
    },
    template: `
        <div class="artwork-bar" 
             :data-art-id="artwork.id" 
             :data-focus-single="artwork._swFocusSingle ? 'true' : null">
            
            <div class="artwork-header">
                <div class="artwork-title">{{ formattedTitle }}</div>
                <div class="color-actions">
                    <el-button size="small" @click="handleAddScheme">
                        <el-icon><Plus /></el-icon> 新增配色方案
                    </el-button>
                    
                    <template v-if="hasSchemes">
                        <el-tooltip content="该作品下仍有配色方案，无法删除作品" placement="top">
                            <span>
                                <el-button size="small" type="danger" disabled>
                                    <el-icon><Delete /></el-icon> 删除
                                </el-button>
                            </span>
                        </el-tooltip>
                    </template>
                    <el-button v-else size="small" type="danger" @click="handleDeleteArtwork">
                        <el-icon><Delete /></el-icon> 删除
                    </el-button>
                </div>
            </div>
            
            <div v-if="hasSchemes">
                <scheme-card
                    v-for="scheme in artwork.schemes"
                    :key="scheme.id"
                    :ref="setSchemeRef(scheme)"
                    :artwork="artwork"
                    :scheme="scheme"
                    :view-mode="viewMode"
                    :colors="colors"
                    :base-url="baseURL"
                    :highlight-scheme-id="highlightSchemeId"
                    :highlight-layers="highlightLayers"
                    :highlight-color-code="highlightColorCode"
                    @edit="handleEditScheme"
                    @delete="handleDeleteScheme"
                    @show-history="handleShowHistory" />
            </div>
        </div>
    `
};

export default ArtworkCard;