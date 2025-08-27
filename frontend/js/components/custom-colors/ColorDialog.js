// 颜色编辑对话框组件
// frontend/js/components/custom-colors/ColorDialog.js

export const ColorDialog = {
    props: {
        modelValue: { type: Boolean, default: false },
        editingColor: { type: Object, default: null },
        categories: { type: Array, default: () => [] },
        baseURL: { type: String, required: true }
    },
    emits: ['update:modelValue', 'save', 'update:form'],
    data() {
        return {
            form: {
                category_id: null,
                color_code: '',
                formula: '',
                description: '',
                image: null
            },
            rules: {
                category_id: [
                    { required: true, message: '请选择分类', trigger: 'change' }
                ],
                color_code: [
                    { required: true, message: '请输入颜色编号', trigger: 'blur' },
                    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
                ]
            },
            duplicates: [],
            showDuplicateHint: false,
            formulaSegments: [],
            previewImageUrl: null,
            isLoadingDuplicates: false
        };
    },
    computed: {
        dialogTitle() {
            return this.editingColor ? '修改自配色' : '添加自配色';
        },
        categoriesWithOther() {
            const cats = [...this.categories];
            if (!cats.some(c => c.name === '其他')) {
                cats.push({ id: 'other', name: '其他' });
            }
            return cats;
        },
        currentImageUrl() {
            if (this.previewImageUrl) {
                return this.previewImageUrl;
            }
            if (this.editingColor && this.editingColor.image_path) {
                return this.$helpers.buildUploadURL(this.baseURL, this.editingColor.image_path);
            }
            return null;
        }
    },
    watch: {
        modelValue(val) {
            if (val) {
                this.onOpen();
            }
        },
        editingColor: {
            immediate: true,
            handler(val) {
                if (val) {
                    this.form = {
                        category_id: val.category_id || 'other',
                        color_code: val.color_code,
                        formula: val.formula || '',
                        description: val.description || '',
                        image: null
                    };
                    this.previewImageUrl = null;
                }
            }
        }
    },
    methods: {
        onOpen() {
            if (!this.editingColor) {
                this.resetForm();
            }
            this.updateFormulaSegments();
        },
        resetForm() {
            this.form = {
                category_id: null,
                color_code: '',
                formula: '',
                description: '',
                image: null
            };
            this.duplicates = [];
            this.showDuplicateHint = false;
            this.formulaSegments = [];
            this.previewImageUrl = null;
            if (this.$refs.formRef) {
                this.$refs.formRef.clearValidate();
            }
        },
        onCategoryChange(val) {
            if (val === 'other') {
                this.form.color_code = this.generateOtherCode();
            } else {
                const cat = this.categories.find(c => c.id === val);
                if (cat) {
                    this.form.color_code = this.generateCodeForCategory(cat.name);
                }
            }
            this.checkDuplicates();
        },
        generateOtherCode() {
            const timestamp = Date.now().toString(36).toUpperCase();
            return `OTHER_${timestamp}`;
        },
        generateCodeForCategory(categoryName) {
            const prefix = this.getCategoryPrefix(categoryName);
            const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
            return `${prefix}${timestamp}`;
        },
        getCategoryPrefix(categoryName) {
            const prefixMap = {
                '蓝色系': 'BU',
                '绿色系': 'GR',
                '黄色系': 'YL',
                '红色系': 'RD',
                '紫色系': 'PP',
                '橙色系': 'OR',
                '黑白灰': 'BW',
                '金属色': 'MT',
                '特殊色': 'SP'
            };
            return prefixMap[categoryName] || 'CC';
        },
        onColorCodeInput(val) {
            this.form.color_code = val.toUpperCase();
            this.checkDuplicates();
        },
        async checkDuplicates() {
            if (!this.form.color_code || this.form.color_code.length < 2) {
                this.duplicates = [];
                this.showDuplicateHint = false;
                return;
            }

            this.isLoadingDuplicates = true;
            try {
                // 这里应该调用 API 检查重复
                // const duplicates = await this.api.checkDuplicates(this.form.color_code);
                this.duplicates = []; // 暂时返回空
                this.showDuplicateHint = this.duplicates.length > 0;
            } catch (error) {
                console.error('检查重复失败:', error);
            } finally {
                this.isLoadingDuplicates = false;
            }
        },
        onFormulaInput(val) {
            this.form.formula = val;
            this.updateFormulaSegments();
        },
        updateFormulaSegments() {
            if (!this.form.formula) {
                this.formulaSegments = [];
                return;
            }
            
            const separators = ['+', '＋', ',', '，', ';', '；'];
            let segments = [this.form.formula];
            
            for (const sep of separators) {
                const newSegments = [];
                for (const seg of segments) {
                    newSegments.push(...seg.split(sep));
                }
                segments = newSegments;
            }
            
            this.formulaSegments = segments
                .map(s => s.trim())
                .filter(s => s.length > 0);
        },
        handleImageChange(file) {
            this.form.image = file.raw;
            this.previewImageUrl = URL.createObjectURL(file.raw);
        },
        removeImage() {
            this.form.image = null;
            this.previewImageUrl = null;
        },
        async handleSave() {
            try {
                await this.$refs.formRef.validate();
                this.$emit('save', this.form);
            } catch (error) {
                console.error('表单验证失败:', error);
            }
        },
        handleClose() {
            this.$emit('update:modelValue', false);
            this.resetForm();
        }
    },
    template: `
        <el-dialog 
            :model-value="modelValue"
            @update:model-value="$emit('update:modelValue', $event)"
            class="scheme-dialog"
            :title="dialogTitle"
            width="600px"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            @open="onOpen"
            @close="handleClose">
            
            <el-form 
                :model="form" 
                :rules="rules" 
                ref="formRef" 
                label-width="100px"
                @keydown.enter.stop.prevent="handleSave">
                
                <el-form-item label="颜色分类" prop="category_id">
                    <el-select 
                        v-model="form.category_id" 
                        placeholder="请选择"
                        @change="onCategoryChange">
                        <el-option 
                            v-for="cat in categoriesWithOther" 
                            :key="cat.id || 'other'"
                            :label="cat.name" 
                            :value="cat.id || 'other'">
                        </el-option>
                    </el-select>
                </el-form-item>
                
                <el-form-item label="颜色编号" prop="color_code">
                    <div class="dup-inline-row">
                        <el-input 
                            v-model="form.color_code" 
                            placeholder="例如: BU001"
                            @input="onColorCodeInput"
                            class="short-inline-input"
                            maxlength="50">
                        </el-input>
                        <div v-if="isLoadingDuplicates" class="dup-checking">
                            <el-icon class="is-loading"><Loading /></el-icon>
                            检查中...
                        </div>
                        <div v-else-if="showDuplicateHint" class="dup-hint">
                            <el-icon><Warning /></el-icon>
                            检测到相似配方
                        </div>
                    </div>
                </el-form-item>
                
                <el-form-item label="配方">
                    <el-input 
                        v-model="form.formula" 
                        type="textarea"
                        :autosize="{ minRows: 2, maxRows: 4 }"
                        placeholder="输入配方，多个成分用 + 或 , 分隔"
                        @input="onFormulaInput">
                    </el-input>
                    <div v-if="formulaSegments.length > 0" class="formula-preview">
                        <span class="preview-label">预览：</span>
                        <span v-for="(seg, i) in formulaSegments" :key="i" class="formula-chip">
                            {{ seg }}
                        </span>
                    </div>
                </el-form-item>
                
                <el-form-item label="备注">
                    <el-input 
                        v-model="form.description" 
                        type="textarea"
                        :autosize="{ minRows: 2, maxRows: 4 }"
                        placeholder="可选的备注信息">
                    </el-input>
                </el-form-item>
                
                <el-form-item label="图片">
                    <div class="image-upload-area">
                        <el-upload
                            v-if="!currentImageUrl"
                            class="image-uploader"
                            :show-file-list="false"
                            :on-change="handleImageChange"
                            :auto-upload="false"
                            accept="image/*">
                            <div class="upload-trigger">
                                <el-icon><Plus /></el-icon>
                                <div>点击上传</div>
                            </div>
                        </el-upload>
                        
                        <div v-else class="image-preview">
                            <img :src="currentImageUrl" />
                            <div class="image-actions">
                                <el-button size="small" @click="removeImage">
                                    <el-icon><Delete /></el-icon> 删除
                                </el-button>
                            </div>
                        </div>
                    </div>
                </el-form-item>
            </el-form>
            
            <template #footer>
                <el-button @click="handleClose">取消</el-button>
                <el-button type="primary" @click="handleSave">
                    {{ editingColor ? '保存' : '添加' }}
                </el-button>
            </template>
        </el-dialog>
    `
};

export default ColorDialog;