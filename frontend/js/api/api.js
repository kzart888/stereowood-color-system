// API配置和封装
// 该文件定义所有与后端通信的API接口
// 被 app.js 和各组件文件调用

// 后端服务器地址配置
const API_BASE_URL = window.location.origin + '/api';

// Simple cache for small team use (3-5 users)
// No need for complex caching strategies
const simpleCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Simple cached GET for small deployment
function cachedGet(url, options = {}) {
    const key = url + JSON.stringify(options.params || {});
    const cached = simpleCache.get(key);
    
    // Check if cache is still valid
    if (cached && Date.now() - cached.time < CACHE_TTL) {
        console.log('[Cache HIT]', url);
        return Promise.resolve(cached.data);
    }
    
    // Make request and cache result
    console.log('[Cache MISS]', url);
    return axios.get(url, options).then(response => {
        simpleCache.set(key, { data: response, time: Date.now() });
        return response;
    });
}

// API接口封装对象
const api = {
    // 颜色分类相关API
    categories: {
        // 获取所有分类
        getAll: () => cachedGet(`${API_BASE_URL}/categories`, { cacheTTL: 10 * 60 * 1000 }),
        
        // 创建新分类
        create: (data) => axios.post(`${API_BASE_URL}/categories`, data),
        
        // 更新分类
        update: (id, data) => axios.put(`${API_BASE_URL}/categories/${id}`, data),
        
        // 删除分类
        delete: (id) => axios.delete(`${API_BASE_URL}/categories/${id}`)
    },
    
    // 自配颜色相关API
    customColors: {
        // 获取所有自配颜色
        getAll: () => cachedGet(`${API_BASE_URL}/custom-colors`, { cacheTTL: 3 * 60 * 1000 }),
        
        // 创建新颜色（带图片上传）
        create: (formData) => {
            // Clear cache when data changes
            simpleCache.clear();
            return axios.post(`${API_BASE_URL}/custom-colors`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        
        // 更新颜色（带图片上传）
        update: (id, formData) => axios.put(`${API_BASE_URL}/custom-colors/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
        
        // 删除颜色
        delete: (id) => axios.delete(`${API_BASE_URL}/custom-colors/${id}`),
        
        // 获取颜色历史记录
    getHistory: (id) => axios.get(`${API_BASE_URL}/custom-colors/${id}/history`),
    // 强制合并重复配方（更新引用后删除）
    forceMerge: (payload) => axios.post(`${API_BASE_URL}/custom-colors/force-merge`, payload)
    },
    
    // 作品相关API
    artworks: {
        // 获取所有作品
        getAll: () => cachedGet(`${API_BASE_URL}/artworks`, { cacheTTL: 3 * 60 * 1000 }),
        
        // 获取单个作品详情
        get: (id) => axios.get(`${API_BASE_URL}/artworks/${id}`),
        
        // 创建新作品
        create: (data) => axios.post(`${API_BASE_URL}/artworks`, data),
        
        // 更新作品
        update: (id, data) => axios.put(`${API_BASE_URL}/artworks/${id}`, data),
        
        // 删除作品
        delete: (id) => axios.delete(`${API_BASE_URL}/artworks/${id}`)
    },
    
    // 蒙马特颜色（颜色原料库）相关API
    montMarteColors: {
        // 获取所有颜色原料
        getAll: () => cachedGet(`${API_BASE_URL}/mont-marte-colors`, { cacheTTL: 10 * 60 * 1000 }),
        
        // 创建新颜色原料（带图片上传）
        create: (formData) => axios.post(`${API_BASE_URL}/mont-marte-colors`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
        
        // 更新颜色原料（带图片上传）
        update: (id, formData) => axios.put(`${API_BASE_URL}/mont-marte-colors/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
        
        // 删除颜色原料
        delete: (id) => axios.delete(`${API_BASE_URL}/mont-marte-colors/${id}`)
    }
};

// 导出给其他文件使用
// 在浏览器环境中，这会创建一个全局变量 api