import { useAppData } from './modules/app-data.js';
import { useGlobalSearch } from './modules/global-search.js';

const {
    createApp,
    ref,
    reactive,
    computed,
    watch,
    onMounted,
    onBeforeUnmount,
    nextTick,
    provide
} = Vue;

const ALLOWED_TABS = ['custom-colors', 'color-dictionary', 'artworks', 'mont-marte'];

function getInitialTab() {
    let initTab = 'custom-colors';
    try {
        const savedTab = localStorage.getItem('sw-active-tab');
        if (savedTab && ALLOWED_TABS.includes(savedTab)) initTab = savedTab;
    } catch (e) {
        // ignore persistence failures
    }
    return initTab;
}

function setupActiveTabPersistence(activeTab) {
    watch(activeTab, val => {
        try {
            localStorage.setItem('sw-active-tab', val);
        } catch (e) {
            // ignore persistence failures
        }
    });
}

function setupScrollPersistence(activeTab, suppressNextRestore) {
    const restoreScroll = () => {
        try {
            const raw = localStorage.getItem('sw-scroll-map');
            if (!raw) return;
            const map = JSON.parse(raw);
            const pos = map && typeof map[activeTab.value] === 'number' ? map[activeTab.value] : 0;
            if (pos > 0) window.scrollTo(0, pos);
        } catch (e) {
            // ignore scroll restoration failures
        }
    };

    let scrollTimer = null;
    const handleScroll = () => {
        if (scrollTimer) return;
        scrollTimer = setTimeout(() => {
            scrollTimer = null;
            try {
                const raw = localStorage.getItem('sw-scroll-map');
                const map = raw ? JSON.parse(raw) : {};
                map[activeTab.value] = window.scrollY || 0;
                localStorage.setItem('sw-scroll-map', JSON.stringify(map));
            } catch (e) {
                // ignore persistence failures
            }
        }, 200);
    };

    onMounted(() => {
        setTimeout(restoreScroll, 80);
        window.addEventListener('scroll', handleScroll, { passive: true });
    });

    onBeforeUnmount(() => {
        window.removeEventListener('scroll', handleScroll);
    });

    let lastTabForScroll = activeTab.value;
    watch(activeTab, (newTab, oldTab) => {
        try {
            const raw = localStorage.getItem('sw-scroll-map');
            const map = raw ? JSON.parse(raw) : {};
            const key = lastTabForScroll || oldTab || newTab;
            map[key] = window.scrollY || 0;
            localStorage.setItem('sw-scroll-map', JSON.stringify(map));
        } catch (e) {
            // ignore persistence failures
        }
        lastTabForScroll = newTab;
        if (!suppressNextRestore.value) {
            nextTick(() => setTimeout(restoreScroll, 40));
        } else {
            suppressNextRestore.value = false;
        }
    });

    return { restoreScroll };
}

const helpContent = reactive({
    'custom-colors': `
        <h4>自配色管理</h4>
        <ul>
            <li>添加新的自配色配方</li>
            <li>编辑现有颜色信息</li>
            <li>查看颜色历史记录</li>
            <li>检测重复配方</li>
        </ul>
        <h4>快捷键</h4>
        <ul>
            <li><kbd>Ctrl</kbd>+<kbd>F</kbd> - 打开全局搜索</li>
            <li><kbd>ESC</kbd> - 清空搜索结果</li>
        </ul>
    `,
    'color-dictionary': `
        <h4>自配色字典</h4>
        <ul>
            <li>按类别浏览所有自配色</li>
            <li>快速查看颜色详情</li>
            <li>打印颜色列表</li>
        </ul>
        <h4>快捷键</h4>
        <ul>
            <li><kbd>1</kbd> - 切换到列表视图</li>
            <li><kbd>2</kbd> - 切换到色轮视图</li>
            <li><kbd>3</kbd> - 切换到统计视图</li>
            <li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> - 键盘导航</li>
            <li><kbd>Enter</kbd> - 选中当前颜色</li>
            <li><kbd>Ctrl</kbd>+<kbd>P</kbd> - 打印</li>
        </ul>
    `,
    'artworks': `
        <h4>作品配色管理</h4>
        <ul>
            <li>创建和管理作品</li>
            <li>为作品添加配色方案</li>
            <li>管理层号到颜色的映射</li>
            <li>使用过滤器筛选作品</li>
        </ul>
        <h4>过滤器</h4>
        <ul>
            <li>尺寸筛选：巨尺寸/大尺寸/中尺寸/小尺寸</li>
            <li>形状筛选：正方形/长方形/圆形/不规则形</li>
        </ul>
    `,
    'mont-marte': `
        <h4>颜色原料管理</h4>
        <ul>
            <li>管理基础颜料信息</li>
            <li>添加供应商信息</li>
            <li>维护采购链接</li>
            <li>作为自配色的参考</li>
        </ul>
    `
});

