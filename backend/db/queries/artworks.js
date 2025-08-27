/**
 * 作品相关数据库查询模块
 * 职责：封装所有与作品和配色方案相关的数据库操作
 * 引用：被 services/ArtworkService.js 和 routes/artworks.js 使用
 * @module db/queries/artworks
 */

const { db } = require('../index');

/**
 * 获取所有作品及其配色方案
 * @returns {Promise<Array>} 作品列表
 */
function getAllArtworks() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT a.*, 
                   cs.id as scheme_id, cs.scheme_name, cs.thumbnail_path,
                   cs.created_at as scheme_created_at, cs.updated_at as scheme_updated_at,
                   sl.layer_number, sl.custom_color_id,
                   cc.color_code, cc.formula, cc.image_path as color_image_path
            FROM artworks a
            LEFT JOIN color_schemes cs ON a.id = cs.artwork_id
            LEFT JOIN scheme_layers sl ON cs.id = sl.scheme_id
            LEFT JOIN custom_colors cc ON sl.custom_color_id = cc.id
            ORDER BY a.created_at DESC, cs.created_at DESC, sl.layer_number
        `, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * 根据ID获取作品
 * @param {number} id - 作品ID
 * @returns {Promise<Object>} 作品对象
 */
function getArtworkById(id) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT * FROM artworks WHERE id = ?
        `, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * 创建新作品
 * @param {Object} artworkData - 作品数据
 * @returns {Promise<number>} 新创建的作品ID
 */
function createArtwork(artworkData) {
    const { code, name } = artworkData;
    
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO artworks (code, name) VALUES (?, ?)
        `, [code, name], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

/**
 * 更新作品信息
 * @param {number} id - 作品ID
 * @param {Object} artworkData - 更新的作品数据
 * @returns {Promise<number>} 影响的行数
 */
function updateArtwork(id, artworkData) {
    const { code, name } = artworkData;
    
    return new Promise((resolve, reject) => {
        db.run(`
            UPDATE artworks 
            SET code = ?, name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [code, name, id], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

/**
 * 删除作品
 * @param {number} id - 作品ID
 * @returns {Promise<number>} 影响的行数
 */
function deleteArtwork(id) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM artworks WHERE id = ?`, [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

/**
 * 获取作品的所有配色方案
 * @param {number} artworkId - 作品ID
 * @returns {Promise<Array>} 配色方案列表
 */
function getArtworkSchemes(artworkId) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT cs.*, 
                   sl.layer_number, sl.custom_color_id,
                   cc.color_code, cc.formula, cc.image_path as color_image_path
            FROM color_schemes cs
            LEFT JOIN scheme_layers sl ON cs.id = sl.scheme_id
            LEFT JOIN custom_colors cc ON sl.custom_color_id = cc.id
            WHERE cs.artwork_id = ?
            ORDER BY cs.created_at DESC, sl.layer_number
        `, [artworkId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * 创建配色方案
 * @param {Object} schemeData - 方案数据
 * @returns {Promise<number>} 新创建的方案ID
 */
function createScheme(schemeData) {
    const { artwork_id, scheme_name, thumbnail_path, layers } = schemeData;
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            db.run(`
                INSERT INTO color_schemes (artwork_id, scheme_name, thumbnail_path)
                VALUES (?, ?, ?)
            `, [artwork_id, scheme_name, thumbnail_path], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                }
                
                const schemeId = this.lastID;
                
                // 插入层信息
                if (layers && layers.length > 0) {
                    let completed = 0;
                    layers.forEach(layer => {
                        db.run(`
                            INSERT INTO scheme_layers (scheme_id, layer_number, custom_color_id)
                            VALUES (?, ?, ?)
                        `, [schemeId, layer.layer_number, layer.custom_color_id], (layerErr) => {
                            if (layerErr) {
                                db.run('ROLLBACK');
                                return reject(layerErr);
                            }
                            completed++;
                            if (completed === layers.length) {
                                db.run('COMMIT', (commitErr) => {
                                    if (commitErr) reject(commitErr);
                                    else resolve(schemeId);
                                });
                            }
                        });
                    });
                } else {
                    db.run('COMMIT', (commitErr) => {
                        if (commitErr) reject(commitErr);
                        else resolve(schemeId);
                    });
                }
            });
        });
    });
}

/**
 * 更新配色方案
 * @param {number} schemeId - 方案ID
 * @param {Object} schemeData - 更新的方案数据
 * @returns {Promise<void>}
 */
function updateScheme(schemeId, schemeData) {
    const { scheme_name, thumbnail_path, layers } = schemeData;
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // 更新方案基本信息
            db.run(`
                UPDATE color_schemes 
                SET scheme_name = ?, thumbnail_path = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [scheme_name, thumbnail_path, schemeId], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                }
                
                // 删除旧的层信息
                db.run(`DELETE FROM scheme_layers WHERE scheme_id = ?`, [schemeId], (delErr) => {
                    if (delErr) {
                        db.run('ROLLBACK');
                        return reject(delErr);
                    }
                    
                    // 插入新的层信息
                    if (layers && layers.length > 0) {
                        let completed = 0;
                        layers.forEach(layer => {
                            db.run(`
                                INSERT INTO scheme_layers (scheme_id, layer_number, custom_color_id)
                                VALUES (?, ?, ?)
                            `, [schemeId, layer.layer_number, layer.custom_color_id], (layerErr) => {
                                if (layerErr) {
                                    db.run('ROLLBACK');
                                    return reject(layerErr);
                                }
                                completed++;
                                if (completed === layers.length) {
                                    db.run('COMMIT', (commitErr) => {
                                        if (commitErr) reject(commitErr);
                                        else resolve();
                                    });
                                }
                            });
                        });
                    } else {
                        db.run('COMMIT', (commitErr) => {
                            if (commitErr) reject(commitErr);
                            else resolve();
                        });
                    }
                });
            });
        });
    });
}

/**
 * 删除配色方案
 * @param {number} schemeId - 方案ID
 * @returns {Promise<number>} 影响的行数
 */
function deleteScheme(schemeId) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // 先删除层信息
            db.run(`DELETE FROM scheme_layers WHERE scheme_id = ?`, [schemeId], (err1) => {
                if (err1) {
                    db.run('ROLLBACK');
                    return reject(err1);
                }
                
                // 再删除方案
                db.run(`DELETE FROM color_schemes WHERE id = ?`, [schemeId], function(err2) {
                    if (err2) {
                        db.run('ROLLBACK');
                        return reject(err2);
                    }
                    
                    db.run('COMMIT', (commitErr) => {
                        if (commitErr) reject(commitErr);
                        else resolve(this.changes);
                    });
                });
            });
        });
    });
}

module.exports = {
    getAllArtworks,
    getArtworkById,
    createArtwork,
    updateArtwork,
    deleteArtwork,
    getArtworkSchemes,
    createScheme,
    updateScheme,
    deleteScheme
};