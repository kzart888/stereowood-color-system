// 作品API模块
// frontend/js/api/artworks.js

import { BaseAPI } from './index.js';
import { RequestDeduplicator } from './cache.js';

export class ArtworkAPI extends BaseAPI {
    constructor() {
        super('artworks');
        this.deduplicator = new RequestDeduplicator();
    }

    // 获取所有作品
    async getAll(options = {}) {
        const key = 'getAll';
        return this.deduplicator.execute(key, () => 
            this.get('', options)
        );
    }

    // 获取单个作品详情
    async getById(id, options = {}) {
        return this.get(`/${id}`, options);
    }

    // 创建新作品
    async create(data) {
        return this.post('', data);
    }

    // 更新作品
    async update(id, data) {
        return this.put(`/${id}`, data);
    }

    // 删除作品
    async delete(id) {
        return super.delete(`/${id}`);
    }

    // === 配色方案相关 ===
    
    // 获取作品的所有配色方案
    async getSchemes(artworkId, options = {}) {
        return this.get(`/${artworkId}/schemes`, options);
    }

    // 获取单个配色方案
    async getSchemeById(artworkId, schemeId, options = {}) {
        return this.get(`/${artworkId}/schemes/${schemeId}`, options);
    }

    // 创建配色方案
    async createScheme(artworkId, formData) {
        const url = `/${artworkId}/schemes`;
        
        // 如果是FormData直接上传
        if (formData instanceof FormData) {
            return this.upload(url, formData);
        }
        
        // 否则构建FormData
        const data = new FormData();
        if (formData.name) data.append('name', formData.name);
        if (formData.thumbnail) data.append('thumbnail', formData.thumbnail);
        if (formData.layers) {
            data.append('layers', JSON.stringify(formData.layers));
        }
        
        return this.upload(url, data);
    }

    // 更新配色方案
    async updateScheme(artworkId, schemeId, formData) {
        const url = `/${artworkId}/schemes/${schemeId}`;
        
        // 如果是FormData直接上传
        if (formData instanceof FormData) {
            return this.upload(url, formData, { method: 'PUT' });
        }
        
        // 否则构建FormData
        const data = new FormData();
        if (formData.name !== undefined) data.append('name', formData.name);
        if (formData.thumbnail) data.append('thumbnail', formData.thumbnail);
        if (formData.removeThumbnail) data.append('remove_thumbnail', 'true');
        if (formData.layers) {
            data.append('layers', JSON.stringify(formData.layers));
        }
        
        return this.upload(url, data, { method: 'PUT' });
    }

    // 删除配色方案
    async deleteScheme(artworkId, schemeId) {
        return super.delete(`/${artworkId}/schemes/${schemeId}`);
    }

    // 复制配色方案
    async copyScheme(artworkId, schemeId, targetArtworkId) {
        return this.post(`/${artworkId}/schemes/${schemeId}/copy`, {
            target_artwork_id: targetArtworkId
        });
    }

    // === 批量操作 ===
    
    // 批量导入作品
    async batchImport(artworks) {
        return this.post('/batch-import', { artworks });
    }

    // 导出作品数据
    async export(format = 'json', filters = {}) {
        const params = { format, ...filters };
        return this.get('/export' + this.utils.buildQueryString(params));
    }

    // === 统计和分析 ===
    
    // 获取作品统计
    async getStatistics() {
        return this.get('/statistics', { cache: true });
    }

    // 获取颜色使用分析
    async getColorUsageAnalysis(artworkId) {
        return this.get(`/${artworkId}/color-analysis`);
    }

    // 获取层分布统计
    async getLayerDistribution(artworkId) {
        return this.get(`/${artworkId}/layer-distribution`);
    }

    // === 历史记录 ===
    
    // 获取作品历史
    async getHistory(artworkId, options = {}) {
        return this.get(`/${artworkId}/history`, options);
    }

    // 获取配色方案历史
    async getSchemeHistory(artworkId, schemeId, options = {}) {
        return this.get(`/${artworkId}/schemes/${schemeId}/history`, options);
    }

    // === 验证和工具方法 ===
    
    // 验证作品名称
    validateArtworkName(name) {
        if (!name) return true; // 允许空名称（自动编号）
        return name.length <= 100;
    }

    // 验证层映射
    validateLayerMappings(layers) {
        if (!Array.isArray(layers)) return false;
        
        return layers.every(layer => {
            return typeof layer.layer_number === 'number' &&
                   layer.layer_number > 0 &&
                   (!layer.color_code || typeof layer.color_code === 'string');
        });
    }

    // 格式化作品标题
    formatArtworkTitle(artwork) {
        if (!artwork) return '';
        return artwork.name || `作品#${artwork.id}`;
    }

    // 格式化方案名称
    formatSchemeName(artwork, scheme) {
        if (!scheme) return '';
        if (scheme.name) return scheme.name;
        
        const schemeIndex = artwork.schemes ? 
            artwork.schemes.findIndex(s => s.id === scheme.id) + 1 : 1;
        return `方案${schemeIndex}`;
    }

    // 计算层使用情况
    calculateLayerUsage(schemes) {
        const usage = new Map();
        
        schemes.forEach(scheme => {
            if (scheme.layers) {
                scheme.layers.forEach(layer => {
                    const key = layer.layer_number;
                    if (!usage.has(key)) {
                        usage.set(key, { count: 0, colors: new Set() });
                    }
                    usage.get(key).count++;
                    if (layer.color_code) {
                        usage.get(key).colors.add(layer.color_code);
                    }
                });
            }
        });
        
        return usage;
    }
}

export default ArtworkAPI;