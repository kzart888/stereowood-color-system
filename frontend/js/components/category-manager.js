// Category Manager Component
// Reusable component for managing categories in both custom colors and Mont-Marte materials
const CategoryManagerComponent = {
    name: 'CategoryManager',
    template: `
        <el-dialog
            v-model="dialogVisible"
            :title="dialogTitle"
            width="90%"
            :style="{ maxWidth: '800px' }"
            class="category-manager-dialog"
            @close="handleClose"
            :close-on-click-modal="false"
            :close-on-press-escape="true"
        >
            <!-- Add New Category Section -->
            <div class="category-add-section">
                <el-form inline @submit.native.prevent="addCategory">
                    <el-form-item 
                        label="新分类名称:"
                        :error="validationError"
                    >
                        <el-input
                            v-model="newCategoryName"
                            placeholder="输入分类名称 (2-20个字符)"
                            :maxlength="20"
                            clearable
                            ref="newCategoryInput"
                            :class="{ 'is-error': validationError }"
                        />
                    </el-form-item>
                    <el-form-item 
                        label="代码:"
                        :error="codeValidationError"
                    >
                        <el-input
                            v-model="newCategoryCode"
                            placeholder="2-4位字母/数字"
                            :maxlength="4"
                            style="width: 120px"
                            :class="{ 'is-error': codeValidationError }"
                        />
                        <el-tooltip content="如: BU, YW, BW001等" placement="top">
                            <el-icon style="margin-left: 4px; color: #909399;"><InfoFilled /></el-icon>
                        </el-tooltip>
                    </el-form-item>
                    <el-form-item>
                        <el-button 
                            type="primary" 
                            @click="addCategory"
                            :loading="adding"
                            :disabled="!newCategoryName.trim() || !!validationError || !!codeValidationError"
                        >
                            <el-icon><Plus /></el-icon>
                            添加分类
                        </el-button>
                    </el-form-item>
                    <div v-if="validationError || codeValidationError" class="validation-error-text">
                        {{ validationError || codeValidationError }}
                    </div>
                </el-form>
            </div>

            <!-- Category List Table -->
            <div class="category-list-section">
                <el-table
                    :data="sortableCategories"
                    v-loading="loading"
                    stripe
                    border
                    style="width: 100%"
                    row-key="id"
                    empty-text="暂无分类"
                >
                    <!-- Drag Handle Column -->
                    <el-table-column
                        width="50"
                        align="center"
                        class-name="drag-column"
                    >
                        <template #default="{ row, $index }">
                            <span 
                                class="drag-handle"
                                :draggable="true"
                                @dragstart="handleDragStart($index, $event)"
                                @dragover.prevent="handleDragOver($index, $event)"
                                @drop="handleDrop($index, $event)"
                                @dragend="handleDragEnd"
                                title="拖动排序"
                            >
                                ≡
                            </span>
                        </template>
                    </el-table-column>

                    <!-- Category Name Column -->
                    <el-table-column
                        prop="name"
                        label="分类名称"
                        min-width="150"
                    >
                        <template #default="{ row }">
                            <div v-if="editingId === row.id" class="inline-edit-wrapper">
                                <div class="inline-edit">
                                    <el-input
                                        v-model="editingName"
                                        size="small"
                                        @keyup.enter="!editValidationError && saveRename(row)"
                                        @keyup.esc="cancelEdit"
                                        ref="editInput"
                                        :maxlength="20"
                                        :class="{ 'is-error': editValidationError }"
                                        placeholder="2-20个字符"
                                    />
                                    <el-button 
                                        size="small" 
                                        type="primary" 
                                        @click="saveRename(row)"
                                        :loading="saving"
                                        :disabled="!!editValidationError"
                                    >
                                        保存
                                    </el-button>
                                    <el-button size="small" @click="cancelEdit">取消</el-button>
                                </div>
                                <div v-if="editValidationError" class="edit-validation-error">
                                    {{ editValidationError }}
                                </div>
                            </div>
                            <div v-else class="category-name-display">
                                <span>{{ row.name }}</span>
                            </div>
                        </template>
                    </el-table-column>

                    <!-- Category Code Column -->
                    <el-table-column
                        prop="code"
                        label="代码"
                        width="120"
                        align="center"
                    >
                        <template #default="{ row }">
                            <div v-if="editingId === row.id" class="inline-edit">
                                <el-input
                                    v-model="editingCode"
                                    size="small"
                                    @keyup.enter="!editValidationError && saveRename(row)"
                                    @keyup.esc="cancelEdit"
                                    :maxlength="4"
                                    :class="{ 'is-error': codeEditValidationError }"
                                    placeholder="2-4位"
                                    style="width: 80px"
                                />
                            </div>
                            <span v-else>{{ row.code }}</span>
                        </template>
                    </el-table-column>

                    <!-- Item Count Column -->
                    <el-table-column
                        label="项目数"
                        width="80"
                        align="center"
                    >
                        <template #default="{ row }">
                            <el-tag :type="getCountType(row)">
                                {{ getItemCount(row) }}
                            </el-tag>
                        </template>
                    </el-table-column>

                    <!-- Actions Column -->
                    <el-table-column
                        label="操作"
                        width="180"
                        align="center"
                        fixed="right"
                    >
                        <template #default="{ row }">
                            <div class="category-actions">
                                <el-button
                                        size="small"
                                    @click="startEdit(row)"
                                    :disabled="editingId !== null"
                                >
                                    <el-icon><Edit /></el-icon>
                                    重命名
                                </el-button>
                                <el-button
                                        size="small"
                                    type="danger"
                                    @click="deleteCategory(row)"
                                    :disabled="getItemCount(row) > 0"
                                >
                                    <el-icon><Delete /></el-icon>
                                    删除
                                </el-button>
                            </div>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <!-- Dialog Footer -->
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="handleClose">关闭</el-button>
                </div>
            </template>
        </el-dialog>
    `,

    props: {
        visible: {
            type: Boolean,
            required: true
        },
        categoryType: {
            type: String,
            required: true,
            validator: value => ['colors', 'materials'].includes(value)
        },
        categories: {
            type: Array,
            required: true
        }
    },

    data() {
        return {
            dialogVisible: false,
            loading: false,
            adding: false,
            saving: false,
            newCategoryName: '',
            newCategoryCode: '',
            editingId: null,
            editingName: '',
            editingCode: '',
            draggedIndex: null,
            sortableCategories: [],
            dropTargetIndex: null,
            validationError: '',
            codeValidationError: '',
            editValidationError: '',
            codeEditValidationError: ''
        };
    },

    computed: {
        dialogTitle() {
            return this.categoryType === 'colors' ? '管理自配色分类' : '管理原料分类';
        },

        apiEndpoint() {
            return this.categoryType === 'colors' ? '/api/categories' : '/api/mont-marte-categories';
        }
    },

    watch: {
        visible(val) {
            this.dialogVisible = val;
            if (val) {
                this.loadCategories();
            }
        },

        categories: {
            handler(val) {
                if (val && val.length > 0) {
                    this.sortableCategories = [...val].sort((a, b) => 
                        (a.display_order || 999) - (b.display_order || 999)
                    );
                }
            },
            deep: true,
            immediate: true
        },
        
        // Real-time validation for new category name
        newCategoryName(val) {
            this.validateCategoryName(val);
        },
        
        newCategoryCode(val) {
            this.validateCategoryCode(val);
        },
        
        // Real-time validation for edit category name
        editingName(val) {
            if (this.editingId) {
                this.validateEditName(val);
            }
        },
        
        editingCode(val) {
            if (this.editingId) {
                this.validateEditCode(val);
            }
        }
    },

    methods: {
        // Validation methods
        validateCategoryName(name) {
            const trimmedName = name.trim();
            
            if (!trimmedName) {
                this.validationError = '';
                return false;
            }
            
            if (trimmedName.length < 2) {
                this.validationError = '分类名称至少需要2个字符';
                return false;
            }
            
            if (trimmedName.length > 20) {
                this.validationError = '分类名称不能超过20个字符';
                return false;
            }
            
            // Check for special characters (optional)
            const invalidChars = /[<>:"\/\\|?*]/;
            if (invalidChars.test(trimmedName)) {
                this.validationError = '分类名称不能包含特殊字符 < > : " / \\ | ? *';
                return false;
            }
            
            // Check for duplicate names
            if (this.sortableCategories.some(cat => cat.name === trimmedName)) {
                this.validationError = '该分类名称已存在';
                return false;
            }
            
            this.validationError = '';
            return true;
        },
        
        validateCategoryCode(code) {
            const trimmedCode = (code || '').trim().toUpperCase();
            
            if (!trimmedCode) {
                this.codeValidationError = '';
                return true; // Code is optional, will be auto-generated
            }
            
            if (trimmedCode.length < 2) {
                this.codeValidationError = '代码至少需要2个字符';
                return false;
            }
            
            if (trimmedCode.length > 4) {
                this.codeValidationError = '代码不能超过4个字符';
                return false;
            }
            
            // Allow letters, numbers, and Chinese characters
            const validCode = /^[A-Z0-9一-龥]+$/;
            if (!validCode.test(trimmedCode)) {
                this.codeValidationError = '代码只能包含字母、数字或中文';
                return false;
            }
            
            // Check for duplicate codes
            const isDuplicate = this.sortableCategories.some(cat => 
                cat.code === trimmedCode
            );
            
            if (isDuplicate) {
                this.codeValidationError = '代码已存在';
                return false;
            }
            
            this.codeValidationError = '';
            return true;
        },
        
        validateEditName(name) {
            const trimmedName = name.trim();
            const currentCategory = this.sortableCategories.find(cat => cat.id === this.editingId);
            
            if (!trimmedName) {
                this.editValidationError = '分类名称不能为空';
                return false;
            }
            
            if (trimmedName.length < 2) {
                this.editValidationError = '分类名称至少需要2个字符';
                return false;
            }
            
            if (trimmedName.length > 20) {
                this.editValidationError = '分类名称不能超过20个字符';
                return false;
            }
            
            // Check for special characters
            const invalidChars = /[<>:"\/\\|?*]/;
            if (invalidChars.test(trimmedName)) {
                this.editValidationError = '分类名称不能包含特殊字符 < > : " / \\ | ? *';
                return false;
            }
            
            // Check for duplicate names (excluding current)
            if (this.sortableCategories.some(cat => 
                cat.id !== this.editingId && cat.name === trimmedName)) {
                this.editValidationError = '该分类名称已存在';
                return false;
            }
            
            this.editValidationError = '';
            return true;
        },
        
        validateEditCode(code) {
            const trimmedCode = (code || '').trim().toUpperCase();
            const currentRow = this.sortableCategories.find(cat => cat.id === this.editingId);
            
            if (!trimmedCode) {
                this.codeEditValidationError = '代码不能为空';
                return false;
            }
            
            if (trimmedCode.length < 2) {
                this.codeEditValidationError = '代码至少需要2个字符';
                return false;
            }
            
            if (trimmedCode.length > 4) {
                this.codeEditValidationError = '代码不能超过4个字符';
                return false;
            }
            
            // Allow letters, numbers, and Chinese characters
            const validCode = /^[A-Z0-9一-龥]+$/;
            if (!validCode.test(trimmedCode)) {
                this.codeEditValidationError = '代码只能包含字母、数字或中文';
                return false;
            }
            
            // Check for duplicate codes (excluding current)
            const isDuplicate = this.sortableCategories.some(cat => 
                cat.code === trimmedCode && cat.id !== this.editingId
            );
            
            if (isDuplicate) {
                this.codeEditValidationError = '代码已存在';
                return false;
            }
            
            this.codeEditValidationError = '';
            return true;
        },
        
        handleClose() {
            this.dialogVisible = false;
            this.$emit('update:visible', false);
            this.resetForm();
        },

        resetForm() {
            this.newCategoryName = '';
            this.newCategoryCode = '';
            this.editingId = null;
            this.editingName = '';
            this.editingCode = '';
            this.draggedIndex = null;
            this.dropTargetIndex = null;
            this.validationError = '';
            this.codeValidationError = '';
            this.editValidationError = '';
            this.codeEditValidationError = '';
        },

        async loadCategories() {
            this.loading = true;
            try {
                const response = await fetch(this.apiEndpoint);
                if (!response.ok) throw new Error('Failed to load categories');
                const data = await response.json();
                this.sortableCategories = data.sort((a, b) => 
                    (a.display_order || 999) - (b.display_order || 999)
                );
            } catch (error) {
                this.$message.error('加载分类失败: ' + error.message);
            } finally {
                this.loading = false;
            }
        },

        async addCategory() {
            const name = this.newCategoryName.trim();
            const code = this.newCategoryCode.trim().toUpperCase();
            
            if (!name) {
                this.$message.warning('请输入分类名称');
                return;
            }

            if (!this.validateCategoryName(name)) {
                return;
            }
            
            if (code && !this.validateCategoryCode(code)) {
                return;
            }

            this.adding = true;
            try {
                const nextOrder = Math.max(...this.sortableCategories.map(c => c.display_order || 0)) + 1;
                
                const payload = { 
                    name,
                    display_order: nextOrder
                };
                
                if (code) {
                    payload.code = code;
                }
                
                const response = await fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to add category');
                }

                this.$message.success('分类添加成功');
                this.newCategoryName = '';
                this.newCategoryCode = '';
                this.$emit('updated');
                await this.loadCategories();
            } catch (error) {
                this.$message.error('添加分类失败: ' + error.message);
            } finally {
                this.adding = false;
            }
        },

        startEdit(row) {
            this.editingId = row.id;
            this.editingName = row.name;
            this.editingCode = row.code;
            this.$nextTick(() => {
                if (this.$refs.editInput) {
                    this.$refs.editInput.focus();
                }
            });
        },

        cancelEdit() {
            this.editingId = null;
            this.editingName = '';
            this.editingCode = '';
            this.editValidationError = '';
            this.codeEditValidationError = '';
        },

        async saveRename(row) {
            const newName = this.editingName.trim();
            const newCode = this.editingCode.trim().toUpperCase();
            
            if (!newName) {
                this.$message.warning('分类名称不能为空');
                return;
            }
            
            if (!newCode) {
                this.$message.warning('代码不能为空');
                return;
            }

            if (newName === row.name && newCode === row.code) {
                this.cancelEdit();
                return;
            }

            if (!this.validateEditName(newName) || !this.validateEditCode(newCode)) {
                return;
            }

            this.saving = true;
            try {
                const response = await fetch(`${this.apiEndpoint}/${row.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        name: newName,
                        code: newCode
                    })
                });

                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to update category');
                }

                this.$message.success('分类更新成功');
                this.cancelEdit();
                this.$emit('updated');
                await this.loadCategories();
            } catch (error) {
                this.$message.error('更新失败: ' + error.message);
            } finally {
                this.saving = false;
            }
        },

        async deleteCategory(row) {
            const itemCount = this.getItemCount(row);
            
            if (itemCount > 0) {
                const itemType = this.categoryType === 'colors' ? '颜色' : '原料';
                this.$message({
                    message: `该分类下有 ${itemCount} 个${itemType}，请先将它们移至其他分类后再删除`,
                    type: 'warning',
                    duration: 4000,
                    showClose: true
                });
                return;
            }

            try {
                await this.$confirm(
                    `<div style="text-align: left;">
                        <p><strong>即将删除分类：${row.name}</strong></p>
                        <p style="color: #909399; margin-top: 8px;">• 分类代码：${row.code}</p>
                        <p style="color: #909399;">• 当前项目数：${itemCount}</p>
                        <p style="color: #E6A23C; margin-top: 12px;">
                            <i class="el-icon-warning"></i> 此操作不可恢复
                        </p>
                    </div>`,
                    '确认删除分类',
                    {
                        confirmButtonText: '确定删除',
                        cancelButtonText: '取消',
                        type: 'warning',
                        dangerouslyUseHTMLString: true,
                        distinguishCancelAndClose: true
                    }
                );

                const response = await fetch(`${this.apiEndpoint}/${row.id}`, {
                    method: 'DELETE'
                });

                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to delete category');
                }

                this.$message({
                    message: `分类"${row.name}"已成功删除`,
                    type: 'success',
                    duration: 2000
                });
                this.$emit('updated');
                await this.loadCategories();
            } catch (error) {
                if (error !== 'cancel' && error.message !== 'cancel') {
                    this.$message.error('删除失败: ' + error.message);
                }
            }
        },

        // Drag and Drop Methods
        handleDragStart(index, event) {
            
            this.draggedIndex = index;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/html', event.target.innerHTML);
            
            // Add dragging class to the row, not just the handle
            const row = event.target.closest('tr');
            if (row) row.classList.add('dragging');
            
            // Set drag image (optional - for better visual feedback)
            if (event.dataTransfer.setDragImage) {
                const dragImage = row.cloneNode(true);
                dragImage.style.opacity = '0.8';
                dragImage.style.transform = 'rotate(2deg)';
                document.body.appendChild(dragImage);
                event.dataTransfer.setDragImage(dragImage, event.offsetX, event.offsetY);
                setTimeout(() => document.body.removeChild(dragImage), 0);
            }
        },

        handleDragOver(index, event) {
            event.preventDefault();
            
            event.dataTransfer.dropEffect = 'move';
            
            // Visual feedback for drop zone
            if (this.dropTargetIndex !== index && this.draggedIndex !== index) {
                // Remove all previous drop target highlights
                const allRows = event.target.closest('tbody').querySelectorAll('tr');
                allRows.forEach(row => row.classList.remove('drop-target', 'drop-target-before', 'drop-target-after'));
                
                // Add new drop target highlight
                this.dropTargetIndex = index;
                const currentTarget = event.target.closest('tr');
                if (currentTarget) {
                    currentTarget.classList.add('drop-target');
                    
                    // Add directional indicator based on mouse position
                    const rect = currentTarget.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;
                    if (event.clientY < midpoint) {
                        currentTarget.classList.add('drop-target-before');
                    } else {
                        currentTarget.classList.add('drop-target-after');
                    }
                }
            }
        },

        async handleDrop(index, event) {
            event.preventDefault();
            
            // Clean up drop target highlight
            const dropTarget = event.target.closest('tr');
            if (dropTarget) dropTarget.classList.remove('drop-target');
            
            if (this.draggedIndex !== null && this.draggedIndex !== index) {
                // Reorder the array
                const draggedItem = this.sortableCategories[this.draggedIndex];
                const newCategories = [...this.sortableCategories];
                
                // Remove dragged item
                newCategories.splice(this.draggedIndex, 1);
                
                // Insert at new position
                newCategories.splice(index, 0, draggedItem);
                
                // Update display_order for all items
                const updates = newCategories.map((cat, idx) => ({
                    id: cat.id,
                    display_order: idx + 1
                }));
                
                // Save to backend
                await this.saveReorder(updates);
                
                // Update local state
                this.sortableCategories = newCategories;
            }
            
            this.dropTargetIndex = null;
        },

        handleDragEnd(event) {
            // Clean up the dragging class from the row
            const row = event.target.closest('tr');
            if (row) row.classList.remove('dragging');
            
            // Clean up any remaining drop target highlights
            const dropTargets = document.querySelectorAll('.drop-target, .drop-target-before, .drop-target-after, .dragging');
            dropTargets.forEach(el => {
                el.classList.remove('drop-target', 'drop-target-before', 'drop-target-after', 'dragging');
            });
            
            this.draggedIndex = null;
            this.dropTargetIndex = null;
        },

        async saveReorder(updates) {
            try {
                const response = await fetch(`${this.apiEndpoint}/reorder`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });

                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to reorder categories');
                }

                this.$message.success('分类顺序已更新');
                this.$emit('updated');
            } catch (error) {
                this.$message.error('更新顺序失败: ' + error.message);
                // Reload to restore original order
                await this.loadCategories();
            }
        },

        getItemCount(category) {
            return this.categoryType === 'colors' 
                ? (category.color_count || 0)
                : (category.material_count || 0);
        },

        getCountType(category) {
            const count = this.getItemCount(category);
            if (count === 0) return 'success';
            if (count < 10) return 'warning';
            return 'danger';
        }
    },

    mounted() {
        if (this.visible) {
            this.loadCategories();
        }
    }
};

// Register component globally for Vue 3
if (typeof window !== 'undefined' && window.Vue) {
    window.CategoryManagerComponent = CategoryManagerComponent;
}