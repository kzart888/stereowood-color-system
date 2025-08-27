/**
 * 原料相关数据库查询模块
 * 职责：封装所有与颜色原料相关的数据库操作
 * 引用：被 services/MaterialService.js 和 routes/materials.js 使用
 * @module db/queries/materials
 */

const { db } = require('../index');

/**
 * 获取所有颜色原料
 * @returns {Promise<Array>} 原料列表
 */
function getAllMaterials() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT * FROM mont_marte_colors 
            ORDER BY created_at DESC
        `, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * 根据ID获取原料
 * @param {number} id - 原料ID
 * @returns {Promise<Object>} 原料对象
 */
function getMaterialById(id) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT * FROM mont_marte_colors WHERE id = ?
        `, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * 根据名称获取原料
 * @param {string} name - 原料名称
 * @returns {Promise<Object>} 原料对象
 */
function getMaterialByName(name) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT * FROM mont_marte_colors WHERE name = ?
        `, [name], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * 创建新原料
 * @param {Object} materialData - 原料数据
 * @returns {Promise<number>} 新创建的原料ID
 */
function createMaterial(materialData) {
    const { name, image_path, supplier, purchase_link, brand, specification } = materialData;
    
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO mont_marte_colors (name, image_path, supplier, purchase_link, brand, specification)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [name, image_path, supplier, purchase_link, brand, specification], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

/**
 * 更新原料信息
 * @param {number} id - 原料ID
 * @param {Object} materialData - 更新的原料数据
 * @returns {Promise<number>} 影响的行数
 */
function updateMaterial(id, materialData) {
    const { name, image_path, supplier, purchase_link, brand, specification } = materialData;
    
    return new Promise((resolve, reject) => {
        db.run(`
            UPDATE mont_marte_colors 
            SET name = ?, image_path = ?, supplier = ?, purchase_link = ?, 
                brand = ?, specification = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, image_path, supplier, purchase_link, brand, specification, id], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

/**
 * 删除原料
 * @param {number} id - 原料ID
 * @returns {Promise<number>} 影响的行数
 */
function deleteMaterial(id) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM mont_marte_colors WHERE id = ?`, [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

/**
 * 获取所有供应商
 * @returns {Promise<Array>} 供应商列表
 */
function getAllSuppliers() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT * FROM suppliers 
            ORDER BY created_at DESC
        `, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * 创建供应商
 * @param {Object} supplierData - 供应商数据
 * @returns {Promise<number>} 新创建的供应商ID
 */
function createSupplier(supplierData) {
    const { name } = supplierData;
    
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO suppliers (name) VALUES (?)
        `, [name], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

/**
 * 获取所有采购链接
 * @returns {Promise<Array>} 采购链接列表
 */
function getAllPurchaseLinks() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT * FROM purchase_links 
            ORDER BY created_at DESC
        `, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * 创建采购链接
 * @param {Object} linkData - 链接数据
 * @returns {Promise<number>} 新创建的链接ID
 */
function createPurchaseLink(linkData) {
    const { url, description } = linkData;
    
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO purchase_links (url, description) VALUES (?, ?)
        `, [url, description], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

/**
 * 获取所有分类
 * @returns {Promise<Array>} 分类列表
 */
function getAllCategories() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT * FROM color_categories 
            ORDER BY code
        `, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * 创建颜色分类
 * @param {Object} categoryData - 分类数据
 * @returns {Promise<number>} 新创建的分类ID
 */
function createCategory(categoryData) {
    const { code, name } = categoryData;
    
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO color_categories (code, name) VALUES (?, ?)
        `, [code, name], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

module.exports = {
    getAllMaterials,
    getMaterialById,
    getMaterialByName,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    getAllSuppliers,
    createSupplier,
    getAllPurchaseLinks,
    createPurchaseLink,
    getAllCategories,
    createCategory
};