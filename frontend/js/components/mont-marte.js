// 颜色原料库组件
// 文件路径: frontend/js/components/mont-marte.js
// 定义全局变量 MontMarteComponent，被 app.js 引用并注册

const MontMarteComponent = {
        props: {
            sortMode: { type: String, default: 'time' } // time | name
        },
        template: `
                <div>
                        <div v-if="loading" class="loading">
                                <el-icon class="is-loading"><Loading /></el-icon> 加载中...
                        </div>
                        <div v-else>
                                <div v-if="montMarteColors.length === 0" class="empty-message">暂无原料，点击右上角“新原料”添加</div>
                                <div v-for="color in montMarteColors" :key="color.id" class="artwork-bar">
                                    <div class="artwork-header">
                                        <div class="artwork-title">{{ color.name }}</div>
                                        <div class="color-actions">
                                                <el-button size="small" type="primary" @click="editColor(color)">
                                                    <el-icon><Edit /></el-icon> 修改
                                                </el-button>
                                                <el-button size="small" type="danger" @click="deleteColor(color)">
                                                    <el-icon><Delete /></el-icon> 删除
                                                </el-button>
                                        </div>
                                    </div>
                                    <div style="display:flex; gap:12px; padding:6px 4px 4px;">
                                                            <div class="scheme-thumbnail" :style="{
                                                                    backgroundImage: color.image_path ? 'url(' + baseURL + '/uploads/' + color.image_path + ')' : 'none',
                                                                    backgroundColor: color.image_path ? 'transparent' : '#f0f0f0'
                                                                }" :class="{ 'no-image': !color.image_path }" @click="color.image_path && $thumbPreview && $thumbPreview.show($event, baseURL + '/uploads/' + color.image_path)">
                                                                <template v-if="!color.image_path">未上传图片</template>
                                                            </div>
                                        <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;">
                                            <div class="meta-text" v-if="color.updated_at">更新时间：{{ formatDate(color.updated_at) }}</div>
                                            <div class="meta-text" v-if="color.supplier_name">供应商：{{ color.supplier_name }}</div>
                                            <div class="meta-text" v-if="color.purchase_link_url" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" :title="color.purchase_link_url">采购：{{ color.purchase_link_url }}</div>
                                        </div>
                                    </div>
                                </div>
                        </div>

            <!-- 新增/编辑对话框 -->
            <el-dialog
                class="scheme-dialog"
                v-model="showDialog"
                :title="editing ? '修改颜色原料' : '新增颜色原料'"
                width="640px"
                :close-on-click-modal="false"
                :close-on-press-escape="false"
                @open="onOpenDialog"
            >
                <el-form
                    ref="formRef"
                    :model="form"
                    :rules="rules"
                    label-width="100px"
                    @submit.prevent
                    @keydown.enter.stop.prevent="onFormEnter"
                >
                    <el-form-item label="颜色名称" prop="name">
                        <el-input v-model.trim="form.name" placeholder="例如：粉红"></el-input>
                    </el-form-item>

                    <!-- 新增：供应商（可输入+创建+下拉） -->
                    <el-form-item label="供应商">
                        <div style="display:flex; gap:8px; align-items:center; width:100%;">
                            <el-select
                                ref="supplierSelect"
                                v-model="form.supplier_id"
                                filterable
                                clearable
                                allow-create
                                default-first-option
                                automatic-dropdown
                                placeholder="选择或输入供应商"
                                style="flex:1;"
                                @change="onSupplierChange"
                            >
                                <el-option
                                    v-for="opt in supplierOptions"
                                    :key="opt.id"
                                    :label="opt.name"
                                    :value="opt.id"
                                >
                                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                        <span>{{ opt.name }}</span>
                                        <el-icon
                                            style="color:#bbb; cursor:pointer;"
                                            title="删除该供应商"
                                            @click.stop="deleteSupplierOption(opt)"
                                        >
                                            <Delete />
                                        </el-icon>
                                    </div>
                                </el-option>
                            </el-select>
                            <el-button circle @click="confirmSupplier" :disabled="supplierBusy" :loading="supplierBusy" title="提交当前输入">
                                <el-icon><Check /></el-icon>
                            </el-button>
                        </div>
                    </el-form-item>

                    <!-- 新增：线上采购地址 -->
                    <el-form-item label="线上采购地址">
                        <div style="display:flex; gap:8px; align-items:center; width:100%;">
                            <el-select
                                ref="purchaseSelect"
                                v-model="form.purchase_link_id"
                                filterable
                                clearable
                                allow-create
                                default-first-option
                                automatic-dropdown
                                placeholder="选择或输入采购地址"
                                style="flex:1;"
                                @change="onPurchaseChange"
                            >
                                <el-option
                                    v-for="opt in purchaseLinkOptions"
                                    :key="opt.id"
                                    :label="opt.url"
                                    :value="opt.id"
                                >
                                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                        <span class="meta-text" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:460px;">{{ opt.url }}</span>
                                        <el-icon
                                            style="color:#bbb; cursor:pointer;"
                                            title="删除该地址"
                                            @click.stop="deletePurchaseOption(opt)"
                                        >
                                            <Delete />
                                        </el-icon>
                                    </div>
                                </el-option>
                            </el-select>
                            <el-button circle @click="confirmPurchase" :disabled="purchaseBusy" :loading="purchaseBusy" title="提交当前输入">
                                <el-icon><Check /></el-icon>
                            </el-button>
                        </div>
                    </el-form-item>

                    <el-form-item label="颜色样图">
                        <el-upload
                            :auto-upload="false"
                            :show-file-list="false"
                            :on-change="onImageChange"
                            accept="image/*"
                        >
                            <el-button><el-icon><Upload /></el-icon> 选择图片</el-button>
                        </el-upload>
                        <div v-if="form.imagePreview" style="margin-top: 8px;">
                            <div class="scheme-thumbnail" :style="{ backgroundImage: 'url(' + form.imagePreview + ')', backgroundColor: 'transparent' }" @click="form.imagePreview && $thumbPreview && $thumbPreview.show($event, form.imagePreview)"></div>
                        </div>
                    </el-form-item>
                </el-form>

                <template #footer>
                    <el-button @click="closeDialog">
                        <el-icon><Close /></el-icon> 取消
                    </el-button>
                    <el-button type="primary" @click="saveColor" :loading="saving">
                        <el-icon><Check /></el-icon> 保存
                    </el-button>
                </template>
            </el-dialog>
        </div>
    `,
    
    // 注入全局数据
    inject: ['globalData'],
    data() {
        return {
            loading: false,
            showDialog: false,
            editing: null, // 当前编辑的记录

            form: {
                id: null,
                name: '',
                supplier_id: null,
                purchase_link_id: null,
                imageFile: null,
                imagePreview: null
            },

            rules: {
                name: [{ required: true, message: '请输入颜色名称', trigger: 'blur' }]
            },

            supplierBusy: false,
            purchaseBusy: false,
            saving: false
        };
    },
    computed: {
        baseURL() { return this.globalData.baseURL; },
        montMarteColors() {
            const list = (this.globalData.montMarteColors.value || []).slice();
            if (this.sortMode === 'name') {
                list.sort((a,b) => (a.name||'').localeCompare(b.name||''));
            } else {
                list.sort((a,b) => new Date(b.updated_at||b.created_at||0) - new Date(a.updated_at||a.created_at||0));
            }
            return list;
        },
        supplierOptions() { return this.globalData.suppliers.value || []; },
        purchaseLinkOptions() { return this.globalData.purchaseLinks.value || []; }
    },
    methods: {
        formatDate(ts) {
            if (!ts) return '';
            const d = new Date(ts);
            const pad = (n) => (n < 10 ? '0' + n : '' + n);
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        },

        async refreshDictionaries() {
            await Promise.all([ this.globalData.loadSuppliers(), this.globalData.loadPurchaseLinks() ]);
        },

        openDialog() {
            this.editing = null;
            this.resetForm();
            this.showDialog = true;
        },
        editColor(row) {
            this.editing = row;
            this.form.id = row.id;
            this.form.name = row.name || '';
            this.form.supplier_id = row.supplier_id || null;
            this.form.purchase_link_id = row.purchase_link_id || null;
            this.form.imageFile = null;
            this.form.imagePreview = row.image_path ? `${this.baseURL}/uploads/${row.image_path}` : null;
            this.showDialog = true;
        },
        closeDialog() {
            this.showDialog = false;
        },
        onOpenDialog() {
            // 打开时确保字典已加载
            this.refreshDictionaries();
        },
        resetForm() {
            this.form = {
                id: null,
                name: '',
                supplier_id: null,
                purchase_link_id: null,
                imageFile: null,
                imagePreview: null
            };
        },

        // 选择器变更：当 val 为字符串时，表示创建
        async onSupplierChange(val) {
            // 仅当为“新输入的字符串”时触发创建
            if (typeof val !== 'string') return;
            const name = val.trim();
            if (!name) { this.form.supplier_id = null; return; }
            try {
                this.supplierBusy = true;
                const { data } = await axios.post(`${this.baseURL}/api/suppliers/upsert`, { name });
                // 先刷新选项，再切换为 id，避免出现“数字选项”
                await this.globalData.loadSuppliers();
                await this.$nextTick();
                const found = this.supplierOptions.find(o => o.id === data.id);
                this.form.supplier_id = found ? found.id : data.id;
                // 可选：收起下拉，避免视觉闪烁
                this.$nextTick(() => this.$refs.supplierSelect?.blur?.());
            } catch (e) {
                console.error('创建供应商失败', e);
                ElementPlus.ElMessage.error('创建供应商失败');
                this.form.supplier_id = null;
            } finally {
                this.supplierBusy = false;
            }
        },
        async confirmSupplier() {
            if (typeof this.form.supplier_id === 'string' && !this.supplierBusy) {
                await this.onSupplierChange(this.form.supplier_id);
            }
        },

        async deleteSupplierOption(opt) {
            try {
                await axios.delete(`${this.baseURL}/api/suppliers/${opt.id}`);
                ElementPlus.ElMessage.success('已删除供应商');
                // 如果当前选中的是被删项，清空
                if (this.form.supplier_id === opt.id) this.form.supplier_id = null;
                await this.globalData.loadSuppliers();
            } catch (e) {
                if (e.response && e.response.status === 409) {
                    ElementPlus.ElMessage.warning(e.response.data?.error || '有引用，无法删除');
                } else {
                    ElementPlus.ElMessage.error('删除失败');
                }
            }
        },

        async onPurchaseChange(val) {
            if (typeof val !== 'string') return;
            const url = val.trim();
            if (!url) { this.form.purchase_link_id = null; return; }
            try {
                this.purchaseBusy = true;
                const { data } = await axios.post(`${this.baseURL}/api/purchase-links/upsert`, { url });
                await this.globalData.loadPurchaseLinks();
                await this.$nextTick();
                const found = this.purchaseLinkOptions.find(o => o.id === data.id);
                this.form.purchase_link_id = found ? found.id : data.id;
                this.$nextTick(() => this.$refs.purchaseSelect?.blur?.());
            } catch (e) {
                console.error('创建采购地址失败', e);
                ElementPlus.ElMessage.error('创建采购地址失败');
                this.form.purchase_link_id = null;
            } finally {
                this.purchaseBusy = false;
            }
        },
        async confirmPurchase() {
            if (typeof this.form.purchase_link_id === 'string' && !this.purchaseBusy) {
                await this.onPurchaseChange(this.form.purchase_link_id);
            }
        },
        async deletePurchaseOption(opt) {
            try {
                await axios.delete(`${this.baseURL}/api/purchase-links/${opt.id}`);
                ElementPlus.ElMessage.success('已删除采购地址');
                if (this.form.purchase_link_id === opt.id) this.form.purchase_link_id = null;
                await this.globalData.loadPurchaseLinks();
            } catch (e) {
                if (e.response && e.response.status === 409) {
                    ElementPlus.ElMessage.warning(e.response.data?.error || '有引用，无法删除');
                } else {
                    ElementPlus.ElMessage.error('删除失败');
                }
            }
        },

        onImageChange(file) {
            const raw = file.raw || file;
            this.form.imageFile = raw;
            const reader = new FileReader();
            reader.onload = () => { this.form.imagePreview = reader.result; };
            reader.readAsDataURL(raw);
        },

        async saveColor() {
            try {
                this.saving = true;
                await this.$refs.formRef.validate();

                if (typeof this.form.supplier_id === 'string') {
                    await this.onSupplierChange(this.form.supplier_id);
                }
                if (typeof this.form.purchase_link_id === 'string') {
                    await this.onPurchaseChange(this.form.purchase_link_id);
                }

                const fd = new FormData();
                fd.append('name', this.form.name);
                if (this.form.supplier_id) fd.append('supplier_id', this.form.supplier_id);
                if (this.form.purchase_link_id) fd.append('purchase_link_id', this.form.purchase_link_id);
                if (this.form.imageFile) fd.append('image', this.form.imageFile);
                if (!this.form.imageFile && this.form.imagePreview && this.editing && this.editing.image_path) {
                    fd.append('existingImagePath', this.editing.image_path);
                }

                if (this.editing) {
                    const res = await axios.put(`${this.baseURL}/api/mont-marte-colors/${this.form.id}`, fd);
                    const n = res?.data?.updatedReferences || 0;
                    if (n > 0) {
                        ElementPlus.ElMessage.success(`已保存并同步更新 ${n} 处配方引用`);
                    } else {
                        ElementPlus.ElMessage.success('已保存修改');
                    }
                } else {
                    await axios.post(`${this.baseURL}/api/mont-marte-colors`, fd);
                    ElementPlus.ElMessage.success('已新增颜色原料');
                }

                // 关键：同时刷新原料库与自配色，确保两个页面立刻看到新名称
                await Promise.all([
                    this.globalData.loadMontMarteColors(),
                    this.globalData.loadCustomColors()
                ]);

                this.showDialog = false;
            } catch (e) {
                console.error('保存失败', e);
                ElementPlus.ElMessage.error('保存失败，请检查表单');
            } finally {
                this.saving = false;
            }
        },
        
        onFormEnter() {
            // 回车即保存
            this.saveColor();
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