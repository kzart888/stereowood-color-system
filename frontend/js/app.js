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
    mounted() {
        console.log('应用已挂载，开始初始化数据...');
        this.initApp();
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
app.use(ElementPlus).mount('#app');
console.log('Vue应用已挂载到#app');