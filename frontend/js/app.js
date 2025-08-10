// 主应用入口文件
// 负责：1.创建Vue应用实例 2.注册组件 3.管理全局数据 4.初始化数据加载

const { createApp } = Vue;

// 创建Vue应用
const app = createApp({
    // ===== 响应式数据 =====
    data() {
        // 初始读取本地存储中的活动 tab
        let initTab = 'custom-colors';
        try {
            const savedTab = localStorage.getItem('sw-active-tab');
            if (savedTab && ['custom-colors','artworks','mont-marte'].includes(savedTab)) initTab = savedTab;
            console.log('[restore] saved activeTab =', savedTab, ' -> initTab =', initTab);
        } catch(e) {}
        return {
            // 基础配置
            baseURL: 'http://localhost:3000',
            loading: false,
            activeTab: initTab,
            // 作品配色视图模式 + 各页面排序模式（重建）
            artworksViewMode: 'byLayer',
            customColorsSortMode: 'time',
            artworksSortMode: 'time',
            montMarteSortMode: 'time',
            // ===== 全局搜索（阶段1+2：仅布局与索引构建） =====
            globalSearchQuery: '', // 输入框绑定
            globalSearchResults: [], // 下拉候选（后续阶段构建）
            showSearchDropdown: false,
            _searchIndex: { customColors: [], artworks: [], schemes: [], rawMaterials: [] }, // 内存索引
            _indexReady: { customColors:false, artworks:false, rawMaterials:false },
            _searchDebounceTimer: null,

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
                suppliers: Vue.computed(() => this.suppliers),
                purchaseLinks: Vue.computed(() => this.purchaseLinks),
                loadCategories: () => this.loadCategories(),
                loadCustomColors: () => this.loadCustomColors(),
                loadArtworks: () => this.loadArtworks(),
                loadMontMarteColors: () => this.loadMontMarteColors(),
                loadSuppliers: () => this.loadSuppliers(),
                loadPurchaseLinks: () => this.loadPurchaseLinks()
            }
        };
    },
    
    // ===== 生命周期 =====
    mounted() {
        console.log('应用已挂载，开始初始化数据...');
        this.initApp();
    // 若首次没有存储过 activeTab，则立即写入当前初始值
    try { if (!localStorage.getItem('sw-active-tab')) localStorage.setItem('sw-active-tab', this.activeTab); } catch(e) {}
        // 恢复滚动位置（按 tab 单独存储）
        const restoreScroll = () => {
            try {
                const raw = localStorage.getItem('sw-scroll-map');
                if (!raw) return;
                const map = JSON.parse(raw);
                const key = this.activeTab;
                const pos = map && typeof map[key]==='number' ? map[key] : 0;
                if (pos>0) window.scrollTo(0,pos);
            } catch(e) {}
        };
        setTimeout(restoreScroll, 80);
        // 监听滚动，防抖写入当前 tab 的位置
        let _stTimer=null;
        window.addEventListener('scroll', ()=>{
            if (_stTimer) return;
            _stTimer = setTimeout(()=>{
                _stTimer=null;
                try {
                    const raw = localStorage.getItem('sw-scroll-map');
                    const map = raw ? JSON.parse(raw) : {};
                    map[this.activeTab] = window.scrollY||0;
                    localStorage.setItem('sw-scroll-map', JSON.stringify(map));
                } catch(e) {}
            }, 200);
        }, { passive:true });
        // 当 tab 初始化之后切换时也尝试恢复
        this.$watch('activeTab', ()=>{
            // 切换前保存旧 tab 位置
            try {
                const raw = localStorage.getItem('sw-scroll-map');
                const map = raw ? JSON.parse(raw) : {};
                map[this._lastTabForScroll || this.activeTab] = window.scrollY||0;
                localStorage.setItem('sw-scroll-map', JSON.stringify(map));
            } catch(e) {}
            this._lastTabForScroll = this.activeTab;
            if (!this._suppressNextRestore) {
                this.$nextTick(()=> setTimeout(restoreScroll, 40));
            } else {
                this._suppressNextRestore = false;
            }
        });
    },
    watch: {
    activeTab(val) { try { localStorage.setItem('sw-active-tab', val); console.log('[persist] activeTab ->', val); } catch(e) {} }
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
                // 注册自配色索引（阶段2）: 使用 color_code 作为 code；部分数据可能没有 name 字段
                this.registerDataset('customColors', this.customColors.map(c => ({ id: c.id, code: c.color_code || c.code || '', name: c.name || '' })));
            } catch (error) {
                console.error('加载自配颜色失败:', error);
                ElementPlus.ElMessage.error('加载自配颜色失败');
            }
        },
        
        // 加载作品列表
        async loadArtworks() {
            try {
                const response = await api.artworks.getAll();
                this.artworks = response.data;
                console.log(`加载了 ${this.artworks.length} 个作品`);
                // 拆分作品与方案索引
                const artworksIdx = []; const schemesIdx = [];
                this.artworks.forEach(a => {
                    const name = a.name || a.title || '';
                    const code = a.code || a.no || '';
                    artworksIdx.push({ id: a.id, name, code });
                    if (Array.isArray(a.schemes)) {
                        a.schemes.forEach(s => {
                            schemesIdx.push({ id: s.id, artworkId: a.id, artworkName: name, artworkCode: code, name: s.name || '' });
                        });
                    }
                });
                this.registerDataset('artworks', artworksIdx);
                this.registerDataset('schemes', schemesIdx);
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
                this.registerDataset('rawMaterials', this.montMarteColors.map(m => ({ id: m.id, name: m.name })));
            } catch (error) {
                console.error('加载蒙马特颜色失败:', error);
                ElementPlus.ElMessage.error('加载蒙马特颜色失败');
            }
        },
        setArtworksViewMode(mode) {
            if (mode !== this.artworksViewMode && (mode === 'byLayer' || mode === 'byColor')) {
                this.artworksViewMode = mode;
                const comp = this.$refs.artworksRef;
                if (comp) comp.viewMode = mode;
            }
        },
        setSortMode(section, mode) {
            if (!(mode === 'time' || mode === 'name')) return;
            if (section === 'customColors') this.customColorsSortMode = mode;
            else if (section === 'artworks') this.artworksSortMode = mode;
            else if (section === 'montMarte') this.montMarteSortMode = mode;
        },
        focusCustomColor(colorCode) {
            if (!colorCode) return;
                this.setActiveTabPersist('custom-colors');
            // 标记：这次切换后不要恢复旧滚动
            this._suppressNextRestore = true;
            this.$nextTick(()=>{
                const comp = this.$refs.customColorsRef;
                if (comp && typeof comp.focusCustomColor==='function') comp.focusCustomColor(String(colorCode));
            });
        },
        focusArtworkScheme(payload) {
            if (!payload || !payload.artworkId || !payload.schemeId) return;
                this.setActiveTabPersist('artworks');
            this._suppressNextRestore = true;
            const TRY_MAX = 20; let tries=0;
            const attempt = () => {
                const comp = this.$refs.artworksRef;
                if (comp && typeof comp.focusSchemeUsage==='function') {
                    if (comp.hasScheme && !comp.hasScheme(payload.schemeId)) {
                        if (tries++ < TRY_MAX) return setTimeout(attempt,120);
                        return; }
                    comp.focusSchemeUsage({
                        artworkId: payload.artworkId,
                        schemeId: payload.schemeId,
                        layers: Array.isArray(payload.layers)?payload.layers.slice():[],
                        colorCode: payload.colorCode
                    });
                } else if (tries++ < TRY_MAX) setTimeout(attempt,120);
            };
            this.$nextTick(attempt);
        },
        setActiveTabPersist(tab) {
            if (!['custom-colors','artworks','mont-marte'].includes(tab)) return;
            this.activeTab = tab;
            try { localStorage.setItem('sw-active-tab', tab); } catch(e) {}
            // 切换后先回到顶部，避免旧滚动增量影响后续定点滚动
            window.scrollTo(0,0);
        },
        // ===== 阶段2：注册数据集到搜索索引 =====
        registerDataset(type, items) {
            if (!type || !Array.isArray(items)) return;
            if (type === 'customColors') { this._searchIndex.customColors = items.slice(); this._indexReady.customColors = true; }
            else if (type === 'artworks') { this._searchIndex.artworks = items.slice(); this._indexReady.artworks = true; }
            else if (type === 'schemes') { this._searchIndex.schemes = items.slice(); }
            else if (type === 'rawMaterials') { this._searchIndex.rawMaterials = items.slice(); this._indexReady.rawMaterials = true; }
            // 预留：全部索引 ready 且已有查询时重跑搜索（阶段3实现）
        },
        // 阶段1：输入监听（占位，阶段3再填充逻辑）
        handleGlobalSearchInput(val) {
            this.globalSearchQuery = val;
            // 防抖触发构建
            if (this._searchDebounceTimer) clearTimeout(this._searchDebounceTimer);
            this._searchDebounceTimer = setTimeout(()=>{
                this.buildSearchResults();
            }, 200);
            // 若输入不为空，显示下拉（等待结果生成）
            if (val && !this.showSearchDropdown) this.showSearchDropdown = true;
            if (!val) {
                // 清空时不立即隐藏，交由组件外部逻辑通过 close-search-dropdown 控制；此处只清空结果
                this.globalSearchResults = [];
            }
        },
        // 打开/关闭下拉供头部组件调用
        openSearchDropdown() { this.showSearchDropdown = true; },
        closeSearchDropdown() { this.showSearchDropdown = false; },
        // ===== 阶段3：构建搜索结果（仅生成候选，不改变页面过滤） =====
        buildSearchResults() {
            const qRaw = (this.globalSearchQuery||'').trim();
            if (!qRaw) {
                this.globalSearchResults = [];
                this.showSearchDropdown = false;
                return;
            }
            const q = qRaw.toLowerCase();
            const results = [];
            const push = (item) => results.push(item);
        // 自配色：颜色编号 code 与名称 name 均可匹配（扩展以符合用户案例：RD0224 / RD 前缀 / 数字片段 / 中文名称）
            if (this._searchIndex.customColors.length) {
                this._searchIndex.customColors.forEach(c => {
            const code = (c.code||'').toLowerCase();
            const name = (c.name||'').toLowerCase();
            if ((name && name.includes(q)) || (code && code.includes(q))) {
                        push({
                            type:'customColor',
                            id: c.id,
                            code: c.code,
                display: c.code || c.name,
                            group:'自配色',
                pathLabel:`自配色管理 -> ${(c.code||'')}${c.name ? (' '+c.name) : ''}`
                        });
                    }
                });
            }
        // 作品：匹配 name / code / 组合 (code-name)
            if (this._searchIndex.artworks.length) {
                this._searchIndex.artworks.forEach(a => {
            const name = (a.name||'').toLowerCase();
            const code = (a.code||'').toLowerCase();
            const combo = (code && name) ? (code + '-' + name) : (code || name);
            if ((name && name.includes(q)) || (code && code.includes(q)) || (combo && combo.includes(q))) {
            push({ type:'artwork', id:a.id, display: (a.code? a.code+'-' : '') + (a.name||''), group:'作品', pathLabel:`作品配色管理 -> ${(a.code? a.code+'-' : '') + (a.name||'')}` });
            }
                });
            }
        // 配色方案：方案名 + (作品code/name + 方案名) 联合匹配
            if (this._searchIndex.schemes.length) {
                this._searchIndex.schemes.forEach(s => {
            const sName = (s.name||'').toLowerCase();
            const aName = (s.artworkName||'').toLowerCase();
            const aCode = (s.artworkCode||'').toLowerCase();
            const combo1 = aName ? (aName + ' ' + sName) : sName;
            const combo2 = aCode ? (aCode + ' ' + sName) : sName;
            if ((sName && sName.includes(q)) || (combo1 && combo1.includes(q)) || (combo2 && combo2.includes(q))) {
            push({ type:'scheme', id:s.id, parentId:s.artworkId, artworkName:s.artworkName, artworkCode:s.artworkCode, display:s.name, group:'配色方案', pathLabel:`作品配色管理 -> ${(s.artworkCode? s.artworkCode+'-' : '') + s.artworkName} / ${s.name}` });
            }
                });
            }
            // 原料（名称）
            if (this._searchIndex.rawMaterials.length) {
                this._searchIndex.rawMaterials.forEach(r => {
                    if (r.name && r.name.toLowerCase().includes(q)) {
                        push({
                            type:'rawMaterial', id:r.id, display:r.name, group:'原料', pathLabel:`颜色原料管理 -> ${r.name}`
                        });
                    }
                });
            }
            // 排序：按 group 顺序 + 字母
            const groupOrder = { '自配色':1, '作品':2, '配色方案':3, '原料':4 };
            results.sort((a,b)=>{
                const ga = groupOrder[a.group]||99; const gb = groupOrder[b.group]||99;
                if (ga!==gb) return ga-gb;
                return (a.display||'').localeCompare(b.display||'', 'zh-CN');
            });
            // 限制最大数量（可调）
            const limited = results.slice(0, 60);
            this.globalSearchResults = limited;
            this.showSearchDropdown = limited.length>0;
            // 调试输出
            // console.log('[search] query=', qRaw, 'results=', limited);
        },
        // 阶段5：点击下拉结果跳转定位 + 高亮
        handleGlobalSearchSelect(item) {
            if (!item) return;
            this.showSearchDropdown = false;
            // 切换 tab & 定位
            if (item.type === 'customColor') {
                this.focusCustomColor(item.code || item.display);
            } else if (item.type === 'rawMaterial') {
                this.setActiveTabPersist('mont-marte');
                this._suppressNextRestore = true;
                this.$nextTick(()=>{
                    const comp = this.$refs.montMarteRef;
                    if (comp && typeof comp.focusRawMaterial==='function') comp.focusRawMaterial(item.id);
                });
            } else if (item.type === 'artwork') {
                this.setActiveTabPersist('artworks');
                this._suppressNextRestore = true;
                this.$nextTick(()=>{
                    const comp = this.$refs.artworksRef;
                    if (comp && typeof comp.focusArtwork==='function') comp.focusArtwork(item.id);
                });
            } else if (item.type === 'scheme') {
                this.focusArtworkScheme({ artworkId:item.parentId, schemeId:item.id, layers:[], colorCode:'' });
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
    }
    ,
    watch: {
        activeTab(val){ /* 需要时可持久化 */ }
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
if (typeof AppHeaderBar !== 'undefined') app.component('app-header-bar', AppHeaderBar);

// 将 helpers 与 thumbPreview 暴露到全局 (供组件模板中通过 this.$helpers / this.$thumbPreview 使用)
if (window.helpers) app.config.globalProperties.$helpers = window.helpers;
if (window.thumbPreview) app.config.globalProperties.$thumbPreview = window.thumbPreview;

// 添加配方编辑器组件注册
if (typeof FormulaEditorComponent !== 'undefined') {
    app.component('formula-editor', FormulaEditorComponent);
    console.log('配方编辑器组件已注册');
} else {
    console.error('FormulaEditorComponent 未定义');
}

// ===== 挂载应用 =====
// 使用Element Plus UI库并挂载到#app元素
app.use(ElementPlus).mount('#app');
console.log('Vue应用已挂载到#app');