/* =========================================================
   Module: backend/routes/mont-marte-colors.js
   Responsibility: HTTP layer for Mont Marte raw color CRUD operations
   Imports/Relations: Delegates business logic to MontMarteService and uses
                      the shared upload helper for disk storage
   Notes: The route now focuses on request parsing/response formatting while
          validation, SQL and file cleanup live in the service layer
   ========================================================= */

const express = require('express');
const router = express.Router();

const MontMarteService = require('../services/MontMarteService');
const { createUploadHandler } = require('../utils/upload');

const upload = createUploadHandler();

function parseNullableInt(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normaliseExistingImagePath(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
    return null;
  }
  return trimmed;
}

// GET /api/mont-marte-colors
router.get('/mont-marte-colors', async (req, res) => {
  try {
    const colors = await MontMarteService.listColors();
    res.json(colors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mont-marte-colors
router.post('/mont-marte-colors', upload.single('image'), async (req, res) => {
  try {
    const payload = {
      name: req.body.name,
      category: req.body.category,
      categoryId: parseNullableInt(req.body.category_id),
      supplierId: parseNullableInt(req.body.supplier_id),
      purchaseLinkId: parseNullableInt(req.body.purchase_link_id),
      imageFilename: req.file ? req.file.filename : null,
    };

    const created = await MontMarteService.createColor(payload);
    res.json(created);
  } catch (error) {
    if (req.file) {
      await MontMarteService.discardUpload(req.file.filename);
    }
    res.status(error.status || 500).json({ error: error.message });
  }
});

// PUT /api/mont-marte-colors/:id
router.put('/mont-marte-colors/:id', upload.single('image'), async (req, res) => {
  try {
    const payload = {
      name: req.body.name,
      category: req.body.category,
      categoryId: parseNullableInt(req.body.category_id),
      supplierId: parseNullableInt(req.body.supplier_id),
      purchaseLinkId: parseNullableInt(req.body.purchase_link_id),
      uploadedImage: req.file ? req.file.filename : undefined,
      existingImagePath: normaliseExistingImagePath(req.body.existingImagePath),
    };

    const updated = await MontMarteService.updateColor(req.params.id, payload);
    res.json(updated);
  } catch (error) {
    if (req.file) {
      await MontMarteService.discardUpload(req.file.filename);
    }
    res.status(error.status || 500).json({ error: error.message });
  }
});

// DELETE /api/mont-marte-colors/:id
router.delete('/mont-marte-colors/:id', async (req, res) => {
  try {
    const result = await MontMarteService.deleteColor(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
