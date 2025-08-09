// 自配颜色管理组件
// 文件路径: frontend/js/components/custom-colors.js
// 定义全局变量 CustomColorsComponent，被 app.js 引用并注册

const CustomColorsComponent = {
        props: {
            sortMode: { type: String, default: 'time' } // time | name
        },
        template: `
                <div>
                        <el-tabs v-model="activeCategory" class="category-tabs">
                                <el-tab-pane label="全部" name="all"></el-tab-pane>
                                <el-tab-pane 
                                        v-for="cat in categoriesWithOther" 
                                        :key="cat.id || 'other'"
                                        :label="cat.name" 
                                        :name="String(cat.id || 'other')"
                                ></el-tab-pane>
                        </el-tabs>
                        <div v-if="loading" class="loading"><el-icon class="is-loading"><Loading /></el-icon> 加载中...</div>
                        <div v-else>
                            <div v-if="filteredColors.length === 0" class="empty-message">暂无自配色，点击右上角“新自配色”添加</div>
                            <div v-for="color in filteredColors" :key="color.id" class="artwork-bar">
                                <div class="artwork-header">
                                    <div class="artwork-title">{{ color.color_code }}</div>
                                    <div class="color-actions">
                                        <el-button size="small" type="primary" @click="editColor(color)"><el-icon><Edit /></el-icon> 修改</el-button>
                                        <el-button size="small" @click="viewHistory(color)" disabled><el-icon><Clock /></el-icon> 历史</el-button>
                                        <el-button size="small" type="danger" @click="deleteColor(color)"><el-icon><Delete /></el-icon> 删除</el-button>
                                    </div>
                                </div>
                                                <div style="display:flex; gap:12px; padding:6px 4px 4px;">
                                                    <div class="scheme-thumbnail" :style="{
                                                        backgroundImage: color.image_path ? 'url(' + baseURL + '/' + color.image_path + ')' : 'none',
                                                        backgroundColor: color.image_path ? 'transparent' : '#f0f0f0'
                                                    }" :class="{ 'no-image': !color.image_path }" @click="color.image_path && $thumbPreview && $thumbPreview.show($event, baseURL + '/' + color.image_path)">
                                                        <template v-if="!color.image_path">未上传图片</template>
                                                    </div>
                                    <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;">
                                                            <div class="meta-text" v-if="color.formula">
                                                                <div class="mapping-formula-chips">
                                                                    <el-tooltip v-for="(seg,i) in formulaSegments(color.formula)" :key="'ccf'+color.id+'-'+i" :content="seg" placement="top">
                                                                        <span class="mf-chip">{{ seg }}</span>
                                                                    </el-tooltip>
                                                                </div>
                                                            </div>
                                           <div class="meta-text">分类：{{ categoryName(color) }}</div>
                                           <div class="meta-text" v-if="color.updated_at">更新：{{ formatDate(color.updated_at) }}</div>
                                        <div class="meta-text" v-else>（暂无配方）</div>
                    <div class="meta-text">适用层：
                                            <template v-if="usageGroups(color).length">
                        <span class="usage-chips">
                                                    <span v-for="g in usageGroups(color)" :key="'ug'+color.id+g" class="mf-chip usage-chip" :title="g">{{ g }}</span>
                                                </span>
                                            </template>
                                            <span v-else>（未使用）</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- 添加/编辑对话框 -->
            <el-dialog 
                v-model="showAddDialog" 
                                class="scheme-dialog"
                                :title="editingColor ? '修改自配色' : '添加自配色'"
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
                    <!-- 适用画层改为自动统计，不再手动输入 -->
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
                            <div class="scheme-thumbnail" :style="{ backgroundImage: 'url(' + form.imagePreview + ')', backgroundColor: 'transparent' }" @click="form.imagePreview && $thumbPreview && $thumbPreview.show($event, form.imagePreview)"></div>
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
            let list;
            if (this.activeCategory === 'all') {
                list = this.customColors.slice();
            } else if (this.activeCategory === 'other') {
                list = this.customColors.filter(color => {
                    const prefix = color.color_code.substring(0, 2).toUpperCase();
                    const matchedCategory = this.categories.find(cat => cat.code === prefix);
                    return !matchedCategory;
                });
            } else {
                list = this.customColors.filter(c => c.category_id === parseInt(this.activeCategory));
            }
            // 排序
            if (this.sortMode === 'name') {
                list.sort((a,b) => (a.color_code||'').localeCompare(b.color_code||''));
            } else { // time 默认
                list.sort((a,b) => new Date(b.updated_at||b.created_at||0) - new Date(a.updated_at||a.created_at||0));
            }
            return list;
        },
        // 从注入的全局数据获取颜色原料库
        montMarteColors() {
            return this.globalData.montMarteColors.value || [];
        }
    },
    
    methods: {
        formatDate(ts) {
            if (!ts) return '';
            const d = new Date(ts);
            const p = n => n < 10 ? '0'+n : ''+n;
            return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
        },
        artworkTitle(art) {
            if (!art) return '';
            const code = art.code || art.no || '';
            const name = art.name || art.title || '';
            if (code && name) return `${code}-${name}`;
            return code || name || `作品#${art.id}`;
        },
        usageGroups(color) {
            if (!color) return [];
            const code = color.color_code;
            if (!code) return [];
            const artworks = (this.globalData.artworks?.value) || [];
            const groups = [];
            artworks.forEach(a => {
                (a.schemes || []).forEach(s => {
                    const layers = [];
                    (s.layers || []).forEach(l => {
                        if (l.colorCode === code) {
                            const num = Number(l.layer);
                            if (Number.isFinite(num)) layers.push(num);
                        }
                    });
                    if (layers.length) {
                        layers.sort((x,y)=>x-y);
                        const schemeName = s.name || s.scheme_name || '-';
                        const header = `${this.artworkTitle(a)}-[${schemeName}]`;
                        const suffix = layers.map(n=>`(${n})`).join('');
                        groups.push(header + suffix);
                    }
                });
            });
            return groups;
        },
        categoryName(color) {
            if (!color) return '-';
            const cat = this.categories.find(c => c.id === color.category_id);
            if (cat) return cat.name;
            // 前缀推断
            const prefix = (color.color_code || '').substring(0,2).toUpperCase();
            const byPrefix = this.categories.find(c => c.code === prefix);
            return byPrefix ? byPrefix.name : '其他';
        },
        formulaSegments(formula) {
            const str = (formula || '').trim();
            if (!str) return [];
            const parts = str.split(/\s+/);
            const segs = [];
            let pending = null;
            for (const t of parts) {
                const m = t.match(/^([\d.]+)([a-zA-Z\u4e00-\u9fa5%]+)$/);
                if (m && pending) {
                    segs.push(pending + ' ' + m[1] + m[2]);
                    pending = null;
                } else {
                    if (pending) segs.push(pending);
                    pending = t;
                }
            }
            if (pending) segs.push(pending);
            return segs;
        },
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
                // 先刷新自配色，再刷新作品（同步更新作品方案中引用的自配色编号）
                await this.globalData.loadCustomColors();
                await this.globalData.loadArtworks();
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
                // 删除后也刷新作品（虽然后端阻止引用中删除，这里保持一致）
                await this.globalData.loadArtworks();
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