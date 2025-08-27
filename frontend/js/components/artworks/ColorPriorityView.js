// 颜色优先视图组件 - 按颜色分组显示层号
// frontend/js/components/artworks/ColorPriorityView.js

export const ColorPriorityView = {
    props: {
        scheme: { type: Object, required: true },
        mappings: { type: Array, required: true },
        colors: { type: Array, default: () => [] },
        highlightSchemeId: { type: Number, default: null },
        highlightLayers: { type: Array, default: () => [] },
        highlightColorCode: { type: String, default: '' }
    },
    emits: ['calc-click'],
    inject: ['$helpers'],
    computed: {
        colorGroups() {
            const groups = new Map();
            
            this.mappings.forEach(mapping => {
                if (mapping.colorCode) {
                    if (!groups.has(mapping.colorCode)) {
                        groups.set(mapping.colorCode, {
                            colorCode: mapping.colorCode,
                            layers: [],
                            color: this.colorByCode(mapping.colorCode)
                        });
                    }
                    groups.get(mapping.colorCode).layers.push(mapping.layer);
                }
            });
            
            // 转换为数组并排序
            return Array.from(groups.values()).sort((a, b) => 
                a.colorCode.localeCompare(b.colorCode)
            );
        }
    },
    methods: {
        colorByCode(colorCode) {
            if (!colorCode) return null;
            return this.colors.find(c => c.color_code === colorCode);
        },
        compactLayers(layers) {
            return this.$helpers.compactLayers(layers);
        },
        structuredFormula(formula) {
            return this.$helpers.structureFormula(formula);
        },
        isHighlighted(colorCode, layer) {
            return this.highlightSchemeId === this.scheme.id && 
                   this.highlightLayers.includes(layer) && 
                   this.highlightColorCode === colorCode;
        },
        handleCalcClick(colorCode, formula, event) {
            this.$emit('calc-click', colorCode, formula, event);
        }
    },
    template: `
        <div class="color-priority-view">
            <div v-if="colorGroups.length === 0" class="empty-message">
                暂无配色映射
            </div>
            
            <div v-for="group in colorGroups" 
                 :key="group.colorCode" 
                 class="color-group-item">
                
                <div class="color-group-header">
                    <strong class="color-code">{{ group.colorCode }}</strong>
                    <div class="applicable-layers">
                        <span class="layer-label">适用层：</span>
                        <span class="layer-chip" 
                              v-for="layer in group.layers" 
                              :key="layer"
                              :class="{ 'highlight-pulse': isHighlighted(group.colorCode, layer) }">
                            {{ layer }}
                        </span>
                    </div>
                    <template v-if="group.color && group.color.formula">
                        <button class="calc-mini-btn" 
                                @click.stop="handleCalcClick(group.colorCode, group.color.formula, $event)" 
                                title="快速计算">算</button>
                    </template>
                </div>
                
                <div class="color-group-formula">
                    <template v-if="!group.color">
                        <span style="color:#999;">（颜色不存在）</span>
                    </template>
                    <template v-else-if="group.color.formula">
                        <div class="formula-lines" 
                             :style="{ '--max-name-ch': structuredFormula(group.color.formula).maxNameChars }">
                            <div class="fl" 
                                 v-for="(p,i) in structuredFormula(group.color.formula).lines" 
                                 :key="'cpfl'+i">
                                <span class="fl-name">{{ p.name }}</span>
                                <span class="fl-amount">{{ p.amount }}</span>
                            </div>
                        </div>
                    </template>
                    <template v-else>
                        <span>（未指定配方）</span>
                    </template>
                </div>
            </div>
        </div>
    `
};

export default ColorPriorityView;