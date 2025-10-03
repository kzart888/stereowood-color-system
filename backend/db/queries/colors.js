/**
 * 颜色相关数据库查询模块
 * 职责：封装所有与自配色相关的数据库操作
 * 引用：被 services/ColorService.js 和 routes/colors.js 使用
 * @module db/queries/colors
 */

const { db } = require('../index');

/**
 * 获取所有自配颜色
 * @returns {Promise<Array>} 颜色列表
 */
function getAllColors() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT c.*, cat.name as category_name, cat.code as category_code 
            FROM custom_colors c
            LEFT JOIN color_categories cat ON c.category_id = cat.id
            ORDER BY c.created_at DESC
        `, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * 根据ID获取颜色
 * @param {number} id - 颜色ID
 * @returns {Promise<Object>} 颜色对象
 */
function getColorById(id) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT c.*, cat.name as category_name, cat.code as category_code 
            FROM custom_colors c
            LEFT JOIN color_categories cat ON c.category_id = cat.id
            WHERE c.id = ?
        `, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * 根据颜色编码获取颜色
 * @param {string} colorCode - 颜色编码
 * @returns {Promise<Object>} 颜色对象
 */
function getColorByCode(colorCode) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT c.*, cat.name as category_name, cat.code as category_code 
            FROM custom_colors c
            LEFT JOIN color_categories cat ON c.category_id = cat.id
            WHERE c.color_code = ?
        `, [colorCode], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * 创建新的自配颜色
 * @param {Object} colorData - 颜色数据
 * @returns {Promise<number>} 新创建的颜色ID
 */
function createColor(colorData) {
    const { 
        category_id, color_code, image_path, formula, applicable_layers,
        rgb_r, rgb_g, rgb_b,
        cmyk_c, cmyk_m, cmyk_y, cmyk_k,
        hex_color, pantone_coated, pantone_uncoated,
        pure_rgb_r, pure_rgb_g, pure_rgb_b, pure_hex_color, pure_generated_at
    } = colorData;
    
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO custom_colors (
                category_id, color_code, image_path, formula, applicable_layers,
                rgb_r, rgb_g, rgb_b,
                cmyk_c, cmyk_m, cmyk_y, cmyk_k,
                hex_color, pantone_coated, pantone_uncoated,
                pure_rgb_r, pure_rgb_g, pure_rgb_b, pure_hex_color, pure_generated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            category_id, color_code, image_path, formula, applicable_layers,
            rgb_r, rgb_g, rgb_b,
            cmyk_c, cmyk_m, cmyk_y, cmyk_k,
            hex_color, pantone_coated, pantone_uncoated,
            pure_rgb_r, pure_rgb_g, pure_rgb_b, pure_hex_color, pure_generated_at
        ], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

/**
 * 更新自配颜色
 * @param {number} id - 颜色ID
 * @param {Object} colorData - 更新的颜色数据
 * @returns {Promise<number>} 影响的行数
 */
function updateColor(id, colorData) {
    return new Promise((resolve, reject) => {
        // 动态构建UPDATE语句，只更新提供的字段
        const updates = [];
        const values = [];
        
        if (colorData.category_id !== undefined) {
            updates.push('category_id = ?');
            values.push(colorData.category_id);
        }
        if (colorData.color_code !== undefined) {
            updates.push('color_code = ?');
            values.push(colorData.color_code);
        }
        if (colorData.image_path !== undefined) {
            updates.push('image_path = ?');
            values.push(colorData.image_path);
        }
        if (colorData.formula !== undefined) {
            updates.push('formula = ?');
            values.push(colorData.formula);
        }
        if (colorData.applicable_layers !== undefined) {
            updates.push('applicable_layers = ?');
            values.push(colorData.applicable_layers);
        }
        
        // New color fields
        if (colorData.rgb_r !== undefined) {
            updates.push('rgb_r = ?');
            values.push(colorData.rgb_r);
        }
        if (colorData.rgb_g !== undefined) {
            updates.push('rgb_g = ?');
            values.push(colorData.rgb_g);
        }
        if (colorData.rgb_b !== undefined) {
            updates.push('rgb_b = ?');
            values.push(colorData.rgb_b);
        }
        if (colorData.cmyk_c !== undefined) {
            updates.push('cmyk_c = ?');
            values.push(colorData.cmyk_c);
        }
        if (colorData.cmyk_m !== undefined) {
            updates.push('cmyk_m = ?');
            values.push(colorData.cmyk_m);
        }
        if (colorData.cmyk_y !== undefined) {
            updates.push('cmyk_y = ?');
            values.push(colorData.cmyk_y);
        }
        if (colorData.cmyk_k !== undefined) {
            updates.push('cmyk_k = ?');
            values.push(colorData.cmyk_k);
        }
        if (colorData.hex_color !== undefined) {
            updates.push('hex_color = ?');
            values.push(colorData.hex_color);
        }
        if (colorData.pantone_coated !== undefined) {
            updates.push('pantone_coated = ?');
            values.push(colorData.pantone_coated);
        }
        if (colorData.pantone_uncoated !== undefined) {
            updates.push('pantone_uncoated = ?');
            values.push(colorData.pantone_uncoated);
        }
        if (colorData.pure_rgb_r !== undefined) {
            updates.push('pure_rgb_r = ?');
            values.push(colorData.pure_rgb_r);
        }
        if (colorData.pure_rgb_g !== undefined) {
            updates.push('pure_rgb_g = ?');
            values.push(colorData.pure_rgb_g);
        }
        if (colorData.pure_rgb_b !== undefined) {
            updates.push('pure_rgb_b = ?');
            values.push(colorData.pure_rgb_b);
        }
        if (colorData.pure_hex_color !== undefined) {
            updates.push('pure_hex_color = ?');
            values.push(colorData.pure_hex_color);
        }
        if (colorData.pure_generated_at !== undefined) {
            updates.push('pure_generated_at = ?');
            values.push(colorData.pure_generated_at);
        }
        
        // 总是更新updated_at
        updates.push('updated_at = CURRENT_TIMESTAMP');
        
        // 添加WHERE条件的id
        values.push(id);
        
        const sql = `UPDATE custom_colors SET ${updates.join(', ')} WHERE id = ?`;
        
        db.run(sql, values, function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

/**
 * 删除自配颜色
 * @param {number} id - 颜色ID
 * @returns {Promise<number>} 影响的行数
 */
function deleteColor(id) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM custom_colors WHERE id = ?`, [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

/**
 * 归档颜色到历史记录
 * @param {number} colorId - 颜色ID
 * @param {Object} colorData - 颜色数据
 * @returns {Promise<number>} 新创建的历史记录ID
 */
function archiveColorHistory(colorId, colorData) {
    const { color_code, image_path, formula, applicable_layers } = colorData;
    
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO custom_colors_history 
            (custom_color_id, color_code, image_path, formula, applicable_layers,
            pure_rgb_r, pure_rgb_g, pure_rgb_b, pure_hex_color)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [colorId, color_code, image_path, formula, applicable_layers, colorData.pure_rgb_r ?? null, colorData.pure_rgb_g ?? null, colorData.pure_rgb_b ?? null, colorData.pure_hex_color ?? null], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

/**
 * 获取颜色的历史记录
 * @param {number} colorId - 颜色ID
 * @returns {Promise<Array>} 历史记录列表
 */
function getColorHistory(colorId) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT * FROM custom_colors_history 
            WHERE custom_color_id = ?
            ORDER BY archived_at DESC
        `, [colorId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * 批量更新配方中的颜色名称
 * @param {string} oldName - 旧颜色名称
 * @param {string} newName - 新颜色名称
 * @param {Function} replaceFunc - 替换函数
 * @returns {Promise<number>} 更新的记录数
 */
function updateFormulasWithNewName(oldName, newName, replaceFunc) {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, formula FROM custom_colors', [], (err, rows) => {
            if (err) return reject(err);

            let updatedCount = 0;
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                rows.forEach(row => {
                    const newFormula = replaceFunc(row.formula, oldName, newName);
                    if (newFormula !== row.formula) {
                        updatedCount++;
                        db.run(
                            `UPDATE custom_colors 
                               SET formula = ?, updated_at = CURRENT_TIMESTAMP 
                             WHERE id = ?`,
                            [newFormula, row.id]
                        );
                    }
                });
                db.run('COMMIT', (commitErr) => {
                    if (commitErr) return reject(commitErr);
                    resolve(updatedCount);
                });
            });
        });
    });
}

module.exports = {
    getAllColors,
    getColorById,
    getColorByCode,
    createColor,
    updateColor,
    deleteColor,
    archiveColorHistory,
    getColorHistory,
    updateFormulasWithNewName
};