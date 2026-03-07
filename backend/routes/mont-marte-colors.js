/* =========================================================
   Module: backend/routes/mont-marte-colors.js
   Responsibility: HTTP handlers for Mont-Marte colors
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   ========================================================= */

const express = require('express');
const multer = require('multer');
const path = require('path');
const MontMarteColorService = require('../domains/materials/service');
const UploadImageService = require('../domains/shared/upload-image-service');
const { extractAuditContext } = require('./helpers/request-audit-context');
const { requireWriteAccess } = require('./helpers/write-access');

const router = express.Router();

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

function parseVersion(value) {
  if (value === undefined || value === null || value === '') {
    return { value: null };
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return { error: 'version must be a non-negative integer.' };
  }
  return { value: parsed };
}

function mapServiceError(res, error) {
  if (error && error.code === 'VERSION_CONFLICT') {
    return sendError(res, 409, error.message, {
      code: 'VERSION_CONFLICT',
      entityType: error.entityType || 'mont_marte_color',
      expectedVersion: error.expectedVersion,
      actualVersion: error.actualVersion,
      latestData: error.latestData,
    });
  }

  const status = error && error.statusCode ? error.statusCode : 500;
  const message = error && error.message ? error.message : 'Internal server error';
  return sendError(res, status, message);
}

// GET /api/mont-marte-colors
router.get('/mont-marte-colors', async (req, res) => {
  try {
    const rows = await MontMarteColorService.getAllColors();
    return res.json(rows);
  } catch (error) {
    return mapServiceError(res, error);
  }
});

// POST /api/mont-marte-colors
router.post('/mont-marte-colors', requireWriteAccess, upload.single('image'), async (req, res) => {
  try {
    if (req.file) {
      await UploadImageService.ensureThumbnailForUpload(req.file);
    }
    const created = await MontMarteColorService.createColor(
      req.body,
      req.file ? req.file.filename : null,
      extractAuditContext(req)
    );
    return res.json(created);
  } catch (error) {
    return mapServiceError(res, error);
  }
});

// PUT /api/mont-marte-colors/:id
router.put('/mont-marte-colors/:id', requireWriteAccess, upload.single('image'), async (req, res) => {
  try {
    if (req.file) {
      await UploadImageService.ensureThumbnailForUpload(req.file);
    }
    const versionResult = parseVersion(req.body.version);
    if (versionResult.error) {
      return sendError(res, 400, versionResult.error);
    }

    const updated = await MontMarteColorService.updateColor(
      req.params.id,
      req.body,
      req.file ? req.file.filename : null,
      versionResult.value,
      extractAuditContext(req)
    );
    return res.json(updated);
  } catch (error) {
    return mapServiceError(res, error);
  }
});

// DELETE /api/mont-marte-colors/:id
router.delete('/mont-marte-colors/:id', requireWriteAccess, async (req, res) => {
  try {
    const deleted = await MontMarteColorService.deleteColor(req.params.id, extractAuditContext(req));
    return res.json(deleted);
  } catch (error) {
    return mapServiceError(res, error);
  }
});

module.exports = router;

