// API基类和配置
// frontend/js/api/index.js

import { ColorAPI } from './colors.js';
import { ArtworkAPI } from './artworks.js';
import { MaterialAPI } from './materials.js';
import { CategoryAPI } from './categories.js';
import { APICache } from './cache.js';
import { APIUtils } from './utils.js';

// API配置
export const API_CONFIG = {
    BASE_URL: window.location.origin + '/api',
    TIMEOUT: 30000,
    RETRY_COUNT: 3,
    RETRY_DELAY: 1000,
    CACHE_TTL: 5 * 60 * 1000, // 5分钟缓存
    ENABLE_CACHE: true
};

// API基类
export class BaseAPI {
    constructor(endpoint, config = {}) {
        this.endpoint = endpoint;
        this.config = { ...API_CONFIG, ...config };
        this.cache = new APICache(this.config.CACHE_TTL);
        this.utils = new APIUtils();
    }

    // 构建完整URL
    buildURL(path = '') {
        return `${this.config.BASE_URL}/${this.endpoint}${path}`;
    }

    // 通用GET请求
    async get(path = '', options = {}) {
        const url = this.buildURL(path);
        
        // 检查缓存
        if (this.config.ENABLE_CACHE && !options.noCache) {
            const cached = this.cache.get(url);
            if (cached) return cached;
        }
        
        try {
            const response = await this.utils.request('GET', url, options);
            
            // 缓存结果
            if (this.config.ENABLE_CACHE && !options.noCache) {
                this.cache.set(url, response.data);
            }
            
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    // 通用POST请求
    async post(path = '', data = {}, options = {}) {
        const url = this.buildURL(path);
        
        try {
            const response = await this.utils.request('POST', url, { ...options, data });
            
            // 清除相关缓存
            this.cache.clearPattern(this.endpoint);
            
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    // 通用PUT请求
    async put(path = '', data = {}, options = {}) {
        const url = this.buildURL(path);
        
        try {
            const response = await this.utils.request('PUT', url, { ...options, data });
            
            // 清除相关缓存
            this.cache.clearPattern(this.endpoint);
            
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    // 通用DELETE请求
    async delete(path = '', options = {}) {
        const url = this.buildURL(path);
        
        try {
            const response = await this.utils.request('DELETE', url, options);
            
            // 清除相关缓存
            this.cache.clearPattern(this.endpoint);
            
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    // 上传文件
    async upload(path = '', formData, options = {}) {
        return this.post(path, formData, {
            ...options,
            headers: {
                'Content-Type': 'multipart/form-data',
                ...(options.headers || {})
            }
        });
    }

    // 错误处理
    handleError(error) {
        console.error(`API Error [${this.endpoint}]:`, error);
        
        if (error.response) {
            // 服务器返回错误
            const message = error.response.data?.message || '服务器错误';
            throw new Error(message);
        } else if (error.request) {
            // 请求发送但无响应
            throw new Error('网络连接失败');
        } else {
            // 其他错误
            throw error;
        }
    }

    // 清除缓存
    clearCache() {
        this.cache.clearPattern(this.endpoint);
    }
}

// API实例管理器
export class APIManager {
    constructor() {
        this.colors = new ColorAPI();
        this.artworks = new ArtworkAPI();
        this.materials = new MaterialAPI();
        this.categories = new CategoryAPI();
    }

    // 获取颜色API
    getColorAPI() {
        return this.colors;
    }

    // 获取作品API
    getArtworkAPI() {
        return this.artworks;
    }

    // 获取材料API
    getMaterialAPI() {
        return this.materials;
    }

    // 获取分类API
    getCategoryAPI() {
        return this.categories;
    }

    // 清除所有缓存
    clearAllCache() {
        this.colors.clearCache();
        this.artworks.clearCache();
        this.materials.clearCache();
        this.categories.clearCache();
    }

    // 预加载关键数据
    async preloadCriticalData() {
        const promises = [
            this.categories.getAll(),
            this.colors.getAll(),
            this.artworks.getAll()
        ];
        
        try {
            await Promise.all(promises);
            console.log('Critical data preloaded');
        } catch (error) {
            console.error('Failed to preload critical data:', error);
        }
    }
}

// 创建全局API实例
export const apiManager = new APIManager();

// 导出便捷访问方法（保持向后兼容）
export const api = {
    // 分类API
    getColorCategories: () => apiManager.categories.getAll(),
    createCategory: (data) => apiManager.categories.create(data),
    updateCategory: (id, data) => apiManager.categories.update(id, data),
    deleteCategory: (id) => apiManager.categories.delete(id),
    
    // 自配色API
    getCustomColors: () => apiManager.colors.getAll(),
    createCustomColor: (formData) => apiManager.colors.create(formData),
    updateCustomColor: (id, formData) => apiManager.colors.update(id, formData),
    deleteCustomColor: (id) => apiManager.colors.delete(id),
    
    // 作品API
    getArtworks: () => apiManager.artworks.getAll(),
    createArtwork: (data) => apiManager.artworks.create(data),
    updateArtwork: (id, data) => apiManager.artworks.update(id, data),
    deleteArtwork: (id) => apiManager.artworks.delete(id),
    
    // 配色方案API
    createScheme: (artworkId, formData) => apiManager.artworks.createScheme(artworkId, formData),
    updateScheme: (artworkId, schemeId, formData) => apiManager.artworks.updateScheme(artworkId, schemeId, formData),
    deleteScheme: (artworkId, schemeId) => apiManager.artworks.deleteScheme(artworkId, schemeId),
    
    // 材料API
    getMontMarteColors: () => apiManager.materials.getAll(),
    createMontMarteColor: (formData) => apiManager.materials.create(formData),
    updateMontMarteColor: (id, formData) => apiManager.materials.update(id, formData),
    deleteMontMarteColor: (id) => apiManager.materials.delete(id)
};

// 保持向后兼容
window.api = api;
window.apiManager = apiManager;

export default api;