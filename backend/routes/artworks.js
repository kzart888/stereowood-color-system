/**
 * 作品路由模块
 * 职责：处理 /api/artworks/* 相关的HTTP请求
 * 依赖：ArtworkService, multer
 * @module routes/artworks
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ArtworkService = require('../services/ArtworkService');

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
 * GET /api/artworks
 * 获取所有作品及其配色方案
 */
router.get('/', async (req, res) => {
    try {
        const artworks = await ArtworkService.getAllArtworks();
        res.json(artworks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/artworks
 * 创建新作品
 */
router.post('/', async (req, res) => {
    try {
        const { code, name } = req.body;
        const newArtwork = await ArtworkService.createArtwork({ code, name });
        res.json(newArtwork);
    } catch (error) {
        if (error.message.includes('已存在')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * DELETE /api/artworks/:id
 * 删除作品
 */
router.delete('/:id', async (req, res) => {
    try {
        const result = await ArtworkService.deleteArtwork(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/artworks/:artworkId/schemes
 * 为作品创建配色方案
 */
router.post('/:artworkId/schemes', upload.single('thumbnail'), async (req, res) => {
    try {
        const { artworkId } = req.params;
        const { scheme_name, layers } = req.body;
        const thumbnail_path = req.file ? req.file.filename : null;
        
        // 解析layers（前端可能传递JSON字符串）
        let parsedLayers = [];
        if (layers) {
            try {
                parsedLayers = typeof layers === 'string' ? JSON.parse(layers) : layers;
            } catch (e) {
                throw new Error('层信息格式错误');
            }
        }
        
        const newScheme = await ArtworkService.createScheme({
            artwork_id: artworkId,
            scheme_name,
            thumbnail_path,
            layers: parsedLayers
        });
        
        res.json(newScheme);
    } catch (error) {
        // 如果创建失败，删除已上传的文件
        if (req.file) {
            await ArtworkService.deleteUploadedImage(req.file.filename);
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/artworks/:artworkId/schemes/:schemeId
 * 更新配色方案
 */
router.put('/:artworkId/schemes/:schemeId', upload.single('thumbnail'), async (req, res) => {
    try {
        const { schemeId } = req.params;
        const { scheme_name, layers, existingThumbnailPath } = req.body;
        const newThumbnailPath = req.file ? req.file.filename : existingThumbnailPath;
        
        // 解析layers
        let parsedLayers = [];
        if (layers) {
            try {
                parsedLayers = typeof layers === 'string' ? JSON.parse(layers) : layers;
            } catch (e) {
                throw new Error('层信息格式错误');
            }
        }
        
        await ArtworkService.updateScheme(schemeId, {
            scheme_name,
            thumbnail_path: newThumbnailPath,
            layers: parsedLayers
        });
        
        // 如果上传了新图片且有旧图片，删除旧图片
        if (req.file && existingThumbnailPath && existingThumbnailPath !== newThumbnailPath) {
            await ArtworkService.deleteUploadedImage(existingThumbnailPath);
        }
        
        res.json({ success: true });
    } catch (error) {
        // 如果更新失败，删除新上传的文件
        if (req.file) {
            await ArtworkService.deleteUploadedImage(req.file.filename);
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/artworks/:artworkId/schemes/:schemeId
 * 删除配色方案
 */
router.delete('/:artworkId/schemes/:schemeId', async (req, res) => {
    try {
        const result = await ArtworkService.deleteScheme(req.params.schemeId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;