const app = createApp({
    setup() {
        const search = useGlobalSearch();
        const data = useAppData({ registerDataset: search.registerDataset });

        const baseURL = data.baseURL;
        const loading = data.loading;
        const activeTab = ref(getInitialTab());
        const artworksViewMode = ref('byLayer');
        const customColorsSortMode = ref('time');
        const artworksSortMode = ref('time');
        const montMarteSortMode = ref('time');
        const showGlobalHelp = ref(false);

        const customColorsRef = ref(null);
        const artworksRef = ref(null);
        const montMarteRef = ref(null);
        const colorDictionaryRef = ref(null);

        const suppressNextRestore = ref(false);

        setupActiveTabPersistence(activeTab);
        setupScrollPersistence(activeTab, suppressNextRestore);

        provide('globalData', {
            baseURL: baseURL.value,
            appConfig: computed(() => data.appConfig),
            categories: computed(() => data.categories.value),
            customColors: computed(() => data.customColors.value),
            artworks: computed(() => data.artworks.value),
            montMarteColors: computed(() => data.montMarteColors.value),
            suppliers: computed(() => data.suppliers.value),
            purchaseLinks: computed(() => data.purchaseLinks.value),
            loadCategories: () => data.loadCategories(),
            loadCustomColors: bypassCache => data.loadCustomColors(bypassCache),
            loadArtworks: () => data.loadArtworks(),
            loadMontMarteColors: () => data.loadMontMarteColors(),
            loadSuppliers: () => data.loadSuppliers(),
            loadPurchaseLinks: () => data.loadPurchaseLinks()
        });

        const showHelp = () => {
            showGlobalHelp.value = true;
        };

        const setArtworksViewMode = mode => {
            if (mode !== artworksViewMode.value && (mode === 'byLayer' || mode === 'byColor')) {
                artworksViewMode.value = mode;
                const comp = artworksRef.value;
                if (comp) comp.viewMode = mode;
            }
        };

        const setSortMode = (section, mode) => {
            if (!(mode === 'time' || mode === 'name')) return;
            if (section === 'customColors') customColorsSortMode.value = mode;
            else if (section === 'artworks') artworksSortMode.value = mode;
            else if (section === 'montMarte') montMarteSortMode.value = mode;
        };

        const setActiveTabPersist = tab => {
            if (!ALLOWED_TABS.includes(tab)) return;
            activeTab.value = tab;
            try {
                localStorage.setItem('sw-active-tab', tab);
            } catch (e) {
                // ignore persistence failures
            }
            window.scrollTo(0, 0);
        };

        const focusCustomColor = code => {
            if (!code) return;
            setActiveTabPersist('custom-colors');
            suppressNextRestore.value = true;
            const TRY_MAX = 20;
            let tries = 0;
            const attempt = () => {
                const comp = customColorsRef.value;
                if (comp && comp.focusCustomColor) {
                    comp.focusCustomColor(String(code));
                } else if (tries++ < TRY_MAX) {
                    setTimeout(attempt, 120);
                }
            };
            setTimeout(() => {
                nextTick(attempt);
            }, 50);
        };

        const focusArtworkScheme = payload => {
            if (!payload || !payload.artworkId || !payload.schemeId) return;
            setActiveTabPersist('artworks');
            suppressNextRestore.value = true;
            const TRY_MAX = 20;
            let tries = 0;
            const attempt = () => {
                const comp = artworksRef.value;
                if (comp && comp.focusSchemeUsage) {
                    if (comp.hasScheme && !comp.hasScheme(payload.schemeId)) {
                        if (tries++ < TRY_MAX) return setTimeout(attempt, 120);
                        return;
                    }
                    comp.focusSchemeUsage({
                        artworkId: payload.artworkId,
                        schemeId: payload.schemeId,
                        layers: Array.isArray(payload.layers) ? payload.layers.slice() : [],
                        colorCode: payload.colorCode
                    });
                } else if (tries++ < TRY_MAX) {
                    setTimeout(attempt, 120);
                }
            };
            nextTick(attempt);
        };

        const handleGlobalSearchSelect = item => {
            if (!item) return;
            search.showSearchDropdown.value = false;
            if (item.type === 'customColor') {
                focusCustomColor(item.code || item.display);
            } else if (item.type === 'rawMaterial') {
                setActiveTabPersist('mont-marte');
                suppressNextRestore.value = true;
                nextTick(() => {
                    const comp = montMarteRef.value;
                    if (comp && comp.focusRawMaterial) comp.focusRawMaterial(item.id);
                });
            } else if (item.type === 'artwork') {
                setActiveTabPersist('artworks');
                suppressNextRestore.value = true;
                nextTick(() => {
                    const comp = artworksRef.value;
                    if (comp && comp.focusArtwork) comp.focusArtwork(item.id);
                });
            } else if (item.type === 'scheme') {
                const artworkNamePart = (item.artworkName || '').trim();
                const schemeNamePart = (item.display || '').trim();
                if (artworkNamePart && schemeNamePart) {
                    const current = (search.globalSearchQuery.value || '').trim().toLowerCase();
                    const needArtwork = !current.includes(artworkNamePart.toLowerCase());
                    const needScheme = !current.includes(schemeNamePart.toLowerCase());
                    if (needArtwork || needScheme) {
                        search.globalSearchQuery.value = `${artworkNamePart} ${schemeNamePart}`.trim();
                        search.buildSearchResults();
                        search.showSearchDropdown.value = false;
                    }
                }
                setActiveTabPersist('artworks');
                suppressNextRestore.value = true;
                focusArtworkScheme({
                    artworkId: item.parentId,
                    schemeId: item.id,
                    layers: [],
                    colorCode: ''
                });
            }
        };

        onMounted(() => {
            data.initApp();
            try {
                if (!localStorage.getItem('sw-active-tab')) {
                    localStorage.setItem('sw-active-tab', activeTab.value);
                }
            } catch (e) {
                // ignore persistence failures
            }
        });

        return {
            baseURL,
            loading,
            activeTab,
            artworksViewMode,
            customColorsSortMode,
            artworksSortMode,
            montMarteSortMode,
            showGlobalHelp,
            helpContent,
            globalSearchQuery: search.globalSearchQuery,
            globalSearchResults: search.globalSearchResults,
            showSearchDropdown: search.showSearchDropdown,
            handleGlobalSearchInput: search.handleGlobalSearchInput,
            openSearchDropdown: search.openSearchDropdown,
            closeSearchDropdown: search.closeSearchDropdown,
            handleGlobalSearchSelect,
            setArtworksViewMode,
            setSortMode,
            setActiveTabPersist,
            focusCustomColor,
            focusArtworkScheme,
            showHelp,
            customColorsRef,
            artworksRef,
            montMarteRef,
            colorDictionaryRef
        };
    }
});

