/* =========================================================
   Module: backend/routes/custom-colors.js
   Responsibility: CRUD routes for Custom Colors and their history
   Imports/Relations: Uses ColorService for business logic; multer for image upload
   Origin: Extracted from backend/server.js (2025-08), refactored with Service layer
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   Related: artworks routes (scheme_layers references custom_colors)
   ========================================================= */

const express = require('express');
const router = express.Router();
const ColorService = require('../services/ColorService');
const multer = require('multer');
const path = require('path');

// Multer config (same as server.js)
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/'); },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// GET /api/custom-colors
router.get('/custom-colors', async (req, res) => {
  try {
    const colors = await ColorService.getAllColors();
    res.json(colors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/custom-colors
router.post('/custom-colors', upload.single('image'), async (req, res) => {
  try {
    const { category_id, color_code, formula, applicable_layers } = req.body;
    const imagePath = req.file ? req.file.filename : null;

    const colorData = {
      category_id,
      color_code,
      image_path: imagePath,
      formula,
      applicable_layers
    };

    const result = await ColorService.createColor(colorData);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/custom-colors/:id/history
router.get('/custom-colors/:id/history', async (req, res) => {
  try {
    const colorId = req.params.id;
    const history = await ColorService.getColorHistory(colorId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/custom-colors/:id
router.delete('/custom-colors/:id', async (req, res) => {
  try {
    const colorId = req.params.id;
    const result = await ColorService.deleteColor(colorId);
    res.json(result);
  } catch (error) {
    if (error.message === '颜色不存在') {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('配色方案使用')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// PUT /api/custom-colors/:id
router.put('/custom-colors/:id', upload.single('image'), async (req, res) => {
  try {
    const colorId = req.params.id;
    const { category_id, color_code, formula, applicable_layers, existingImagePath } = req.body;
    const imagePath = req.file ? req.file.filename : existingImagePath || null;

    const colorData = {
      category_id,
      color_code,
      image_path: imagePath,
      formula,
      applicable_layers
    };

    const result = await ColorService.updateColor(colorId, colorData);
    // 返回更新后的完整颜色信息
    const updatedColor = await ColorService.getColorById(colorId);
    res.json(updatedColor);
  } catch (error) {
    if (error.message === '自配颜色不存在') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// POST /api/custom-colors/force-merge - 强制合并重复颜色
router.post('/custom-colors/force-merge', async (req, res) => {
  try {
    const { keepId, removeIds, signature } = req.body;
    
    if (!keepId || !Array.isArray(removeIds) || !removeIds.length) {
      return res.status(400).json({ error: '合并参数不完整' });
    }

    const result = await ColorService.forceMerge({ keepId, removeIds, signature });
    res.json(result);
  } catch (error) {
    console.error('强制合并失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
