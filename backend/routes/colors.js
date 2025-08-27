/**
 * 自配色路由模块
 * 职责：处理 /api/custom-colors/* 相关的HTTP请求
 * 依赖：ColorService, multer
 * @module routes/colors
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ColorService = require('../services/ColorService');

// 文件上传配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

/**
 * GET /api/custom-colors
 * 获取所有自配颜色
 */
router.get('/', async (req, res) => {
    try {
        const colors = await ColorService.getAllColors();
        res.json(colors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/custom-colors/:id
 * 获取单个自配颜色
 */
router.get('/:id', async (req, res) => {
    try {
        const color = await ColorService.getColorById(req.params.id);
        res.json(color);
    } catch (error) {
        if (error.message.includes('不存在')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * POST /api/custom-colors
 * 添加自配颜色
 */
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { category_id, color_code, formula, applicable_layers } = req.body;
        const image_path = req.file ? req.file.filename : null;
        
        const newColor = await ColorService.createColor({
            category_id,
            color_code,
            image_path,
            formula,
            applicable_layers
        });
        
        res.json(newColor);
    } catch (error) {
        // 如果创建失败，删除已上传的文件
        if (req.file) {
            await ColorService.deleteUploadedImage(req.file.filename);
        }
        
        if (error.message.includes('已存在')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * PUT /api/custom-colors/:id
 * 更新自配颜色
 */
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const colorId = req.params.id;
        const { category_id, color_code, formula, applicable_layers, existingImagePath } = req.body;
        const newImagePath = req.file ? req.file.filename : existingImagePath;
        
        const updatedColor = await ColorService.updateColor(colorId, {
            category_id,
            color_code,
            image_path: newImagePath,
            formula,
            applicable_layers
        });
        
        // 如果上传了新图片且有旧图片，删除旧图片
        if (req.file && existingImagePath && existingImagePath !== newImagePath) {
            await ColorService.deleteUploadedImage(existingImagePath);
        }
        
        res.json(updatedColor);
    } catch (error) {
        // 如果更新失败，删除新上传的文件
        if (req.file) {
            await ColorService.deleteUploadedImage(req.file.filename);
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
 * DELETE /api/custom-colors/:id
 * 删除自配颜色
 */
router.delete('/:id', async (req, res) => {
    try {
        const result = await ColorService.deleteColor(req.params.id);
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
 * GET /api/custom-colors/:id/history
 * 获取自配颜色历史记录
 */
router.get('/:id/history', async (req, res) => {
    try {
        const history = await ColorService.getColorHistory(req.params.id);
        res.json(history);
    } catch (error) {
        if (error.message.includes('不存在')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

module.exports = router;