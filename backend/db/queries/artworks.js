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
                   cs.id as scheme_id, cs.scheme_name, cs.thumbnail_path, cs.initial_thumbnail_path,
                   cs.version as scheme_version,
                   cs.created_at as scheme_created_at, cs.updated_at as scheme_updated_at,
                   sl.layer_number, sl.custom_color_id, sl.manual_formula,
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
                   sl.layer_number, sl.custom_color_id, sl.manual_formula,
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
 * Get a single scheme by id
 * @param {number} schemeId - Scheme ID
 * @returns {Promise<Object|null>}
 */
function getSchemeById(schemeId) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT id, artwork_id, scheme_name, thumbnail_path, initial_thumbnail_path
            FROM color_schemes
            WHERE id = ?
        `, [schemeId], (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
}

function getSchemeWithLayers(schemeId) {
    return new Promise((resolve, reject) => {
        db.all(
            `
            SELECT
                cs.id,
                cs.artwork_id,
                cs.scheme_name,
                cs.thumbnail_path,
                cs.initial_thumbnail_path,
                cs.version,
                sl.layer_number,
                sl.custom_color_id,
                sl.manual_formula,
                cc.color_code
            FROM color_schemes cs
            LEFT JOIN scheme_layers sl ON sl.scheme_id = cs.id
            LEFT JOIN custom_colors cc ON cc.id = sl.custom_color_id
            WHERE cs.id = ?
            ORDER BY sl.layer_number ASC
            `,
            [schemeId],
            (err, rows) => {
                if (err) return reject(err);
                if (!rows || rows.length === 0) return resolve(null);

                const head = rows[0];
                const layers = rows
                    .filter((row) => row.layer_number !== null && row.layer_number !== undefined)
                    .map((row) => ({
                        layer_number: row.layer_number,
                        custom_color_id: row.custom_color_id ?? null,
                        color_code: row.color_code ?? null,
                        manual_formula: row.manual_formula ?? null,
                    }));

                resolve({
                    id: head.id,
                    artwork_id: head.artwork_id,
                    scheme_name: head.scheme_name,
                    thumbnail_path: head.thumbnail_path,
                    initial_thumbnail_path: head.initial_thumbnail_path,
                    version: head.version ?? null,
                    layers,
                });
            }
        );
    });
}

function archiveSchemeHistory(schemeData, metadata = {}) {
    if (!schemeData || !schemeData.id) {
        return Promise.resolve(null);
    }

    const layersData = JSON.stringify(schemeData.layers || []);
    return new Promise((resolve, reject) => {
        db.run(
            `
            INSERT INTO color_schemes_history (
                scheme_id,
                scheme_name,
                thumbnail_path,
                layers_data,
                change_action,
                actor_id,
                actor_name,
                request_id,
                source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                schemeData.id,
                schemeData.scheme_name,
                schemeData.thumbnail_path,
                layersData,
                metadata.changeAction || 'UPDATE',
                metadata.actorId || null,
                metadata.actorName || null,
                metadata.requestId || null,
                metadata.source || 'api',
            ],
            function onArchive(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

/**
 * 创建配色方案
 * @param {Object} schemeData - 方案数据
 * @returns {Promise<number>} 新创建的方案ID
 */
function createScheme(schemeData) {
    const { artwork_id, scheme_name, thumbnail_path, initial_thumbnail_path, layers } = schemeData;
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            db.run(`
                INSERT INTO color_schemes (artwork_id, scheme_name, thumbnail_path, initial_thumbnail_path)
                VALUES (?, ?, ?, ?)
            `, [artwork_id, scheme_name, thumbnail_path, initial_thumbnail_path], function(err) {
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
                            INSERT INTO scheme_layers (scheme_id, layer_number, custom_color_id, manual_formula)
                            VALUES (?, ?, ?, ?)
                        `, [schemeId, layer.layer_number, layer.custom_color_id ?? null, layer.manual_formula ?? null], (layerErr) => {
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
 * @returns {Promise<number>}
 */
function updateScheme(schemeId, schemeData, expectedVersion = null) {
    const { scheme_name, thumbnail_path, initial_thumbnail_path, layers } = schemeData;
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // 更新方案基本信息
            db.run(`
                UPDATE color_schemes 
                SET scheme_name = ?, thumbnail_path = ?, initial_thumbnail_path = ?,
                    version = version + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND (? IS NULL OR version = ?)
            `, [scheme_name, thumbnail_path, initial_thumbnail_path, schemeId, expectedVersion, expectedVersion], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                }
                if (this.changes === 0) {
                    db.run('ROLLBACK');
                    return resolve(0);
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
                                INSERT INTO scheme_layers (scheme_id, layer_number, custom_color_id, manual_formula)
                                VALUES (?, ?, ?, ?)
                            `, [schemeId, layer.layer_number, layer.custom_color_id ?? null, layer.manual_formula ?? null], (layerErr) => {
                                if (layerErr) {
                                    db.run('ROLLBACK');
                                    return reject(layerErr);
                                }
                                completed++;
                                if (completed === layers.length) {
                                    db.run('COMMIT', (commitErr) => {
                                        if (commitErr) reject(commitErr);
                                        else resolve(1);
                                    });
                                }
                            });
                        });
                    } else {
                        db.run('COMMIT', (commitErr) => {
                            if (commitErr) reject(commitErr);
                            else resolve(1);
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

function getSchemeAssets(schemeId) {
    return new Promise((resolve, reject) => {
        db.all(
            `
            SELECT
                id,
                scheme_id,
                asset_type,
                original_name,
                file_path,
                mime_type,
                file_size,
                source_modified_at,
                sort_order,
                created_at,
                updated_at
            FROM color_scheme_assets
            WHERE scheme_id = ?
            ORDER BY sort_order ASC, id ASC
            `,
            [schemeId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            }
        );
    });
}

function getSchemeAssetsForSchemeIds(schemeIds = []) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(schemeIds) || schemeIds.length === 0) {
            return resolve([]);
        }
        const placeholders = schemeIds.map(() => '?').join(',');
        db.all(
            `
            SELECT
                id,
                scheme_id,
                asset_type,
                original_name,
                file_path,
                mime_type,
                file_size,
                source_modified_at,
                sort_order,
                created_at,
                updated_at
            FROM color_scheme_assets
            WHERE scheme_id IN (${placeholders})
            ORDER BY scheme_id ASC, sort_order ASC, id ASC
            `,
            schemeIds,
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            }
        );
    });
}

