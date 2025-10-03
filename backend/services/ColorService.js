/**
 * 颜色业务逻辑服务
 * 职责：处理自配色相关的业务逻辑，协调数据库操作
 * 引用：被 routes/colors.js 使用
 * @module services/ColorService
 */

const colorQueries = require('../db/queries/colors');
const fs = require('fs').promises;
const path = require('path');

class ColorService {
    /**
     * 验证RGB值
     */
    validateRGB(r, g, b) {
        if (r !== null && r !== undefined) {
            if (!Number.isInteger(r) || r < 0 || r > 255) {
                throw new Error(`RGB R值必须在0-255之间: ${r}`);
            }
        }
        if (g !== null && g !== undefined) {
            if (!Number.isInteger(g) || g < 0 || g > 255) {
                throw new Error(`RGB G值必须在0-255之间: ${g}`);
            }
        }
        if (b !== null && b !== undefined) {
            if (!Number.isInteger(b) || b < 0 || b > 255) {
                throw new Error(`RGB B值必须在0-255之间: ${b}`);
            }
        }
    }

    /**
     * 验证CMYK值
     */
    validateCMYK(c, m, y, k) {
        const validateValue = (value, name) => {
            if (value !== null && value !== undefined) {
                if (typeof value !== 'number' || value < 0 || value > 100) {
                    throw new Error(`CMYK ${name}值必须在0-100之间: ${value}`);
                }
            }
        };
        validateValue(c, 'C');
        validateValue(m, 'M');
        validateValue(y, 'Y');
        validateValue(k, 'K');
    }

    /**
     * 验证HEX颜色格式
     */
    validateHEX(hex) {
        if (hex !== null && hex !== undefined && hex !== '') {
            const hexPattern = /^#?[0-9A-Fa-f]{6}$/;
            if (!hexPattern.test(hex)) {
                throw new Error(`HEX颜色格式不正确: ${hex}`);
            }
        }
    }

    /**
     * 验证颜色数据
     */
    validateColorData(colorData) {
        // 验证RGB
        if ('rgb_r' in colorData || 'rgb_g' in colorData || 'rgb_b' in colorData) {
            this.validateRGB(colorData.rgb_r, colorData.rgb_g, colorData.rgb_b);
        }
        
        // 验证CMYK
        if ('cmyk_c' in colorData || 'cmyk_m' in colorData || 
            'cmyk_y' in colorData || 'cmyk_k' in colorData) {
            this.validateCMYK(colorData.cmyk_c, colorData.cmyk_m, 
                            colorData.cmyk_y, colorData.cmyk_k);
        }
        
        // 验证HEX
        if ('hex_color' in colorData) {
            this.validateHEX(colorData.hex_color);
        }
        if ('pure_rgb_r' in colorData || 'pure_rgb_g' in colorData || 'pure_rgb_b' in colorData) {
            this.validateRGB(colorData.pure_rgb_r, colorData.pure_rgb_g, colorData.pure_rgb_b);
        }

        if ('pure_hex_color' in colorData) {
            this.validateHEX(colorData.pure_hex_color);
        }
    }

    /**
     * 获取所有颜色
     */
    normalizePureColorPayload(colorData) {
        if (!colorData) {
            return;
        }

        if (colorData.clear_pure_color) {
            colorData.pure_rgb_r = null;
            colorData.pure_rgb_g = null;
            colorData.pure_rgb_b = null;
            colorData.pure_hex_color = null;
            colorData.pure_generated_at = null;
            delete colorData.clear_pure_color;
            return;
        }

        const hasPureField = ['pure_rgb_r','pure_rgb_g','pure_rgb_b','pure_hex_color'].some(key => key in colorData);
        const hasTimestampField = 'pure_generated_at' in colorData;
        if (!hasPureField && !hasTimestampField) {
            return;
        }

        if (!('pure_rgb_r' in colorData)) colorData.pure_rgb_r = null;
        if (!('pure_rgb_g' in colorData)) colorData.pure_rgb_g = null;
        if (!('pure_rgb_b' in colorData)) colorData.pure_rgb_b = null;
        if (!('pure_hex_color' in colorData)) colorData.pure_hex_color = null;

        const hasColor = (colorData.pure_hex_color && colorData.pure_hex_color !== '') ||
            [colorData.pure_rgb_r, colorData.pure_rgb_g, colorData.pure_rgb_b].some(v => v !== null && v !== undefined);

        if (hasColor) {
            colorData.pure_generated_at = colorData.pure_generated_at || new Date().toISOString();
        } else if (!hasTimestampField) {
            colorData.pure_generated_at = null;
        }
    }

