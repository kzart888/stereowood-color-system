/**
 * 原料路由模块
 * 职责：处理 /api/mont-marte-colors/*, /api/categories/*, /api/suppliers/* 等请求
 * 依赖：MaterialService, FormulaService, multer
 * @module routes/materials
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const MaterialService = require('../services/MaterialService');
const FormulaService = require('../services/FormulaService');

// 文件上传配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

/**
 * GET /api/mont-marte-colors
 * 获取所有颜色原料
 */
router.get('/mont-marte-colors', async (req, res) => {
    try {
        const materials = await MaterialService.getAllMaterials();
        res.json(materials);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/mont-marte-colors
 * 添加颜色原料
 */
router.post('/mont-marte-colors', upload.single('image'), async (req, res) => {
    try {
        const { name, supplier, purchase_link, brand, specification } = req.body;
        const image_path = req.file ? req.file.filename : null;
        
        const newMaterial = await MaterialService.createMaterial({
            name,
            image_path,
            supplier,
            purchase_link,
            brand,
            specification
        });
        
        res.json(newMaterial);
    } catch (error) {
        // 如果创建失败，删除已上传的文件
        if (req.file) {
            await MaterialService.deleteUploadedImage(req.file.filename);
        }
        
        if (error.message.includes('已存在')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * PUT /api/mont-marte-colors/:id
 * 更新颜色原料
 */
router.put('/mont-marte-colors/:id', upload.single('image'), async (req, res) => {
    try {
        const materialId = req.params.id;
        const { name, supplier, purchase_link, brand, specification, existingImagePath } = req.body;
        const newImagePath = req.file ? req.file.filename : existingImagePath;
        
        const updatedMaterial = await MaterialService.updateMaterial(
            materialId,
            {
                name,
                image_path: newImagePath,
                supplier,
                purchase_link,
                brand,
                specification
            },
            FormulaService.replaceColorNameInFormula.bind(FormulaService)
        );
        
        // 如果上传了新图片且有旧图片，删除旧图片
        if (req.file && existingImagePath && existingImagePath !== newImagePath) {
            await MaterialService.deleteUploadedImage(existingImagePath);
        }
        
        res.json(updatedMaterial);
    } catch (error) {
        // 如果更新失败，删除新上传的文件
        if (req.file) {
            await MaterialService.deleteUploadedImage(req.file.filename);
        }
        
        if (error.message.includes('不存在')) {
            res.status(404).json({ error: error.message });
        } else if (error.message.includes('已被使用')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * DELETE /api/mont-marte-colors/:id
 * 删除颜色原料
 */
router.delete('/mont-marte-colors/:id', async (req, res) => {
    try {
        const result = await MaterialService.deleteMaterial(req.params.id);
        res.json(result);
    } catch (error) {
        if (error.message.includes('不存在')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * GET /api/categories
 * 获取所有颜色分类
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = await MaterialService.getAllCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/categories
 * 添加颜色分类
 */
router.post('/categories', async (req, res) => {
    try {
        const { code, name } = req.body;
        const newCategory = await MaterialService.createCategory({ code, name });
        res.json(newCategory);
    } catch (error) {
        if (error.message.includes('已存在')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * GET /api/suppliers
 * 获取所有供应商
 */
router.get('/suppliers', async (req, res) => {
    try {
        const suppliers = await MaterialService.getAllSuppliers();
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/suppliers
 * 添加供应商
 */
router.post('/suppliers', async (req, res) => {
    try {
        const { name } = req.body;
        const newSupplier = await MaterialService.createSupplier({ name });
        res.json(newSupplier);
    } catch (error) {
        if (error.message.includes('已存在')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * GET /api/purchase-links
 * 获取所有采购链接
 */
router.get('/purchase-links', async (req, res) => {
    try {
        const links = await MaterialService.getAllPurchaseLinks();
        res.json(links);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/purchase-links
 * 添加采购链接
 */
router.post('/purchase-links', async (req, res) => {
    try {
        const { url, description } = req.body;
        const newLink = await MaterialService.createPurchaseLink({ url, description });
        res.json(newLink);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;