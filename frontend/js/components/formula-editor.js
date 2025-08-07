// 配方编辑器组件
// 用于自配颜色的配方编辑，支持表格编辑、拖拽排序等功能

const FormulaEditorComponent = {
    name: 'FormulaEditor',
    template: `
        <div class="formula-editor">
            <table class="formula-table">
                <thead>
                    <tr>
                        <th width="30">排序</th>
                        <th>颜色原料</th>
                        <th width="100">用量</th>
                        <th width="80">单位</th>
                        <th width="45">操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr 
                        v-for="(item, index) in formulaItems"
                        :key="item.id"
                        :draggable="true"
                        @dragstart="handleDragStart(index)"
                        @dragover.prevent
                        @drop="handleDrop(index)"
                        :class="{ 'dragging': dragIndex === index }"
                    >
                        <td class="drag-handle">
                            ≡
                        </td>
                        <td>
                            <el-select 
                                v-model="item.colorId"
                                placeholder="选择颜色原料"
                                clearable
                                filterable
                                size="small"
                                @change="onColorChange(index, item.colorId)"
                                style="width: 100%"
                            >
                                <el-option
                                    v-for="color in availableColors(index)"
                                    :key="color.id"
                                    :label="color.name"
                                    :value="color.id"
                                />
                            </el-select>
                        </td>
                        <td>
                            <el-input-number
                                v-model="item.amount"
                                :min="0"
                                :step="0.1"
                                :precision="1"
                                placeholder="用量"
                                controls-position="right"
                                size="small"
                                style="width: 100%"
                            />
                        </td>
                        <td>
                            <el-select 
                                v-model="item.unit" 
                                placeholder="单位"
                                size="small"
                                style="width: 100%"
                            >
                                <el-option label="g" value="g" />
                                <el-option label="滴" value="滴" />
                                <el-option label="ml" value="ml" />
                            </el-select>
                        </td>
                        <td>
                            <el-button 
                                type="danger" 
                                size="small" 
                                circle 
                                @click="removeItem(index)"
                                style="width: 24px; height: 24px; font-size: 14px; padding: 0;"
                            >
                                -
                            </el-button>
                        </td>
                    </tr>
                    <tr v-if="formulaItems.length === 0">
                        <td colspan="5" class="empty-message">
                            暂无配方，点击下方"+"按钮添加颜色原料
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <div class="add-button-container">
                <el-button 
                    type="primary" 
                    circle 
                    @click="addItem"
                    style="width: 32px; height: 32px; padding: 0; font-size: 18px;"
                >
                    +
                </el-button>
                <span class="add-hint">添加颜色原料</span>
            </div>
        </div>
    `,
    
    props: {
        // 当前配方值（字符串格式，如："钛白 5g 群青 3滴"）
        modelValue: {
            type: String,
            default: ''
        },
        // 颜色原料库数据
        montMarteColors: {
            type: Array,
            default: () => []
        }
    },
    
    data() {
        return {
            formulaItems: [],
            dragIndex: null,
            nextId: 1
        };
    },
    
    computed: {
        // 获取某行可用的颜色（排除已选择的）
        availableColors() {
            return (currentIndex) => {
                const selectedIds = this.formulaItems
                    .filter((item, index) => index !== currentIndex && item.colorId)
                    .map(item => item.colorId);
                
                return this.montMarteColors.filter(color => 
                    !selectedIds.includes(color.id)
                );
            };
        }
    },
    
    watch: {
        // 监听外部传入的值变化
        modelValue: {
            immediate: true,
            handler(newVal) {
                // 防止无限循环：只有当值真的不同时才更新
                const currentString = this.getFormulaString();
                if (newVal !== currentString) {
                    this.parseFormula(newVal);
                }
            }
        },
        
        // 可以恢复 formulaItems 的深度监听
        formulaItems: {
            deep: true,
            handler() {
                // 使用防抖避免频繁触发
                if (this.updateTimer) {
                    clearTimeout(this.updateTimer);
                }
                this.updateTimer = setTimeout(() => {
                    this.emitUpdate();
                }, 100);
            }
        }
    },
    
    methods: {
        // 解析配方字符串为表格数据
        parseFormula(formulaString) {
            if (!formulaString || formulaString.trim() === '') {
                this.formulaItems = [];
                return;
            }
            
            const items = [];
            // 改进的解析逻辑，支持 "钛白 5g 群青 3滴" 格式
            const parts = formulaString.trim().split(/\s+/);
            
            for (let i = 0; i < parts.length; i += 2) {
                const colorName = parts[i];
                const amountWithUnit = parts[i + 1] || '';
                
                // 解析数量和单位
                const match = amountWithUnit.match(/^([\d.]+)(.*)$/);
                let amount = null;
                let unit = 'g'; // 默认单位
                
                if (match) {
                    amount = parseFloat(match[1]);
                    unit = match[2] || 'g';
                }
                
                // 查找对应的颜色ID
                const color = this.montMarteColors.find(c => c.name === colorName);
                
                items.push({
                    id: this.nextId++,
                    colorId: color ? color.id : null,
                    colorName: colorName, // 保留原始名称，以防找不到对应颜色
                    amount: amount,
                    unit: unit
                });
            }
            
            this.formulaItems = items;
        },
        
        // 将表格数据转换为配方字符串
        getFormulaString() {
            return this.formulaItems
                .filter(item => item.colorId || item.colorName) // 只包含有颜色的项
                .map(item => {
                    const color = this.montMarteColors.find(c => c.id === item.colorId);
                    const colorName = color ? color.name : item.colorName;
                    
                    if (item.amount) {
                        return `${colorName} ${item.amount}${item.unit}`;
                    } else if (colorName) {
                        return colorName;
                    }
                    return '';
                })
                .filter(s => s) // 过滤空字符串
                .join(' ');
        },
        
        // 添加新行
        addItem() {
            this.formulaItems.push({
                id: this.nextId++,
                colorId: null,
                amount: null,
                unit: 'g'
            });
            // 不需要手动调用 emitUpdate，watcher 会处理
        },
        
        // 删除行
        async removeItem(index) {
            const item = this.formulaItems[index];
            const colorName = this.montMarteColors.find(c => c.id === item.colorId)?.name;
            
            try {
                await ElementPlus.ElMessageBox.confirm(
                    colorName ? `确定删除 "${colorName}" 吗？` : '确定删除这一行吗？',
                    '提示',
                    {
                        confirmButtonText: '确定',
                        cancelButtonText: '取消',
                        type: 'warning'
                    }
                );
                
                this.formulaItems.splice(index, 1);
                // 不需要手动调用 emitUpdate
            } catch {
                // 用户取消
            }
        },
        
        // 颜色选择变化
        onColorChange(index, colorId) {
            // 检查是否重复
            const isDuplicate = this.formulaItems.some((item, i) => 
                i !== index && item.colorId === colorId && colorId !== null
            );
            
            if (isDuplicate) {
                const color = this.montMarteColors.find(c => c.id === colorId);
                ElementPlus.ElMessage.warning(`"${color.name}" 已经添加过了`);
                // 清空当前选择
                this.formulaItems[index].colorId = null;
            }
            // 不需要手动调用 emitUpdate
        },
        
        // 拖拽开始
        handleDragStart(index) {
            this.dragIndex = index;
        },
        
        // 拖拽放下
        handleDrop(dropIndex) {
            if (this.dragIndex === null || this.dragIndex === dropIndex) {
                return;
            }
            
            const dragItem = this.formulaItems[this.dragIndex];
            this.formulaItems.splice(this.dragIndex, 1);
            
            // 调整插入位置
            const newIndex = this.dragIndex < dropIndex ? dropIndex - 1 : dropIndex;
            this.formulaItems.splice(newIndex, 0, dragItem);
            
            this.dragIndex = null;
            // 不需要手动调用 emitUpdate
        },
        
        // 发送更新事件
        emitUpdate() {
            const formulaString = this.getFormulaString();
            this.$emit('update:modelValue', formulaString);
            this.$emit('change', formulaString);
        }
    }
};

// 注册为全局组件，供其他组件使用
if (typeof window !== 'undefined') {
    window.FormulaEditorComponent = FormulaEditorComponent;
}