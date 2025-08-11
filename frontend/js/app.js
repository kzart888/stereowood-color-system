// 主应用入口文件
// 负责：1.创建Vue应用实例 2.注册组件 3.管理全局数据 4.初始化数据加载
const { createApp } = Vue;

const app = createApp({
    data() {
        let initTab = 'custom-colors';
        try {
            const savedTab = localStorage.getItem('sw-active-tab');
            if (savedTab && ['custom-colors','artworks','mont-marte'].includes(savedTab)) initTab = savedTab;
        } catch(e) {}
        return {
            baseURL: 'http://localhost:3000',
            loading: false,
            activeTab: initTab,
            artworksViewMode: 'byLayer',
            customColorsSortMode: 'time',
            artworksSortMode: 'time',
            montMarteSortMode: 'time',
            // 全局搜索
            globalSearchQuery: '',
            globalSearchResults: [],
            showSearchDropdown: false,
            _searchIndex: { customColors: [], artworks: [], schemes: [], rawMaterials: [] },
            _indexReady: { customColors:false, artworks:false, rawMaterials:false },
            _searchDebounceTimer: null,
            // 数据
            categories: [],
            customColors: [],
            artworks: [],
            montMarteColors: [],
            suppliers: [],
            purchaseLinks: []
        };
    },
    provide() {
        return {
            globalData: {
                baseURL: this.baseURL,
                categories: Vue.computed(()=>this.categories),
                customColors: Vue.computed(()=>this.customColors),
                artworks: Vue.computed(()=>this.artworks),
                montMarteColors: Vue.computed(()=>this.montMarteColors),
                suppliers: Vue.computed(()=>this.suppliers),
                purchaseLinks: Vue.computed(()=>this.purchaseLinks),
                loadCategories: ()=>this.loadCategories(),
                loadCustomColors: ()=>this.loadCustomColors(),
                loadArtworks: ()=>this.loadArtworks(),
                loadMontMarteColors: ()=>this.loadMontMarteColors(),
                loadSuppliers: ()=>this.loadSuppliers(),
                loadPurchaseLinks: ()=>this.loadPurchaseLinks()
            }
        };
    },
    mounted() {
        console.log('应用已挂载，开始初始化数据...');
        this.initApp();
        try { if (!localStorage.getItem('sw-active-tab')) localStorage.setItem('sw-active-tab', this.activeTab); } catch(e) {}
        const restoreScroll = () => {
            try {
                const raw = localStorage.getItem('sw-scroll-map');
                if (!raw) return;
                const map = JSON.parse(raw);
                const pos = map && typeof map[this.activeTab]==='number' ? map[this.activeTab] : 0;
                if (pos>0) window.scrollTo(0,pos);
            } catch(e) {}
        };
        setTimeout(restoreScroll, 80);
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
            },200);
        }, { passive:true });
        this.$watch('activeTab', ()=>{
            try {
                const raw = localStorage.getItem('sw-scroll-map');
                const map = raw ? JSON.parse(raw) : {};
                map[this._lastTabForScroll || this.activeTab] = window.scrollY||0;
                localStorage.setItem('sw-scroll-map', JSON.stringify(map));
            } catch(e) {}
            this._lastTabForScroll = this.activeTab;
            if (!this._suppressNextRestore) {
                this.$nextTick(()=> setTimeout(restoreScroll,40));
            } else {
                this._suppressNextRestore = false;
            }
        });
    },
    watch: {
        activeTab(val){ try { localStorage.setItem('sw-active-tab', val); } catch(e) {} }
    },
    methods: {
        async initApp() {
            this.loading = true;
            try {
                await Promise.all([
                    this.loadCategories(),
                    this.loadCustomColors(),
                    this.loadArtworks(),
                    this.loadMontMarteColors(),
                    this.loadSuppliers(),
                    this.loadPurchaseLinks()
                ]);
                // 初次加载后构建自配色配方同步索引
                this._buildColorFormulaIndex();
            } catch(e) { console.error('初始化失败', e); } finally { this.loading = false; }
        },
        async loadCategories() {
            try { const res = await api.categories.getAll(); this.categories = res.data; } catch(e){ console.error('加载颜色分类失败',e); }
        },
        async loadCustomColors() {
            try {
                const res = await api.customColors.getAll();
                this.customColors = res.data;
                this.registerDataset('customColors', this.customColors.map(c=>({ id:c.id, code:c.color_code||c.code||'', name:c.name||'' })));
                // 若已存在旧索引，执行 diff 同步；否则首次建立
                if (this._colorFormulaIndex) {
                    this.syncFormulasIfChanged();
                } else {
                    this._buildColorFormulaIndex();
                }
            } catch(e){ console.error('加载自配颜色失败',e); }
        },
        async loadArtworks() {
            try { const res = await api.artworks.getAll(); this.artworks = res.data; const artworksIdx=[]; const schemesIdx=[]; this.artworks.forEach(a=>{ const name=a.name||a.title||''; const code=a.code||a.no||''; artworksIdx.push({id:a.id,name,code}); if(Array.isArray(a.schemes)) a.schemes.forEach(s=> schemesIdx.push({id:s.id, artworkId:a.id, artworkName:name, artworkCode:code, name:s.name||''})); }); this.registerDataset('artworks', artworksIdx); this.registerDataset('schemes', schemesIdx); } catch(e){ console.error('加载作品列表失败',e); }
        },
        async loadMontMarteColors() { try { const res = await api.montMarteColors.getAll(); this.montMarteColors = res.data; this.registerDataset('rawMaterials', this.montMarteColors.map(m=>({id:m.id, name:m.name}))); } catch(e){ console.error('加载原料失败',e); } },
        async loadSuppliers() { try { const r = await axios.get(`${this.baseURL}/api/suppliers`); this.suppliers = r.data||[]; } catch(e){} },
        async loadPurchaseLinks() { try { const r = await axios.get(`${this.baseURL}/api/purchase-links`); this.purchaseLinks = r.data||[]; } catch(e){} },
        setArtworksViewMode(mode){ if(mode!==this.artworksViewMode && (mode==='byLayer'||mode==='byColor')) { this.artworksViewMode=mode; const comp=this.$refs.artworksRef; if(comp) comp.viewMode=mode; } },
        setSortMode(section, mode){ if(!(mode==='time'||mode==='name')) return; if(section==='customColors') this.customColorsSortMode=mode; else if(section==='artworks') this.artworksSortMode=mode; else if(section==='montMarte') this.montMarteSortMode=mode; },
        focusCustomColor(code){ if(!code) return; this.setActiveTabPersist('custom-colors'); this._suppressNextRestore=true; this.$nextTick(()=>{ const comp=this.$refs.customColorsRef; if(comp&&comp.focusCustomColor) comp.focusCustomColor(String(code)); }); },
        focusArtworkScheme(p){ if(!p||!p.artworkId||!p.schemeId) return; this.setActiveTabPersist('artworks'); this._suppressNextRestore=true; const TRY_MAX=20; let tries=0; const attempt=()=>{ const comp=this.$refs.artworksRef; if(comp&&comp.focusSchemeUsage){ if(comp.hasScheme && !comp.hasScheme(p.schemeId)){ if(tries++<TRY_MAX) return setTimeout(attempt,120); return;} comp.focusSchemeUsage({ artworkId:p.artworkId, schemeId:p.schemeId, layers:Array.isArray(p.layers)?p.layers.slice():[], colorCode:p.colorCode }); } else if(tries++<TRY_MAX) setTimeout(attempt,120); }; this.$nextTick(attempt); },
        setActiveTabPersist(tab){ if(!['custom-colors','artworks','mont-marte'].includes(tab)) return; this.activeTab=tab; try{ localStorage.setItem('sw-active-tab', tab);}catch(e){} window.scrollTo(0,0); },
        registerDataset(type, items){ if(!type||!Array.isArray(items)) return; if(type==='customColors'){ this._searchIndex.customColors=items.slice(); this._indexReady.customColors=true;} else if(type==='artworks'){ this._searchIndex.artworks=items.slice(); this._indexReady.artworks=true;} else if(type==='schemes'){ this._searchIndex.schemes=items.slice(); } else if(type==='rawMaterials'){ this._searchIndex.rawMaterials=items.slice(); this._indexReady.rawMaterials=true;} },
        _buildColorFormulaIndex(){
            // 建立当前自配色 formula 哈希索引以供后续 diff
            this._colorFormulaIndex = {};
            (this.customColors||[]).forEach(c=>{ this._colorFormulaIndex[c.color_code] = (c.formula||''); });
        },
        syncFormulasIfChanged(){
            if(!window.$formulaCalc || !this._colorFormulaIndex) return;
            (this.customColors||[]).forEach(c=>{
                const oldF = this._colorFormulaIndex[c.color_code];
                const newF = c.formula||'';
                if (oldF !== newF) {
                    $formulaCalc.syncFormulaChange(c.color_code, newF);
                }
            });
            this._buildColorFormulaIndex();
    },
    handleGlobalSearchInput(val){ this.globalSearchQuery=val; if(this._searchDebounceTimer) clearTimeout(this._searchDebounceTimer); this._searchDebounceTimer=setTimeout(()=> this.buildSearchResults(),200); if(val && !this.showSearchDropdown) this.showSearchDropdown=true; if(!val) this.globalSearchResults=[]; },
        openSearchDropdown(){ this.showSearchDropdown=true; },
        closeSearchDropdown(){ this.showSearchDropdown=false; },
        buildSearchResults(){ const qRaw=(this.globalSearchQuery||'').trim(); if(!qRaw){ this.globalSearchResults=[]; this.showSearchDropdown=false; return;} const qLower=qRaw.toLowerCase(); const tokens=qLower.split(/\s+/).filter(t=>t); const multi=tokens.length>1; const results=[]; const push=i=>results.push(i); // 自配色
            this._searchIndex.customColors.forEach(c=>{ const code=(c.code||'').toLowerCase(); const name=(c.name||'').toLowerCase(); const hay=[code,name]; const match= multi ? tokens.every(t=>hay.some(h=>h&&h.includes(t))) : hay.some(h=>h&&h.includes(qLower)); if(match) push({ type:'customColor', id:c.id, code:c.code, display:c.code||c.name, group:'自配色', pathLabel:`自配色管理 -> ${(c.code||'')}${c.name?(' '+c.name):''}` }); });
            const artworkMatches=[]; const schemeMatches=[]; this._searchIndex.artworks.forEach(a=>{ const name=(a.name||'').toLowerCase(); const code=(a.code||'').toLowerCase(); const combo= code&&name? code+'-'+name : (code||name); const hay=[name,code,combo]; const match= multi ? tokens.every(t=>hay.some(h=>h&&h.includes(t))) : hay.some(h=>h&&h.includes(qLower)); if(match) artworkMatches.push({ type:'artwork', id:a.id, display:(a.code? a.code+'-' : '')+(a.name||''), group:'作品', pathLabel:`作品配色管理 -> ${(a.code? a.code+'-' : '')+(a.name||'')}` }); });
            this._searchIndex.schemes.forEach(s=>{ const sName=(s.name||'').toLowerCase(); const aName=(s.artworkName||'').toLowerCase(); const aCode=(s.artworkCode||'').toLowerCase(); const combo1= aCode&&aName? aCode+'-'+aName : (aCode||aName); const hay=[sName,aName,aCode,combo1]; const match= multi ? tokens.every(t=>hay.some(h=>h&&h.includes(t))) : hay.some(h=>h&&h.includes(qLower)); if(match) schemeMatches.push({ type:'scheme', id:s.id, parentId:s.artworkId, artworkName:s.artworkName, artworkCode:s.artworkCode, display:s.name, group:'配色方案', pathLabel:`作品配色管理 -> ${(s.artworkCode? s.artworkCode+'-' : '')+s.artworkName}-[${s.name}]` }); });
            if(multi && schemeMatches.length){ results.push(...schemeMatches);} else { results.push(...artworkMatches, ...schemeMatches);} this._searchIndex.rawMaterials.forEach(r=>{ const name=(r.name||'').toLowerCase(); const match= multi ? tokens.every(t=>name && name.includes(t)) : (name && name.includes(qLower)); if(match) push({ type:'rawMaterial', id:r.id, display:r.name, group:'原料', pathLabel:`颜色原料管理 -> ${r.name}` }); }); const groupOrder={'自配色':1,'作品':2,'配色方案':3,'原料':4}; results.sort((a,b)=>{ const ga=groupOrder[a.group]||99; const gb=groupOrder[b.group]||99; if(ga!==gb) return ga-gb; return (a.display||'').localeCompare(b.display||'','zh-CN'); }); const limited=results.slice(0,60); this.globalSearchResults=limited; this.showSearchDropdown=!!limited.length; },
    handleGlobalSearchSelect(item){ if(!item) return; this.showSearchDropdown=false; if(item.type==='customColor'){ this.focusCustomColor(item.code||item.display); } else if(item.type==='rawMaterial'){ this.setActiveTabPersist('mont-marte'); this._suppressNextRestore=true; this.$nextTick(()=>{ const comp=this.$refs.montMarteRef; if(comp&&comp.focusRawMaterial) comp.focusRawMaterial(item.id); }); } else if(item.type==='artwork'){ this.setActiveTabPersist('artworks'); this._suppressNextRestore=true; this.$nextTick(()=>{ const comp=this.$refs.artworksRef; if(comp&&comp.focusArtwork) comp.focusArtwork(item.id); }); } else if(item.type==='scheme'){ // 方案点击：若当前查询未同时包含作品名与方案名，则自动回填“作品名 方案名”
                const artworkNamePart = (item.artworkName||'').trim();
                const schemeNamePart = (item.display||'').trim();
                if (artworkNamePart && schemeNamePart) {
                    const current = (this.globalSearchQuery||'').trim().toLowerCase();
                    const needArtwork = !current.includes(artworkNamePart.toLowerCase());
                    const needScheme = !current.includes(schemeNamePart.toLowerCase());
                    if (needArtwork || needScheme) {
                        this.globalSearchQuery = `${artworkNamePart} ${schemeNamePart}`.trim();
                        // 立即重建结果以缩减为单作品单方案
            this.buildSearchResults();
            // 用户需求：回填后自动收起下拉
            this.showSearchDropdown = false;
                    }
                }
                this.setActiveTabPersist('artworks'); this._suppressNextRestore=true; this.focusArtworkScheme({ artworkId:item.parentId, schemeId:item.id, layers:[], colorCode:'' }); } }
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
// 计算器浮层（渲染由全局服务控制）
if (typeof FormulaCalculatorOverlay !== 'undefined') {
    app.component('formula-calculator-overlay', FormulaCalculatorOverlay);
}

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

// 全局计算器服务封装：提供 $calc.open(code, formula, triggerEl)
if (window.$formulaCalc) {
    app.config.globalProperties.$calc = {
        open: (code, formula, triggerEl)=> window.$formulaCalc.open(code, formula, triggerEl, app),
        close: ()=> window.$formulaCalc.close()
    };
}

// ===== 挂载应用 =====
// 使用Element Plus UI库并挂载到#app元素
app.use(ElementPlus).mount('#app');
console.log('Vue应用已挂载到#app');