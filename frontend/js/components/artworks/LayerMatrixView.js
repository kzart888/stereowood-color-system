// 层矩阵视图组件 - 按层号显示配色
// frontend/js/components/artworks/LayerMatrixView.js

export const LayerMatrixView = {
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
    methods: {
        colorByCode(colorCode) {
            if (!colorCode) return null;
            return this.colors.find(c => c.color_code === colorCode);
        },
        dupCountFor(layerNumber) {
            return this.$helpers.calculateDuplicateCount(this.scheme, layerNumber);
        },
        dupBadgeColor(layerNumber) {
            return this.$helpers.getDuplicateBadgeColor(layerNumber);
        },
        isHighlighted(mapping) {
            return this.highlightSchemeId === this.scheme.id && 
                   this.highlightLayers.includes(mapping.layer) && 
                   (!this.highlightColorCode || mapping.colorCode === this.highlightColorCode);
        },
        structuredFormula(formula) {
            return this.$helpers.structureFormula(formula);
        },
        handleCalcClick(colorCode, formula, event) {
            this.$emit('calc-click', colorCode, formula, event);
        }
    },
    template: `
        <table class="layer-table">
            <thead>
                <tr>
                    <th v-for="m in mappings" 
                        :key="'h'+m.layer" 
                        :class="{'highlight-pulse': isHighlighted(m)}">
                        <span class="layer-cell">
                            <template v-if="dupCountFor(m.layer) > 1">
                                <el-tooltip 
                                    :content="'检测到第' + m.layer + '层被分配了' + dupCountFor(m.layer) + '次颜色'" 
                                    placement="top">
                                    <span class="dup-badge" 
                                          :style="{ backgroundColor: dupBadgeColor(m.layer) }">!</span>
                                </el-tooltip>
                            </template>
                            <span>第{{ m.layer }}层</span>
                        </span>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td v-for="m in mappings" 
                        :key="'c'+m.layer" 
                        :class="{'highlight-pulse': isHighlighted(m)}" 
                        style="position:relative;">
                        <strong>{{ m.colorCode ? m.colorCode : '（未指定）' }}</strong>
                        <template v-if="m.colorCode && colorByCode(m.colorCode) && colorByCode(m.colorCode).formula">
                            <button class="calc-mini-btn" 
                                    @click.stop="handleCalcClick(m.colorCode, colorByCode(m.colorCode).formula, $event)" 
                                    title="快速计算">算</button>
                        </template>
                    </td>
                </tr>
                <tr>
                    <td v-for="m in mappings" 
                        :key="'f'+m.layer" 
                        class="meta-text" 
                        style="text-align:left;" 
                        :class="{'highlight-pulse': isHighlighted(m)}">
                        <template v-if="!m.colorCode">
                            -
                        </template>
                        <template v-else-if="colorByCode(m.colorCode)">
                            <template v-if="structuredFormula(colorByCode(m.colorCode).formula).lines.length">
                                <div class="formula-lines" 
                                     :style="{ '--max-name-ch': structuredFormula(colorByCode(m.colorCode).formula).maxNameChars }">
                                    <div class="fl" 
                                         v-for="(p,i) in structuredFormula(colorByCode(m.colorCode).formula).lines" 
                                         :key="'pfl'+i">
                                        <span class="fl-name">{{ p.name }}</span>
                                        <span class="fl-amount">{{ p.amount }}</span>
                                    </div>
                                </div>
                            </template>
                            <span v-else>（未指定配方）</span>
                        </template>
                        <span v-else style="color:#999;">（颜色不存在）</span>
                    </td>
                </tr>
            </tbody>
        </table>
    `
};

export default LayerMatrixView;