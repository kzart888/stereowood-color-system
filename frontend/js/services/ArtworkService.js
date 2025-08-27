// 作品服务模块 - 处理作品配色相关的业务逻辑
// frontend/js/services/ArtworkService.js

export class ArtworkService {
    constructor(api) {
        this.api = api;
    }

    // 获取所有作品
    async loadArtworks() {
        try {
            const response = await this.api.getArtworks();
            return response.data || [];
        } catch (error) {
            console.error('加载作品失败:', error);
            throw error;
        }
    }

    // 创建作品
    async createArtwork(data) {
        try {
            const response = await this.api.createArtwork(data);
            return response.data;
        } catch (error) {
            console.error('创建作品失败:', error);
            throw error;
        }
    }

    // 删除作品
    async deleteArtwork(id) {
        try {
            await this.api.deleteArtwork(id);
        } catch (error) {
            console.error('删除作品失败:', error);
            throw error;
        }
    }

    // 创建配色方案
    async createScheme(artworkId, formData) {
        try {
            const response = await this.api.createScheme(artworkId, formData);
            return response.data;
        } catch (error) {
            console.error('创建配色方案失败:', error);
            throw error;
        }
    }

    // 更新配色方案
    async updateScheme(artworkId, schemeId, formData) {
        try {
            const response = await this.api.updateScheme(artworkId, schemeId, formData);
            return response.data;
        } catch (error) {
            console.error('更新配色方案失败:', error);
            throw error;
        }
    }

    // 删除配色方案
    async deleteScheme(artworkId, schemeId) {
        try {
            await this.api.deleteScheme(artworkId, schemeId);
        } catch (error) {
            console.error('删除配色方案失败:', error);
            throw error;
        }
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

    // 标准化层映射数据
    normalizeMappings(scheme) {
        if (!scheme || !scheme.layers) return [];
        
        const mappings = [];
        const layerSet = new Set();
        
        scheme.layers.forEach(layer => {
            if (!layerSet.has(layer.layer_number)) {
                layerSet.add(layer.layer_number);
                mappings.push({
                    layer: layer.layer_number,
                    colorCode: layer.color_code || '',
                    colorId: layer.color_id || null
                });
            }
        });
        
        // 按层号排序
        mappings.sort((a, b) => a.layer - b.layer);
        
        // 填充空缺的层
        const maxLayer = Math.max(...mappings.map(m => m.layer), 0);
        const result = [];
        
        for (let i = 1; i <= maxLayer; i++) {
            const existing = mappings.find(m => m.layer === i);
            if (existing) {
                result.push(existing);
            } else {
                result.push({
                    layer: i,
                    colorCode: '',
                    colorId: null
                });
            }
        }
        
        return result;
    }

    // 计算层号的重复次数
    calculateDuplicateCount(scheme, layerNumber) {
        if (!scheme || !scheme.layers) return 0;
        
        return scheme.layers.filter(l => 
            l.layer_number === layerNumber
        ).length;
    }

    // 获取重复层的颜色
    getDuplicateBadgeColor(layerNumber) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', 
            '#FFA07A', '#98D8C8', '#FFD93D'
        ];
        return colors[layerNumber % colors.length];
    }

    // 构建结构化的配方数据
    structureFormula(formula) {
        if (!formula) {
            return { lines: [], maxNameChars: 0 };
        }
        
        const lines = [];
        const parts = formula.split(/[+＋]/);
        let maxChars = 0;
        
        parts.forEach(part => {
            const match = part.match(/^(.+?)(\d+(?:\.\d+)?%?)$/);
            if (match) {
                const name = match[1].trim();
                const amount = match[2].trim();
                lines.push({ name, amount });
                
                const nameLength = this.getChineseCharLength(name);
                if (nameLength > maxChars) {
                    maxChars = nameLength;
                }
            } else {
                const trimmed = part.trim();
                if (trimmed) {
                    lines.push({ name: trimmed, amount: '' });
                    const nameLength = this.getChineseCharLength(trimmed);
                    if (nameLength > maxChars) {
                        maxChars = nameLength;
                    }
                }
            }
        });
        
        return { lines, maxNameChars: maxChars };
    }

    // 计算中文字符长度
    getChineseCharLength(str) {
        let length = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            // 中文字符范围
            if ((char >= 0x4e00 && char <= 0x9fa5) || 
                (char >= 0x3000 && char <= 0x303f)) {
                length += 2;
            } else {
                length += 1;
            }
        }
        return length;
    }

    // 生成打印HTML
    generatePrintHTML(artwork, scheme, colors) {
        // TODO: 实现打印HTML生成
        return '<html><body>打印内容</body></html>';
    }
}

export default ArtworkService;