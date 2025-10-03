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
const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseOptionalFloat = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeHexInput = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

// Multer config (same as server.js)
const storage = multer.diskStorage({
  destination: function (req, file, cb) { 
    cb(null, path.join(__dirname, '..', 'uploads')); 
  },
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
      hex_color, pantone_coated, pantone_uncoated,
      pure_rgb_r, pure_rgb_g, pure_rgb_b, pure_hex_color
    } = req.body;
    let imagePath = null;

    // 处理图片上传（保存原图）
    if (req.file) {
      imagePath = req.file.filename;
    }

    const colorData = {
      category_id,
      color_code,
      image_path: imagePath,
      formula,
      applicable_layers,
      // New color fields - convert to proper types
      rgb_r: parseOptionalInt(rgb_r),
      rgb_g: parseOptionalInt(rgb_g),
      rgb_b: parseOptionalInt(rgb_b),
      cmyk_c: parseOptionalFloat(cmyk_c),
      cmyk_m: parseOptionalFloat(cmyk_m),
      cmyk_y: parseOptionalFloat(cmyk_y),
      cmyk_k: parseOptionalFloat(cmyk_k),
      hex_color: normalizeHexInput(hex_color),
      pantone_coated: pantone_coated || null,
      pantone_uncoated: pantone_uncoated || null,
      pure_rgb_r: parseOptionalInt(pure_rgb_r),
      pure_rgb_g: parseOptionalInt(pure_rgb_g),
      pure_rgb_b: parseOptionalInt(pure_rgb_b),
      pure_hex_color: normalizeHexInput(pure_hex_color)
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
      hex_color, pantone_coated, pantone_uncoated,
      pure_rgb_r, pure_rgb_g, pure_rgb_b, pure_hex_color, clear_pure_color
    } = req.body;
    const expectedVersion = version ? parseInt(version) : null;
    
    // 处理图片：只有在有新上传或明确提供existingImagePath时才更新
    let imagePath;
    let shouldUpdateImage = false;
    
    if (req.file) {
      // 有新上传的图片
      imagePath = req.file.filename;
      shouldUpdateImage = true;

      // 删除旧图片（如果存在）
      if (existingImagePath) {
        const fs = require('fs');
        const oldImagePath = path.join(__dirname, '..', 'uploads', existingImagePath);
        fs.unlink(oldImagePath, (err) => {
        });
      }
    } else if (existingImagePath !== undefined) {
      // 明确提供了existingImagePath（包括null，表示要清除图片）
      imagePath = existingImagePath;
      shouldUpdateImage = true;
    }

    const colorData = {};

    if (category_id !== undefined) {
      colorData.category_id = category_id === 'other' ? null : category_id;
    }
    if (color_code !== undefined) {
      colorData.color_code = color_code;
    }
    if (formula !== undefined) {
      colorData.formula = formula;
    }
    if (applicable_layers !== undefined) {
      colorData.applicable_layers = applicable_layers;
    }

    if (rgb_r !== undefined) colorData.rgb_r = parseOptionalInt(rgb_r);
    if (rgb_g !== undefined) colorData.rgb_g = parseOptionalInt(rgb_g);
    if (rgb_b !== undefined) colorData.rgb_b = parseOptionalInt(rgb_b);

    if (cmyk_c !== undefined) colorData.cmyk_c = parseOptionalFloat(cmyk_c);
    if (cmyk_m !== undefined) colorData.cmyk_m = parseOptionalFloat(cmyk_m);
    if (cmyk_y !== undefined) colorData.cmyk_y = parseOptionalFloat(cmyk_y);
    if (cmyk_k !== undefined) colorData.cmyk_k = parseOptionalFloat(cmyk_k);

    if (hex_color !== undefined) colorData.hex_color = normalizeHexInput(hex_color);
    if (pantone_coated !== undefined) colorData.pantone_coated = pantone_coated ? pantone_coated : null;
    if (pantone_uncoated !== undefined) colorData.pantone_uncoated = pantone_uncoated ? pantone_uncoated : null;

    if (pure_rgb_r !== undefined) colorData.pure_rgb_r = parseOptionalInt(pure_rgb_r);
    if (pure_rgb_g !== undefined) colorData.pure_rgb_g = parseOptionalInt(pure_rgb_g);
    if (pure_rgb_b !== undefined) colorData.pure_rgb_b = parseOptionalInt(pure_rgb_b);
    if (pure_hex_color !== undefined) colorData.pure_hex_color = normalizeHexInput(pure_hex_color);

    if (clear_pure_color !== undefined) {
      const flag = clear_pure_color;
      colorData.clear_pure_color = flag === '1' || flag === 'true' || flag === 'TRUE' || flag === 'True';
    }

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
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
