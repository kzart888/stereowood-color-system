const ColorDetailsDialog = {
    name: 'ColorDetailsDialog',
    inject: ['customColorsStore'],
    props: {
        visible: { type: Boolean, default: false },
        form: { type: Object, required: true },
        rules: { type: Object, required: true },
        editingColor: { type: Object, default: null },
        saving: { type: Boolean, default: false },
        colorCodeDuplicate: { type: Boolean, default: false },
        categories: { type: Array, required: true },
        montMarteColors: { type: Array, default: () => [] },
        colorValueHelpers: { type: Object, required: true }
    },
    emits: [
        'update:visible',
        'save',
        'attempt-close',
        'dialog-open',
        'dialog-close',
        'color-code-input',
        'category-change',
        'image-change',
        'clear-image',
        'extract-color',
        'find-pantone',
        'clear-color-values'
    ],
    template: `
        <el-dialog
            v-model="dialogVisible"
            class="scheme-dialog"
            :title="editingColor ? '修改自配色' : '添加自配色'"
            width="600px"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            @open="handleDialogOpen"
            @close="handleDialogClose"
        >
            <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" @keydown.enter.stop.prevent="handleSave">
                <el-form-item label="颜色分类" prop="category_id">
                    <el-select v-model="form.category_id" placeholder="选择分类" @change="onCategoryChange">
                        <el-option v-for="cat in categories" :key="cat.id || 'other'" :label="cat.name" :value="cat.id || 'other'" />
                    </el-select>
                </el-form-item>

                <el-form-item label="颜色编号" prop="color_code">
                    <div class="dup-inline-row">
                        <el-input v-model="form.color_code" placeholder="如：BU001" @input="onColorCodeInput" />
                        <span v-if="colorCodeDuplicate" class="dup-msg">该编号已存在</span>
                    </div>
                </el-form-item>

                <el-form-item label="配方">
                    <formula-editor
                        v-if="visible"
                        v-model="form.formula"
                        :mont-marte-colors="montMarteColors"
                    />
                </el-form-item>

                <el-form-item label="颜色样本">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="scheme-thumbnail"
                             :class="{ 'no-image': !form.imagePreview }"
                             style="width: 80px; height: 80px; flex-shrink: 0;"
                             @click="form.imagePreview && $thumbPreview && $thumbPreview.show($event, form.imagePreview)">
                            <template v-if="!form.imagePreview">未上传图片</template>
                            <img v-else :src="form.imagePreview" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <el-upload
                                :auto-upload="false"
                                :show-file-list="false"
                                :on-change="onImageChange"
                                accept="image/*"
                            >
                                <el-button size="small" type="primary">
                                    <el-icon><Upload /></el-icon>
                                    {{ form.imagePreview ? '更换图片' : '上传图片' }}
                                </el-button>
                            </el-upload>

                            <el-button
                                v-if="form.imagePreview"
                                size="small"
                                @click="onClearImage"
                            >
                                <el-icon><Delete /></el-icon>
                                清除图片
                            </el-button>
                        </div>
                    </div>
                </el-form-item>

                <el-form-item label="颜色信息" class="color-info-header">
                    <div class="color-action-buttons">
                        <el-button
                            size="small"
                            type="primary"
                            @click="onExtractColor"
                            :disabled="!colorValueHelpers.hasImageAvailable.value">
                            <el-icon><Camera /></el-icon>
                            计算基础色值
                        </el-button>
                        <el-button
                            size="small"
                            @click="onFindPantone"
                            :disabled="!(form.rgb_r != null && form.rgb_g != null && form.rgb_b != null)">
                            <el-icon><Search /></el-icon>
                            匹配潘通色号
                        </el-button>
                        <el-button
                            size="small"
                            type="warning"
                            @click="onClearColorValues">
                            <el-icon><Delete /></el-icon>
                            清除色值
                        </el-button>
                    </div>
                </el-form-item>

                <el-form-item label="RGB:">
                    <div class="color-input-row">
                        <div class="color-swatch-wrapper">
                            <div class="color-swatch" :style="colorValueHelpers.rgbSwatchStyle.value"></div>
                            <span v-if="!colorValueHelpers.hasRGBValue.value" class="swatch-empty-text">未</span>
                        </div>
                        <el-input v-model.number="form.rgb_r" placeholder="R" class="color-input-small" :min="0" :max="255" />
                        <el-input v-model.number="form.rgb_g" placeholder="G" class="color-input-small" :min="0" :max="255" />
                        <el-input v-model.number="form.rgb_b" placeholder="B" class="color-input-small" :min="0" :max="255" />
                    </div>
                </el-form-item>

                <el-form-item label="CMYK:">
                    <div class="color-input-row">
                        <div class="color-swatch-wrapper">
                            <div class="color-swatch" :style="colorValueHelpers.cmykSwatchStyle.value"></div>
                            <span v-if="!colorValueHelpers.hasCMYKValue.value" class="swatch-empty-text">未</span>
                        </div>
                        <el-input v-model.number="form.cmyk_c" placeholder="C" class="color-input-small" :min="0" :max="100" />
                        <el-input v-model.number="form.cmyk_m" placeholder="M" class="color-input-small" :min="0" :max="100" />
                        <el-input v-model.number="form.cmyk_y" placeholder="Y" class="color-input-small" :min="0" :max="100" />
                        <el-input v-model.number="form.cmyk_k" placeholder="K" class="color-input-small" :min="0" :max="100" />
                    </div>
                </el-form-item>

                <el-form-item label="HEX:">
                    <div class="color-input-row">
                        <div class="color-swatch-wrapper">
                            <div class="color-swatch" :style="colorValueHelpers.hexSwatchStyle.value"></div>
                            <span v-if="!colorValueHelpers.hasHEXValue.value" class="swatch-empty-text">未</span>
                        </div>
                        <el-input v-model="form.hex_color" placeholder="#000000" class="color-input-hex" />
                    </div>
                </el-form-item>

                <el-form-item label="Pantone C:">
                    <div class="color-input-row">
                        <div class="color-swatch-wrapper">
                            <div class="color-swatch" :style="colorValueHelpers.pantoneCoatedSwatchStyle.value"></div>
                            <span v-if="!colorValueHelpers.hasPantoneCoatedValue.value" class="swatch-empty-text">未</span>
                        </div>
                        <el-input v-model="form.pantone_coated" placeholder="如: 185 C" class="color-input-pantone" />
                    </div>
                </el-form-item>

                <el-form-item label="Pantone U:">
                    <div class="color-input-row">
                        <div class="color-swatch-wrapper">
                            <div class="color-swatch" :style="colorValueHelpers.pantoneUncoatedSwatchStyle.value"></div>
                            <span v-if="!colorValueHelpers.hasPantoneUncoatedValue.value" class="swatch-empty-text">未</span>
                        </div>
                        <el-input v-model="form.pantone_uncoated" placeholder="如: 185 U" class="color-input-pantone" />
                    </div>
                </el-form-item>
            </el-form>

            <template #footer>
                <el-button @click="onAttemptClose">取消</el-button>
                <el-button type="primary" @click="handleSave" :disabled="colorCodeDuplicate || saving">
                    <el-icon v-if="saving" class="is-loading"><Loading /></el-icon>
                    {{ saving ? '保存中...' : '保存' }}
                </el-button>
            </template>
        </el-dialog>
    `,
    computed: {
        dialogVisible: {
            get() {
                return this.visible;
            },
            set(val) {
                this.$emit('update:visible', val);
            }
        }
    },
    methods: {
        async handleSave() {
            if (!this.$refs.formRef) {
                this.$emit('save');
                return;
            }
            const valid = await this.$refs.formRef.validate().catch(() => false);
            if (!valid) return;
            if (this.colorCodeDuplicate) return;
            this.$emit('save');
        },
        onAttemptClose() {
            this.$emit('attempt-close');
        },
        handleDialogOpen() {
            this.$emit('dialog-open', this.$refs.formRef);
        },
        handleDialogClose() {
            this.$emit('dialog-close');
        },
        onColorCodeInput(value) {
            this.$emit('color-code-input', value);
        },
        onCategoryChange(value) {
            this.$emit('category-change', value);
        },
        onImageChange(file) {
            this.$emit('image-change', file);
        },
        onClearImage() {
            this.$emit('clear-image');
        },
        onExtractColor() {
            this.$emit('extract-color');
        },
        onFindPantone() {
            this.$emit('find-pantone');
        },
        onClearColorValues() {
            this.$emit('clear-color-values');
        },
        resetFields() {
            if (this.$refs.formRef) {
                this.$refs.formRef.resetFields();
            }
        }
    }
};

window.ColorDetailsDialog = ColorDetailsDialog;
