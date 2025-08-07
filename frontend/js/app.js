// 主应用入口文件
// 负责：1.创建Vue应用实例 2.注册组件 3.管理全局数据 4.初始化数据加载

const { createApp } = Vue;

const app = createApp({
    // ===== 组件注册 =====
    // 注册三个主要组件（组件必须在此之前定义为全局变量）
    components: {
        'custom-colors-component': typeof CustomColorsComponent !== 'undefined' ? CustomColorsComponent : {},
        'artworks-component': typeof ArtworksComponent !== 'undefined' ? ArtworksComponent : {},
        'mont-marte-component': typeof MontMarteComponent !== 'undefined' ? MontMarteComponent : {}
    },
    
    // ===== 响应式数据 =====
    data() {
        return {
            // 基础配置
            baseURL: 'http://localhost:3000',  // 后端服务器地址
            loading: false,                     // 全局加载状态
            activeTab: 'custom-colors',         // 当前激活的标签页
            
            // 核心数据（由各组件共享）
            categories: [],      // 颜色分类列表
            customColors: [],    // 自配颜色列表
            artworks: [],        // 作品列表
            montMarteColors: []  // 蒙马特颜色（原料库）列表
        };
    },
    
    // ===== 提供数据给子组件 =====
    // 使用 provide/inject 模式共享数据
    provide() {
        return {
            globalData: {
                // 基础配置
                baseURL: this.baseURL,
                
                // 响应式数据（使用computed包装）
                categories: Vue.computed(() => this.categories),
                customColors: Vue.computed(() => this.customColors),
                artworks: Vue.computed(() => this.artworks),
                montMarteColors: Vue.computed(() => this.montMarteColors),
                
                // 数据加载方法
                loadCategories: () => this.loadCategories(),
                loadCustomColors: () => this.loadCustomColors(),
                loadArtworks: () => this.loadArtworks(),
                loadMontMarteColors: () => this.loadMontMarteColors()
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
                    this.loadMontMarteColors()
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
        }
    }
});

// ===== 挂载应用 =====
// 使用Element Plus UI库并挂载到#app元素
app.use(ElementPlus).mount('#app');
console.log('Vue应用已挂载到#app');