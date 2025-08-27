// 作品配色管理主组件 - 整合所有子组件
// frontend/js/components/artworks/index.js

import { ArtworkCard } from './ArtworkCard.js';
import { SchemeCard } from './SchemeCard.js';
import { SchemeDialog } from './SchemeDialog.js';
import { LayerMatrixView } from './LayerMatrixView.js';
import { ColorPriorityView } from './ColorPriorityView.js';
import { ArtworkService } from '../../services/ArtworkService.js';

export const ArtworksComponent = {
    components: {
        ArtworkCard,
        SchemeCard,
        SchemeDialog,
        LayerMatrixView,
        ColorPriorityView
    },
    props: {
        sortMode: { type: String, default: 'time' } // time | name
    },
    emits: ['view-mode-changed'],
    inject: ['$api', '$helpers', '$calc', '$thumbPreview'],
    data() {
        return {
            artworks: [],
            colors: [],
            loading: false,
            viewMode: 'byLayer', // byLayer | byColor
            showSchemeDialog: false,
            editingArtwork: null,
            editingScheme: null,
            highlightSchemeId: null,
            highlightLayers: [],
            highlightColorCode: '',
            baseURL: window.BASE_URL || '',
            artworkService: null
        };
    },
    computed: {
        sortedArtworks() {
            const sorted = [...this.artworks];
            
            if (this.sortMode === 'name') {
                sorted.sort((a, b) => {
                    const nameA = a.name || `作品#${a.id}`;
                    const nameB = b.name || `作品#${b.id}`;
                    return nameA.localeCompare(nameB);
                });
            } else {
                sorted.sort((a, b) => {
                    const dateA = new Date(a.updated_at || a.created_at);
                    const dateB = new Date(b.updated_at || b.created_at);
                    return dateB - dateA;
                });
            }
            
            return sorted;
        }
    },
    created() {
        this.artworkService = new ArtworkService(this.$api);
        this.loadData();
    },
    methods: {
        async loadData() {
            this.loading = true;
            try {
                const [artworks, colors] = await Promise.all([
                    this.artworkService.loadArtworks(),
                    this.loadColors()
                ]);
                
                this.artworks = artworks;
                this.colors = colors;
            } catch (error) {
                this.$message.error('加载数据失败: ' + error.message);
            } finally {
                this.loading = false;
            }
        },
        async loadColors() {
            try {
                const response = await this.$api.getCustomColors();
                return response.data || [];
            } catch (error) {
                console.error('加载颜色失败:', error);
                return [];
            }
        },
        async addArtwork() {
            try {
                const { value: name } = await this.$prompt(
                    '请输入作品名称',
                    '新建作品',
                    {
                        confirmButtonText: '确定',
                        cancelButtonText: '取消',
                        inputPlaceholder: '例如：客厅装饰画'
                    }
                );
                
                const artwork = await this.artworkService.createArtwork({ name });
                this.$message.success('作品创建成功');
                await this.loadData();
                
                // 自动打开新增配色方案对话框
                this.addScheme(artwork);
            } catch (error) {
                if (error !== 'cancel') {
                    this.$message.error('创建失败: ' + error.message);
                }
            }
        },
        async deleteArtwork(artwork) {
            try {
                await this.$confirm(
                    `确定要删除作品 "${this.artworkService.formatArtworkTitle(artwork)}" 吗？`,
                    '删除确认',
                    {
                        confirmButtonText: '确定',
                        cancelButtonText: '取消',
                        type: 'warning'
                    }
                );
                
                await this.artworkService.deleteArtwork(artwork.id);
                this.$message.success('删除成功');
                await this.loadData();
            } catch (error) {
                if (error !== 'cancel') {
                    this.$message.error('删除失败: ' + error.message);
                }
            }
        },
        addScheme(artwork) {
            this.editingArtwork = artwork;
            this.editingScheme = null;
            this.showSchemeDialog = true;
        },
        editScheme(artwork, scheme) {
            this.editingArtwork = artwork;
            this.editingScheme = scheme;
            this.showSchemeDialog = true;
        },
        async saveScheme(formData) {
            try {
                const data = new FormData();
                data.append('name', formData.name || '');
                
                // 处理层映射
                const layers = formData.layers
                    .filter(l => l.color_code)
                    .map(l => ({
                        layer_number: l.layer_number,
                        color_code: l.color_code
                    }));
                data.append('layers', JSON.stringify(layers));
                
                // 处理缩略图
                if (formData.thumbnail) {
                    data.append('thumbnail', formData.thumbnail);
                } else if (formData.removeThumbnail) {
                    data.append('remove_thumbnail', 'true');
                }
                
                if (this.editingScheme) {
                    await this.artworkService.updateScheme(
                        this.editingArtwork.id, 
                        this.editingScheme.id, 
                        data
                    );
                    this.$message.success('修改成功');
                } else {
                    await this.artworkService.createScheme(
                        this.editingArtwork.id, 
                        data
                    );
                    this.$message.success('添加成功');
                }
                
                this.showSchemeDialog = false;
                await this.loadData();
            } catch (error) {
                this.$message.error('保存失败: ' + error.message);
            }
        },
        async deleteScheme(artwork, scheme) {
            try {
                const schemeName = this.artworkService.formatSchemeName(artwork, scheme);
                await this.$confirm(
                    `确定要删除配色方案 "${schemeName}" 吗？`,
                    '删除确认',
                    {
                        confirmButtonText: '确定',
                        cancelButtonText: '取消',
                        type: 'warning'
                    }
                );
                
                await this.artworkService.deleteScheme(artwork.id, scheme.id);
                this.$message.success('删除成功');
                await this.loadData();
            } catch (error) {
                if (error !== 'cancel') {
                    this.$message.error('删除失败: ' + error.message);
                }
            }
        },
        showHistory(artwork, scheme) {
            // TODO: 实现历史记录功能
            this.$message.info('历史记录功能开发中');
        },
        toggleViewMode() {
            this.viewMode = this.viewMode === 'byLayer' ? 'byColor' : 'byLayer';
            this.$emit('view-mode-changed', this.viewMode);
        },
        focusScheme(schemeId, layers = [], colorCode = '') {
            this.highlightSchemeId = schemeId;
            this.highlightLayers = layers;
            this.highlightColorCode = colorCode;
            
            // 查找对应的方案并滚动到视图
            for (const artwork of this.artworks) {
                if (artwork.schemes) {
                    const scheme = artwork.schemes.find(s => s.id === schemeId);
                    if (scheme) {
                        artwork._swFocusSingle = true;
                        scheme._scrollIntoView = true;
                        
                        // 3秒后清除高亮
                        setTimeout(() => {
                            artwork._swFocusSingle = false;
                            this.highlightSchemeId = null;
                            this.highlightLayers = [];
                            this.highlightColorCode = '';
                        }, 3000);
                        break;
                    }
                }
            }
        }
    },
    template: `
        <div>
            <div v-if="loading" class="loading">
                <el-icon class="is-loading"><Loading /></el-icon> 加载中...
            </div>
            
            <div v-else>
                <div v-if="artworks.length === 0" class="empty-message">
                    暂无作品，点击右上角"新作品"添加
                </div>
                
                <artwork-card
                    v-for="artwork in sortedArtworks"
                    :key="artwork.id"
                    :artwork="artwork"
                    :view-mode="viewMode"
                    :colors="colors"
                    :base-url="baseURL"
                    :highlight-scheme-id="highlightSchemeId"
                    :highlight-layers="highlightLayers"
                    :highlight-color-code="highlightColorCode"
                    @add-scheme="addScheme"
                    @edit-scheme="editScheme"
                    @delete-scheme="deleteScheme"
                    @delete-artwork="deleteArtwork"
                    @show-history="showHistory" />
            </div>
            
            <scheme-dialog
                v-model="showSchemeDialog"
                :artwork="editingArtwork"
                :editing-scheme="editingScheme"
                :colors="colors"
                :base-url="baseURL"
                @save="saveScheme" />
        </div>
    `
};

// 保持向后兼容
window.ArtworksComponent = ArtworksComponent;

export default ArtworksComponent;