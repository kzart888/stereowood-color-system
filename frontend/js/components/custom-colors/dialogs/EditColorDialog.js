(function(window) {
    'use strict';

    const helpers = window.helpers || {};

    const EditColorDialog = {
        name: 'EditColorDialog',
        mixins: [window.CustomColorMediaMixin],
        inject: ['globalData'],
        props: {
            visible: { type: Boolean, default: false },
            categories: { type: Array, default: () => [] },
            categoriesWithOther: { type: Array, default: () => [] },
            customColors: { type: Array, default: () => [] },
            montMarteColors: { type: Array, default: () => [] },
            baseUrl: { type: String, default: '' },
            editingColor: { type: Object, default: null },
            activeCategory: { type: String, default: 'all' },
            saving: { type: Boolean, default: false }
        },
        emits: ['update:visible', 'save', 'cancel'],
        data() {
            return {
                form: this.createEmptyForm(),
                rules: {
                    category_id: [{ required: true, message: '请选择分类', trigger: 'change' }],
                    color_code: [
                        { required: true, message: '请输入颜色编号', trigger: 'blur' }
                    ]
                },
                autoSyncDisabled: false,
                _originalColorFormSnapshot: null,
                _escHandler: null
            };
        },
        computed: {
            baseURL() {
                return this.baseUrl || (this.globalData && this.globalData.baseURL) || window.location.origin;
            },
            esCategoryId() {
                const es = this.categories.find(c => c.code === 'ES');
                return es ? es.id : null;
            },
            dialogTitle() {
                return this.editingColor ? '修改自配色' : '添加自配色';
            },
            colorCodeDuplicate() {
                const val = (this.form.color_code || '').trim();
                if (!val) return false;
                const editingId = this.editingColor ? this.editingColor.id : null;
                return this.customColors.some(c => c.color_code === val && c.id !== editingId);
            }
        },
        watch: {
            visible: {
                immediate: true,
                handler(val) {
                    if (val) {
                        this.onOpen();
                    } else {
                        this.onDialogClosed();
                    }
                }
            },
            editingColor() {
                if (this.visible) {
                    this.populateForm();
                    this.$nextTick(() => {
                        this._originalColorFormSnapshot = JSON.stringify(this._normalizedColorForm());
                    });
                }
            },
            colorCodeDuplicate(val) {
                if (val && this.$refs.formRef) {
                    this.$refs.formRef.clearValidate('color_code');
                }
            }
        },
        methods: {
            createEmptyForm() {
                return {
                    category_id: '',
                    color_code: '',
                    formula: '',
                    imageFile: null,
                    imagePreview: null,
                    rgb_r: null,
                    rgb_g: null,
                    rgb_b: null,
                    cmyk_c: null,
                    cmyk_m: null,
                    cmyk_y: null,
                    cmyk_k: null,
                    hex_color: null,
                    pantone_coated: null,
                    pantone_uncoated: null
                };
            },
            getMsg() {
                return ElementPlus.ElMessage;
            },
            async handleSave() {
                const valid = await this.$refs.formRef.validate().catch(() => false);
                if (!valid) return;
                if (this.colorCodeDuplicate) return;

                const formData = new FormData();
                const actualCategoryId = this.form.category_id;

                formData.append('category_id', actualCategoryId);
                formData.append('color_code', this.form.color_code);
                formData.append('formula', this.form.formula || '');

                if (this.form.imageFile) {
                    formData.append('image', this.form.imageFile);
                }

                if (this.form.rgb_r != null) formData.append('rgb_r', this.form.rgb_r);
                if (this.form.rgb_g != null) formData.append('rgb_g', this.form.rgb_g);
                if (this.form.rgb_b != null) formData.append('rgb_b', this.form.rgb_b);
                if (this.form.cmyk_c != null) formData.append('cmyk_c', this.form.cmyk_c);
                if (this.form.cmyk_m != null) formData.append('cmyk_m', this.form.cmyk_m);
                if (this.form.cmyk_y != null) formData.append('cmyk_y', this.form.cmyk_y);
                if (this.form.cmyk_k != null) formData.append('cmyk_k', this.form.cmyk_k);
                if (this.form.hex_color) formData.append('hex_color', this.form.hex_color);
                if (this.form.pantone_coated) formData.append('pantone_coated', this.form.pantone_coated);
                if (this.form.pantone_uncoated) formData.append('pantone_uncoated', this.form.pantone_uncoated);

                if (this.editingColor) {
                    if (!this.form.imageFile && this.editingColor.image_path) {
                        formData.append('existingImagePath', this.editingColor.image_path);
                    }
                    if (this.editingColor.version) {
                        formData.append('version', this.editingColor.version);
                    }
                }

                this.$emit('save', {
                    formData,
                    form: { ...this.form }
                });
            },
            async requestClose() {
                if (this._isColorFormDirty()) {
                    try {
                        await ElementPlus.ElMessageBox.confirm('检测到未保存的修改，确认丢弃吗？', '未保存的修改', {
                            confirmButtonText: '丢弃修改',
                            cancelButtonText: '继续编辑',
                            type: 'warning'
                        });
                    } catch (e) {
                        return;
                    }
                }
                this.$emit('cancel');
                this.$emit('update:visible', false);
            },
            handleBeforeClose(done) {
                if (!this._isColorFormDirty()) {
                    this.$emit('cancel');
                    this.$emit('update:visible', false);
                    done();
                    return;
                }
                ElementPlus.ElMessageBox.confirm('检测到未保存的修改，确认丢弃吗？', '未保存的修改', {
                    confirmButtonText: '丢弃修改',
                    cancelButtonText: '继续编辑',
                    type: 'warning'
                }).then(() => {
                    this.$emit('cancel');
                    this.$emit('update:visible', false);
                    done();
                }).catch(() => {
                    /* ignore */
                });
            },
            onOpen() {
                if (!this.visible) return;
                this.populateForm();
                this._bindEscForDialog();
                this.$nextTick(() => {
                    this._originalColorFormSnapshot = JSON.stringify(this._normalizedColorForm());
                });
            },
            onDialogClosed() {
                this._unbindEsc();
                this.resetForm();
            },
            populateForm() {
                if (this.editingColor) {
                    this.autoSyncDisabled = true;
                    this.form = {
                        category_id: this.editingColor.category_id,
                        color_code: this.editingColor.color_code,
                        formula: this.editingColor.formula,
                        imageFile: null,
                        imagePreview: this.editingColor.image_path ? this.$helpers.buildUploadURL(this.baseURL, this.editingColor.image_path) : null,
                        rgb_r: this.editingColor.rgb_r,
                        rgb_g: this.editingColor.rgb_g,
                        rgb_b: this.editingColor.rgb_b,
                        cmyk_c: this.editingColor.cmyk_c,
                        cmyk_m: this.editingColor.cmyk_m,
                        cmyk_y: this.editingColor.cmyk_y,
                        cmyk_k: this.editingColor.cmyk_k,
                        hex_color: this.editingColor.hex_color,
                        pantone_coated: this.editingColor.pantone_coated,
                        pantone_uncoated: this.editingColor.pantone_uncoated
                    };
                } else {
                    this.autoSyncDisabled = false;
                    this.form = this.createEmptyForm();
                    if (this.activeCategory && this.activeCategory !== 'all') {
                        if (this.activeCategory === 'other') {
                            this.form.category_id = '';
                            this.form.color_code = '';
                        } else {
                            const categoryId = parseInt(this.activeCategory);
                            if (!Number.isNaN(categoryId)) {
                                this.form.category_id = categoryId;
                                if (categoryId === this.esCategoryId) {
                                    this.form.color_code = '';
                                } else {
                                    this.generateColorCode(categoryId);
                                }
                            }
                        }
                    }
                }
                this.$nextTick(() => {
                    if (this.$refs.formRef) {
                        this.$refs.formRef.clearValidate();
                    }
                });
                this.initForm();
            },
            resetForm() {
                if (this.form.imageFile && this.form.imagePreview && this.form.imagePreview.startsWith('blob:')) {
                    URL.revokeObjectURL(this.form.imagePreview);
                }
                this.form = this.createEmptyForm();
                if (this.$refs.formRef && this.$refs.formRef.resetFields) {
                    this.$refs.formRef.resetFields();
                }
                this.autoSyncDisabled = false;
                this._originalColorFormSnapshot = null;
            },
            _normalizedColorForm() {
                return {
                    category_id: this.form.category_id || '',
                    color_code: this.form.color_code || '',
                    formula: this.form.formula || '',
                    imagePreview: this.form.imagePreview ? '1' : ''
                };
            },
            _isColorFormDirty() {
                if (!this._originalColorFormSnapshot) return false;
                return JSON.stringify(this._normalizedColorForm()) !== this._originalColorFormSnapshot;
            },
            _bindEscForDialog() {
                this._unbindEsc();
                this._escHandler = (e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        this.requestClose();
                    }
                };
                document.addEventListener('keydown', this._escHandler);
            },
            _unbindEsc() {
                if (this._escHandler) {
                    document.removeEventListener('keydown', this._escHandler);
                    this._escHandler = null;
                }
            },
            onColorCodeInput(value) {
                if (this.editingColor) return;
                if (this.autoSyncDisabled) return;

                const esId = this.esCategoryId;
                if (esId && this.form.category_id === esId) return;
                if (!value) return;

                const firstChar = value.charAt(0);
                const esTriggers = ['酒', '沙', '红', '黑', '蓝'];
                if (esId && esTriggers.includes(firstChar)) {
                    if (this.form.category_id !== esId) {
                        this.form.category_id = esId;
                        this.getMsg().info('已自动识别为 色精');
                        this.autoSyncDisabled = true;
                    }
                    return;
                }

                if (value.length >= 2) {
                    const prefix = value.substring(0, 2).toUpperCase();
                    const matchedCategory = this.categories.find(cat => cat.code === prefix);
                    if (matchedCategory && this.form.category_id !== matchedCategory.id) {
                        this.form.category_id = matchedCategory.id;
                        this.getMsg().info(`已自动切换到 ${matchedCategory.name}`);
                        this.autoSyncDisabled = true;
                    }
                }
            },
            initForm() {
                const esId = this.esCategoryId;
                if (!this.editingColor && this.form.category_id && this.form.category_id !== esId) {
                    this.generateColorCode(this.form.category_id);
                }
            },
            onCategoryChange(categoryId) {
                if (this.autoSyncDisabled) return;
                const esId = this.esCategoryId;
                if (!this.editingColor && categoryId && categoryId !== esId) {
                    this.generateColorCode(categoryId);
                    this.autoSyncDisabled = true;
                } else if (categoryId === esId) {
                    this.form.color_code = '';
                    this.autoSyncDisabled = true;
                }
            },
            generateColorCode(categoryId) {
                const esId = this.esCategoryId;
                if (!categoryId || categoryId === esId) return;
                if (helpers && typeof helpers.generateColorCode === 'function') {
                    const code = helpers.generateColorCode(this.categories, this.customColors, categoryId);
                    if (code) {
                        this.form.color_code = code;
                    }
                }
            }
        },
        template: `
            <el-dialog
                :model-value="visible"
                class="scheme-dialog"
                :title="dialogTitle"
                width="600px"
                :close-on-click-modal="false"
                :close-on-press-escape="false"
                :before-close="handleBeforeClose"
                @open="onOpen"
            >
                <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" @keydown.enter.stop.prevent="handleSave">
                    <el-form-item label="颜色分类" prop="category_id">
                        <el-select v-model="form.category_id" placeholder="选择分类" @change="onCategoryChange">
                            <el-option v-for="cat in categoriesWithOther" :key="cat.id || 'other'" :label="cat.name" :value="cat.id || 'other'" />
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
                                    :on-change="handleImageChange"
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
                                    @click="clearImage"
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
                                @click="extractColorFromImage"
                                :disabled="!hasImageAvailable">
                                <el-icon><Camera /></el-icon>
                                计算基础色值
                            </el-button>
                            <el-button
                                size="small"
                                @click="findPantoneMatch"
                                :disabled="!(form.rgb_r != null && form.rgb_g != null && form.rgb_b != null)">
                                <el-icon><Search /></el-icon>
                                匹配潘通色号
                            </el-button>
                            <el-button
                                size="small"
                                type="warning"
                                @click="clearColorValues">
                                <el-icon><Delete /></el-icon>
                                清除色值
                            </el-button>
                        </div>
                    </el-form-item>

                    <el-form-item label="RGB:">
                        <div class="color-input-row">
                            <div class="color-swatch-wrapper">
                                <div class="color-swatch" :style="rgbSwatchStyle"></div>
                                <span v-if="!hasRGBValue" class="swatch-empty-text">未</span>
                            </div>
                            <el-input v-model.number="form.rgb_r" placeholder="R" class="color-input-small" :min="0" :max="255" />
                            <el-input v-model.number="form.rgb_g" placeholder="G" class="color-input-small" :min="0" :max="255" />
                            <el-input v-model.number="form.rgb_b" placeholder="B" class="color-input-small" :min="0" :max="255" />
                        </div>
                    </el-form-item>

                    <el-form-item label="CMYK:">
                        <div class="color-input-row">
                            <div class="color-swatch-wrapper">
                                <div class="color-swatch" :style="cmykSwatchStyle"></div>
                                <span v-if="!hasCMYKValue" class="swatch-empty-text">未</span>
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
                                <div class="color-swatch" :style="hexSwatchStyle"></div>
                                <span v-if="!hasHEXValue" class="swatch-empty-text">未</span>
                            </div>
                            <el-input v-model="form.hex_color" placeholder="#000000" class="color-input-hex" />
                        </div>
                    </el-form-item>

                    <el-form-item label="Pantone C:">
                        <div class="color-input-row">
                            <div class="color-swatch-wrapper">
                                <div class="color-swatch" :style="pantoneCoatedSwatchStyle"></div>
                                <span v-if="!hasPantoneCoatedValue" class="swatch-empty-text">未</span>
                            </div>
                            <el-input v-model="form.pantone_coated" placeholder="如: 185 C" class="color-input-pantone" />
                        </div>
                    </el-form-item>

                    <el-form-item label="Pantone U:">
                        <div class="color-input-row">
                            <div class="color-swatch-wrapper">
                                <div class="color-swatch" :style="pantoneUncoatedSwatchStyle"></div>
                                <span v-if="!hasPantoneUncoatedValue" class="swatch-empty-text">未</span>
                            </div>
                            <el-input v-model="form.pantone_uncoated" placeholder="如: 185 U" class="color-input-pantone" />
                        </div>
                    </el-form-item>
                </el-form>

                <template #footer>
                    <el-button @click="requestClose">取消</el-button>
                    <el-button type="primary" @click="handleSave" :disabled="colorCodeDuplicate || saving">
                        <el-icon v-if="saving" class="is-loading"><Loading /></el-icon>
                        {{ saving ? '保存中...' : '保存' }}
                    </el-button>
                </template>
            </el-dialog>
        `
    };

    window.EditColorDialog = EditColorDialog;
})(window);
