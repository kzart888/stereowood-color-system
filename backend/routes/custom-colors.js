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
    const { 
      category_id, color_code, formula, applicable_layers,
      rgb_r, rgb_g, rgb_b,
      cmyk_c, cmyk_m, cmyk_y, cmyk_k,
      hex_color, pantone_coated, pantone_uncoated
    } = req.body;
    let imagePath = null;

    // 处理图片上传（保存原图）
    if (req.file) {
      imagePath = req.file.filename;
      console.log('图片上传成功:', imagePath);
    }

    const colorData = {
      category_id,
      color_code,
      image_path: imagePath,
      formula,
      applicable_layers,
      // New color fields - convert to proper types
      rgb_r: rgb_r ? parseInt(rgb_r) : null,
      rgb_g: rgb_g ? parseInt(rgb_g) : null,
      rgb_b: rgb_b ? parseInt(rgb_b) : null,
      cmyk_c: cmyk_c ? parseFloat(cmyk_c) : null,
      cmyk_m: cmyk_m ? parseFloat(cmyk_m) : null,
      cmyk_y: cmyk_y ? parseFloat(cmyk_y) : null,
      cmyk_k: cmyk_k ? parseFloat(cmyk_k) : null,
      hex_color: hex_color || null,
      pantone_coated: pantone_coated || null,
      pantone_uncoated: pantone_uncoated || null
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
    const { 
      category_id, color_code, formula, applicable_layers, existingImagePath, version,
      rgb_r, rgb_g, rgb_b,
      cmyk_c, cmyk_m, cmyk_y, cmyk_k,
      hex_color, pantone_coated, pantone_uncoated
    } = req.body;
    const expectedVersion = version ? parseInt(version) : null;
    
    // 处理图片：只有在有新上传或明确提供existingImagePath时才更新
    let imagePath;
    let shouldUpdateImage = false;
    
    if (req.file) {
      // 有新上传的图片
      imagePath = req.file.filename;
      shouldUpdateImage = true;
      console.log('编辑图片上传成功:', imagePath);

      // 删除旧图片（如果存在）
      if (existingImagePath) {
        const fs = require('fs');
        const oldImagePath = path.join(__dirname, '..', 'uploads', existingImagePath);
        fs.unlink(oldImagePath, (err) => {
          if (err) console.log('删除旧图片失败:', err.message);
          else console.log('删除旧图片成功:', existingImagePath);
        });
      }
    } else if (existingImagePath !== undefined) {
      // 明确提供了existingImagePath（包括null，表示要清除图片）
      imagePath = existingImagePath;
      shouldUpdateImage = true;
    }

    const colorData = {
      category_id,
      color_code,
      formula,
      applicable_layers,
      // New color fields - convert to proper types
      rgb_r: rgb_r !== undefined ? (rgb_r ? parseInt(rgb_r) : null) : undefined,
      rgb_g: rgb_g !== undefined ? (rgb_g ? parseInt(rgb_g) : null) : undefined,
      rgb_b: rgb_b !== undefined ? (rgb_b ? parseInt(rgb_b) : null) : undefined,
      cmyk_c: cmyk_c !== undefined ? (cmyk_c ? parseFloat(cmyk_c) : null) : undefined,
      cmyk_m: cmyk_m !== undefined ? (cmyk_m ? parseFloat(cmyk_m) : null) : undefined,
      cmyk_y: cmyk_y !== undefined ? (cmyk_y ? parseFloat(cmyk_y) : null) : undefined,
      cmyk_k: cmyk_k !== undefined ? (cmyk_k ? parseFloat(cmyk_k) : null) : undefined,
      hex_color: hex_color !== undefined ? (hex_color || null) : undefined,
      pantone_coated: pantone_coated !== undefined ? (pantone_coated || null) : undefined,
      pantone_uncoated: pantone_uncoated !== undefined ? (pantone_uncoated || null) : undefined
    };
    
    // Remove undefined fields to avoid updating them
    Object.keys(colorData).forEach(key => {
      if (colorData[key] === undefined) {
        delete colorData[key];
      }
    });
    
    // 只有在需要更新图片时才添加image_path字段
    if (shouldUpdateImage) {
      colorData.image_path = imagePath;
    }

    const result = await ColorService.updateColor(colorId, colorData, expectedVersion);
    // 返回更新后的完整颜色信息
    const updatedColor = await ColorService.getColorById(colorId);
    res.json(updatedColor);
  } catch (error) {
    if (error.code === 'VERSION_CONFLICT') {
      res.status(409).json({ 
        error: error.message, 
        code: 'VERSION_CONFLICT',
        expectedVersion: error.expectedVersion,
        actualVersion: error.actualVersion,
        latestData: error.latestData
      });
    } else if (error.message === '自配颜色不存在') {
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
