// 分类API模块
// frontend/js/api/categories.js

import { BaseAPI } from './index.js';

export class CategoryAPI extends BaseAPI {
    constructor() {
        super('categories');
    }

    // 获取所有分类
    async getAll(options = {}) {
        // 分类数据通常不会频繁变化，可以使用较长的缓存时间
        return this.get('', { ...options, cache: true });
    }

    // 获取单个分类
    async getById(id, options = {}) {
        return this.get(`/${id}`, options);
    }

    // 创建新分类
    async create(data) {
        return this.post('', data);
    }

    // 更新分类
    async update(id, data) {
        return this.put(`/${id}`, data);
    }

    // 删除分类
    async delete(id) {
        return super.delete(`/${id}`);
    }

    // 获取分类统计（包含每个分类下的颜色数量）
    async getStatistics() {
        return this.get('/statistics', { cache: true });
    }

    // 批量创建分类
    async batchCreate(categories) {
        return this.post('/batch', { categories });
    }

    // 合并分类
    async merge(sourceId, targetId) {
        return this.post('/merge', {
            source_id: sourceId,
            target_id: targetId
        });
    }

    // 重新排序分类
    async reorder(categoryIds) {
        return this.post('/reorder', { ids: categoryIds });
    }

    // === 预定义分类 ===
    
    // 获取默认分类列表
    getDefaultCategories() {
        return [
            { name: '蓝色系', code: 'BU', color: '#0066CC' },
            { name: '绿色系', code: 'GR', color: '#00AA00' },
            { name: '黄色系', code: 'YL', color: '#FFCC00' },
            { name: '红色系', code: 'RD', color: '#CC0000' },
            { name: '紫色系', code: 'PP', color: '#9900CC' },
            { name: '橙色系', code: 'OR', color: '#FF6600' },
            { name: '黑白灰', code: 'BW', color: '#666666' },
            { name: '金属色', code: 'MT', color: '#C0C0C0' },
            { name: '特殊色', code: 'SP', color: '#FF00FF' },
            { name: '其他', code: 'OTHER', color: '#999999' }
        ];
    }

    // 初始化默认分类
    async initializeDefaults() {
        const defaults = this.getDefaultCategories();
        return this.batchCreate(defaults);
    }

    // === 验证和工具方法 ===
    
    // 验证分类名称
    validateCategoryName(name) {
        if (!name) return false;
        return name.length > 0 && name.length <= 50;
    }

    // 获取分类代码前缀
    getCategoryPrefix(categoryName) {
        const prefixMap = {
            '蓝色系': 'BU',
            '绿色系': 'GR',
            '黄色系': 'YL',
            '红色系': 'RD',
            '紫色系': 'PP',
            '橙色系': 'OR',
            '黑白灰': 'BW',
            '金属色': 'MT',
            '特殊色': 'SP',
            '其他': 'OTHER'
        };
        
        return prefixMap[categoryName] || 'CC';
    }

    // 生成颜色编码
    generateColorCode(categoryName, sequence = null) {
        const prefix = this.getCategoryPrefix(categoryName);
        
        if (sequence !== null) {
            // 使用指定的序号
            return `${prefix}${String(sequence).padStart(3, '0')}`;
        } else {
            // 使用时间戳
            const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
            return `${prefix}_${timestamp}`;
        }
    }

    // 解析颜色编码获取分类
    parseColorCode(colorCode) {
        if (!colorCode) return null;
        
        // 尝试匹配前缀
        const prefixes = {
            'BU': '蓝色系',
            'GR': '绿色系',
            'YL': '黄色系',
            'RD': '红色系',
            'PP': '紫色系',
            'OR': '橙色系',
            'BW': '黑白灰',
            'MT': '金属色',
            'SP': '特殊色'
        };
        
        const upperCode = colorCode.toUpperCase();
        for (const [prefix, category] of Object.entries(prefixes)) {
            if (upperCode.startsWith(prefix)) {
                return category;
            }
        }
        
        return '其他';
    }

    // 分类排序比较函数
    getCategorySorter() {
        const order = [
            '蓝色系', '绿色系', '黄色系', 
            '红色系', '紫色系', '橙色系',
            '黑白灰', '金属色', '特殊色', '其他'
        ];
        
        return (a, b) => {
            const indexA = order.indexOf(a.name);
            const indexB = order.indexOf(b.name);
            
            if (indexA === -1 && indexB === -1) {
                return a.name.localeCompare(b.name);
            }
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            
            return indexA - indexB;
        };
    }
}

export default CategoryAPI;