// 颜色API模块
// frontend/js/api/colors.js

import { BaseAPI } from './index.js';
import { RequestDeduplicator } from './cache.js';

export class ColorAPI extends BaseAPI {
    constructor() {
        super('custom-colors');
        this.deduplicator = new RequestDeduplicator();
    }

    // 获取所有自配颜色
    async getAll(options = {}) {
        const key = 'getAll';
        return this.deduplicator.execute(key, () => 
            this.get('', options)
        );
    }

    // 获取单个颜色
    async getById(id, options = {}) {
        return this.get(`/${id}`, options);
    }

    // 创建新颜色
    async create(formData) {
        return this.upload('', formData);
    }

    // 更新颜色
    async update(id, formData) {
        return this.upload(`/${id}`, formData, {
            method: 'PUT'
        });
    }

    // 删除颜色
    async delete(id) {
        return super.delete(`/${id}`);
    }

    // 获取颜色历史记录
    async getHistory(id, options = {}) {
        return this.get(`/${id}/history`, options);
    }

    // 检查配方重复
    async checkDuplicate(formula, excludeId = null) {
        const params = { formula };
        if (excludeId) {
            params.exclude_id = excludeId;
        }
        
        return this.post('/check-duplicate', params);
    }

    // 强制合并重复配方
    async forceMerge(sourceId, targetId) {
        return this.post('/force-merge', {
            source_id: sourceId,
            target_id: targetId
        });
    }

    // 批量导入颜色
    async batchImport(colors) {
        return this.post('/batch-import', { colors });
    }

    // 导出颜色数据
    async export(format = 'json', filters = {}) {
        const params = { format, ...filters };
        return this.get('/export' + this.utils.buildQueryString(params));
    }

    // 搜索颜色
    async search(query, options = {}) {
        const params = { q: query, ...options };
        return this.get('/search' + this.utils.buildQueryString(params));
    }

    // 获取颜色统计
    async getStatistics() {
        return this.get('/statistics', { cache: true });
    }

    // 获取使用情况
    async getUsage(colorCode) {
        return this.get(`/usage/${encodeURIComponent(colorCode)}`);
    }

    // 验证颜色编码
    validateColorCode(code) {
        if (!code) return false;
        
        // 颜色编码规则：字母数字，最多50字符
        const pattern = /^[A-Z0-9_-]{1,50}$/;
        return pattern.test(code.toUpperCase());
    }

    // 解析配方文本
    parseFormula(formulaText) {
        if (!formulaText) return [];
        
        const separators = ['+', '＋', ',', '，', ';', '；'];
        let segments = [formulaText];
        
        for (const sep of separators) {
            const newSegments = [];
            for (const seg of segments) {
                newSegments.push(...seg.split(sep));
            }
            segments = newSegments;
        }
        
        return segments
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(segment => {
                // 尝试解析成分和数量
                const match = segment.match(/^(.+?)(\d+(?:\.\d+)?%?)$/);
                if (match) {
                    return {
                        name: match[1].trim(),
                        amount: match[2].trim()
                    };
                }
                return { name: segment, amount: '' };
            });
    }

    // 格式化配方
    formatFormula(parsedFormula) {
        return parsedFormula
            .map(item => item.amount ? `${item.name}${item.amount}` : item.name)
            .join(' + ');
    }
}

export default ColorAPI;