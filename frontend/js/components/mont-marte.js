// 颜色原料库组件
// 文件路径: frontend/js/components/mont-marte.js
// 定义全局变量 MontMarteComponent，被 app.js 引用并注册

const MontMarteComponent = {
    template: `
        <div class="tab-content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <!-- 添加按钮 -->
                <el-button type="primary" @click="showAddDialog = true">
                    <el-icon><Plus /></el-icon> 添加颜色原料
                </el-button>
                
                <!-- 排序按钮组 -->
                <el-button-group>
                    <el-button 
                        :type="sortType === 'name' ? 'primary' : 'default'"
                        @click="sortByName"
                    >
                        <el-icon><Sort /></el-icon> 按名称排序
                    </el-button>
                    <el-button 
                        :type="sortType === 'time' ? 'primary' : 'default'"
                        @click="sortByTime"
                    >
                        <el-icon><Clock /></el-icon> 按时间排序
                    </el-button>
                </el-button-group>
            </div>
            
            <!-- 颜色列表 -->
            <div v-if="loading" class="loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                加载中...
            </div>
            
            <div v-else>
                <div v-for="color in sortedColors" :key="color.id" class="mont-marte-bar">
                    <div 
                        class="color-sample" 
                        :style="{ backgroundImage: color.image_path ? 'url(' + baseURL + '/' + color.image_path + ')' : 'none' }"
                    ></div>
                    <div class="color-info">
                        <div class="color-code">{{ color.name }}</div>
                        <div class="color-formula">更新时间: {{ formatDate(color.updated_at) }}</div>
                    </div>
                    <div class="color-actions">
                        <el-button type="primary" size="small" @click="editColor(color)">修改</el-button>
                        <el-button type="danger" size="small" @click="deleteColor(color)">删除</el-button>
                    </div>
                </div>
                
                <div v-if="montMarteColors.length === 0" class="loading">
                    暂无颜色原料数据
                </div>
            </div>
            
            <!-- 添加/编辑对话框 -->
            <el-dialog 
                v-model="showAddDialog" 
                :title="editingColor ? '修改颜色原料' : '添加颜色原料'"
                width="500px"
                @close="resetForm"
            >
                <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
                    <el-form-item label="颜色名称" prop="name">
                        <el-input v-model="form.name" placeholder="例如: 朱红" @keyup.enter="saveColor"></el-input>
                    </el-form-item>
                    <el-form-item label="颜色照片">
                        <el-upload
                            :auto-upload="false"
                            :show-file-list="false"
                            :on-change="handleImageChange"
                            accept="image/*"
                        >
                            <el-button>{{ form.imagePreview ? '更换图片' : '选择图片' }}</el-button>
                        </el-upload>
                        <div v-if="form.imagePreview" style="margin-top: 10px;">
                            <img :src="form.imagePreview" style="width: 100px; height: 80px; object-fit: cover;">
                        </div>
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="showAddDialog = false">取消</el-button>
                    <el-button type="primary" @click="saveColor">保存</el-button>
                </template>
            </el-dialog>
        </div>
    `,
    
    // 注入全局数据
    inject: ['globalData'],
    
    data() {
        return {
            loading: false,
            sortType: 'name',
            showAddDialog: false,
            editingColor: null,
            form: {
                name: '',
                imageFile: null,
                imagePreview: null
            },
            rules: {
                name: [
                    { required: true, message: '颜色名称为必填项', trigger: 'blur' },
                    { validator: this.validateName, trigger: 'blur' }
                ]
            }
        };
    },
    
    computed: {
        baseURL() {
            return this.globalData.baseURL;
        },
        montMarteColors() {
            return this.globalData.montMarteColors.value || [];
        },
        sortedColors() {
            const colors = [...this.montMarteColors];
            if (this.sortType === 'name') {
                return colors.sort((a, b) => helpers.compareNames(a.name, b.name));
            } else {
                return colors.sort((a, b) => {
                    const timeA = new Date(a.updated_at || a.created_at).getTime();
                    const timeB = new Date(b.updated_at || b.created_at).getTime();
                    return timeB - timeA;
                });
            }
        }
    },
    
    methods: {
        formatDate(date) {
            return helpers.formatDate(date);
        },
        
        validateName(rule, value, callback) {
            if (value) {
                const exists = this.montMarteColors.some(color => 
                    color.name.toLowerCase() === value.toLowerCase() && 
                    color.id !== (this.editingColor?.id || null)
                );
                if (exists) {
                    callback(new Error('该颜色已存在！'));
                } else {
                    callback();
                }
            } else {
                callback();
            }
        },
        
        sortByName() {
            this.sortType = 'name';
            ElementPlus.ElMessage.success('已按名称排序');
        },
        
        sortByTime() {
            this.sortType = 'time';
            ElementPlus.ElMessage.success('已按时间排序');
        },
        
        handleImageChange(file) {
            this.form.imageFile = file.raw;
            this.form.imagePreview = URL.createObjectURL(file.raw);
        },
        
        async saveColor() {
            const valid = await this.$refs.formRef.validate().catch(() => false);
            if (!valid) return;
            
            try {
                const formData = new FormData();
                formData.append('name', this.form.name);
                if (this.form.imageFile) {
                    formData.append('image', this.form.imageFile);
                }
                
                if (this.editingColor) {
                    formData.append('existingImagePath', this.editingColor.image_path || '');
                    await api.montMarteColors.update(this.editingColor.id, formData);
                    ElementPlus.ElMessage.success('修改成功');
                } else {
                    await api.montMarteColors.create(formData);
                    ElementPlus.ElMessage.success('添加成功');
                }
                
                this.showAddDialog = false;
                this.resetForm();
                await this.globalData.loadMontMarteColors();
            } catch (error) {
                ElementPlus.ElMessage.error('操作失败');
            }
        },
        
        editColor(color) {
            this.editingColor = color;
            this.form = {
                name: color.name,
                imageFile: null,
                imagePreview: color.image_path ? `${this.baseURL}/${color.image_path}` : null
            };
            this.showAddDialog = true;
        },
        
        async deleteColor(color) {
            try {
                await ElementPlus.ElMessageBox.confirm(
                    `确定删除 "${color.name}" 吗？`,
                    '提示',
                    {
                        confirmButtonText: '确定',
                        cancelButtonText: '取消',
                        type: 'warning'
                    }
                );
                
                await api.montMarteColors.delete(color.id);
                ElementPlus.ElMessage.success('删除成功');
                await this.globalData.loadMontMarteColors();
            } catch (error) {
                if (error !== 'cancel') {
                    ElementPlus.ElMessage.error('删除失败');
                }
            }
        },
        
        resetForm() {
            this.editingColor = null;
            this.form = {
                name: '',
                imageFile: null,
                imagePreview: null
            };
            if (this.$refs.formRef) {
                this.$refs.formRef.resetFields();
            }
        }
    }
};