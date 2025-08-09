// 主应用入口文件
// 负责：1.创建Vue应用实例 2.注册组件 3.管理全局数据 4.初始化数据加载

const { createApp } = Vue;

// 创建Vue应用
const app = createApp({
    // ===== 响应式数据 =====
    data() {
        return {
            // 基础配置
            baseURL: 'http://localhost:3000',
            loading: false,
            activeTab: 'custom-colors',
            // 当前作品配色视图模式（由 artworks 子组件 emit 更新）
            artworksViewMode: 'byLayer',
            // 排序模式：time | name （三个页面各自独立）
            customColorsSortMode: 'time',
            artworksSortMode: 'time',
            montMarteSortMode: 'time',

            // 核心数据
            categories: [],
            customColors: [],
            artworks: [],
            montMarteColors: [],

            // 新增：全局字典数据
            suppliers: [],          // 供应商字典
            purchaseLinks: []       // 线上采购地址字典
        };
    },
    
    // ===== 提供数据给子组件 =====
    // 使用 provide/inject 模式共享数据
    provide() {
        return {
            globalData: {
                baseURL: this.baseURL,

                categories: Vue.computed(() => this.categories),
                customColors: Vue.computed(() => this.customColors),
                artworks: Vue.computed(() => this.artworks),
                montMarteColors: Vue.computed(() => this.montMarteColors),

                // 新增：字典数据
                suppliers: Vue.computed(() => this.suppliers),
                purchaseLinks: Vue.computed(() => this.purchaseLinks),

                // 数据加载方法
                loadCategories: () => this.loadCategories(),
                loadCustomColors: () => this.loadCustomColors(),
                loadArtworks: () => this.loadArtworks(),
                loadMontMarteColors: () => this.loadMontMarteColors(),

                // 新增：字典加载方法
                loadSuppliers: () => this.loadSuppliers(),
                loadPurchaseLinks: () => this.loadPurchaseLinks()
            }
        };
    },
    
    // ===== 生命周期 =====
    created() {
        // 恢复上次活跃标签
        try {
            const t = localStorage.getItem('sw_active_tab');
            if (t && ['custom-colors','artworks','mont-marte'].includes(t)) {
                this.activeTab = t;
            }
            const vm = localStorage.getItem('sw_artworks_view_mode');
            if (vm === 'byLayer' || vm === 'byColor') {
                this.artworksViewMode = vm;
            }
            const scc = localStorage.getItem('sw_sort_customColors');
            if (scc === 'time' || scc === 'name') this.customColorsSortMode = scc;
            const saw = localStorage.getItem('sw_sort_artworks');
            if (saw === 'time' || saw === 'name') this.artworksSortMode = saw;
            const smm = localStorage.getItem('sw_sort_montMarte');
            if (smm === 'time' || smm === 'name') this.montMarteSortMode = smm;
        } catch(e) { /* ignore */ }
    },
    mounted() {
        console.log('应用已挂载，开始初始化数据...');
        const savedScroll = Number(localStorage.getItem('sw_scroll_y') || 0);
        this.initApp().finally(() => {
            this.$nextTick(() => {
                requestAnimationFrame(() => {
                    if (Number.isFinite(savedScroll) && savedScroll > 0) {
                        window.scrollTo(0, savedScroll);
                    }
                });
            });
        });
        window.addEventListener('beforeunload', this.persistState);
    },
    beforeUnmount() {
        window.removeEventListener('beforeunload', this.persistState);
    },
    
    // ===== 方法 =====
    methods: {
        // 初始化应用
        async initApp() {
            this.loading = true;
            try {
                // 并行加载所有数据
                await Promise.all([
                    this.loadCategories(),
                    this.loadCustomColors(),
                    this.loadArtworks(),
                    this.loadMontMarteColors(),
                    this.loadSuppliers(),        // 新增
                    this.loadPurchaseLinks()     // 新增
                ]);
                console.log('所有数据加载完成');
            } catch (error) {
                console.error('初始化失败:', error);
            } finally {
                this.loading = false;
            }
        },
        
        // 加载颜色分类
        async loadCategories() {
            try {
                const response = await api.categories.getAll();
                this.categories = response.data;
                console.log(`加载了 ${this.categories.length} 个颜色分类`);
            } catch (error) {
                console.error('加载颜色分类失败:', error);
                ElementPlus.ElMessage.error('加载颜色分类失败');
            }
        },
        
        // 加载自配颜色
        async loadCustomColors() {
            try {
                const response = await api.customColors.getAll();
                this.customColors = response.data;
                console.log(`加载了 ${this.customColors.length} 个自配颜色`);
                // 自配色列表变化后，重新拉取作品，保证方案中引用显示的自配色编号最新
                // （以后若引入 diff，可以只在发生变更时刷新）
                try { await this.loadArtworks(); } catch(e) { console.warn('刷新作品以同步自配色引用失败', e); }
            } catch (error) {
                console.error('加载自配颜色失败:', error);
                ElementPlus.ElMessage.error('加载自配颜色失败');
            }
        },
        
        // 加载作品列表（后端已内联 layers）
        async loadArtworks() {
            try {
                const response = await api.artworks.getAll();
                this.artworks = response.data || [];
                console.log(`加载了 ${this.artworks.length} 个作品（含方案层信息）`);
            } catch (error) {
                console.error('加载作品列表失败:', error);
                ElementPlus.ElMessage.error('加载作品列表失败');
            }
        },
        
        // 加载蒙马特颜色（原料库）
        async loadMontMarteColors() {
            try {
                const response = await api.montMarteColors.getAll();
                this.montMarteColors = response.data;
                console.log(`加载了 ${this.montMarteColors.length} 个颜色原料`);
            } catch (error) {
                console.error('加载蒙马特颜色失败:', error);
                ElementPlus.ElMessage.error('加载蒙马特颜色失败');
            }
        },

        // 新增：加载供应商
        async loadSuppliers() {
            try {
                const res = await axios.get(`${this.baseURL}/api/suppliers`);
                this.suppliers = res.data || [];
                // console.log(`加载了 ${this.suppliers.length} 个供应商`);
            } catch (e) {
                console.error('加载供应商失败:', e);
            }
        },

        // 新增：加载线上采购地址
        async loadPurchaseLinks() {
            try {
                const res = await axios.get(`${this.baseURL}/api/purchase-links`);
                this.purchaseLinks = res.data || [];
                // console.log(`加载了 ${this.purchaseLinks.length} 个采购地址`);
            } catch (e) {
                console.error('加载采购地址失败:', e);
            }
        }
        ,
        // 持久化当前 tab 与滚动位置
        persistState() {
            try {
                localStorage.setItem('sw_active_tab', this.activeTab);
                localStorage.setItem('sw_scroll_y', String(window.scrollY || window.pageYOffset || 0));
                localStorage.setItem('sw_sort_customColors', this.customColorsSortMode);
                localStorage.setItem('sw_sort_artworks', this.artworksSortMode);
                localStorage.setItem('sw_sort_montMarte', this.montMarteSortMode);
            } catch(e) { /* ignore */ }
        },
        // 返回顶部
        scrollTop() {
            try { window.scrollTo({ top:0, behavior:'smooth' }); } catch(e) { window.scrollTo(0,0); }
        },
        // 接收子组件视图模式变化
        onArtworksViewMode(mode) {
            if (mode === 'byLayer' || mode === 'byColor') this.artworksViewMode = mode;
        },
        setArtworksViewMode(mode) {
            if (mode !== this.artworksViewMode && (mode === 'byLayer' || mode === 'byColor')) {
                this.artworksViewMode = mode;
                try { localStorage.setItem('sw_artworks_view_mode', mode); } catch(e) {}
                if (this.$refs.artworksRef && this.$refs.artworksRef.viewMode !== mode) {
                    this.$refs.artworksRef.viewMode = mode;
                }
            }
        },
        setSortMode(section, mode) {
            if (!(mode === 'time' || mode === 'name')) return;
            if (section === 'customColors') { this.customColorsSortMode = mode; }
            else if (section === 'artworks') { this.artworksSortMode = mode; }
            else if (section === 'montMarte') { this.montMarteSortMode = mode; }
            this.persistState();
        },
        // 跨页寻迹：跳转到自配色并高亮指定编号
        focusCustomColor(colorCode) {
            if (!colorCode) return;
            this.activeTab = 'custom-colors';
            this.$nextTick(() => {
                const comp = this.$refs.customColorsRef;
                if (comp && typeof comp.focusCustomColor === 'function') {
                    comp.focusCustomColor(String(colorCode));
                }
            });
        }
    }
    ,
    watch: {
        activeTab(val) {
            // 即时记录当前标签
            try { localStorage.setItem('sw_active_tab', val); } catch(e) { /* ignore */ }
        }
    }
});

