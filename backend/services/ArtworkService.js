/**
 * 作品业务逻辑服务
 * 职责：处理作品和配色方案相关的业务逻辑
 * 引用：被 routes/artworks.js 使用
 * @module services/ArtworkService
 */

const artworkQueries = require('../db/queries/artworks');
const { db } = require('../db/index');
const fs = require('fs').promises;
const path = require('path');

class ArtworkService {
    /**
     * 获取所有作品
     */
    async getAllArtworks() {
        try {
            const rows = await artworkQueries.getAllArtworks();
            return this.formatArtworkData(rows);
        } catch (error) {
            throw new Error(`获取作品列表失败: ${error.message}`);
        }
    }

    /**
     * 格式化作品数据结构
     */
    formatArtworkData(rows) {
        const artworksMap = new Map();
        
        rows.forEach(row => {
            if (!artworksMap.has(row.id)) {
                artworksMap.set(row.id, {
                    id: row.id,
                    code: row.code,
                    name: row.name,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    schemes: []
                });
            }
            
            const artwork = artworksMap.get(row.id);
            
            if (row.scheme_id) {
                let scheme = artwork.schemes.find(s => s.id === row.scheme_id);
                if (!scheme) {
                    scheme = {
                        id: row.scheme_id,
                        name: row.scheme_name,  // Frontend expects 'name' not 'scheme_name'
                        thumbnail_path: row.thumbnail_path,
                        initial_thumbnail_path: row.initial_thumbnail_path,  // Include initial thumbnail
                        created_at: row.scheme_created_at,
                        updated_at: row.scheme_updated_at,
                        layers: []
                    };
                    artwork.schemes.push(scheme);
                }
                
                if (row.layer_number && row.custom_color_id) {
                    scheme.layers.push({
                        layer: row.layer_number,  // Frontend expects 'layer' not 'layer_number'
                        colorCode: row.color_code,  // Frontend expects 'colorCode' not 'color_code'
                        custom_color_id: row.custom_color_id,  // Keep for backend reference
                        formula: row.formula
                    });
                }
            }
        });
        
        return Array.from(artworksMap.values());
    }

    /**
     * 创建新作品
     */
    async createArtwork(artworkData) {
        try {
            const artworkId = await artworkQueries.createArtwork(artworkData);
            return await artworkQueries.getArtworkById(artworkId);
        } catch (error) {
            if (error.message.includes('UNIQUE')) {
                throw new Error('作品编码已存在');
            }
            throw new Error(`创建作品失败: ${error.message}`);
        }
    }

    /**
     * 删除作品
     */
    async deleteArtwork(id) {
        try {
            const schemes = await artworkQueries.getArtworkSchemes(id);
            
            // 删除所有配色方案的缩略图
            for (const scheme of schemes) {
                if (scheme.thumbnail_path) {
                    await this.deleteUploadedImage(scheme.thumbnail_path);
                }
            }
            
            const changes = await artworkQueries.deleteArtwork(id);
            return { success: changes > 0, deletedId: id };
        } catch (error) {
            throw new Error(`删除作品失败: ${error.message}`);
        }
    }

    /**
     * 将颜色代码转换为颜色ID
     */
    async convertColorCodesToIds(layers) {
        if (!layers || !layers.length) return [];
        
        const convertedLayers = [];
        for (const layer of layers) {
            // Handle both frontend format (layer, colorCode) and backend format (layer_number, custom_color_id)
            const layerNumber = layer.layer || layer.layer_number;
            let colorId = layer.custom_color_id;
            
            // If we have colorCode but not custom_color_id, look it up
            if (layer.colorCode && !layer.custom_color_id) {
                if (layer.colorCode) {
                    // Look up the color ID from the database
                    const color = await new Promise((resolve, reject) => {
                        db.get(
                            `SELECT id FROM custom_colors WHERE color_code = ?`,
                            [layer.colorCode],
                            (err, row) => {
                                if (err) reject(err);
                                else resolve(row);
                            }
                        );
                    });
                    colorId = color ? color.id : null;
                }
            }
            
            if (layerNumber && colorId) {
                convertedLayers.push({
                    layer_number: layerNumber,
                    custom_color_id: colorId
                });
            }
        }
        return convertedLayers;
    }

    /**
     * 创建配色方案
     */
    async createScheme(schemeData) {
        try {
            // Convert color codes to IDs if needed
            const convertedLayers = await this.convertColorCodesToIds(schemeData.layers);
            const dataWithConvertedLayers = {
                ...schemeData,
                layers: convertedLayers
            };
            
            const schemeId = await artworkQueries.createScheme(dataWithConvertedLayers);
            return { id: schemeId, ...schemeData };
        } catch (error) {
            throw new Error(`创建配色方案失败: ${error.message}`);
        }
    }

    /**
     * 更新配色方案
     */
    async updateScheme(schemeId, schemeData) {
        try {
            // Convert color codes to IDs if needed
            const convertedLayers = await this.convertColorCodesToIds(schemeData.layers);
            const dataWithConvertedLayers = {
                ...schemeData,
                layers: convertedLayers
            };
            
            await artworkQueries.updateScheme(schemeId, dataWithConvertedLayers);
            return { success: true };
        } catch (error) {
            throw new Error(`更新配色方案失败: ${error.message}`);
        }
    }

    /**
     * 删除配色方案
     */
    async deleteScheme(schemeId) {
        try {
            // 获取方案信息以删除缩略图
            const schemes = await artworkQueries.getArtworkSchemes(null);
            const scheme = schemes.find(s => s.id === schemeId);
            
            if (scheme) {
                // 删除主缩略图
                if (scheme.thumbnail_path) {
                    await this.deleteUploadedImage(scheme.thumbnail_path);
                }
                // 删除初始方案缩略图
                if (scheme.initial_thumbnail_path) {
                    await this.deleteUploadedImage(scheme.initial_thumbnail_path);
                }
            }
            
            const changes = await artworkQueries.deleteScheme(schemeId);
            return { success: changes > 0, deletedId: schemeId };
        } catch (error) {
            throw new Error(`删除配色方案失败: ${error.message}`);
        }
    }

    /**
     * 删除上传的图片文件
     */
    async deleteUploadedImage(imagePath) {
        if (!imagePath) return;
        
        try {
            const fullPath = path.join(__dirname, '..', 'uploads', path.basename(imagePath));
            await fs.unlink(fullPath);
        } catch (error) {
            console.warn('删除图片文件失败:', error.message);
        }
    }
}

module.exports = new ArtworkService();