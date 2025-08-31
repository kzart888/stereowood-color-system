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
    }

    /**
     * 获取所有颜色
     */
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
}

module.exports = new ColorService();