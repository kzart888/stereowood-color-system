(() => {
    const {
        reactive,
        ref,
        computed,
        watch,
        nextTick
    } = Vue;

    const formulaUtilsFallback = {
        segments: (formula) => formula ? formula.split(/\s+/) : []
    };

    function createColorValueHelpers(form) {
        const hasRGBValue = computed(() =>
            form.rgb_r != null && form.rgb_g != null && form.rgb_b != null
        );

        const hasCMYKValue = computed(() =>
            form.cmyk_c != null || form.cmyk_m != null || form.cmyk_y != null || form.cmyk_k != null
        );

        const hasHEXValue = computed(() => !!form.hex_color);
        const hasPantoneCoatedValue = computed(() => !!form.pantone_coated);
        const hasPantoneUncoatedValue = computed(() => !!form.pantone_uncoated);

        const rgbSwatchStyle = computed(() => {
            if (hasRGBValue.value) {
                return {
                    backgroundColor: `rgb(${form.rgb_r}, ${form.rgb_g}, ${form.rgb_b})`,
                    border: '1px solid rgba(0, 0, 0, 0.15)'
                };
            }
            return { backgroundColor: '#f5f5f5', border: '1px dashed #ccc' };
        });

        const cmykSwatchStyle = computed(() => {
            if (hasCMYKValue.value && window.ColorConverter) {
                const rgb = window.ColorConverter.cmykToRgb(
                    form.cmyk_c || 0,
                    form.cmyk_m || 0,
                    form.cmyk_y || 0,
                    form.cmyk_k || 0
                );
                return {
                    backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
                    border: '1px solid rgba(0, 0, 0, 0.15)'
                };
            }
            return { backgroundColor: '#f5f5f5', border: '1px dashed #ccc' };
        });

        const hexSwatchStyle = computed(() => {
            if (hasHEXValue.value) {
                return {
                    backgroundColor: form.hex_color,
                    border: '1px solid rgba(0, 0, 0, 0.15)'
                };
            }
            return { backgroundColor: '#f5f5f5', border: '1px dashed #ccc' };
        });

        const pantoneCoatedSwatchStyle = computed(() => {
            if (hasPantoneCoatedValue.value && window.PantoneHelper) {
                const color = window.PantoneHelper.getColorByName(form.pantone_coated);
                if (color) {
                    return {
                        backgroundColor: `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`,
                        border: '1px solid rgba(0, 0, 0, 0.15)'
                    };
                }
            }
            return { backgroundColor: '#f5f5f5', border: '1px dashed #ccc' };
        });

        const pantoneUncoatedSwatchStyle = computed(() => {
            if (hasPantoneUncoatedValue.value && window.PantoneHelper) {
                const color = window.PantoneHelper.getColorByName(form.pantone_uncoated);
                if (color) {
                    return {
                        backgroundColor: `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`,
                        border: '1px solid rgba(0, 0, 0, 0.15)'
                    };
                }
            }
            return { backgroundColor: '#f5f5f5', border: '1px dashed #ccc' };
        });

        const hasImageAvailable = computed(() =>
            !!(form.imageFile || form.imagePreview)
        );

        return {
            hasRGBValue,
            hasCMYKValue,
            hasHEXValue,
            hasPantoneCoatedValue,
            hasPantoneUncoatedValue,
            rgbSwatchStyle,
            cmykSwatchStyle,
            hexSwatchStyle,
            pantoneCoatedSwatchStyle,
            pantoneUncoatedSwatchStyle,
            hasImageAvailable
        };
    }

    function createCustomColorsStore({
        globalData,
        getSortMode,
        getSearchQuery,
        getActiveTab
    }) {
        const pagination = reactive({
            activeCategory: 'all',
            currentPage: 1,
            itemsPerPage: 12
        });

        const highlightCode = ref(null);
        const selectedColorId = ref(null);
        const refreshKey = ref(0);
        const colorItemRefs = new Map();

        const duplicateState = reactive({
            showDialog: false,
            groups: [],
            selections: {},
            deletionPending: false,
            mergingPending: false
        });

        const formulaUtils = computed(() => window.formulaUtils || formulaUtilsFallback);
        const categories = computed(() => globalData.categories?.value || []);
        const customColors = computed(() => globalData.customColors?.value || []);
        const artworks = computed(() => globalData.artworks?.value || []);
        const baseURL = computed(() => globalData.baseURL);
        const appConfig = computed(() => globalData.appConfig?.value || null);
        const isDevelopmentMode = computed(() => appConfig.value && appConfig.value.mode === 'test');

        const filteredColors = computed(() => {
            let list;
            if (pagination.activeCategory === 'all') {
                list = customColors.value.slice();
            } else if (pagination.activeCategory === 'other') {
                list = customColors.value.filter(color => {
                    const prefix = (color.color_code || '').substring(0, 2).toUpperCase();
                    const matchedCategory = categories.value.find(cat => cat.code === prefix);
                    return !matchedCategory;
                });
            } else {
                const categoryId = parseInt(pagination.activeCategory, 10);
                list = customColors.value.filter(color => color.category_id === categoryId);
            }

            const query = (getSearchQuery?.() || '').trim().toLowerCase();
            const activeTab = getActiveTab?.();
            if (query && activeTab === 'custom-colors') {
                list = list.filter(color => (
                    (color.name || '').toLowerCase().includes(query) ||
                    (color.color_code || '').toLowerCase().includes(query)
                ));
            }

            const sortMode = getSortMode?.() || 'time';
            if (sortMode === 'name') {
                list.sort((a, b) => (a.color_code || '').localeCompare(b.color_code || ''));
            } else {
                list.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
            }
            return list;
        });

        const totalPages = computed(() => {
            if (pagination.itemsPerPage === 0) return 1;
            if (filteredColors.value.length === 0) return 1;
            return Math.ceil(filteredColors.value.length / pagination.itemsPerPage);
        });

        const paginatedColors = computed(() => {
            if (pagination.itemsPerPage === 0) return filteredColors.value;
            const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
            const end = start + pagination.itemsPerPage;
            return filteredColors.value.slice(start, end);
        });

        const startItem = computed(() => {
            if (filteredColors.value.length === 0) return 0;
            if (pagination.itemsPerPage === 0) return 1;
            return (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
        });

        const endItem = computed(() => {
            if (pagination.itemsPerPage === 0) return filteredColors.value.length;
            return Math.min(pagination.currentPage * pagination.itemsPerPage, filteredColors.value.length);
        });

        const visiblePages = computed(() => {
            const pages = [];
            const maxVisible = 7;
            const total = totalPages.value;
            const current = pagination.currentPage;

            if (total <= maxVisible) {
                for (let i = 1; i <= total; i++) pages.push(i);
                return pages;
            }

            if (current <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(total);
                return pages;
            }

            if (current >= total - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = total - 4; i <= total; i++) pages.push(i);
                return pages;
            }

            pages.push(1);
            pages.push('...');
            for (let i = current - 1; i <= current + 1; i++) pages.push(i);
            pages.push('...');
            pages.push(total);
            return pages;
        });

        watch(() => pagination.activeCategory, () => {
            pagination.currentPage = 1;
        });

        watch(totalPages, (total) => {
            if (pagination.currentPage > total) {
                pagination.currentPage = total;
            }
        });

        watch(appConfig, (config) => {
            if (config) updatePaginationFromConfig();
        }, { deep: true, immediate: true });

        function restorePaginationState() {
            try {
                const savedPage = localStorage.getItem('sw-colors-page');
                const savedItems = localStorage.getItem('sw-colors-items-per-page');
                if (savedItems) pagination.itemsPerPage = parseInt(savedItems, 10);
                if (savedPage) {
                    const page = parseInt(savedPage, 10);
                    if (page <= totalPages.value) pagination.currentPage = page;
                }
            } catch (e) {
                // ignore persistence errors
            }
        }

        function updatePaginationFromConfig() {
            const config = appConfig.value;
            if (!config || !window.ConfigHelper) return;
            let savedItems = null;
            try {
                const saved = localStorage.getItem('sw-colors-items-per-page');
                if (saved) savedItems = parseInt(saved, 10);
            } catch (e) {
                // ignore persistence errors
            }
            pagination.itemsPerPage = window.ConfigHelper.getItemsPerPage(
                config,
                'custom-colors',
                savedItems
            );
        }

        function goToPage(page) {
            if (page === '...') return;
            if (page < 1 || page > totalPages.value) return;
            pagination.currentPage = page;
            nextTick(() => {
                const container = document.querySelector('.color-cards-grid');
                if (container) {
                    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            try {
                localStorage.setItem('sw-colors-page', page);
            } catch (e) {
                // ignore persistence errors
            }
        }

        function setItemsPerPage(value) {
            pagination.itemsPerPage = value;
            pagination.currentPage = 1;
            try {
                localStorage.setItem('sw-colors-items-per-page', value);
            } catch (e) {
                // ignore persistence errors
            }
        }

        function toggleColorSelection(colorId, event) {
            if (event && event.stopPropagation) event.stopPropagation();
            selectedColorId.value = selectedColorId.value === colorId ? null : colorId;
        }

        function clearSelection() {
            selectedColorId.value = null;
        }

        function handleGlobalClick(event) {
            if (!event.target.closest('.artwork-bar')) {
                clearSelection();
            }
        }

        function handleEscKey(event) {
            if (event.key !== 'Escape') return;
            const activeElement = document.activeElement;
            const isInputFocused = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.tagName === 'SELECT' ||
                activeElement.classList.contains('el-input__inner')
            );
            if (!isInputFocused && selectedColorId.value !== null) {
                clearSelection();
                event.preventDefault();
            }
        }

        function setColorItemRef(color) {
            return (el) => {
                if (el) colorItemRefs.set(color.color_code, el);
                else colorItemRefs.delete(color.color_code);
            };
        }

        function usageGroups(color) {
            if (!color) return [];
            const code = color.color_code;
            if (!code) return [];
            const groups = [];
            artworks.value.forEach(artwork => {
                (artwork.schemes || []).forEach(scheme => {
                    const layers = [];
                    (scheme.layers || []).forEach(layer => {
                        if (layer.colorCode === code) {
                            const num = Number(layer.layer);
                            if (Number.isFinite(num)) layers.push(num);
                        }
                    });
                    if (layers.length) {
                        layers.sort((a, b) => a - b);
                        const schemeName = scheme.name || scheme.scheme_name || '-';
                        const header = `${helpers.formatArtworkTitle(artwork)}-[${schemeName}]`;
                        const suffix = layers.map(n => `(${n})`).join('');
                        groups.push({
                            display: header + suffix,
                            artworkId: artwork.id,
                            schemeId: scheme.id,
                            layers: layers.slice(),
                            colorCode: code,
                            schemeName
                        });
                    }
                });
            });
            return groups;
        }

        function categoryName(color) {
            const cat = categories.value.find(c => c.id === color.category_id);
            if (cat) return cat.name;
            const prefix = (color.color_code || '').substring(0, 2).toUpperCase();
            const byPrefix = categories.value.find(c => c.code === prefix);
            return byPrefix ? byPrefix.name : '其他';
        }

        function isColorReferenced(color) {
            if (!color) return false;
            const code = color.color_code;
            return artworks.value.some(artwork => (
                (artwork.schemes || []).some(scheme => (
                    (scheme.layers || []).some(layer => layer.colorCode === code)
                ))
            ));
        }

        function focusCustomColor(code) {
            if (pagination.activeCategory !== 'all') pagination.activeCategory = 'all';
            const targetIndex = filteredColors.value.findIndex(c => c.color_code === code);
            if (targetIndex === -1) return;
            const targetPage = pagination.itemsPerPage === 0 ? 1 : Math.floor(targetIndex / pagination.itemsPerPage) + 1;
            if (targetPage !== pagination.currentPage) {
                pagination.currentPage = targetPage;
            }
            nextTick(() => {
                const el = colorItemRefs.get(code);
                if (el && el.scrollIntoView) {
                    const rect = el.getBoundingClientRect();
                    const current = window.pageYOffset || document.documentElement.scrollTop;
                    const targetScroll = current + rect.top - 100;
                    window.scrollTo({ top: Math.max(0, targetScroll), behavior: 'instant' });
                    highlightCode.value = code;
                    setTimeout(() => { highlightCode.value = null; }, 2000);
                }
            });
        }

        function getCMYKColor(c, m, y, k) {
            if (window.ColorConverter) {
                const rgb = window.ColorConverter.cmykToRgb(c, m, y, k);
                return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
            }
            return '#f5f5f5';
        }

        function getPantoneSwatchStyle(pantoneCode) {
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
        }

        function runDuplicateCheck(focusSignature = null, preferredKeepId = null) {
            const msg = ElementPlus.ElMessage;
            if (!window.duplicateDetector) {
                msg.info('查重模块未加载');
                return;
            }
            const list = customColors.value || [];
            const map = window.duplicateDetector.groupByRatioSignature(list);
            const sigs = Object.keys(map);
            if (!sigs.length) {
                msg.success('未发现重复配方');
                duplicateState.showDialog = false;
                return;
            }
            duplicateState.groups = sigs.map(sig => {
                const recs = map[sig].slice().sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
                const parsed = window.duplicateDetector.parseRatio(sig);
                return { signature: sig, records: recs, parsed };
            });
            duplicateState.selections = {};
            duplicateState.groups.forEach(group => {
                if (focusSignature && group.signature === focusSignature && preferredKeepId) {
                    duplicateState.selections[group.signature] = preferredKeepId;
                } else if (group.records.length) {
                    duplicateState.selections[group.signature] = group.records[0].id;
                }
            });
            duplicateState.showDialog = true;
            msg.warning(`发现 ${sigs.length} 组重复配方`);
        }

        function keepAllDuplicates() {
            duplicateState.showDialog = false;
            ElementPlus.ElMessage.info('已保留全部重复记录');
        }

        async function performDuplicateDeletion() {
            if (duplicateState.deletionPending) return;
            const toDelete = [];
            duplicateState.groups.forEach(group => {
                const keepId = duplicateState.selections[group.signature];
                if (!keepId) return;
                group.records.forEach(record => {
                    if (record.id !== keepId && !isColorReferenced(record)) {
                        toDelete.push(record);
                    }
                });
            });
            if (!toDelete.length) {
                ElementPlus.ElMessage.info('没有可删除的记录');
                return;
            }
            try {
                await ElementPlus.ElMessageBox.confirm(`将删除 ${toDelete.length} 条记录，确认继续？`, '删除确认', {
                    type: 'warning',
                    confirmButtonText: '确认删除',
                    cancelButtonText: '取消'
                });
            } catch (e) {
                return;
            }
            duplicateState.deletionPending = true;
            let ok = 0;
            let fail = 0;
            for (const record of toDelete) {
                try {
                    await api.customColors.delete(record.id);
                    ok += 1;
                } catch (e) {
                    fail += 1;
                    break;
                }
            }
            duplicateState.deletionPending = false;
            await globalData.loadCustomColors();
            await globalData.loadArtworks();
            ElementPlus.ElMessage.success(`删除完成：成功 ${ok} 条，失败 ${fail} 条`);
            runDuplicateCheck();
        }

        function canDeleteAny() {
            if (!duplicateState.groups.length) return false;
            return duplicateState.groups.some(group => {
                const keepId = duplicateState.selections[group.signature];
                if (!keepId) return false;
                return group.records.some(record => record.id !== keepId && !isColorReferenced(record));
            });
        }

        function canForceMerge() {
            if (!duplicateState.groups.length) return false;
            return duplicateState.groups.some(group => group.records.length > 1 && duplicateState.selections[group.signature]);
        }

        async function confirmForceMerge() {
            if (duplicateState.mergingPending || duplicateState.deletionPending) return;
            const candidates = duplicateState.groups.filter(group => group.records.length > 1 && duplicateState.selections[group.signature]);
            if (!candidates.length) {
                ElementPlus.ElMessage.info('请选择要保留的记录');
                return;
            }
            const group = candidates[0];
            const keepId = duplicateState.selections[group.signature];
            if (!keepId) {
                ElementPlus.ElMessage.info('请先选择要保留的记录');
                return;
            }
            const removeIds = group.records.filter(record => record.id !== keepId).map(record => record.id);
            if (!removeIds.length) {
                ElementPlus.ElMessage.info('该组没有其它记录');
                return;
            }
            let referenced = 0;
            group.records.forEach(record => {
                if (record.id !== keepId && isColorReferenced(record)) referenced += 1;
            });
            const msg = `将合并该组：保留 1 条，删除 ${removeIds.length} 条；其中 ${referenced} 条被引用，其引用将更新到保留记录。确认继续？`;
            try {
                await ElementPlus.ElMessageBox.confirm(msg, '强制合并确认', {
                    type: 'warning',
                    confirmButtonText: '执行合并',
                    cancelButtonText: '取消'
                });
            } catch (e) {
                return;
            }
            executeForceMerge({ keepId, removeIds, signature: group.signature });
        }

        async function executeForceMerge(payload) {
            if (duplicateState.mergingPending) return;
            duplicateState.mergingPending = true;
            try {
                const resp = await api.customColors.forceMerge(payload);
                const updated = resp?.updatedLayers ?? resp?.data?.updatedLayers ?? 0;
                const deleted = resp?.deleted ?? resp?.data?.deleted ?? payload.removeIds.length;
                ElementPlus.ElMessage.success(`强制合并完成：更新引用 ${updated} 个，删除 ${deleted} 条`);
                await globalData.loadCustomColors();
                await globalData.loadArtworks();
                runDuplicateCheck();
                if (!duplicateState.groups.length) {
                    duplicateState.showDialog = false;
                }
            } catch (err) {
                const raw = err?.response?.data?.error || '';
                if (raw) ElementPlus.ElMessage.error('合并失败: ' + raw);
                else if (err?.request) ElementPlus.ElMessage.error('网络错误，合并失败');
                else ElementPlus.ElMessage.error('合并失败');
            } finally {
                duplicateState.mergingPending = false;
            }
        }

        return {
            pagination,
            highlightCode,
            selectedColorId,
            refreshKey,
            colorItemRefs,
            duplicateState,
            formulaUtils,
            categories,
            customColors,
            artworks,
            baseURL,
            appConfig,
            isDevelopmentMode,
            filteredColors,
            paginatedColors,
            totalPages,
            startItem,
            endItem,
            visiblePages,
            restorePaginationState,
            updatePaginationFromConfig,
            goToPage,
            setItemsPerPage,
            toggleColorSelection,
            clearSelection,
            handleGlobalClick,
            handleEscKey,
            setColorItemRef,
            usageGroups,
            categoryName,
            isColorReferenced,
            focusCustomColor,
            getCMYKColor,
            getPantoneSwatchStyle,
            runDuplicateCheck,
            keepAllDuplicates,
            performDuplicateDeletion,
            confirmForceMerge,
            executeForceMerge,
            canDeleteAny,
            canForceMerge
        };
    }

    window.createCustomColorsStore = createCustomColorsStore;
    window.createColorValueHelpers = createColorValueHelpers;
})();