    async getAllColors() {
        try {
            return await colorQueries.getAllColors();
        } catch (error) {
            throw new Error(`获取颜色列表失败: ${error.message}`);
        }
    }

    /**
     * 获取单个颜色
     */
    async getColorById(id) {
        try {
            const color = await colorQueries.getColorById(id);
            if (!color) {
                throw new Error('颜色不存在');
            }
            return color;
        } catch (error) {
            throw new Error(`获取颜色失败: ${error.message}`);
        }
    }

    /**
     * 创建新颜色
     */
    async createColor(colorData) {
        try {
            // 验证颜色数据
            this.validateColorData(colorData);
            this.normalizePureColorPayload(colorData);
            
            // 检查颜色编码是否已存在
            const existing = await colorQueries.getColorByCode(colorData.color_code);
            if (existing) {
                throw new Error('颜色编码已存在');
            }

            // 创建颜色
            const colorId = await colorQueries.createColor(colorData);
            return await colorQueries.getColorById(colorId);
        } catch (error) {
            throw new Error(`创建颜色失败: ${error.message}`);
        }
    }

    /**
     * 更新颜色
     */
    async updateColor(id, colorData) {
        try {
            // 验证颜色数据
            this.validateColorData(colorData);
            this.normalizePureColorPayload(colorData);
            
            // 检查颜色是否存在
            const existing = await colorQueries.getColorById(id);
            if (!existing) {
                throw new Error('颜色不存在');
            }

            // 如果更改了颜色编码，检查新编码是否已被使用
            if (colorData.color_code && colorData.color_code !== existing.color_code) {
                const codeExists = await colorQueries.getColorByCode(colorData.color_code);
                if (codeExists) {
                    throw new Error('新的颜色编码已被使用');
                }
            }

            // 如果有旧数据且发生了实质性变化，先归档历史
            if (existing.formula !== colorData.formula || 
                existing.color_code !== colorData.color_code ||
                existing.applicable_layers !== colorData.applicable_layers) {
                
                await colorQueries.archiveColorHistory(id, existing);
            }

            // 更新颜色
            await colorQueries.updateColor(id, colorData);
            return await colorQueries.getColorById(id);
        } catch (error) {
            throw new Error(`更新颜色失败: ${error.message}`);
        }
    }

    /**
     * 删除颜色
     */
    async deleteColor(id) {
        try {
            // 检查颜色是否存在
            const color = await colorQueries.getColorById(id);
            if (!color) {
                throw new Error('颜色不存在');
            }

            // 删除关联的图片文件
            if (color.image_path) {
                try {
                    const imagePath = path.join(__dirname, '..', 'uploads', path.basename(color.image_path));
                    await fs.unlink(imagePath);
                } catch (err) {
                    console.warn('删除图片文件失败:', err.message);
                }
            }

            // 删除颜色记录
            const changes = await colorQueries.deleteColor(id);
            return { success: changes > 0, deletedId: id };
        } catch (error) {
            throw new Error(`删除颜色失败: ${error.message}`);
        }
    }

