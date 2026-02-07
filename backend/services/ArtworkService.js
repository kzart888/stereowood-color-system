/**
 * 浣滃搧涓氬姟閫昏緫鏈嶅姟
 * 鑱岃矗锛氬鐞嗕綔鍝佸拰閰嶈壊鏂规鐩稿叧鐨勪笟鍔￠€昏緫
 * 寮曠敤锛氳 routes/artworks.js 浣跨敤
 * @module services/ArtworkService
 */

const artworkQueries = require('../db/queries/artworks');
const { db } = require('../db/index');
const fs = require('fs').promises;
const path = require('path');

class ArtworkService {
    /**
     * 鑾峰彇鎵€鏈変綔鍝?
     */
    async getAllArtworks() {
        try {
            const rows = await artworkQueries.getAllArtworks();
            return this.formatArtworkData(rows);
        } catch (error) {
            throw new Error(`鑾峰彇浣滃搧鍒楄〃澶辫触: ${error.message}`);
        }
    }

    /**
     * 鏍煎紡鍖栦綔鍝佹暟鎹粨鏋?
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
                
                if (row.layer_number) {
                    scheme.layers.push({
                        layer: row.layer_number,  // Frontend expects 'layer' not 'layer_number'
                        colorCode: row.color_code ?? null,  // Frontend expects 'colorCode'
                        custom_color_id: row.custom_color_id ?? null,  // Keep for backend reference
                        formula: row.formula ?? null,
                        manualFormula: row.manual_formula ?? null
                    });
                }
            }
        });
        
        return Array.from(artworksMap.values());
    }

    /**
     * 鍒涘缓鏂颁綔鍝?
     */
    async createArtwork(artworkData) {
        try {
            const artworkId = await artworkQueries.createArtwork(artworkData);
            return await artworkQueries.getArtworkById(artworkId);
        } catch (error) {
            if (error.message.includes('UNIQUE')) {
                throw new Error('Artwork code already exists.');
            }
            throw new Error(`鍒涘缓浣滃搧澶辫触: ${error.message}`);
        }
    }

    /**
     * 鍒犻櫎浣滃搧
     */
    async deleteArtwork(id) {
        try {
            const schemes = await artworkQueries.getArtworkSchemes(id);

            const filesToDelete = new Set();
            for (const scheme of schemes) {
                if (scheme.thumbnail_path) {
                    filesToDelete.add(scheme.thumbnail_path);
                }
                if (scheme.initial_thumbnail_path) {
                    filesToDelete.add(scheme.initial_thumbnail_path);
                }
            }

            for (const filePath of filesToDelete) {
                await this.deleteUploadedImage(filePath);
            }

            const changes = await artworkQueries.deleteArtwork(id);
            return { success: changes > 0, deletedId: id };
        } catch (error) {
            throw new Error(`鍒犻櫎浣滃搧澶辫触: ${error.message}`);
        }
    }

    /**
     * 灏嗛鑹蹭唬鐮佽浆鎹负棰滆壊ID
     */
    async convertColorCodesToIds(layers) {
        if (!layers || !layers.length) return [];
        
        const convertedLayers = [];
        for (const layer of layers) {
            // Handle both frontend format (layer, colorCode) and backend format (layer_number, custom_color_id)
            const layerNumber = layer.layer || layer.layer_number;
            let colorId = layer.custom_color_id;
            const manualFormula =
                typeof layer.manualFormula === 'string'
                    ? layer.manualFormula.trim()
                    : typeof layer.manual_formula === 'string'
                      ? layer.manual_formula.trim()
                      : null;
            
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
            
            if (layerNumber && (colorId || manualFormula)) {
                convertedLayers.push({
                    layer_number: layerNumber,
                    custom_color_id: colorId ?? null,
                    manual_formula: manualFormula || null
                });
            }
        }
        return convertedLayers;
    }

    /**
     * 鍒涘缓閰嶈壊鏂规
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
            throw new Error(`鍒涘缓閰嶈壊鏂规澶辫触: ${error.message}`);
        }
    }

    /**
     * 鏇存柊閰嶈壊鏂规
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
            throw new Error(`鏇存柊閰嶈壊鏂规澶辫触: ${error.message}`);
        }
    }

    /**
     * 鍒犻櫎閰嶈壊鏂规
     */
    async deleteScheme(schemeId) {
        try {
            // 鑾峰彇鏂规淇℃伅浠ュ垹闄ょ缉鐣ュ浘
            const scheme = await artworkQueries.getSchemeById(schemeId);
            
            if (scheme) {
                // 鍒犻櫎涓荤缉鐣ュ浘
                if (scheme.thumbnail_path) {
                    await this.deleteUploadedImage(scheme.thumbnail_path);
                }
                // 鍒犻櫎鍒濆鏂规缂╃暐鍥?
                if (scheme.initial_thumbnail_path) {
                    await this.deleteUploadedImage(scheme.initial_thumbnail_path);
                }
            }
            
            const changes = await artworkQueries.deleteScheme(schemeId);
            return { success: changes > 0, deletedId: schemeId };
        } catch (error) {
            throw new Error(`鍒犻櫎閰嶈壊鏂规澶辫触: ${error.message}`);
        }
    }

    /**
     * 鍒犻櫎涓婁紶鐨勫浘鐗囨枃浠?
     */
    async deleteUploadedImage(imagePath) {
        if (!imagePath) return;
        
        try {
            const fullPath = path.join(__dirname, '..', 'uploads', path.basename(imagePath));
            await fs.unlink(fullPath);
        } catch (error) {
            console.warn('鍒犻櫎鍥剧墖鏂囦欢澶辫触:', error.message);
        }
    }
}

module.exports = new ArtworkService();

