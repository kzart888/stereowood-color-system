// 配色方案编辑对话框组件
// frontend/js/components/artworks/SchemeDialog.js

export const SchemeDialog = {
    props: {
        modelValue: { type: Boolean, default: false },
        artwork: { type: Object, default: null },
        editingScheme: { type: Object, default: null },
        colors: { type: Array, default: () => [] },
        baseURL: { type: String, required: true }
    },
    emits: ['update:modelValue', 'save'],
    data() {
        return {
            form: {
                name: '',
                thumbnail: null,
                layers: []
            },
            rules: {
                name: [
                    { max: 100, message: '名称长度不能超过100个字符', trigger: 'blur' }
                ]
            },
            previewImageUrl: null,
            removeThumbnail: false
        };
    },
    computed: {
        dialogTitle() {
            return this.editingScheme ? '修改配色方案' : '添加配色方案';
        },
        currentImageUrl() {
            if (this.removeThumbnail) return null;
            if (this.previewImageUrl) return this.previewImageUrl;
            if (this.editingScheme && this.editingScheme.thumbnail_path) {
                return this.$helpers.buildUploadURL(this.baseURL, this.editingScheme.thumbnail_path);
            }
            return null;
        },
        colorOptions() {
            return this.colors.map(c => ({
                label: c.color_code,
                value: c.color_code
            }));
        }
    },
    watch: {
        modelValue(val) {
            if (val) {
                this.onOpen();
            }
        },
        editingScheme: {
            immediate: true,
            handler(val) {
                if (val) {
                    this.initFormFromScheme(val);
                }
            }
        }
    },
    methods: {
        onOpen() {
            if (!this.editingScheme) {
                this.resetForm();
            }
        },
        resetForm() {
            this.form = {
                name: '',
                thumbnail: null,
                layers: this.createDefaultLayers()
            };
            this.previewImageUrl = null;
            this.removeThumbnail = false;
            if (this.$refs.formRef) {
                this.$refs.formRef.clearValidate();
            }
        },
        initFormFromScheme(scheme) {
            const layers = [];
            const maxLayer = this.getMaxLayer(scheme);
            
            for (let i = 1; i <= Math.max(maxLayer, 10); i++) {
                const mapping = scheme.layers ? 
                    scheme.layers.find(l => l.layer_number === i) : null;
                
                layers.push({
                    layer_number: i,
                    color_code: mapping ? mapping.color_code : ''
                });
            }
            
            this.form = {
                name: scheme.name || '',
                thumbnail: null,
                layers: layers
            };
            this.previewImageUrl = null;
            this.removeThumbnail = false;
        },
        createDefaultLayers() {
            const layers = [];
            for (let i = 1; i <= 10; i++) {
                layers.push({
                    layer_number: i,
                    color_code: ''
                });
            }
            return layers;
        },
        getMaxLayer(scheme) {
            if (!scheme || !scheme.layers || scheme.layers.length === 0) {
                return 10;
            }
            return Math.max(...scheme.layers.map(l => l.layer_number), 10);
        },
        addLayer() {
            const nextNumber = this.form.layers.length > 0 ? 
                Math.max(...this.form.layers.map(l => l.layer_number)) + 1 : 1;
            
            this.form.layers.push({
                layer_number: nextNumber,
                color_code: ''
            });
        },
        removeLayer(index) {
            if (this.form.layers.length > 1) {
                this.form.layers.splice(index, 1);
            }
        },
        handleImageChange(file) {
            this.form.thumbnail = file.raw;
            this.previewImageUrl = URL.createObjectURL(file.raw);
            this.removeThumbnail = false;
        },
        removeImage() {
            this.form.thumbnail = null;
            this.previewImageUrl = null;
            this.removeThumbnail = true;
        },
        async handleSave() {
            try {
                await this.$refs.formRef.validate();
                
                const data = {
                    ...this.form,
                    removeThumbnail: this.removeThumbnail
                };
                
                this.$emit('save', data);
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
            width="700px"
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
                
                <el-form-item label="方案名称" prop="name">
                    <el-input 
                        v-model="form.name" 
                        placeholder="可选，留空将自动编号"
                        maxlength="100">
                    </el-input>
                </el-form-item>
                
                <el-form-item label="缩略图">
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
                
                <el-form-item label="层号映射">
                    <div class="layer-mapping-list">
                        <div v-for="(layer, index) in form.layers" 
                             :key="'layer-'+layer.layer_number"
                             class="layer-mapping-row">
                            <span class="layer-number">第{{ layer.layer_number }}层</span>
                            <el-select 
                                v-model="layer.color_code" 
                                placeholder="选择颜色"
                                filterable
                                clearable
                                style="flex: 1;">
                                <el-option
                                    v-for="color in colorOptions"
                                    :key="color.value"
                                    :label="color.label"
                                    :value="color.value">
                                </el-option>
                            </el-select>
                            <el-button 
                                v-if="form.layers.length > 1"
                                size="small" 
                                type="danger" 
                                circle
                                @click="removeLayer(index)">
                                <el-icon><Delete /></el-icon>
                            </el-button>
                        </div>
                        
                        <el-button 
                            size="small" 
                            @click="addLayer"
                            style="margin-top: 10px;">
                            <el-icon><Plus /></el-icon> 添加层
                        </el-button>
                    </div>
                </el-form-item>
            </el-form>
            
            <template #footer>
                <el-button @click="handleClose">取消</el-button>
                <el-button type="primary" @click="handleSave">
                    {{ editingScheme ? '保存' : '添加' }}
                </el-button>
            </template>
        </el-dialog>
    `
};

export default SchemeDialog;