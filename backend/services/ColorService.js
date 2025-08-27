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