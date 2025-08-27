// 材料（蒙马特颜色）API模块
// frontend/js/api/materials.js

import { BaseAPI } from './index.js';
import { RequestDeduplicator } from './cache.js';

export class MaterialAPI extends BaseAPI {
    constructor() {
        super('mont-marte-colors');
        this.deduplicator = new RequestDeduplicator();
    }

    // 获取所有材料
    async getAll(options = {}) {
        const key = 'getAll';
        return this.deduplicator.execute(key, () => 
            this.get('', options)
        );
    }

    // 获取单个材料
    async getById(id, options = {}) {
        return this.get(`/${id}`, options);
    }

    // 创建新材料
    async create(formData) {
        return this.upload('', formData);
    }

    // 更新材料
    async update(id, formData) {
        return this.upload(`/${id}`, formData, {
            method: 'PUT'
        });
    }

    // 删除材料
    async delete(id) {
        return super.delete(`/${id}`);
    }

    // 搜索材料
    async search(query, options = {}) {
        const params = { q: query, ...options };
        return this.get('/search' + this.utils.buildQueryString(params));
    }

    // 按分类获取材料
    async getByCategory(category, options = {}) {
        const params = { category, ...options };
        return this.get('/by-category' + this.utils.buildQueryString(params));
    }

    // 获取材料使用情况
    async getUsage(materialId) {
        return this.get(`/${materialId}/usage`);
    }

    // 批量导入材料
    async batchImport(materials) {
        return this.post('/batch-import', { materials });
    }

    // 导出材料数据
    async export(format = 'json', filters = {}) {
        const params = { format, ...filters };
        return this.get('/export' + this.utils.buildQueryString(params));
    }

    // 获取材料统计
    async getStatistics() {
        return this.get('/statistics', { cache: true });
    }

    // 检查材料编码重复
    async checkDuplicate(code, excludeId = null) {
        const params = { code };
        if (excludeId) {
            params.exclude_id = excludeId;
        }
        
        return this.post('/check-duplicate', params);
    }

    // 获取材料价格历史
    async getPriceHistory(materialId, options = {}) {
        return this.get(`/${materialId}/price-history`, options);
    }

    // 更新材料价格
    async updatePrice(materialId, price, effectiveDate = null) {
        return this.post(`/${materialId}/update-price`, {
            price,
            effective_date: effectiveDate
        });
    }

    // 获取库存信息
    async getInventory(materialId) {
        return this.get(`/${materialId}/inventory`);
    }

    // 更新库存
    async updateInventory(materialId, quantity, operation = 'set') {
        return this.post(`/${materialId}/update-inventory`, {
            quantity,
            operation // set, add, subtract
        });
    }

    // === 材料分类管理 ===
    
    // 获取所有材料分类
    async getCategories() {
        return this.get('/categories', { cache: true });
    }

    // 创建材料分类
    async createCategory(data) {
        return this.post('/categories', data);
    }

    // 更新材料分类
    async updateCategory(id, data) {
        return this.put(`/categories/${id}`, data);
    }

    // 删除材料分类
    async deleteCategory(id) {
        return super.delete(`/categories/${id}`);
    }

    // === 验证和工具方法 ===
    
    // 验证材料编码
    validateMaterialCode(code) {
        if (!code) return false;
        
        // 材料编码规则：字母数字，最多50字符
        const pattern = /^[A-Z0-9_-]{1,50}$/;
        return pattern.test(code.toUpperCase());
    }

    // 验证材料名称
    validateMaterialName(name) {
        if (!name) return false;
        return name.length > 0 && name.length <= 100;
    }

    // 格式化价格
    formatPrice(price) {
        if (typeof price !== 'number') {
            price = parseFloat(price);
        }
        if (isNaN(price)) return '0.00';
        return price.toFixed(2);
    }

    // 计算材料成本
    calculateCost(formula, materials) {
        let totalCost = 0;
        
        formula.forEach(item => {
            const material = materials.find(m => m.code === item.name);
            if (material && material.price) {
                const amount = parseFloat(item.amount) || 0;
                totalCost += material.price * amount;
            }
        });
        
        return totalCost;
    }

    // 材料分类映射
    getCategoryMap() {
        return {
            'paint': '颜料',
            'medium': '媒介剂',
            'additive': '添加剂',
            'tool': '工具',
            'other': '其他'
        };
    }

    // 获取材料单位列表
    getUnits() {
        return ['ml', 'g', 'kg', 'L', '瓶', '支', '个'];
    }
}

export default MaterialAPI;