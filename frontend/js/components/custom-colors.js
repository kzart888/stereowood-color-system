// 自配颜色管理组件
// 文件路径: frontend/js/components/custom-colors.js
// 定义全局变量 CustomColorsComponent，被 app.js 引用并注册
//test
const CustomColorsComponent = {
    template: `
        <div class="tab-content">
            <!-- 顶部操作栏 -->
            <div style="margin-bottom: 20px;">
                <el-button type="primary" @click="openAddDialog">
                    + 添加新的自配色
                </el-button>
            </div>
            
            <!-- 分类标签页 -->
            <el-tabs v-model="activeCategory" class="category-tabs">
                <el-tab-pane label="全部" name="all"></el-tab-pane>
                <el-tab-pane 
                    v-for="cat in categoriesWithOther" 
                    :key="cat.id || 'other'"
                    :label="cat.name" 
                    :name="String(cat.id || 'other')"
                ></el-tab-pane>
            </el-tabs>
            
            <!-- 颜色列表 -->
            <div v-if="loading" class="loading">
                加载中...
            </div>
            
            <div v-else>
                <div 
                    v-for="color in filteredColors" 
                    :key="color.id" 
                    class="color-bar"
                >
                    <div 
                        class="color-sample" 
                        :style="{ backgroundImage: color.image_path ? 'url(' + baseURL + '/' + color.image_path + ')' : 'none', backgroundColor: color.image_path ? 'transparent' : '#f0f0f0' }"
                    ></div>
                    <div class="color-info">
                        <div class="color-code">{{ color.color_code }}</div>
                        
                        <!-- 优化的配方显示 -->
                        <div class="color-formula" v-if="color.formula">
                            <span class="formula-icon">🎨</span>
                            <div class="formula-tags">
                                <span 
                                    v-for="(item, index) in parseFormulaToTags(color.formula)" 
                                    :key="index"
                                    class="formula-tag"
                                    :title="item.fullText"
                                >
                                    <span class="tag-color">{{ item.colorName }}</span>
                                    <span class="tag-amount">{{ item.amount }}{{ item.unit }}</span>
                                </span>
                            </div>
                        </div>
                        <div v-else class="color-formula">
                            <span class="formula-icon">🎨</span>
                            <span class="no-formula">暂无配方</span>
                        </div>
                        
                        <div class="color-layers">适用层: {{ color.applicable_layers || '未指定' }}</div>
                    </div>
                    <div class="color-actions">
                        <el-button type="primary" size="small" @click="editColor(color)">修改</el-button>
                        <el-button type="info" size="small" @click="viewHistory(color)">历史</el-button>
                        <el-button type="danger" size="small" @click="deleteColor(color)">删除</el-button>
                    </div>
                </div>
                
                <div v-if="filteredColors.length === 0" class="loading">
                    暂无数据
                </div>
            </div>
            
            <!-- 添加/编辑对话框 -->
            <el-dialog 
                v-model="showAddDialog" 
                :title="editingColor ? '修改自配颜色' : '添加自配颜色'"
                width="600px"
                @close="resetForm"
                @open="initForm"
            >
                <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
                    <el-form-item label="颜色分类" prop="category_id">
                        <el-select v-model="form.category_id" placeholder="请选择" @change="onCategoryChange">
                            <el-option 
                                v-for="cat in categoriesWithOther" 
                                :key="cat.id || 'other'"
                                :label="cat.name" 
                                :value="cat.id || 'other'"
                            ></el-option>
                        </el-select>
                    </el-form-item>
                    <el-form-item label="颜色编号" prop="color_code">
                        <el-input 
                            v-model="form.color_code" 
                            placeholder="例如: BU001"
                            @input="onColorCodeInput"
                        ></el-input>
                    </el-form-item>
                    <el-form-item label="配方">
                        <formula-editor 
                            v-if="showAddDialog"
                            v-model="form.formula"
                            :mont-marte-colors="montMarteColors"
                        />
                    </el-form-item>
                    <el-form-item label="适用画层">
                        <el-input v-model="form.applicable_layers"></el-input>
                    </el-form-item>
                    <el-form-item label="颜色样本">
                        <el-upload
                            :auto-upload="false"
                            :show-file-list="false"
                            :on-change="handleImageChange"
                            accept="image/*"
                        >
                            <el-button>选择图片</el-button>
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
            activeCategory: 'all',
            showAddDialog: false,
            editingColor: null,
            form: {
                category_id: '',
                color_code: '',
                formula: '',
                applicable_layers: '',
                imageFile: null,
                imagePreview: null
            },
            rules: {
                category_id: [{ required: true, message: '请选择分类', trigger: 'change' }],
                color_code: [
                    { required: true, message: '请输入颜色编号', trigger: 'blur' },
                    { validator: this.validateColorCode, trigger: 'blur' }
                ]
                // 删除 formula 的必填验证，因为现在允许空配方
            }
        };
    },
    
    computed: {
        // 从注入的全局数据获取基础URL
        baseURL() {
            return this.globalData.baseURL;
        },
        // 从注入的全局数据获取分类列表
        categories() {
            return this.globalData.categories.value || [];
        },
        // 添加"其他"分类的完整分类列表
        categoriesWithOther() {
            const cats = [...this.categories];
            // 添加"其他"分类（id为'other'特殊标识）
            cats.push({ id: 'other', name: '其他', code: 'OTHER' });
            return cats;
        },
        // 从注入的全局数据获取自配颜色列表
        customColors() {
            return this.globalData.customColors.value || [];
        },
        // 根据当前选中的分类过滤颜色
        filteredColors() {
            if (this.activeCategory === 'all') {
                return this.customColors;
            } else if (this.activeCategory === 'other') {
                // 显示无法匹配到任何分类的颜色
                return this.customColors.filter(color => {
                    const prefix = color.color_code.substring(0, 2).toUpperCase();
                    const matchedCategory = this.categories.find(cat => cat.code === prefix);
                    return !matchedCategory;
                });
            }
            return this.customColors.filter(c => c.category_id === parseInt(this.activeCategory));
        },
        // 从注入的全局数据获取颜色原料库
        montMarteColors() {
            return this.globalData.montMarteColors.value || [];
        }
    },
    
    methods: {
        // 打开添加对话框
        openAddDialog() {
            // 重置编辑状态
            this.editingColor = null;
            
            // 如果当前不在"全部"标签页，自动填充对应分类
            if (this.activeCategory !== 'all') {
                if (this.activeCategory === 'other') {
                    // 在"其他"标签页时，设置分类为"其他"
                    this.form.category_id = 'other';
                    this.form.color_code = '';
                } else {
                    const categoryId = parseInt(this.activeCategory);
                    this.form.category_id = categoryId;
                    // 自动生成颜色编号
                    this.generateColorCode(categoryId);
                }
            } else {
                // 在"全部"标签页时，分类保持为空
                this.form.category_id = '';
                this.form.color_code = '';
            }
            
            // 清空其他字段
            this.form.formula = '';
            this.form.applicable_layers = '';
            this.form.imageFile = null;
            this.form.imagePreview = null;
            
            // 打开对话框
            this.showAddDialog = true;
        },
        
        // 颜色编号输入时智能识别分类
        onColorCodeInput(value) {
            // 只在非编辑模式下自动识别分类
            if (this.editingColor) return;
            
            // 提取前两个字符作为分类代码
            if (value && value.length >= 2) {
                const prefix = value.substring(0, 2).toUpperCase();
                
                // 查找匹配的分类
                const matchedCategory = this.categories.find(cat => cat.code === prefix);
                
                if (matchedCategory) {
                    // 找到匹配的分类，自动切换
                    if (this.form.category_id !== matchedCategory.id) {
                        this.form.category_id = matchedCategory.id;
                        ElementPlus.ElMessage.info(`已自动切换到 ${matchedCategory.name}`);
                    }
                } else {
                    // 没有找到匹配的分类，切换到"其他"
                    if (this.form.category_id !== 'other') {
                        this.form.category_id = 'other';
                        ElementPlus.ElMessage.warning('无法识别的颜色编号前缀，已切换到"其他"分类');
                    }
                }
            }
        },
        
        // 验证颜色编号唯一性
        validateColorCode(rule, value, callback) {
            if (value) {
                const exists = this.customColors.some(color => 
                    color.color_code === value && color.id !== (this.editingColor?.id || null)
                );
                if (exists) {
                    callback(new Error('该颜色编号已存在！'));
                } else {
                    callback();
                }
            } else {
                callback();
            }
        },
        
        // 初始化表单（对话框打开时）
        initForm() {
            // 只在编辑模式下或已有分类时生成编号
            if (!this.editingColor && this.form.category_id && this.form.category_id !== 'other') {
                this.generateColorCode(this.form.category_id);
            }
        },
        
        // 分类改变时自动生成编号
        onCategoryChange(categoryId) {
            if (!this.editingColor && categoryId && categoryId !== 'other') {
                this.generateColorCode(categoryId);
            } else if (categoryId === 'other') {
                // 选择"其他"分类时清空编号，让用户自行输入
                this.form.color_code = '';
            }
        },
        
        // 生成颜色编号
        generateColorCode(categoryId) {
            const code = helpers.generateColorCode(this.categories, this.customColors, categoryId);
            this.form.color_code = code;
        },
        
        // 处理图片选择
        handleImageChange(file) {
            this.form.imageFile = file.raw;
            this.form.imagePreview = URL.createObjectURL(file.raw);
        },
        
        // 保存颜色（新增或修改）
        async saveColor() {
            const valid = await this.$refs.formRef.validate().catch(() => false);
            if (!valid) return;
            
            try {
                const formData = new FormData();
                
                // 处理分类ID（"其他"分类特殊处理）
                let actualCategoryId = this.form.category_id;
                if (actualCategoryId === 'other') {
                    // 对于"其他"分类，尝试根据编号前缀找到正确的分类
                    const prefix = this.form.color_code.substring(0, 2).toUpperCase();
                    const matchedCategory = this.categories.find(cat => cat.code === prefix);
                    if (matchedCategory) {
                        actualCategoryId = matchedCategory.id;
                    } else {
                        // 如果确实无法匹配，使用第一个分类或创建特殊标记
                        actualCategoryId = this.categories[0]?.id || 1;
                    }
                }
                
                formData.append('category_id', actualCategoryId);
                formData.append('color_code', this.form.color_code);
                formData.append('formula', this.form.formula);
                formData.append('applicable_layers', this.form.applicable_layers);
                if (this.form.imageFile) {
                    formData.append('image', this.form.imageFile);
                }
                
                if (this.editingColor) {
                    await api.customColors.update(this.editingColor.id, formData);
                    ElementPlus.ElMessage.success('修改成功');
                } else {
                    await api.customColors.create(formData);
                    ElementPlus.ElMessage.success('添加成功');
                }
                
                this.showAddDialog = false;
                this.resetForm();
                await this.globalData.loadCustomColors();
            } catch (error) {
                ElementPlus.ElMessage.error('操作失败');
            }
        },
        
        // 编辑颜色
        editColor(color) {
            this.editingColor = color;
            
            // 判断颜色是否属于"其他"分类
            const prefix = color.color_code.substring(0, 2).toUpperCase();
            const matchedCategory = this.categories.find(cat => cat.code === prefix);
            
            this.form = {
                category_id: matchedCategory ? color.category_id : 'other',
                color_code: color.color_code,
                formula: color.formula,
                applicable_layers: color.applicable_layers,
                imageFile: null,
                imagePreview: color.image_path ? `${this.baseURL}/${color.image_path}` : null
            };
            this.showAddDialog = true;
        },
        
        // 删除颜色
        async deleteColor(color) {
            try {
                await ElementPlus.ElMessageBox.confirm(
                    `确定删除 ${color.color_code} 吗？`,
                    '提示',
                    {
                        confirmButtonText: '确定',
                        cancelButtonText: '取消',
                        type: 'warning'
                    }
                );
                
                const response = await api.customColors.delete(color.id);
                
                ElementPlus.ElMessage.success('删除成功');
                await this.globalData.loadCustomColors();
            } catch (error) {
                // 检查是否是用户取消操作
                if (error === 'cancel' || error.message === 'cancel') {
                    return; // 用户取消，不显示错误信息
                }
                
                // 显示友好的错误提示
                if (error.response && error.response.data && error.response.data.error) {
                    // 从后端获取具体的错误信息
                    const errorMsg = error.response.data.error;
                    
                    // 根据不同的错误信息显示不同的提示
                    if (errorMsg.includes('配色方案使用')) {
                        ElementPlus.ElMessage.warning('该颜色正在被配色方案使用，无法删除');
                    } else if (errorMsg.includes('不存在')) {
                        ElementPlus.ElMessage.error('该颜色不存在');
                    } else {
                        ElementPlus.ElMessage.error(errorMsg);
                    }
                } else if (error.response && error.response.status === 404) {
                    ElementPlus.ElMessage.error('删除功能暂时不可用');
                } else if (error.request) {
                    ElementPlus.ElMessage.error('无法连接到服务器，请检查网络连接');
                } else {
                    ElementPlus.ElMessage.error('删除失败，请稍后重试');
                }
            }
        },
        
        // 查看历史（待实现）
        viewHistory(color) {
            ElementPlus.ElMessage.info('历史功能待实现');
        },
        
        // 重置表单
        resetForm() {
            this.editingColor = null;
            this.form = {
                category_id: '',
                color_code: '',
                formula: '',
                applicable_layers: '',
                imageFile: null,
                imagePreview: null
            };
            if (this.$refs.formRef) {
                this.$refs.formRef.resetFields();
            }
        },
        
        // 解析配方字符串为标签数组
        parseFormulaToTags(formulaString) {
            if (!formulaString || formulaString.trim() === '') {
                return [];
            }
            
            const tags = [];
            const parts = formulaString.trim().split(/\s+/);
            
            // 解析格式如："钛白 15g 天蓝update1 3g 深绿 1g"
            for (let i = 0; i < parts.length; i++) {
                // 检查当前项是否是数量+单位
                const amountMatch = parts[i].match(/^([\d.]+)([a-zA-Z\u4e00-\u9fa5]+)$/);
                
                if (amountMatch) {
                    // 如果是数量+单位，与前一个颜色名组合
                    if (tags.length > 0 && !tags[tags.length - 1].amount) {
                        const lastTag = tags[tags.length - 1];
                        lastTag.amount = amountMatch[1];
                        lastTag.unit = amountMatch[2];
                        lastTag.fullText = `${lastTag.colorName} ${amountMatch[1]}${amountMatch[2]}`;
                    }
                } else {
                    // 否则作为新的颜色名
                    tags.push({
                        colorName: parts[i],
                        amount: '',
                        unit: '',
                        fullText: parts[i]
                    });
                }
            }
            
            return tags;
        }
    }
};