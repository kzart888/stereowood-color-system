/**
 * 作品路由模块
 * 职责：处理 /api/artworks/* 相关的HTTP请求
 * 依赖：ArtworkService, createUploadHandler
 * @module routes/artworks
 */

const express = require('express');
const router = express.Router();
const ArtworkService = require('../services/ArtworkService');
const { createUploadHandler } = require('../utils/upload');

// Reuse the shared upload handler so image naming stays consistent system-wide
const upload = createUploadHandler();

/**
 * GET /api/artworks
 * 获取所有作品及其配色方案
 */
router.get('/artworks', async (req, res) => {
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
router.post('/artworks', async (req, res) => {
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
router.delete('/artworks/:id', async (req, res) => {
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
router.post('/artworks/:artworkId/schemes', upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'initialThumbnail', maxCount: 1 }
]), async (req, res) => {
    try {
        const { artworkId } = req.params;
        // Frontend sends 'name' not 'scheme_name'
        const { name, layers } = req.body;
        const thumbnail_path = req.files?.thumbnail?.[0]?.filename || null;
        const initial_thumbnail_path = req.files?.initialThumbnail?.[0]?.filename || null;
        
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
            scheme_name: name,  // Map 'name' to 'scheme_name'
            thumbnail_path,
            initial_thumbnail_path,
            layers: parsedLayers
        });
        
        res.json(newScheme);
    } catch (error) {
        // 如果创建失败，删除已上传的文件
        if (req.files?.thumbnail?.[0]) {
            await ArtworkService.deleteUploadedImage(req.files.thumbnail[0].filename);
        }
        if (req.files?.initialThumbnail?.[0]) {
            await ArtworkService.deleteUploadedImage(req.files.initialThumbnail[0].filename);
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/artworks/:artworkId/schemes/:schemeId
 * 更新配色方案
 */
router.put('/artworks/:artworkId/schemes/:schemeId', upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'initialThumbnail', maxCount: 1 }
]), async (req, res) => {
    try {
        const { schemeId } = req.params;
        // Frontend sends 'name' not 'scheme_name'
        const { name, layers, existingThumbnailPath, existingInitialThumbnailPath } = req.body;
        const newThumbnailPath = req.files?.thumbnail?.[0]?.filename || existingThumbnailPath;
        const newInitialThumbnailPath = req.files?.initialThumbnail?.[0]?.filename || existingInitialThumbnailPath;
        
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
            scheme_name: name,  // Map 'name' to 'scheme_name'
            thumbnail_path: newThumbnailPath,
            initial_thumbnail_path: newInitialThumbnailPath,
            layers: parsedLayers
        });
        
        // 如果上传了新图片且有旧图片，删除旧图片
        if (req.files?.thumbnail?.[0] && existingThumbnailPath && existingThumbnailPath !== newThumbnailPath) {
            await ArtworkService.deleteUploadedImage(existingThumbnailPath);
        }
        if (req.files?.initialThumbnail?.[0] && existingInitialThumbnailPath && existingInitialThumbnailPath !== newInitialThumbnailPath) {
            await ArtworkService.deleteUploadedImage(existingInitialThumbnailPath);
        }
        
        res.json({ success: true });
    } catch (error) {
        // 如果更新失败，删除新上传的文件
        if (req.files?.thumbnail?.[0]) {
            await ArtworkService.deleteUploadedImage(req.files.thumbnail[0].filename);
        }
        if (req.files?.initialThumbnail?.[0]) {
            await ArtworkService.deleteUploadedImage(req.files.initialThumbnail[0].filename);
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/artworks/:artworkId/schemes/:schemeId
 * 删除配色方案
 */
router.delete('/artworks/:artworkId/schemes/:schemeId', async (req, res) => {
    try {
        const result = await ArtworkService.deleteScheme(req.params.schemeId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;