// 颜色原料管理组件（原“颜色原料库”）
// 文件路径: frontend/js/components/mont-marte.js
// 定义全局变量 MontMarteComponent，被 app.js 引用并注册

const MontMarteComponent = {
        props: {
            sortMode: { type: String, default: 'time' } // time | name
        },
        template: `
                <div>
                        <div class="category-switch-group" role="tablist" aria-label="原料类别筛选">
                            <button type="button" class="category-switch" :class="{active: activeCategory==='all'}" @click="activeCategory='all'" role="tab" :aria-selected="activeCategory==='all'">全部</button>
                            <button v-for="cat in montMarteCategories" :key="cat.id" type="button" class="category-switch" :class="{active: activeCategory===cat.id}" @click="activeCategory=cat.id" role="tab" :aria-selected="activeCategory===cat.id">{{ cat.name }}</button>
                            <button 
                                type="button"
                                class="category-settings-btn"
                                @click="showCategoryManager = true"
                                title="管理分类"
                            >
                                <el-icon><Setting /></el-icon>
                            </button>
                        </div>
                        <div v-if="loading" class="loading">
                                <el-icon class="is-loading"><Loading /></el-icon> 加载中...
                        </div>
                        <div v-else>
                                <div v-if="montMarteColors.length === 0" class="empty-message">暂无原料，点击右上角"新原料"添加</div>
                                
                                <!-- Grid Container for Cards -->
                                <div class="color-cards-grid">
                                    <div v-for="color in paginatedColors" :key="color.id" class="artwork-bar" :data-raw-id="color.id" :class="{'selected': selectedColorId === color.id}" @click="toggleColorSelection(color.id)">
                                    <div class="artwork-header">
                                        <div class="artwork-title">{{ color.name }}</div>
                                        <div class="color-actions">
                                                <el-button size="small" type="primary" @click="editColor(color)">
                                                    <el-icon><Edit /></el-icon> 修改
                                                </el-button>
                                                <template v-if="rawUsageCodes(color).length">
                                                    <el-tooltip content="该颜色原料已被引用，无法删除" placement="top">
                                                        <span>
                                                            <el-button size="small" type="danger" disabled>
                                                                <el-icon><Delete /></el-icon> 删除
                                                            </el-button>
                                                        </span>
                                                    </el-tooltip>
                                                </template>
                                                <el-button v-else size="small" type="danger" @click="deleteColor(color)">
                                                    <el-icon><Delete /></el-icon> 删除
                                                </el-button>
                                        </div>
                                    </div>
                                    <div style="display:flex; gap:12px; padding:6px 4px 4px;">
                                                            <div class="scheme-thumbnail" :class="{ 'no-image': !color.image_path }" @click="color.image_path && $thumbPreview && $thumbPreview.show($event, $helpers.buildUploadURL(baseURL, color.image_path))">
                                                                <template v-if="!color.image_path">未上传图片</template>
                                                                <img v-else :src="$helpers.buildUploadURL(baseURL, color.image_path)" @error="onThumbError" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                                                            </div>
                                        <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;">
                                            <div class="meta-text" v-if="color.updated_at">更新：{{ $helpers.formatDate(color.updated_at) }}</div>
                                            <div class="meta-text">分类：<template v-if="color.category_id">{{ mapCategoryLabel(color.category_id) }}</template><template v-else>（未填）</template></div>
                                            <div class="meta-text">供应商：<template v-if="color.supplier_name">{{ color.supplier_name }}</template><template v-else>（未填）</template></div>
                                            <div class="meta-text" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" :title="color.purchase_link_url || ''">采购：<template v-if="color.purchase_link_url">{{ color.purchase_link_url }}</template><template v-else>（未填）</template></div>
                                            <div class="meta-text">适用色：
                                                <template v-if="rawUsageCodes(color).length">
                                                    <span class="usage-chips">
                                                        <span v-for="c in rawUsageCodes(color)" :key="c" class="mf-chip usage-chip" @click="handleColorChipClick(c)" style="cursor:pointer;">{{ c }}</span>
                                                    </span>
                                                </template>
                                                <template v-else>（未使用）</template>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                </div><!-- End of color-cards-grid -->
                                
                                <!-- Pagination Controls -->
                                <div v-if="filteredColors.length > 0" class="pagination-container">
                                    <div class="pagination-info">
                                        显示 {{ startItem }}-{{ endItem }} 共 {{ filteredColors.length }} 项
                                    </div>
                                    
                                    <div class="pagination-controls">
                                        <el-button 
                                            size="small"
                                            :disabled="currentPage === 1"
                                            @click="goToPage(1)">
                                            <el-icon><DArrowLeft /></el-icon>
                                            <span>首页</span>
                                        </el-button>
                                        
                                        <el-button 
                                            size="small"
                                            :disabled="currentPage === 1"
                                            @click="goToPage(currentPage - 1)">
                                            <el-icon><ArrowLeft /></el-icon>
                                            <span>上一页</span>
                                        </el-button>
                                        
                                        <span class="page-numbers">
                                            <button 
                                                v-for="page in visiblePages"
                                                :key="page"
                                                :class="{ active: page === currentPage, ellipsis: page === '...' }"
                                                :disabled="page === '...'"
                                                @click="goToPage(page)">
                                                {{ page }}
                                            </button>
                                        </span>
                                        
                                        <el-button 
                                            size="small"
                                            :disabled="currentPage === totalPages"
                                            @click="goToPage(currentPage + 1)">
                                            <span>下一页</span>
                                            <el-icon><ArrowRight /></el-icon>
                                        </el-button>
                                        
                                        <el-button 
                                            size="small"
                                            :disabled="currentPage === totalPages"
                                            @click="goToPage(totalPages)">
                                            <span>末页</span>
                                            <el-icon><DArrowRight /></el-icon>
                                        </el-button>
                                    </div>
                                    
                                    <div class="items-per-page">
                                        <span>每页显示：</span>
                                        <el-select v-model="itemsPerPage" @change="onItemsPerPageChange" size="small">
                                            <el-option v-if="isDevelopmentMode" :value="2" label="2 项" />
                                            <el-option :value="12" label="12 项" />
                                            <el-option :value="24" label="24 项" />
                                            <el-option :value="48" label="48 项" />
                                            <el-option :value="0" label="全部" />
                                        </el-select>
                                    </div>
                                </div>
                        </div>

            <!-- Category Manager Dialog -->
            <category-manager
                :visible="showCategoryManager"
                @update:visible="showCategoryManager = $event"
                :categories="montMarteCategories"
                category-type="materials"
                @updated="handleCategoriesUpdated"
            />
            
            <!-- 新增/编辑对话框 -->
            <el-dialog
                class="scheme-dialog"
                v-model="showDialog"
                :title="editing ? '修改颜色原料' : '新增颜色原料'"
                width="640px"
                :close-on-click-modal="false"
                :close-on-press-escape="false"
                @open="onOpenDialog"
                @close="onCloseDialog"
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
                        <div class="dup-inline-row">
                            <el-input v-model.trim="form.name" placeholder="例如：粉红" class="short-inline-input" />
                            <span v-if="nameDuplicate" class="dup-msg">名称重复</span>
                        </div>
                    </el-form-item>
                    <el-form-item label="原料类别" prop="category_id">
                        <el-select v-model="form.category_id" placeholder="请选择类别">
                            <el-option v-for="cat in montMarteCategories" :key="cat.id" :label="cat.name" :value="cat.id" />
                        </el-select>
                    </el-form-item>

                    <!-- 新增：供应商（可输入+创建+下拉） -->
                    <el-form-item label="供应商">
                        <div style="display:flex; gap:8px; align-items:center;">
                            <el-select
                                ref="supplierSelect"
                                v-model="form.supplier_id"
                                filterable
                                clearable
                                allow-create
                                default-first-option
                                automatic-dropdown
                                placeholder="选择或输入供应商"
                                style="width: 360px;"
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
                        <div style="display:flex; gap:8px; align-items:center;">
                            <el-select
                                ref="purchaseSelect"
                                v-model="form.purchase_link_id"
                                filterable
                                clearable
                                allow-create
                                default-first-option
                                automatic-dropdown
                                placeholder="选择或输入采购地址"
                                style="width: 360px;"
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
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <!-- 缩略图预览区域 -->
                            <div class="scheme-thumbnail" 
                                 :class="{ 'no-image': !form.imagePreview }" 
                                 style="width: 80px; height: 80px; flex-shrink: 0;"
                                 @click="form.imagePreview && $thumbPreview && $thumbPreview.show($event, form.imagePreview)">
                                <template v-if="!form.imagePreview">未上传图片</template>
                                <img v-else :src="form.imagePreview" @error="onThumbError" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />
                            </div>
                            
                            <!-- 操作按钮区域 -->
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <el-upload
                                    :auto-upload="false"
                                    :show-file-list="false"
                                    :on-change="onImageChange"
                                    accept="image/*"
                                >
                                    <el-button size="small" type="primary">
                                        <el-icon><Upload /></el-icon>
                                        选择图片
                                    </el-button>
                                </el-upload>
                                
                                <el-button 
                                    v-if="form.imagePreview" 
                                    size="small" 
                                    type="danger" 
                                    @click="clearImage"
                                >
                                    <el-icon><Delete /></el-icon>
                                    清除图片
                                </el-button>
                            </div>
                        </div>
                    </el-form-item>
                </el-form>

                <template #footer>
                    <el-button @click="attemptCloseDialog">
                        <el-icon><Close /></el-icon> 取消
                    </el-button>
                    <el-button type="primary" @click="saveColor" :disabled="nameDuplicate || saving">
                        <el-icon v-if="saving" class="is-loading"><Loading /></el-icon>
                        <el-icon v-else><Check /></el-icon>
                        {{ saving ? '保存中...' : '保存' }}
                    </el-button>
                </template>
            </el-dialog>
        </div>
    `,
    
    // 注入全局数据
    inject: ['globalData'],
    data() {
        // Initial items per page - will be updated from app config in mounted
        
        return {
            // 当前原料类别筛选；'all' 表示不过滤
            activeCategory: 'all',
            loading: false,
            showDialog: false,
            showCategoryManager: false,
            editing: null, // 当前编辑的记录
            
            // Pagination
            currentPage: 1,
            itemsPerPage: 24,  // Default, will be updated from app config
            
            // Card selection
            selectedColorId: null,

            form: {
                id: null,
                version: null,
                name: '',
                category_id: null,  // Changed from category to category_id
                supplier_id: null,
                purchase_link_id: null,
                imageFile: null,
                imagePreview: null
            },

            rules: {
                name: [{ required: true, message: '请输入颜色名称', trigger: 'blur' }],
                category_id: [{ required: true, message: '请选择原料类别', trigger: 'change' }]
            },

            supplierBusy: false,
            purchaseBusy: false,
            saving: false,
            _originalFormSnapshot: null,
            _escHandler: null,
            
            // Mont-Marte categories from API
            montMarteCategories: []
        };
    },
    ...(window.MontMarteComponentOptions || {})

};

// Expose to global scope for app.js to access
window.MontMarteComponent = MontMarteComponent;