// ===== 注册组件 =====

// 注册 Element Plus 图标组件（新增）
if (window.ElementPlusIconsVue) {
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
        app.component(key, component);
    }
    console.log('Element Plus 图标组件已注册');
} else {
    console.warn('Element Plus 图标库未加载');
}

// 注册自定义组件
app.component('custom-colors-component', CustomColorsComponent);
app.component('artworks-component', ArtworksComponent);  
app.component('mont-marte-component', MontMarteComponent);

// 添加配方编辑器组件注册
if (typeof FormulaEditorComponent !== 'undefined') {
    app.component('formula-editor', FormulaEditorComponent);
    console.log('配方编辑器组件已注册');
} else {
    console.error('FormulaEditorComponent 未定义');
}

// ===== 挂载应用 =====
// 使用Element Plus UI库并挂载到#app元素
// 暴露缩略图预览工具到全局属性，供模板中通过 $thumbPreview 使用（避免直接访问 window 在模板沙箱下报错）
app.config.globalProperties.$thumbPreview = (typeof window !== 'undefined' && window.thumbPreview) ? window.thumbPreview : null;
// 统一提供 helpers 给模板中通过 $helpers 使用，避免直接访问 window 触发沙箱限制
app.config.globalProperties.$helpers = (typeof helpers !== 'undefined') ? helpers : (typeof window !== 'undefined' ? window.helpers : null);

app.use(ElementPlus).mount('#app');
console.log('Vue应用已挂载到#app');