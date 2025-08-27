// 颜色服务模块 - 处理自配色相关的业务逻辑
// frontend/js/services/ColorService.js

export class ColorService {
    constructor(api) {
        this.api = api;
    }

    // 获取所有自配色
    async loadColors() {
        try {
            const response = await this.api.getCustomColors();
            return response.data || [];
        } catch (error) {
            console.error('加载自配色失败:', error);
            throw error;
        }
    }

    // 创建自配色
    async createColor(formData) {
        try {
            const response = await this.api.createCustomColor(formData);
            return response.data;
        } catch (error) {
            console.error('创建自配色失败:', error);
            throw error;
        }
    }

    // 更新自配色
    async updateColor(id, formData) {
        try {
            const response = await this.api.updateCustomColor(id, formData);
            return response.data;
        } catch (error) {
            console.error('更新自配色失败:', error);
            throw error;
        }
    }

    // 删除自配色
    async deleteColor(id) {
        try {
            await this.api.deleteCustomColor(id);
        } catch (error) {
            console.error('删除自配色失败:', error);
            throw error;
        }
    }

    // 获取颜色分类
    async loadCategories() {
        try {
            const response = await this.api.getColorCategories();
            return response.data || [];
        } catch (error) {
            console.error('加载分类失败:', error);
            throw error;
        }
    }

    // 检查颜色是否被引用
    isColorReferenced(color, artworks) {
        if (!artworks || !Array.isArray(artworks)) return false;
        
        for (let art of artworks) {
            if (art.schemes && Array.isArray(art.schemes)) {
                for (let scheme of art.schemes) {
                    if (scheme.layers && Array.isArray(scheme.layers)) {
                        for (let mapping of scheme.layers) {
                            if (mapping.color_code === color.color_code) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    // 获取颜色的使用情况
    getColorUsageGroups(color, artworks) {
        const groups = [];
        if (!artworks || !Array.isArray(artworks)) return groups;
        
        for (let art of artworks) {
            if (!art.schemes || !Array.isArray(art.schemes)) continue;
            
            for (let scheme of art.schemes) {
                if (!scheme.layers || !Array.isArray(scheme.layers)) continue;
                
                const layers = [];
                for (let mapping of scheme.layers) {
                    if (mapping.color_code === color.color_code) {
                        layers.push(mapping.layer_number);
                    }
                }
                
                if (layers.length > 0) {
                    layers.sort((a, b) => a - b);
                    const compactLayers = this.compactLayers(layers);
                    groups.push({
                        artworkId: art.id,
                        artworkName: art.name,
                        schemeId: scheme.id,
                        schemeName: scheme.name || '默认方案',
                        layers: layers,
                        display: compactLayers
                    });
                }
            }
        }
        
        return groups;
    }

    // 压缩层号显示
    compactLayers(layers) {
        if (!layers || layers.length === 0) return '';
        if (layers.length === 1) return String(layers[0]);
        
        const ranges = [];
        let start = layers[0];
        let end = layers[0];
        
        for (let i = 1; i < layers.length; i++) {
            if (layers[i] === end + 1) {
                end = layers[i];
            } else {
                ranges.push(start === end ? String(start) : `${start}-${end}`);
                start = end = layers[i];
            }
        }
        ranges.push(start === end ? String(start) : `${start}-${end}`);
        
        return ranges.join(',');
    }

    // 解析配方文本
    parseFormula(formulaText) {
        if (!formulaText) return [];
        
        // 支持多种分隔符
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
            .filter(s => s.length > 0);
    }

    // 构建上传URL
    buildUploadURL(baseURL, path) {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        return `${baseURL}/uploads/${path}`;
    }
}

export default ColorService;