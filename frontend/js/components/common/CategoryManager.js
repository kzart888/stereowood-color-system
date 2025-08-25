// 通用分类管理组件
// 文件路径: frontend/js/components/common/CategoryManager.js
// 用于自配色色系管理和颜料分类管理

const CategoryManagerComponent = {
    props: {
        // 分类数据
        categories: {
            type: Array,
            required: true
        },
        // 当前激活的分类
        activeCategory: {
            type: String,
            default: 'all'
        },
        // 分类类型，用于区分API路由
        categoryType: {
            type: String, // 'color_categories' | 'material_categories'
            required: true
        },
        // 是否显示管理按钮
        showManagement: {
            type: Boolean,
            default: true
        },
        // 检查分类是否可删除的函数
        canDelete: {
            type: Function,
            default: () => true
        }
    },
    
    emits: ['category-change', 'categories-updated'],
    
    template: `
        <div class="category-manager">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: var(--sw-gap-xl);">
                <div class="category-switch-group" role="tablist" aria-label="分类筛选">
                    <!-- 全部按钮 -->
                    <button 
                        type="button" 
                        class="category-switch" 
                        :class="{active: activeCategory==='all'}" 
                        @click="$emit('category-change', 'all')"
                        role="tab"
                        :aria-selected="activeCategory==='all'"
                    >全部</button>
                    
                    <!-- 分类按钮 -->
                    <button 
                        v-for="cat in sortedCategories" 
                        :key="cat.id || cat.value || 'other'"
                        type="button"
                        class="category-switch"
                        :class="{active: activeCategory===String(cat.id || cat.value || 'other')}"
                        @click="$emit('category-change', String(cat.id || cat.value || 'other'))"
                        @contextmenu.prevent="showCategoryMenu($event, cat)"
                        role="tab"
                        :aria-selected="activeCategory===String(cat.id || cat.value || 'other')"
                    >{{ cat.name || cat.label }}</button>
                </div>
                
                <!-- 管理按钮组 -->
                <div style="display: flex; gap: 0; margin-left: auto;">
                    <el-button 
                        v-if="showManagement"
                        size="small" 
                        @click="showAddDialog = true"
                        title="添加分类"
                        style="margin-left: 0 !important;"
                    >
                        <el-icon><Plus /></el-icon>
                    </el-button>
                    
                    <el-button 
                        v-if="showManagement"
                        size="small" 
                        @click="showManageDialog = true"
                        title="管理分类"
                        style="margin-left: 0 !important;"
                    >
                        <el-icon><Setting /></el-icon>
                    </el-button>
                </div>
            </div>
            
            <!-- 右键菜单 -->
            <div 
                v-if="contextMenu.visible" 
                class="category-context-menu"
                :style="{left: contextMenu.x + 'px', top: contextMenu.y + 'px'}"
                @click.stop
            >
                <div class="context-menu-item" @click="editCategory(contextMenu.category)">
                    <el-icon><Edit /></el-icon> 重命名
                </div>
                <div 
                    class="context-menu-item danger" 
                    @click="deleteCategory(contextMenu.category)"
                    :class="{disabled: !canDeleteCategory(contextMenu.category)}"
                >
                    <el-icon><Delete /></el-icon> 删除
                </div>
            </div>
            
            <!-- 添加分类对话框 -->
            <el-dialog 
                v-model="showAddDialog" 
                title="添加分类" 
                width="400px"
                :close-on-click-modal="false"
                @opened="onAddDialogOpened"
                @keydown.esc="showAddDialog = false"
            >
                <el-form :model="addForm" :rules="addRules" ref="addFormRef" label-width="80px" @keydown.enter.prevent="handleAddDialogEnter">
                    <el-form-item label="分类名称" prop="name">
                        <el-input 
                            ref="addNameInput"
                            v-model="addForm.name" 
                            placeholder="请输入分类名称" 
                            @input="generateCodeFromName" 
                        />
                    </el-form-item>
                    <el-form-item v-if="categoryType === 'categories'" label="分类代码" prop="code">
                        <el-input 
                            ref="addCodeInput"
                            v-model="addForm.code" 
                            placeholder="如: BL（自动生成）" 
                            maxlength="2" 
                        />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="showAddDialog = false">取消</el-button>
                    <el-button type="primary" @click="addCategory">确定</el-button>
                </template>
            </el-dialog>
            
            <!-- 编辑分类对话框 -->
            <el-dialog 
                v-model="showEditDialog" 
                title="编辑分类" 
                width="400px"
                :close-on-click-modal="false"
                @opened="onEditDialogOpened"
                @keydown.esc="showEditDialog = false"
            >
                <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="80px" @keydown.enter.prevent="handleEditDialogEnter">
                    <el-form-item label="分类名称" prop="name">
                        <el-input 
                            ref="editNameInput"
                            v-model="editForm.name" 
                            placeholder="请输入分类名称" 
                        />
                    </el-form-item>
                    <el-form-item v-if="categoryType === 'categories'" label="分类代码" prop="code">
                        <el-input 
                            ref="editCodeInput"
                            v-model="editForm.code" 
                            placeholder="如: BL" 
                            maxlength="2" 
                        />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="showEditDialog = false">取消</el-button>
                    <el-button type="primary" @click="updateCategory">确定</el-button>
                </template>
            </el-dialog>
            
            <!-- 管理分类对话框 -->
            <el-dialog 
                v-model="showManageDialog" 
                title="分类管理" 
                width="800px"
                :close-on-click-modal="false"
                @keydown.esc="showManageDialog = false"
            >
                <el-tabs v-model="activeManageTab">
                    <el-tab-pane label="分类排序" name="categories">
                        <div class="manage-dialog-header">
                            <p class="hint-text">拖拽分类项目可调整显示顺序</p>
                        </div>
                        <div class="category-list" ref="categoryListRef">
                            <div 
                                v-for="(cat, index) in manageCategoriesList" 
                                :key="cat.id || cat.value" 
                                class="category-item draggable-item"
                                :data-index="index"
                                draggable="true"
                                @dragstart="handleDragStart($event, index)"
                                @dragover.prevent
                                @drop="handleDrop($event, index)"
                                @dragend="handleDragEnd"
                            >
                                <div class="drag-handle">
                                    <el-icon><Menu /></el-icon>
                                </div>
                                <span class="category-name">{{ cat.name || cat.label }}</span>
                                <div class="category-actions">
                                    <el-button size="small" @click="editCategory(cat)">
                                        <el-icon><Edit /></el-icon> 重命名
                                    </el-button>
                                    <el-button 
                                        size="small" 
                                        type="danger" 
                                        @click="deleteCategory(cat)"
                                        :disabled="!canDeleteCategory(cat)"
                                    >
                                        <el-icon><Delete /></el-icon> 删除
                                    </el-button>
                                </div>
                            </div>
                        </div>
                        <div class="manage-footer" style="margin-top: 20px;">
                            <el-button @click="resetOrder">重置顺序</el-button>
                            <el-button type="primary" @click="saveOrder">保存顺序</el-button>
                        </div>
                    </el-tab-pane>
                    
                    <el-tab-pane label="分类规则" name="rules" v-if="categoryType === 'categories'">
                        <div class="rules-header">
                            <p class="hint-text">配置自动分类和编号生成规则</p>
                            <el-button type="primary" size="small" @click="showAddRuleDialog">
                                <el-icon><Plus /></el-icon> 添加规则
                            </el-button>
                        </div>
                        <div class="rules-list">
                            <el-table :data="classificationRules" style="width: 100%" size="small">
                                <el-table-column prop="rule_name" label="规则名称" width="150"></el-table-column>
                                <el-table-column prop="rule_type" label="规则类型" width="120">
                                    <template #default="{ row }">
                                        <el-tag :type="row.rule_type === 'color_code_generation' ? 'primary' : 'success'" size="small">
                                            {{ row.rule_type === 'color_code_generation' ? '编号生成' : '自动分类' }}
                                        </el-tag>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="category_name" label="目标分类" width="100"></el-table-column>
                                <el-table-column prop="pattern" label="匹配规则" show-overflow-tooltip></el-table-column>
                                <el-table-column prop="priority" label="优先级" width="80"></el-table-column>
                                <el-table-column prop="is_active" label="状态" width="80">
                                    <template #default="{ row }">
                                        <el-switch 
                                            v-model="row.is_active" 
                                            @change="toggleRule(row)"
                                            size="small"
                                        ></el-switch>
                                    </template>
                                </el-table-column>
                                <el-table-column label="操作" width="120">
                                    <template #default="{ row }">
                                        <el-button size="small" @click="editRule(row)">编辑</el-button>
                                        <el-button size="small" type="danger" @click="deleteRule(row)">删除</el-button>
                                    </template>
                                </el-table-column>
                            </el-table>
                        </div>
                    </el-tab-pane>
                </el-tabs>
                
                <template #footer>
                    <el-button @click="showManageDialog = false">关闭</el-button>
                </template>
            </el-dialog>
        </div>
    `,
    
    data() {
        return {
            showAddDialog: false,
            showEditDialog: false,
            showManageDialog: false,
            activeManageTab: 'categories',
            classificationRules: [],
            contextMenu: {
                visible: false,
                x: 0,
                y: 0,
                category: null
            },
            addForm: {
                name: '',
                code: ''
            },
            editForm: {
                id: null,
                name: '',
                code: ''
            },
            addRules: {
                name: [
                    { required: true, message: '请输入分类名称', trigger: 'blur' }
                ],
                code: [
                    { pattern: /^[A-Z]{1,2}$/, message: '代码应为1-2个大写字母', trigger: 'blur' }
                ]
            },
            editRules: {
                name: [
                    { required: true, message: '请输入分类名称', trigger: 'blur' }
                ],
                code: [
                    { pattern: /^[A-Z]{1,2}$/, message: '代码应为1-2个大写字母', trigger: 'blur' }
                ]
            },
            // 拖拽排序相关数据
            manageCategoriesList: [],
            dragData: {
                dragIndex: null,
                originalOrder: []
            }
        }
    },
    
    computed: {
        // 排序后的分类列表（按创建时间或顺序号排序）
        sortedCategories() {
            const cats = [...this.categories];
            
            // 强制按 order/order_index 排序，不管后端是否已排序
            cats.sort((a, b) => {
                // 获取排序值，兼容多个字段名
                const getOrderValue = (cat) => {
                    if (cat.order !== undefined && cat.order !== null) return cat.order;
                    if (cat.order_index !== undefined && cat.order_index !== null) return cat.order_index;
                    if (cat.sort_order !== undefined && cat.sort_order !== null) return cat.sort_order;
                    return 999; // 没有排序值的放到最后
                };
                
                const aOrder = getOrderValue(a);
                const bOrder = getOrderValue(b);
                
                // 如果排序值相同，按创建时间排序
                if (aOrder === bOrder) {
                    const aTime = new Date(a.created_at || a.first_used || 0);
                    const bTime = new Date(b.created_at || b.first_used || 0);
                    return aTime - bTime;
                }
                
                return aOrder - bOrder;
            });
            
            return cats;
        }
    },
    
    watch: {
        // 监听管理对话框开启，初始化管理列表
        showManageDialog(newVal) {
            if (newVal) {
                this.initializeManageList();
                if (this.categoryType === 'categories') {
                    // 延迟加载规则数据，避免组件初始化冲突
                    this.$nextTick(() => {
                        setTimeout(() => {
                            this.loadClassificationRules();
                        }, 100);
                    });
                }
            }
        },
        
        // 监听分类数据变化，更新管理列表
        categories: {
            handler() {
                // 如果管理对话框是打开的，重新初始化列表
                if (this.showManageDialog) {
                    this.initializeManageList();
                }
            },
            deep: true
        }
    },
    
    mounted() {
        // 监听点击事件隐藏右键菜单
        document.addEventListener('click', this.hideContextMenu)
    },
    
    beforeUnmount() {
        document.removeEventListener('click', this.hideContextMenu)
    },
    
    methods: {
        // 显示右键菜单
        showCategoryMenu(event, category) {
            // 移除特殊分类限制，所有分类都可以显示右键菜单
            this.contextMenu = {
                visible: true,
                x: event.clientX,
                y: event.clientY,
                category: category
            }
        },
        
        // 隐藏右键菜单
        hideContextMenu() {
            this.contextMenu.visible = false
        },
        
        // 根据名称自动生成代码
        generateCodeFromName() {
            if (this.categoryType !== 'categories') return;
            if (!this.addForm.name) {
                this.addForm.code = '';
                return;
            }
            
            // 简单的拼音转换逻辑
            const nameToCode = {
                '蓝': 'BU', '蓝色': 'BU', '蓝色系': 'BU',
                '绿': 'GN', '绿色': 'GN', '绿色系': 'GN', 
                '红': 'RD', '红色': 'RD', '红色系': 'RD',
                '紫': 'VT', '紫色': 'VT', '紫色系': 'VT',
                '黄': 'YE', '黄色': 'YE', '黄色系': 'YE',
                '橙': 'OR', '橙色': 'OR', '橙色系': 'OR',
                '粉': 'PK', '粉色': 'PK', '粉色系': 'PK',
                '棕': 'BR', '棕色': 'BR', '棕色系': 'BR',
                '灰': 'GR', '灰色': 'GR', '灰色系': 'GR',
                '黑': 'BK', '黑色': 'BK', '黑色系': 'BK',
                '白': 'WH', '白色': 'WH', '白色系': 'WH'
            };
            
            // 尝试匹配预设
            for (const [name, code] of Object.entries(nameToCode)) {
                if (this.addForm.name.includes(name)) {
                    this.addForm.code = code;
                    return;
                }
            }
            
            // 如果没有匹配，使用首字母
            const name = this.addForm.name.trim();
            if (name.length >= 2) {
                // 取前两个字符的拼音首字母（简化处理）
                this.addForm.code = name.substring(0, 2).toUpperCase();
            } else {
                this.addForm.code = name.charAt(0).toUpperCase();
            }
        },
        
        // 检查是否可以删除分类
        canDeleteCategory(category) {
            return this.canDelete(category)
        },
        
        // 添加对话框打开后聚焦到第一个输入框
        onAddDialogOpened() {
            this.$nextTick(() => {
                this.$refs.addNameInput?.focus();
            });
        },
        
        // 处理添加对话框的回车键逻辑
        async handleAddDialogEnter() {
            // 自配色页面逻辑（有两个输入框）
            if (this.categoryType === 'categories') {
                // 如果当前焦点在分类名称输入框
                const nameInput = this.$refs.addNameInput;
                const codeInput = this.$refs.addCodeInput;
                
                if (document.activeElement === nameInput.$el.querySelector('input')) {
                    if (this.addForm.name.trim()) {
                        // 有内容，跳转到代码输入框
                        this.$nextTick(() => {
                            codeInput?.focus();
                        });
                    } else {
                        // 没有内容，触发验证
                        try {
                            await this.$refs.addFormRef.validateField('name');
                        } catch (error) {
                            // 验证失败，保持在当前输入框
                        }
                    }
                } else {
                    // 在代码输入框，直接保存
                    await this.addCategory();
                }
            } else {
                // 颜料页面逻辑（只有一个输入框）
                if (this.addForm.name.trim()) {
                    // 有内容，直接保存
                    await this.addCategory();
                } else {
                    // 没有内容，触发验证
                    try {
                        await this.$refs.addFormRef.validateField('name');
                    } catch (error) {
                        // 验证失败，保持在当前输入框
                    }
                }
            }
        },
        
        // 编辑对话框打开后聚焦到第一个输入框
        onEditDialogOpened() {
            this.$nextTick(() => {
                this.$refs.editNameInput?.focus();
            });
        },
        
        // 处理编辑对话框的回车键逻辑
        async handleEditDialogEnter() {
            // 自配色页面逻辑（有两个输入框）
            if (this.categoryType === 'categories') {
                // 如果当前焦点在分类名称输入框
                const nameInput = this.$refs.editNameInput;
                const codeInput = this.$refs.editCodeInput;
                
                if (document.activeElement === nameInput.$el.querySelector('input')) {
                    if (this.editForm.name.trim()) {
                        // 有内容，跳转到代码输入框
                        this.$nextTick(() => {
                            codeInput?.focus();
                        });
                    } else {
                        // 没有内容，触发验证
                        try {
                            await this.$refs.editFormRef.validateField('name');
                        } catch (error) {
                            // 验证失败，保持在当前输入框
                        }
                    }
                } else {
                    // 在代码输入框，直接保存
                    await this.updateCategory();
                }
            } else {
                // 颜料页面逻辑（只有一个输入框）
                if (this.editForm.name.trim()) {
                    // 有内容，直接保存
                    await this.updateCategory();
                } else {
                    // 没有内容，触发验证
                    try {
                        await this.$refs.editFormRef.validateField('name');
                    } catch (error) {
                        // 验证失败，保持在当前输入框
                    }
                }
            }
        },
        
        // 添加分类
        async addCategory() {
            const valid = await this.$refs.addFormRef.validate().catch(() => false)
            if (!valid) return
            
            try {
                let payload;
                if (this.categoryType === 'categories') {
                    // 自配色分类
                    payload = {
                        name: this.addForm.name,
                        code: this.addForm.code
                    };
                } else {
                    // 颜料分类 - 只发送名称，后端自动生成value
                    payload = {
                        name: this.addForm.name
                    };
                }
                
                const response = await fetch(`/api/${this.categoryType}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '添加失败');
                }
                
                ElementPlus.ElMessage.success('分类添加成功')
                this.showAddDialog = false
                this.addForm = { name: '', code: '' }
                this.$emit('categories-updated')
            } catch (error) {
                ElementPlus.ElMessage.error(error.message || '添加分类失败')
            }
        },
        
        // 编辑分类
        editCategory(category) {
            this.editForm = {
                id: category.id || category.value,
                name: category.name || category.label,
                code: category.code || ''
            }
            this.showEditDialog = true
            this.hideContextMenu()
        },
        
        // 更新分类
        async updateCategory() {
            const valid = await this.$refs.editFormRef.validate().catch(() => false)
            if (!valid) return
            
            try {
                let payload;
                if (this.categoryType === 'categories') {
                    // 自配色分类
                    payload = {
                        name: this.editForm.name,
                        code: this.editForm.code
                    };
                } else {
                    // 颜料分类 - 只更新标签
                    payload = {
                        value: this.editForm.id, // 保持原value不变
                        label: this.editForm.name
                    };
                }
                
                const response = await fetch(`/api/${this.categoryType}/${this.editForm.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '更新失败');
                }
                
                const result = await response.json();
                
                // 检查是否有警告信息（色系代码变更）
                if (result.warning && result.warning.type === 'code_changed') {
                    const warning = result.warning;
                    await ElementPlus.ElMessageBox.alert(
                        `${warning.message}\n\n注意：现有自配色的编号规则和自动分类逻辑可能需要手动调整。建议在系统设置中配置新的分类规则。`,
                        '重要提醒',
                        { 
                            type: 'warning',
                            dangerouslyUseHTMLString: false
                        }
                    );
                }
                
                ElementPlus.ElMessage.success('分类更新成功')
                this.showEditDialog = false
                this.$emit('categories-updated')
            } catch (error) {
                ElementPlus.ElMessage.error(error.message || '更新分类失败')
            }
        },
        
        // 删除分类
        async deleteCategory(category) {
            if (!this.canDeleteCategory(category)) {
                ElementPlus.ElMessage.warning('该分类下还有项目，无法删除')
                return
            }
            
            try {
                await ElementPlus.ElMessageBox.confirm(
                    `确定要删除分类"${category.name || category.label}"吗？`,
                    '删除确认',
                    { type: 'warning' }
                )
                
                const response = await fetch(`/api/${this.categoryType}/${category.id || category.value}`, {
                    method: 'DELETE'
                })
                
                if (!response.ok) throw new Error('删除失败')
                
                ElementPlus.ElMessage.success('分类删除成功')
                this.hideContextMenu()
                this.$emit('categories-updated')
            } catch (error) {
                if (error === 'cancel') return
                ElementPlus.ElMessage.error(error.message || '删除分类失败')
            }
        },
        
        // 初始化管理列表
        initializeManageList() {
            this.manageCategoriesList = [...this.sortedCategories];
            this.dragData.originalOrder = this.manageCategoriesList.map((cat, index) => ({
                ...cat,
                originalIndex: index
            }));
        },
        
        // 拖拽开始
        handleDragStart(event, index) {
            this.dragData.dragIndex = index;
            event.dataTransfer.effectAllowed = 'move';
            event.target.style.opacity = '0.5';
        },
        
        // 拖拽结束
        handleDragEnd(event) {
            event.target.style.opacity = '1';
            this.dragData.dragIndex = null;
        },
        
        // 拖拽放置
        handleDrop(event, dropIndex) {
            event.preventDefault();
            const dragIndex = this.dragData.dragIndex;
            
            if (dragIndex === null || dragIndex === dropIndex) {
                return;
            }
            
            // 重新排列数组
            const draggedItem = this.manageCategoriesList.splice(dragIndex, 1)[0];
            this.manageCategoriesList.splice(dropIndex, 0, draggedItem);
        },
        
        // 重置顺序
        resetOrder() {
            this.manageCategoriesList = [...this.dragData.originalOrder];
        },
        
        // 保存顺序
        async saveOrder() {
            try {
                // 构造顺序更新的请求数据 - 包含所有分类
                const allCategories = [...this.categories]; // 使用原始分类数据
                const orderUpdates = [];
                
                // 首先为管理列表中的项目分配顺序
                let orderIndex = 0;
                this.manageCategoriesList.forEach((cat, index) => {
                    // 移除虚拟分类限制，所有分类都参与排序
                    orderUpdates.push({
                        id: cat.id || cat.value,
                        order: orderIndex++
                    });
                });
                
                // 然后为不在管理列表中的项目分配后续顺序
                let nextOrder = orderIndex;
                allCategories.forEach(cat => {
                    const catId = cat.id || cat.value;
                    // 移除虚拟分类限制
                    
                    const alreadyUpdated = orderUpdates.some(update => update.id === catId);
                    if (!alreadyUpdated) {
                        orderUpdates.push({
                            id: catId,
                            order: nextOrder++
                        });
                    }
                });
                
                const response = await fetch(`/api/${this.categoryType}/reorder`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orders: orderUpdates })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '保存顺序失败');
                }
                
                ElementPlus.ElMessage.success('分类顺序已保存');
                this.showManageDialog = false;
                this.$emit('categories-updated');
            } catch (error) {
                ElementPlus.ElMessage.error(error.message || '保存顺序失败');
            }
        },
        
        // 加载分类规则
        async loadClassificationRules() {
            try {
                // 确保对话框已经完全打开
                if (!this.showManageDialog) return;
                
                const response = await fetch('/api/classification-rules');
                if (response.ok) {
                    const rules = await response.json();
                    this.classificationRules = rules;
                } else {
                    console.warn('加载分类规则失败，状态码:', response.status);
                    this.classificationRules = []; // 设置为空数组避免渲染错误
                }
            } catch (error) {
                console.warn('加载分类规则异常:', error.message);
                this.classificationRules = []; // 设置为空数组避免渲染错误
            }
        },
        
        // 显示添加规则对话框
        showAddRuleDialog() {
            ElementPlus.ElMessage.info('规则管理功能正在完善中，敬请期待');
        },
        
        // 编辑规则
        editRule(rule) {
            ElementPlus.ElMessage.info('规则编辑功能正在完善中，敬请期待');
        },
        
        // 切换规则状态
        async toggleRule(rule) {
            try {
                const response = await fetch(`/api/classification-rules/${rule.id}/toggle`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    const result = await response.json();
                    ElementPlus.ElMessage.success(result.message);
                    await this.loadClassificationRules(); // 重新加载规则列表
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '切换规则状态失败');
                }
            } catch (error) {
                // 恢复原状态
                rule.is_active = !rule.is_active;
                ElementPlus.ElMessage.error(error.message || '切换规则状态失败');
            }
        },
        
        // 删除规则
        async deleteRule(rule) {
            try {
                await ElementPlus.ElMessageBox.confirm(
                    `确定要删除规则"${rule.rule_name}"吗？`,
                    '删除确认',
                    { type: 'warning' }
                );
                
                const response = await fetch(`/api/classification-rules/${rule.id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    ElementPlus.ElMessage.success('规则删除成功');
                    await this.loadClassificationRules(); // 重新加载规则列表
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '删除失败');
                }
            } catch (error) {
                if (error === 'cancel') return;
                ElementPlus.ElMessage.error(error.message || '删除规则失败');
            }
        }
    }
}

// 添加样式
const categoryManagerStyles = `
<style>
.category-manager {
    position: relative;
}

.manage-dialog-header {
    margin-bottom: var(--sw-gap-lg);
}

.hint-text {
    margin: 0;
    padding: var(--sw-gap-md) var(--sw-gap-lg);
    background: var(--sw-bg-light);
    border-radius: var(--sw-radius-sm);
    font-size: 13px;
    color: var(--sw-text-secondary);
    border-left: 3px solid var(--sw-primary);
}

.draggable-item {
    transition: all var(--sw-transition-base);
    border-radius: var(--sw-radius-sm);
    margin-bottom: var(--sw-gap-sm);
}

.draggable-item:hover {
    background: var(--sw-bg-light);
    box-shadow: var(--sw-shadow-light);
}

.draggable-item.dragging {
    opacity: 0.5;
    transform: rotate(2deg);
    box-shadow: var(--sw-shadow-base);
}

.drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    cursor: grab;
    color: var(--sw-text-muted);
    border-radius: var(--sw-radius-xs);
    transition: all var(--sw-transition-base);
}

.drag-handle:hover {
    background: var(--sw-primary-light);
    color: var(--sw-primary);
}

.drag-handle:active {
    cursor: grabbing;
}

.category-context-menu {
    position: fixed;
    background: white;
    border: 1px solid var(--sw-border-base);
    border-radius: var(--sw-radius-md);
    box-shadow: var(--sw-shadow-dialog);
    z-index: 9999;
    padding: var(--sw-gap-sm) 0;
    min-width: 120px;
}

.context-menu-item {
    padding: var(--sw-gap-lg) var(--sw-gap-xl);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--sw-gap-md);
    font-size: 13px;
    transition: background-color var(--sw-transition-base);
}

.context-menu-item:hover {
    background: var(--sw-bg-light);
}

.context-menu-item.danger {
    color: var(--sw-danger);
}

.context-menu-item.disabled {
    color: var(--sw-text-disabled);
    cursor: not-allowed;
}

.context-menu-item.disabled:hover {
    background: transparent;
}

.category-list {
    max-height: 400px;
    overflow-y: auto;
}

.category-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--sw-gap-xl) 0;
    border-bottom: 1px solid var(--sw-border-light);
}

.category-item:last-child {
    border-bottom: none;
}

.category-name {
    font-weight: 500;
    color: var(--sw-text-primary);
}

.category-actions {
    display: flex;
    gap: var(--sw-actions-gap);
}

.rules-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.rules-header .hint-text {
    margin: 0;
    font-size: 14px;
    color: var(--sw-text-secondary);
}

.rules-list {
    border: 1px solid var(--sw-border-light);
    border-radius: var(--sw-radius-sm);
    overflow: hidden;
}
</style>
`

// 将样式添加到页面
if (!document.getElementById('category-manager-styles')) {
    const styleElement = document.createElement('div')
    styleElement.id = 'category-manager-styles'
    styleElement.innerHTML = categoryManagerStyles
    document.head.appendChild(styleElement)
}

// 导出组件
window.CategoryManagerComponent = CategoryManagerComponent