function countSchemeAssets(schemeId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT COUNT(*) AS count FROM color_scheme_assets WHERE scheme_id = ?`,
            [schemeId],
            (err, row) => {
                if (err) reject(err);
                else resolve((row && row.count) || 0);
            }
        );
    });
}

function createSchemeAsset(assetData) {
    const {
        scheme_id,
        asset_type,
        original_name,
        file_path,
        mime_type,
        file_size,
        source_modified_at,
        sort_order,
    } = assetData;

    return new Promise((resolve, reject) => {
        db.run(
            `
            INSERT INTO color_scheme_assets (
                scheme_id,
                asset_type,
                original_name,
                file_path,
                mime_type,
                file_size,
                source_modified_at,
                sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                scheme_id,
                asset_type,
                original_name,
                file_path,
                mime_type,
                file_size,
                source_modified_at || null,
                sort_order,
            ],
            function onInsert(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

function getSchemeAssetById(assetId) {
    return new Promise((resolve, reject) => {
        db.get(
            `
            SELECT
                id,
                scheme_id,
                asset_type,
                original_name,
                file_path,
                mime_type,
                file_size,
                source_modified_at,
                sort_order,
                created_at,
                updated_at
            FROM color_scheme_assets
            WHERE id = ?
            `,
            [assetId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            }
        );
    });
}

function deleteSchemeAsset(assetId, schemeId = null) {
    return new Promise((resolve, reject) => {
        const params = [assetId];
        let sql = `DELETE FROM color_scheme_assets WHERE id = ?`;
        if (schemeId !== null && schemeId !== undefined) {
            sql += ` AND scheme_id = ?`;
            params.push(schemeId);
        }
        db.run(sql, params, function onDelete(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

function reorderSchemeAssets(schemeId, updates = []) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            let completed = 0;
            let failed = false;

            if (!Array.isArray(updates) || updates.length === 0) {
                db.run('COMMIT', (commitErr) => {
                    if (commitErr) reject(commitErr);
                    else resolve(0);
                });
                return;
            }

            updates.forEach((item) => {
                db.run(
                    `
                    UPDATE color_scheme_assets
                    SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND scheme_id = ?
                    `,
                    [item.sort_order, item.id, schemeId],
                    function onUpdate(err) {
                        if (failed) return;
                        if (err) {
                            failed = true;
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        completed += 1;
                        if (completed === updates.length) {
                            db.run('COMMIT', (commitErr) => {
                                if (commitErr) reject(commitErr);
                                else resolve(completed);
                            });
                        }
                    }
                );
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
    getSchemeById,
    getSchemeWithLayers,
    archiveSchemeHistory,
    createScheme,
    updateScheme,
    deleteScheme,
    getSchemeAssets,
    getSchemeAssetsForSchemeIds,
    countSchemeAssets,
    createSchemeAsset,
    getSchemeAssetById,
    deleteSchemeAsset,
    reorderSchemeAssets
};
