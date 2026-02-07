/* =========================================================
   Module: backend/routes/custom-colors.js
   Responsibility: CRUD routes for custom colors and their history
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   ========================================================= */

const express = require('express');
const router = express.Router();
const ColorService = require('../services/ColorService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

function sendError(res, status, error, extraFields) {
  if (extraFields) {
    return res.status(status).json({ error, ...extraFields });
  }
  return res.status(status).json({ error });
}

function parsePositiveId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function parseOptionalInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalFloat(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeHexInput(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeStringOrNull(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function parseCategoryId(value) {
  if (value === undefined) {
    return { defined: false };
  }
  if (value === null || value === '' || value === 'other') {
    return { defined: true, value: null };
  }

  const parsed = parsePositiveId(value);
  if (!parsed) {
    return { error: 'category_id must be a positive integer or null.' };
  }

  return { defined: true, value: parsed };
}

function parseVersion(value) {
  if (value === undefined || value === null || value === '') {
    return { value: null };
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return { error: 'version must be a non-negative integer.' };
  }

  return { value: parsed };
}

function parseBooleanFlag(value) {
  if (value === true || value === false) return value;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true';
}

function inferColorServiceErrorStatus(error, fallbackStatus) {
  const message = (error && error.message ? String(error.message) : '').toLowerCase();

  if (error && error.code === 'VERSION_CONFLICT') {
    return 409;
  }
  if (
    message.includes('not found') ||
    message.includes('not exist') ||
    message.includes('涓嶅瓨鍦')
  ) {
    return 404;
  }
  if (
    message.includes('already exists') ||
    message.includes('duplicate') ||
    message.includes('unique') ||
    message.includes('宸插瓨鍦') ||
    message.includes('rgb') ||
    message.includes('cmyk') ||
    message.includes('hex') ||
    message.includes('validation')
  ) {
    return 400;
  }
  if (
    message.includes('in use') ||
    message.includes('referenced') ||
    message.includes('used') ||
    message.includes('浣跨敤')
  ) {
    return 400;
  }

  return fallbackStatus;
}

function mapColorServiceError(res, error, fallbackStatus = 500) {
  const status = inferColorServiceErrorStatus(error, fallbackStatus);

  if (error && error.code === 'VERSION_CONFLICT') {
    return sendError(res, 409, error.message, {
      code: 'VERSION_CONFLICT',
      expectedVersion: error.expectedVersion,
      actualVersion: error.actualVersion,
      latestData: error.latestData,
    });
  }

  return sendError(res, status, error && error.message ? error.message : 'Internal server error');
}

function toColorPayload(body) {
  return {
    formula: body.formula,
    applicable_layers: body.applicable_layers,
    rgb_r: parseOptionalInt(body.rgb_r),
    rgb_g: parseOptionalInt(body.rgb_g),
    rgb_b: parseOptionalInt(body.rgb_b),
    cmyk_c: parseOptionalFloat(body.cmyk_c),
    cmyk_m: parseOptionalFloat(body.cmyk_m),
    cmyk_y: parseOptionalFloat(body.cmyk_y),
    cmyk_k: parseOptionalFloat(body.cmyk_k),
    hex_color: normalizeHexInput(body.hex_color),
    pantone_coated: normalizeStringOrNull(body.pantone_coated),
    pantone_uncoated: normalizeStringOrNull(body.pantone_uncoated),
    pure_rgb_r: parseOptionalInt(body.pure_rgb_r),
    pure_rgb_g: parseOptionalInt(body.pure_rgb_g),
    pure_rgb_b: parseOptionalInt(body.pure_rgb_b),
    pure_hex_color: normalizeHexInput(body.pure_hex_color),
  };
}

// GET /api/custom-colors
router.get('/custom-colors', async (req, res) => {
  try {
    const colors = await ColorService.getAllColors();
    res.json(colors);
  } catch (error) {
    mapColorServiceError(res, error, 500);
  }
});

// POST /api/custom-colors
router.post('/custom-colors', upload.single('image'), async (req, res) => {
  try {
    const colorCode = normalizeStringOrNull(req.body.color_code);
    if (!colorCode) {
      return sendError(res, 400, 'color_code is required.');
    }

    const categoryResult = parseCategoryId(req.body.category_id);
    if (categoryResult.error) {
      return sendError(res, 400, categoryResult.error);
    }

    const colorData = {
      ...toColorPayload(req.body),
      category_id: categoryResult.defined ? categoryResult.value : null,
      color_code: colorCode,
      image_path: req.file ? req.file.filename : null,
    };

    const result = await ColorService.createColor(colorData);
    return res.json(result);
  } catch (error) {
    return mapColorServiceError(res, error, 500);
  }
});

// GET /api/custom-colors/:id/history
router.get('/custom-colors/:id/history', async (req, res) => {
  try {
    const colorId = parsePositiveId(req.params.id);
    if (!colorId) {
      return sendError(res, 400, 'Invalid custom color id.');
    }

    const history = await ColorService.getColorHistory(colorId);
    return res.json(history);
  } catch (error) {
    return mapColorServiceError(res, error, 500);
  }
});

// DELETE /api/custom-colors/:id
router.delete('/custom-colors/:id', async (req, res) => {
  try {
    const colorId = parsePositiveId(req.params.id);
    if (!colorId) {
      return sendError(res, 400, 'Invalid custom color id.');
    }

    const result = await ColorService.deleteColor(colorId);
    return res.json(result);
  } catch (error) {
    return mapColorServiceError(res, error, 500);
  }
});

// PUT /api/custom-colors/:id
router.put('/custom-colors/:id', upload.single('image'), async (req, res) => {
  try {
    const colorId = parsePositiveId(req.params.id);
    if (!colorId) {
      return sendError(res, 400, 'Invalid custom color id.');
    }

    const versionResult = parseVersion(req.body.version);
    if (versionResult.error) {
      return sendError(res, 400, versionResult.error);
    }

    const categoryResult = parseCategoryId(req.body.category_id);
    if (categoryResult.error) {
      return sendError(res, 400, categoryResult.error);
    }

    const colorData = {};

    if (categoryResult.defined) {
      colorData.category_id = categoryResult.value;
    }

    if (req.body.color_code !== undefined) {
      const nextCode = normalizeStringOrNull(req.body.color_code);
      if (!nextCode) {
        return sendError(res, 400, 'color_code cannot be empty when provided.');
      }
      colorData.color_code = nextCode;
    }

    if (req.body.formula !== undefined) {
      colorData.formula = req.body.formula;
    }
    if (req.body.applicable_layers !== undefined) {
      colorData.applicable_layers = req.body.applicable_layers;
    }

    const typedFields = toColorPayload(req.body);
    Object.keys(typedFields).forEach((field) => {
      if (req.body[field] !== undefined) {
        colorData[field] = typedFields[field];
      }
    });

    if (req.body.clear_pure_color !== undefined) {
      colorData.clear_pure_color = parseBooleanFlag(req.body.clear_pure_color);
    }

    if (req.file) {
      colorData.image_path = req.file.filename;

      const previousImage = normalizeStringOrNull(req.body.existingImagePath);
      if (previousImage && previousImage !== req.file.filename) {
        const oldImagePath = path.join(__dirname, '..', 'uploads', path.basename(previousImage));
        fs.unlink(oldImagePath, () => {});
      }
    } else if (req.body.existingImagePath !== undefined) {
      colorData.image_path = normalizeStringOrNull(req.body.existingImagePath);
    }

    await ColorService.updateColor(colorId, colorData, versionResult.value);
    const updatedColor = await ColorService.getColorById(colorId);
    return res.json(updatedColor);
  } catch (error) {
    return mapColorServiceError(res, error, 500);
  }
});

// POST /api/custom-colors/force-merge
router.post('/custom-colors/force-merge', async (req, res) => {
  try {
    const keepId = parsePositiveId(req.body.keepId);
    if (!Array.isArray(req.body.removeIds)) {
      return sendError(res, 400, 'Invalid merge payload. keepId and removeIds are required.');
    }

    const parsedRemoveIds = req.body.removeIds.map((id) => parsePositiveId(id));
    const hasInvalidRemoveId = parsedRemoveIds.some((id) => !id);
    const removeIds = parsedRemoveIds.filter(Boolean);

    if (!keepId || hasInvalidRemoveId || removeIds.length === 0) {
      return sendError(res, 400, 'Invalid merge payload. keepId and removeIds are required.');
    }

    const result = await ColorService.forceMerge({
      keepId,
      removeIds,
      signature: req.body.signature,
    });

    return res.json(result);
  } catch (error) {
    return mapColorServiceError(res, error, 500);
  }
});

module.exports = router;
