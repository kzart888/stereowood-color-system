/**
 * 原料业务逻辑服务
 * 职责：处理颜色原料相关的业务逻辑
 * 引用：被 routes/materials.js 使用
 * @module services/MaterialService
 */

const materialQueries = require('../db/queries/materials');
const colorQueries = require('../db/queries/colors');
const fs = require('fs').promises;
const path = require('path');

class MaterialService {
    /**
     * 获取所有原料
     */
    async getAllMaterials() {
        try {
            return await materialQueries.getAllMaterials();
        } catch (error) {
            throw new Error(`获取原料列表失败: ${error.message}`);
        }
    }

    /**
     * 创建新原料
     */
    async createMaterial(materialData) {
        try {
            // 检查名称是否已存在
            const existing = await materialQueries.getMaterialByName(materialData.name);
            if (existing) {
                throw new Error('原料名称已存在');
            }

            const materialId = await materialQueries.createMaterial(materialData);
            return await materialQueries.getMaterialById(materialId);
        } catch (error) {
            throw new Error(`创建原料失败: ${error.message}`);
        }
    }

    /**
     * 更新原料信息
     */
    async updateMaterial(id, materialData, replaceFunc) {
        try {
            // 获取旧数据
            const oldMaterial = await materialQueries.getMaterialById(id);
            if (!oldMaterial) {
                throw new Error('原料不存在');
            }

            // 检查新名称是否与其他原料冲突
            if (materialData.name !== oldMaterial.name) {
                const existing = await materialQueries.getMaterialByName(materialData.name);
                if (existing && existing.id !== id) {
                    throw new Error('新的原料名称已被使用');
                }
            }

            // 更新原料
            await materialQueries.updateMaterial(id, materialData);

            // 如果名称变更，级联更新所有配方
            if (materialData.name !== oldMaterial.name && replaceFunc) {
                const updatedCount = await colorQueries.updateFormulasWithNewName(
                    oldMaterial.name, 
                    materialData.name, 
                    replaceFunc
                );
                console.log(`级联更新了 ${updatedCount} 个配方`);
            }

            return await materialQueries.getMaterialById(id);
        } catch (error) {
            throw new Error(`更新原料失败: ${error.message}`);
        }
    }

    /**
     * 删除原料
     */
    async deleteMaterial(id) {
        try {
            const material = await materialQueries.getMaterialById(id);
            if (!material) {
                throw new Error('原料不存在');
            }

            // 删除图片文件
            if (material.image_path) {
                await this.deleteUploadedImage(material.image_path);
            }

            const changes = await materialQueries.deleteMaterial(id);
            return { success: changes > 0, deletedId: id };
        } catch (error) {
            throw new Error(`删除原料失败: ${error.message}`);
        }
    }

    /**
     * 获取所有供应商
     */
    async getAllSuppliers() {
        try {
            return await materialQueries.getAllSuppliers();
        } catch (error) {
            throw new Error(`获取供应商列表失败: ${error.message}`);
        }
    }

    /**
     * 创建供应商
     */
    async createSupplier(supplierData) {
        try {
            const supplierId = await materialQueries.createSupplier(supplierData);
            return { id: supplierId, ...supplierData };
        } catch (error) {
            if (error.message.includes('UNIQUE')) {
                throw new Error('供应商名称已存在');
            }
            throw new Error(`创建供应商失败: ${error.message}`);
        }
    }

    /**
     * 获取所有采购链接
     */
    async getAllPurchaseLinks() {
        try {
            return await materialQueries.getAllPurchaseLinks();
        } catch (error) {
            throw new Error(`获取采购链接列表失败: ${error.message}`);
        }
    }

    /**
     * 创建采购链接
     */
    async createPurchaseLink(linkData) {
        try {
            const linkId = await materialQueries.createPurchaseLink(linkData);
            return { id: linkId, ...linkData };
        } catch (error) {
            throw new Error(`创建采购链接失败: ${error.message}`);
        }
    }

    /**
     * 获取所有分类
     */
    async getAllCategories() {
        try {
            return await materialQueries.getAllCategories();
        } catch (error) {
            throw new Error(`获取分类列表失败: ${error.message}`);
        }
    }

    /**
     * 创建分类
     */
    async createCategory(categoryData) {
        try {
            const categoryId = await materialQueries.createCategory(categoryData);
            return { id: categoryId, ...categoryData };
        } catch (error) {
            if (error.message.includes('UNIQUE')) {
                throw new Error('分类编码已存在');
            }
            throw new Error(`创建分类失败: ${error.message}`);
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

module.exports = new MaterialService();