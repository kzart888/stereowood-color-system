// API配置和封装
// 该文件定义所有与后端通信的API接口
// 被 app.js 和各组件文件调用

// 后端服务器地址配置
const API_BASE_URL = 'http://localhost:9099/api';

// API接口封装对象
const api = {
    // 颜色分类相关API
    categories: {
        // 获取所有分类
        getAll: () => axios.get(`${API_BASE_URL}/categories`),
        
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
        getAll: () => axios.get(`${API_BASE_URL}/custom-colors`),
        
        // 创建新颜色（带图片上传）
        create: (formData) => axios.post(`${API_BASE_URL}/custom-colors`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
        
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
        getAll: () => axios.get(`${API_BASE_URL}/artworks`),
        
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
        getAll: () => axios.get(`${API_BASE_URL}/mont-marte-colors`),
        
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