if (window.ElementPlusIconsVue) {
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
        app.component(key, component);
    }
}

app.component('custom-colors-component', CustomColorsComponent);
app.component('artworks-component', ArtworksComponent);
app.component('mont-marte-component', MontMarteComponent);
if (typeof ColorDictionaryComponent !== 'undefined') app.component('color-dictionary-component', ColorDictionaryComponent);
if (typeof AppHeaderBar !== 'undefined') app.component('app-header-bar', AppHeaderBar);
if (typeof FormulaCalculatorOverlay !== 'undefined') {
    app.component('formula-calculator-overlay', FormulaCalculatorOverlay);
}

app.provide('$api', window.api || {});

if (window.helpers) {
    app.provide('$helpers', window.helpers);
    app.config.globalProperties.$helpers = window.helpers;
}

if (window.thumbPreview) {
    app.provide('$thumbPreview', window.thumbPreview);
    app.config.globalProperties.$thumbPreview = window.thumbPreview;
}

if (window.$formulaCalc) {
    const calcService = {
        open: (code, formula, triggerEl) => window.$formulaCalc.open(code, formula, triggerEl, app),
        close: () => window.$formulaCalc.close()
    };
    app.provide('$calc', calcService);
    app.config.globalProperties.$calc = calcService;
}

app.provide('$root', app.config.globalProperties);

if (typeof FormulaEditorComponent !== 'undefined') {
    app.component('formula-editor', FormulaEditorComponent);
}

if (typeof ConflictResolver !== 'undefined') {
    app.component('conflict-resolver', ConflictResolver);
}

if (typeof CategoryManagerComponent !== 'undefined') {
    app.component('category-manager', CategoryManagerComponent);
}

if (typeof ColorPaletteDialog !== 'undefined') {
    app.component('color-palette-dialog', ColorPaletteDialog);
}
if (typeof HslColorSpaceView !== 'undefined') {
    app.component('hsl-color-space-view', HslColorSpaceView);
}
if (typeof ColorWheelView !== 'undefined') {
    app.component('color-wheel-view', ColorWheelView);
}
if (typeof EnhancedListView !== 'undefined') {
    app.component('enhanced-list-view', EnhancedListView);
}

if (typeof ColorDictionaryComponent !== 'undefined') {
    app.component('color-dictionary-component', ColorDictionaryComponent);
}

app.use(ElementPlus).mount('#app');
