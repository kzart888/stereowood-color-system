// 颜色卡片组件 - 显示单个自配色的信息
// frontend/js/components/custom-colors/ColorCard.js

export const ColorCard = {
    props: {
        color: { type: Object, required: true },
        baseURL: { type: String, required: true },
        categoryName: { type: String, default: '' },
        usageGroups: { type: Array, default: () => [] },
        highlightCode: { type: String, default: '' },
        isReferenced: { type: Boolean, default: false }
    },
    emits: ['edit', 'delete', 'calculate', 'view-history', 'focus-scheme'],
    computed: {
        formulaSegments() {
            if (!this.color.formula) return [];
            
            // 支持多种分隔符
            const separators = ['+', '＋', ',', '，', ';', '；'];
            let segments = [this.color.formula];
            
            for (const sep of separators) {
                const newSegments = [];
                for (const seg of segments) {
                    newSegments.push(...seg.split(sep));
                }
                segments = newSegments;
            }
            
            return segments
                .map(s => s.trim())
                .filter(s => s.length > 0);
        },
        imageUrl() {
            if (!this.color.image_path) return '';
            return this.$helpers.buildUploadURL(this.baseURL, this.color.image_path);
        }
    },
    methods: {
        handleThumbnailClick() {
            if (this.color.image_path && this.$thumbPreview) {
                this.$thumbPreview.show(
                    event,
                    this.imageUrl
                );
            }
        },
        handleCalculate(event) {
            if (this.$calc) {
                this.$calc.open(
                    this.color.color_code,
                    this.color.formula || '',
                    event.currentTarget
                );
            }
        },
        handleUsageChipClick(group) {
            if (this.$root && this.$root.focusArtworkScheme) {
                this.$root.focusArtworkScheme(group);
            }
            this.$emit('focus-scheme', group);
        }
    },
    template: `
        <div class="artwork-bar" 
             :class="{'highlight-pulse': highlightCode === color.color_code}">
            <div class="artwork-header">
                <div class="artwork-title">{{ color.color_code }}</div>
                <div class="color-actions">
                    <el-button size="small" @click="handleCalculate">
                        <el-icon><ScaleToOriginal /></el-icon> 计算
                    </el-button>
                    <el-button size="small" type="primary" @click="$emit('edit', color)">
                        <el-icon><Edit /></el-icon> 修改
                    </el-button>
                    <el-button size="small" @click="$emit('view-history', color)" disabled>
                        <el-icon><Clock /></el-icon> 历史
                    </el-button>
                    <template v-if="isReferenced">
                        <el-tooltip content="该自配色已被引用，无法删除" placement="top">
                            <span>
                                <el-button size="small" type="danger" disabled>
                                    <el-icon><Delete /></el-icon> 删除
                                </el-button>
                            </span>
                        </el-tooltip>
                    </template>
                    <el-button v-else size="small" type="danger" @click="$emit('delete', color)">
                        <el-icon><Delete /></el-icon> 删除
                    </el-button>
                </div>
            </div>
            
            <div style="display:flex; gap:12px; padding:6px 4px 4px;">
                <div class="scheme-thumbnail" 
                     :class="{ 'no-image': !color.image_path }"
                     @click="handleThumbnailClick">
                    <template v-if="!color.image_path">未上传图片</template>
                    <img v-else 
                         :src="imageUrl" 
                         style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                </div>
                
                <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;">
                    <div class="meta-text" v-if="!color.formula">（未指定配方）</div>
                    <div class="meta-text" v-else>
                        <div class="mapping-formula-chips">
                            <el-tooltip v-for="(seg,i) in formulaSegments" 
                                       :key="'ccf'+color.id+'-'+i" 
                                       :content="seg" 
                                       placement="top">
                                <span class="mf-chip">{{ seg }}</span>
                            </el-tooltip>
                        </div>
                    </div>
                    <div class="meta-text">分类：{{ categoryName }}</div>
                    <div class="meta-text" v-if="color.updated_at">
                        更新：{{ $helpers.formatDate(color.updated_at) }}
                    </div>
                    <div class="meta-text">适用层：
                        <template v-if="usageGroups.length">
                            <span class="usage-chips">
                                <span v-for="g in usageGroups" 
                                      :key="'ug'+color.id+g.display" 
                                      class="mf-chip usage-chip" 
                                      style="cursor:pointer;"
                                      @click="handleUsageChipClick(g)">
                                    {{ g.display }}
                                </span>
                            </span>
                        </template>
                        <span v-else>（未使用）</span>
                    </div>
                </div>
            </div>
        </div>
    `
};

export default ColorCard;