    /**
     * 获取颜色历史记录
     */
    async getColorHistory(colorId) {
        try {
            const color = await colorQueries.getColorById(colorId);
            if (!color) {
                throw new Error('颜色不存在');
            }

            const history = await colorQueries.getColorHistory(colorId);
            return {
                current: color,
                history: history
            };
        } catch (error) {
            throw new Error(`获取历史记录失败: ${error.message}`);
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

    /**
     * 强制合并重复颜色（更新引用）
     */
    async forceMerge({ keepId, removeIds, signature }) {
        const { db } = require('../db');
        
        if (!keepId || !Array.isArray(removeIds) || !removeIds.length) {
            throw new Error('合并参数不完整');
        }

        // 验证要保留的记录存在
        const keepRow = await colorQueries.getColorById(keepId);
        if (!keepRow) {
            throw new Error('保留记录不存在');
        }

        // 验证要删除的记录都存在
        const placeholders = removeIds.map(() => '?').join(',');
        const remRows = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM custom_colors WHERE id IN (${placeholders})`, removeIds, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!remRows || remRows.length !== removeIds.length) {
            throw new Error('部分 removeIds 不存在');
        }

        // 如果提供了签名，验证配方签名一致性
        if (signature) {
            // 这里可以添加签名验证逻辑
            // 暂时跳过复杂的签名验证
        }

        // 执行事务：更新引用，保存历史，删除记录
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN');
                
                // 1. 更新 scheme_layers 中的引用
                db.run(`UPDATE scheme_layers SET custom_color_id = ? WHERE custom_color_id IN (${placeholders})`, 
                    [keepId, ...removeIds], 
                    function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(new Error(`更新引用失败: ${err.message}`));
                            return;
                        }
                        
                        const updatedLayers = this.changes;
                        
                        // 2. 保存删除记录到历史表
                        const hist = db.prepare(`INSERT INTO custom_colors_history 
                            (custom_color_id, color_code, image_path, formula, applicable_layers, 
                             rgb_r, rgb_g, rgb_b, cmyk_c, cmyk_m, cmyk_y, cmyk_k, 
                             hex_color, pantone_coated, pantone_uncoated) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                        
                        remRows.forEach(r => {
                            hist.run([
                                r.id, r.color_code, r.image_path, r.formula, r.applicable_layers,
                                r.rgb_r, r.rgb_g, r.rgb_b, r.cmyk_c, r.cmyk_m, r.cmyk_y, r.cmyk_k,
                                r.hex_color, r.pantone_coated, r.pantone_uncoated
                            ]);
                        });
                        
                        hist.finalize(err => {
                            if (err) {
                                db.run('ROLLBACK');
                                reject(new Error(`保存历史失败: ${err.message}`));
                                return;
                            }
                            
                            // 3. 删除重复记录
                            db.run(`DELETE FROM custom_colors WHERE id IN (${placeholders})`, 
                                removeIds, 
                                function(err) {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        reject(new Error(`删除记录失败: ${err.message}`));
                                        return;
                                    }
                                    
                                    // 4. 更新相关配色方案的更新时间
                                    db.run(`UPDATE color_schemes SET updated_at = CURRENT_TIMESTAMP 
                                        WHERE id IN (SELECT DISTINCT scheme_id FROM scheme_layers WHERE custom_color_id = ?)`, 
                                        [keepId], 
                                        err => {
                                            if (err) {
                                                db.run('ROLLBACK');
                                                reject(new Error(`更新方案时间失败: ${err.message}`));
                                                return;
                                            }
                                            
                                            // 5. 提交事务
                                            db.run('COMMIT', err => {
                                                if (err) {
                                                    reject(new Error(`提交事务失败: ${err.message}`));
                                                } else {
                                                    resolve({
                                                        success: true,
                                                        updatedLayers: updatedLayers,
                                                        deleted: removeIds.length
                                                    });
                                                }
                                            });
                                        }
                                    );
                                }
                            );
                        });
                    }
                );
            });
        });
    }
}

module.exports = new ColorService();