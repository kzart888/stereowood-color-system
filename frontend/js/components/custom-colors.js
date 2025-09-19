const {
    ref,
    reactive,
    computed,
    inject,
    onMounted,
    onBeforeUnmount,
    watch,
    getCurrentInstance,
    provide,
    nextTick
} = Vue;

function createDefaultForm() {
    return {
        category_id: '',
        color_code: '',
        formula: '',
        imageFile: null,
        imagePreview: null,
        rgb_r: null,
        rgb_g: null,
        rgb_b: null,
        cmyk_c: null,
        cmyk_m: null,
        cmyk_y: null,
        cmyk_k: null,
        hex_color: null,
        pantone_coated: null,
        pantone_uncoated: null
    };
}

function revokePreview(preview) {
    if (preview && preview.startsWith && preview.startsWith('blob:')) {
        try { URL.revokeObjectURL(preview); } catch (e) {}
    }
}

function useMessage() {
    return ElementPlus.ElMessage;
}

const CustomColorsComponent = {
    name: 'CustomColorsComponent',
    props: {
        sortMode: { type: String, default: 'time' }
    },
    setup(props) {
        const globalData = inject('globalData');
        const instance = getCurrentInstance();

        const store = window.createCustomColorsStore({
            globalData,
            getSortMode: () => props.sortMode,
            getSearchQuery: () => {
                const root = instance?.proxy?.$root;
                return (root && root.globalSearchQuery) || '';
            },
            getActiveTab: () => {
                const root = instance?.proxy?.$root;
                return root ? root.activeTab : 'custom-colors';
            }
        });

        provide('customColorsStore', store);

        const loading = ref(false);
        const showCategoryManager = ref(false);
        const showAddDialog = ref(false);
        const editingColor = ref(null);
        const saving = ref(false);
        const form = reactive(createDefaultForm());
        const rules = {
            category_id: [{ required: true, message: '请选择分类', trigger: 'change' }],
            color_code: [{ required: true, message: '请输入颜色编号', trigger: 'blur' }]
        };
        const autoSyncDisabled = ref(false);
        const originalFormSnapshot = ref(null);
        const escHandler = ref(null);
        const formRef = ref(null);
        const pendingFormData = ref(null);
        const conflictData = ref(null);
        const showConflictDialog = ref(false);

        const colorValueHelpers = window.createColorValueHelpers(form);
        const hasImageAvailable = computed(() =>
            colorValueHelpers.hasImageAvailable.value || !!(editingColor.value && editingColor.value.image_path)
        );
        const dialogColorHelpers = {
            ...colorValueHelpers,
            hasImageAvailable
        };

        const orderedCategories = computed(() => {
            const raw = [...(store.categories.value || [])];
            raw.sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
            return raw;
        });

        const orderedCategoriesWithOther = computed(() => {
            const raw = orderedCategories.value.slice();
            const hasOther = raw.some(cat => String(cat.id || '').toLowerCase() === 'other');
            if (!hasOther) {
                raw.push({ id: 'other', name: '其他', code: null });
            }
            return raw;
        });

        const dialogCategories = computed(() => orderedCategoriesWithOther.value);
        const baseURL = computed(() => store.baseURL.value);
        const montMarteColors = computed(() => globalData.montMarteColors?.value || []);

        const colorCodeDuplicate = computed(() => {
            const val = (form.color_code || '').trim();
            if (!val) return false;
            const editingId = editingColor.value ? editingColor.value.id : null;
            return (store.customColors.value || []).some(color => color.color_code === val && color.id !== editingId);
        });

        const esCategoryId = computed(() => {
            const es = (store.categories.value || []).find(cat => cat.code === 'ES');
            return es ? es.id : null;
        });

        function resetForm() {
            revokePreview(form.imagePreview);
            Object.assign(form, createDefaultForm());
            if (formRef.value) {
                formRef.value.resetFields();
            }
            editingColor.value = null;
            autoSyncDisabled.value = false;
            originalFormSnapshot.value = null;
            unbindEsc();
        }

        function handleCategoriesUpdated() {
            globalData.loadCategories();
            globalData.loadCustomColors();
            useMessage().success('分类已更新');
        }

        function openAddDialog() {
            editingColor.value = null;
            autoSyncDisabled.value = false;
            if (store.pagination.activeCategory !== 'all') {
                const categoryId = store.pagination.activeCategory === 'other'
                    ? 'other'
                    : parseInt(store.pagination.activeCategory, 10);
                form.category_id = categoryId;
                if (categoryId === esCategoryId.value) {
                    form.color_code = '';
                } else if (categoryId !== 'other') {
                    generateColorCode(categoryId);
                } else {
                    form.color_code = '';
                }
            } else {
                form.category_id = '';
                form.color_code = '';
            }
            form.formula = '';
            form.imageFile = null;
            revokePreview(form.imagePreview);
            form.imagePreview = null;
            form.rgb_r = null;
            form.rgb_g = null;
            form.rgb_b = null;
            form.cmyk_c = null;
            form.cmyk_m = null;
            form.cmyk_y = null;
            form.cmyk_k = null;
            form.hex_color = null;
            form.pantone_coated = null;
            form.pantone_uncoated = null;
            showAddDialog.value = true;
        }

        function editColor(color) {
            editingColor.value = color;
            autoSyncDisabled.value = true;
            form.category_id = color.category_id;
            form.color_code = color.color_code;
            form.formula = color.formula;
            form.imageFile = null;
            revokePreview(form.imagePreview);
            form.imagePreview = color.image_path ? instance.proxy.$helpers.buildUploadURL(baseURL.value, color.image_path) : null;
            form.rgb_r = color.rgb_r;
            form.rgb_g = color.rgb_g;
            form.rgb_b = color.rgb_b;
            form.cmyk_c = color.cmyk_c;
            form.cmyk_m = color.cmyk_m;
            form.cmyk_y = color.cmyk_y;
            form.cmyk_k = color.cmyk_k;
            form.hex_color = color.hex_color;
            form.pantone_coated = color.pantone_coated;
            form.pantone_uncoated = color.pantone_uncoated;
            showAddDialog.value = true;
        }

        function normalizedColorForm() {
            return {
                category_id: form.category_id || '',
                color_code: form.color_code || '',
                formula: form.formula || '',
                imagePreview: form.imagePreview ? '1' : ''
            };
        }

        function bindEsc() {
            unbindEsc();
            escHandler.value = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    attemptCloseAddDialog();
                }
            };
            document.addEventListener('keydown', escHandler.value);
        }

        function unbindEsc() {
            if (escHandler.value) {
                document.removeEventListener('keydown', escHandler.value);
                escHandler.value = null;
            }
        }

        function onDialogOpen(formInstance) {
            formRef.value = formInstance;
            initForm();
            originalFormSnapshot.value = JSON.stringify(normalizedColorForm());
            bindEsc();
        }

        function onDialogClose() {
            resetForm();
        }

        function isFormDirty() {
            if (!originalFormSnapshot.value) return false;
            return JSON.stringify(normalizedColorForm()) !== originalFormSnapshot.value;
        }

        async function attemptCloseAddDialog() {
            if (isFormDirty()) {
                try {
                    await ElementPlus.ElMessageBox.confirm('检测到未保存的修改，确认丢弃吗？', '未保存的修改', {
                        confirmButtonText: '丢弃修改',
                        cancelButtonText: '继续编辑',
                        type: 'warning'
                    });
                } catch (e) {
                    return;
                }
            }
            showAddDialog.value = false;
        }

        function onColorCodeInput(value) {
            if (editingColor.value) return;
            if (autoSyncDisabled.value) return;
            const esId = esCategoryId.value;
            if (esId && form.category_id === esId) return;
            if (!value) return;
            const msg = useMessage();
            const firstChar = value.charAt(0);
            const esTriggers = ['酒', '沙', '红', '黑', '蓝'];
            if (esId && esTriggers.includes(firstChar)) {
                if (form.category_id !== esId) {
                    form.category_id = esId;
                    msg.info('已自动识别为 色精');
                    autoSyncDisabled.value = true;
                }
                return;
            }
            if (value.length >= 2) {
                const prefix = value.substring(0, 2).toUpperCase();
                const matchedCategory = (store.categories.value || []).find(cat => cat.code === prefix);
                if (matchedCategory && form.category_id !== matchedCategory.id) {
                    form.category_id = matchedCategory.id;
                    msg.info(`已自动切换到 ${matchedCategory.name}`);
                    autoSyncDisabled.value = true;
                }
            }
        }

        function initForm() {
            const esId = esCategoryId.value;
            if (!editingColor.value && form.category_id && form.category_id !== esId && form.category_id !== 'other') {
                generateColorCode(form.category_id);
            }
        }

        function onCategoryChange(value) {
            if (autoSyncDisabled.value) return;
            const esId = esCategoryId.value;
            if (!editingColor.value && value && value !== esId && value !== 'other') {
                generateColorCode(value);
                autoSyncDisabled.value = true;
            } else if (value === esId) {
                form.color_code = '';
                autoSyncDisabled.value = true;
            }
        }

        function generateColorCode(categoryId) {
            const esId = esCategoryId.value;
            if (!categoryId || categoryId === esId || categoryId === 'other') return;
            const code = instance.proxy.$helpers.generateColorCode(store.categories.value, store.customColors.value || [], categoryId);
            if (code) {
                form.color_code = code;
            }
        }

        function handleImageChange(file) {
            form.imageFile = file.raw;
            revokePreview(form.imagePreview);
            form.imagePreview = URL.createObjectURL(file.raw);
        }

        function clearImage() {
            form.imageFile = null;
            revokePreview(form.imagePreview);
            form.imagePreview = null;
        }

        async function fetchImageAsFile(imageUrl) {
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                return new File([blob], 'image.jpg', { type: blob.type });
            } catch (error) {
                return null;
            }
        }

        async function extractColorFromImage() {
            const msg = useMessage();
            let imageToProcess = null;
            if (form.imageFile) {
                imageToProcess = form.imageFile;
            } else if (editingColor.value && editingColor.value.image_path) {
                const imageUrl = instance.proxy.$helpers.buildUploadURL(baseURL.value, editingColor.value.image_path);
                imageToProcess = await fetchImageAsFile(imageUrl);
            } else if (form.imagePreview) {
                imageToProcess = await fetchImageAsFile(form.imagePreview);
            }
            if (!imageToProcess) {
                msg.warning('没有可用的图片');
                return;
            }
            try {
                const color = await ColorConverter.extractColorFromImage(imageToProcess);
                form.rgb_r = color.r;
                form.rgb_g = color.g;
                form.rgb_b = color.b;
                const cmyk = ColorConverter.rgbToCmyk(color.r, color.g, color.b);
                form.cmyk_c = cmyk.c;
                form.cmyk_m = cmyk.m;
                form.cmyk_y = cmyk.y;
                form.cmyk_k = cmyk.k;
                form.hex_color = ColorConverter.rgbToHex(color.r, color.g, color.b);
                msg.success('已提取颜色值');
            } catch (error) {
                msg.error('提取颜色失败');
            }
        }

        function clearColorValues() {
            const msg = useMessage();
            form.rgb_r = null;
            form.rgb_g = null;
            form.rgb_b = null;
            form.cmyk_c = null;
            form.cmyk_m = null;
            form.cmyk_y = null;
            form.cmyk_k = null;
            form.hex_color = null;
            form.pantone_coated = null;
            form.pantone_uncoated = null;
            msg.success('色值已清除');
        }

        async function findPantoneMatch() {
            const msg = useMessage();
            if (form.rgb_r === null || form.rgb_g === null || form.rgb_b === null) {
                msg.warning('请先输入或提取 RGB 颜色值');
                return;
            }
            try {
                const rgb = {
                    r: parseInt(form.rgb_r, 10),
                    g: parseInt(form.rgb_g, 10),
                    b: parseInt(form.rgb_b, 10)
                };
                if (!ColorConverter.isValidRGB(rgb.r, rgb.g, rgb.b)) {
                    msg.error('RGB 值无效，请检查输入');
                    return;
                }
                let coatedMatch;
                let uncoatedMatch;
                if (window.PantoneHelper) {
                    coatedMatch = window.PantoneHelper.findClosest(rgb, 'coated');
                    uncoatedMatch = window.PantoneHelper.findClosest(rgb, 'uncoated');
                } else {
                    const pantoneResult = ColorConverter.findClosestPantone(rgb);
                    coatedMatch = pantoneResult.coated;
                    uncoatedMatch = pantoneResult.uncoated;
                }
                if (coatedMatch) {
                    const cleanName = coatedMatch.name.replace(/^PANTONE\s+/i, '').replace(/\s+C$/i, 'C');
                    form.pantone_coated = cleanName;
                }
                if (uncoatedMatch) {
                    const cleanName = uncoatedMatch.name.replace(/^PANTONE\s+/i, '').replace(/\s+U$/i, 'U');
                    form.pantone_uncoated = cleanName;
                }
                const coatedDisplay = coatedMatch ? coatedMatch.name.replace(/^PANTONE\s+/i, '').replace(/\s+C$/i, 'C') : '无';
                const uncoatedDisplay = uncoatedMatch ? uncoatedMatch.name.replace(/^PANTONE\s+/i, '').replace(/\s+U$/i, 'U') : '无';
                msg.success(`已匹配潘通色号: ${coatedDisplay} / ${uncoatedDisplay}`);
            } catch (error) {
                msg.error('匹配潘通色号失败');
            }
        }

        async function saveColor() {
            if (!formRef.value) return;
            const valid = await formRef.value.validate().catch(() => false);
            if (!valid) return;
            if (colorCodeDuplicate.value) return;
            const msg = useMessage();
            try {
                saving.value = true;
                const formData = new FormData();
                const actualCategoryId = form.category_id === 'other' ? '' : form.category_id;
                formData.append('category_id', actualCategoryId);
                formData.append('color_code', form.color_code);
                formData.append('formula', form.formula || '');
                if (form.imageFile) formData.append('image', form.imageFile);
                if (form.rgb_r != null) formData.append('rgb_r', form.rgb_r);
                if (form.rgb_g != null) formData.append('rgb_g', form.rgb_g);
                if (form.rgb_b != null) formData.append('rgb_b', form.rgb_b);
                if (form.cmyk_c != null) formData.append('cmyk_c', form.cmyk_c);
                if (form.cmyk_m != null) formData.append('cmyk_m', form.cmyk_m);
                if (form.cmyk_y != null) formData.append('cmyk_y', form.cmyk_y);
                if (form.cmyk_k != null) formData.append('cmyk_k', form.cmyk_k);
                if (form.hex_color) formData.append('hex_color', form.hex_color);
                if (form.pantone_coated) formData.append('pantone_coated', form.pantone_coated);
                if (form.pantone_uncoated) formData.append('pantone_uncoated', form.pantone_uncoated);
                if (editingColor.value) {
                    if (!form.imageFile && editingColor.value.image_path) {
                        formData.append('existingImagePath', editingColor.value.image_path);
                    }
                    if (editingColor.value.version) {
                        formData.append('version', editingColor.value.version);
                    }
                    await api.customColors.update(editingColor.value.id, formData);
                    msg.success('修改成功');
                } else {
                    await api.customColors.create(formData);
                    msg.success('添加成功');
                }
                showAddDialog.value = false;
                resetForm();
                await globalData.loadCustomColors();
                await globalData.loadArtworks();
                store.refreshKey.value = (store.refreshKey.value || 0) + 1;
            } catch (error) {
                if (error.response?.status === 409 && error.response?.data?.code === 'VERSION_CONFLICT') {
                    conflictData.value = error.response.data;
                    pendingFormData.value = formData;
                    showConflictDialog.value = true;
                } else {
                    msg.error(error.response?.data?.error || '保存失败');
                }
            } finally {
                saving.value = false;
            }
        }

        async function deleteColor(color) {
            const ok = await instance.proxy.$helpers.doubleDangerConfirm({
                firstMessage: `确定删除 ${color.color_code} 吗？`,
                firstConfirmText: '确定',
                firstCancelText: '取消',
                secondMessage: `真的要删除 ${color.color_code} 吗？此操作不可恢复！`,
                secondConfirmText: '删除',
                secondCancelText: '取消',
                confirmType: 'danger'
            });
            if (!ok) return;
            const msg = useMessage();
            try {
                await api.customColors.delete(color.id);
                msg.success('删除成功');
                await globalData.loadCustomColors();
                await globalData.loadArtworks();
            } catch (error) {
                const raw = error?.response?.data?.error || '';
                if (raw.includes('配色方案使用')) {
                    msg.warning('该自配色已被引用，无法删除');
                } else {
                    msg.error(raw || '删除失败');
                }
            }
        }

        function viewHistory() {
            useMessage().info('历史功能待实现');
        }

        function runDuplicateCheck() {
            store.runDuplicateCheck();
        }

        function showColorPalette() {
            useMessage().info('请使用“自配色字典”页面查看色卡');
        }

        onMounted(() => {
            store.updatePaginationFromConfig();
            store.restorePaginationState();
            document.addEventListener('click', store.handleGlobalClick);
            document.addEventListener('keydown', store.handleEscKey);
        });

        onBeforeUnmount(() => {
            document.removeEventListener('click', store.handleGlobalClick);
            document.removeEventListener('keydown', store.handleEscKey);
        });

        watch(() => store.pagination.itemsPerPage, () => {
            // reset snapshot when per-page changes (prevents stale diff)
            nextTick(() => {
                originalFormSnapshot.value = JSON.stringify(normalizedColorForm());
            });
        });

        return {
            store,
            loading,
            showCategoryManager,
            showAddDialog,
            editingColor,
            saving,
            form,
            rules,
            colorCodeDuplicate,
            dialogCategories,
            montMarteColors,
            dialogColorHelpers,
            orderedCategoriesWithOther,
            esCategoryId,
            baseURL,
            handleCategoriesUpdated,
            openAddDialog,
            editColor,
            saveColor,
            deleteColor,
            viewHistory,
            attemptCloseAddDialog,
            onColorCodeInput,
            onCategoryChange,
            handleImageChange,
            clearImage,
            extractColorFromImage,
            clearColorValues,
            findPantoneMatch,
            runDuplicateCheck,
            showColorPalette,
            onDialogOpen,
            onDialogClose,
            conflictData,
            pendingFormData,
            showConflictDialog
        };
    },
    template: `
        <div class="custom-colors-page">
            <div class="category-switch-group" role="tablist" aria-label="颜色分类筛选">
                <button
                    type="button"
                    class="category-switch"
                    :class="{active: store.pagination.activeCategory==='all'}"
                    @click="store.pagination.activeCategory='all'"
                    role="tab"
                    :aria-selected="store.pagination.activeCategory==='all'">
                    全部
                </button>
                <button
                    v-for="cat in orderedCategoriesWithOther"
                    :key="cat.id || 'other'"
                    type="button"
                    class="category-switch"
                    :class="{active: store.pagination.activeCategory===String(cat.id || 'other')}"
                    @click="store.pagination.activeCategory=String(cat.id || 'other')"
                    role="tab"
                    :aria-selected="store.pagination.activeCategory===String(cat.id || 'other')"
                >{{ cat.name }}</button>
                <button
                    type="button"
                    class="category-settings-btn"
                    @click="showCategoryManager = true"
                    title="管理分类"
                >
                    <el-icon><Setting /></el-icon>
                </button>
            </div>

            <div v-if="loading" class="loading"><el-icon class="is-loading"><Loading /></el-icon> 加载中...</div>
            <div v-else>
                <color-card-grid
                    @edit-color="editColor"
                    @delete-color="deleteColor"
                    @view-history="viewHistory"
                />
            </div>

            <category-manager
                :visible="showCategoryManager"
                @update:visible="val => showCategoryManager = val"
                :categories="store.categories.value"
                category-type="colors"
                @updated="handleCategoriesUpdated"
            />

            <color-details-dialog
                :visible="showAddDialog"
                @update:visible="val => showAddDialog = val"
                :form="form"
                :rules="rules"
                :editing-color="editingColor"
                :saving="saving"
                :color-code-duplicate="colorCodeDuplicate"
                :categories="dialogCategories"
                :mont-marte-colors="montMarteColors"
                :color-value-helpers="dialogColorHelpers"
                @save="saveColor"
                @attempt-close="attemptCloseAddDialog"
                @dialog-open="onDialogOpen"
                @dialog-close="onDialogClose"
                @color-code-input="onColorCodeInput"
                @category-change="onCategoryChange"
                @image-change="handleImageChange"
                @clear-image="clearImage"
                @extract-color="extractColorFromImage"
                @find-pantone="findPantoneMatch"
                @clear-color-values="clearColorValues"
            />

            <duplicate-resolution-dialog />
        </div>
    `
};

window.CustomColorsComponent = CustomColorsComponent;
