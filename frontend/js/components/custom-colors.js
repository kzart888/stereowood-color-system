// 自配颜色管理组件 - Refactored with child components
// 文件路径: frontend/js/components/custom-colors.js
// 定义全局变量 CustomColorsComponent，被 app.js 引用并注册

const CustomColorsComponent = {
    name: 'CustomColorsComponent',
    props: {
        sortMode: { type: String, default: 'time' } // time | name
    },

    components: {
        'custom-color-list-view': window.CustomColorListView,
        'edit-color-dialog': window.EditColorDialog,
        'duplicate-groups-dialog': window.DuplicateGroupsDialog
    },

    mixins: [
        window.CustomColorFilteringMixin,
        window.CustomColorPaginationMixin,
        window.CustomColorSelectionMixin
    ],

    template: `
        <div class="custom-colors-page">
            <custom-color-list-view
                :loading="loading"
                :active-category="activeCategory"
                :ordered-categories="orderedCategoriesWithOther"
                :filtered-count="filteredColors.length"
                :paginated-colors="paginatedColors"
                :start-item="startItem"
                :end-item="endItem"
                :visible-pages="visiblePages"
                :current-page="currentPage"
                :total-pages="totalPages"
                :items-per-page="itemsPerPage"
                :is-development-mode="isDevelopmentMode"
                :highlight-code="highlightCode"
                :selected-color-id="selectedColorId"
                :refresh-key="refreshKey"
                :formula-utils="formulaUtils"
                :base-url="baseURL"
                :category-name-fn="(color) => categoryName(color)"
                :usage-groups-fn="(color) => usageGroups(color)"
                :set-color-item-ref="(color) => setColorItemRef(color)"
                :is-color-referenced-fn="(color) => isColorReferenced(color)"
                :get-cmyk-color-fn="getCMYKColor"
                :get-pantone-swatch-style-fn="getPantoneSwatchStyle"
                @update:activeCategory="activeCategory = $event"
                @open-category-manager="showCategoryManager = true"
                @toggle-selection="handleToggleSelection"
                @edit="editColor"
                @delete="deleteColor"
                @view-history="viewHistory"
                @go-to-page="goToPage"
                @update:itemsPerPage="handleItemsPerPageChange"
            />

            <category-manager
                :visible="showCategoryManager"
                @update:visible="showCategoryManager = $event"
                :categories="categories"
                category-type="colors"
                @updated="handleCategoriesUpdated"
            />

            <edit-color-dialog
                :visible="showEditDialog"
                :categories="categories"
                :categories-with-other="categoriesWithOther"
                :custom-colors="customColors"
                :mont-marte-colors="montMarteColors"
                :base-url="baseURL"
                :editing-color="editingColor"
                :active-category="activeCategory"
                :saving="saving"
                @update:visible="showEditDialog = $event"
                @save="handleSaveColor"
                @cancel="handleDialogCancel"
            />

            <duplicate-groups-dialog
                ref="duplicateDialog"
                :is-color-referenced-fn="(color) => isColorReferenced(color)"
            />
        </div>
    `,

    inject: ['globalData'],

    data() {
        return {
            loading: false,
            activeCategory: 'all',
            showEditDialog: false,
            showCategoryManager: false,
            editingColor: null,
            saving: false,
            refreshKey: 0,

            showConflictDialog: false,
            conflictData: null,
            pendingFormData: null
        };
    },

    computed: {
        formulaUtils() {
            return window.formulaUtils || { segments: (f) => f ? f.split(/\s+/) : [] };
        },

        baseURL() {
            return this.globalData.baseURL;
        },

        categoriesWithOther() {
            return this.orderedCategoriesWithOther.map(c => c);
        }
    },

    methods: {
        // Category management
        async handleCategoriesUpdated() {
            await this.globalData.loadCategories();
            await this.globalData.loadCustomColors();
            this.$message.success('分类已更新');
        },

        getMsg() {
            return ElementPlus.ElMessage;
        },

        openAddDialog() {
            this.editingColor = null;
            this.showEditDialog = true;
        },

        editColor(color) {
            this.editingColor = color;
            this.showEditDialog = true;
        },

        async handleSaveColor(payload) {
            if (!payload || !payload.formData) return;
            const formData = payload.formData;
            const msg = this.getMsg();

            try {
                this.saving = true;
                if (this.editingColor) {
                    await api.customColors.update(this.editingColor.id, formData);
                    msg.success('修改成功');
                } else {
                    await api.customColors.create(formData);
                    msg.success('添加成功');
                }

                this.showEditDialog = false;
                this.editingColor = null;

                await this.globalData.loadCustomColors();
                await this.globalData.loadArtworks();
                this.refreshKey++;
            } catch (error) {
                if (error.response?.status === 409 && error.response?.data?.code === 'VERSION_CONFLICT') {
                    this.handleVersionConflict(error.response.data, formData);
                } else {
                    msg.error(error.response?.data?.error || '保存失败');
                }
            } finally {
                this.saving = false;
            }
        },

        handleDialogCancel() {
            this.showEditDialog = false;
            this.editingColor = null;
        },

        handleToggleSelection(colorId, event) {
            this.toggleColorSelection(colorId, event);
        },

        handleItemsPerPageChange(value) {
            this.itemsPerPage = value;
            this.onItemsPerPageChange();
        },

        async deleteColor(color) {
            const msg = this.getMsg();
            const ok = await this.$helpers.doubleDangerConfirm({
                firstMessage: `确定删除 ${color.color_code} 吗？`,
                firstConfirmText: '确定',
                firstCancelText: '取消',
                secondMessage: `真的要删除 ${color.color_code} 吗？此操作不可恢复！`,
                secondConfirmText: '删除',
                secondCancelText: '取消',
                confirmType: 'danger'
            });

            if (!ok) return;

            try {
                await api.customColors.delete(color.id);
                msg.success('删除成功');
                await this.globalData.loadCustomColors();
                await this.globalData.loadArtworks();
            } catch (error) {
                const raw = error?.response?.data?.error || '';
                if (raw.includes('配色方案使用')) {
                    msg.warning('该自配色已被引用，无法删除');
                } else {
                    msg.error(raw || '删除失败');
                }
            }
        },

        viewHistory(color) {
            const msg = this.getMsg();
            msg.info('历史功能待实现');
        },

        handleVersionConflict(conflictData, formData) {
            this.conflictData = conflictData;
            this.pendingFormData = formData;
            this.showConflictDialog = true;
        },

        getCMYKColor(c, m, y, k) {
            if (window.ColorConverter) {
                const rgb = window.ColorConverter.cmykToRgb(c, m, y, k);
                return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
            }
            return '#f5f5f5';
        },

        getPantoneSwatchStyle(pantoneCode) {
            if (!pantoneCode || !window.PantoneHelper) {
                return { background: '#f5f5f5', border: '1px dashed #ccc' };
            }

            const color = window.PantoneHelper.getColorByName(pantoneCode);
            if (color && color.rgb) {
                return {
                    background: `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`,
                    border: '1px solid rgba(0, 0, 0, 0.15)'
                };
            }
            return { background: '#f5f5f5', border: '1px dashed #ccc' };
        },

        printColorPalette() {
            const msg = this.getMsg();
            msg.info('正在准备打印，请稍候...');

            this.$nextTick(() => {
                setTimeout(() => {
                    this.createPrintWindow();
                }, 300);
            });
        },

        createPrintWindow() {
            if (typeof window.buildCustomColorsPrintHTML !== 'function') {
                this.getMsg().error('打印模块未加载');
                return;
            }

            const colorCount = (this.globalData.customColors?.value || []).length;
            const printContent = window.buildCustomColorsPrintHTML({
                paletteGroups: this.paletteGroups,
                colorCount,
                baseURL: this.baseURL
            });

            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) return;
            printWindow.document.write(printContent);
            printWindow.document.close();

            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            };
        },

        runDuplicateCheck(focusSignature = null, preferredKeepId = null) {
            if (this.$refs.duplicateDialog && typeof this.$refs.duplicateDialog.runDuplicateCheck === 'function') {
                this.$refs.duplicateDialog.runDuplicateCheck(focusSignature, preferredKeepId);
            } else {
                this.getMsg().info('查重模块未加载');
            }
        }
    }
};

window.CustomColorsComponent = CustomColorsComponent;
