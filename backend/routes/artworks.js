/**
 * Artwork routes
 * Responsibility: /api/artworks endpoints
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ArtworkService = require('../domains/artworks/service');
const UploadImageService = require('../domains/shared/upload-image-service');
const { extractAuditContext } = require('./helpers/request-audit-context');
const { requireWriteAccess } = require('./helpers/write-access');
const {
  normalizeSourceModifiedAtInput,
} = require('../domains/shared/asset-file-utils');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });
const ASSET_DOC_MIME_SET = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
]);

const ASSET_EXT_SET = new Set(['.doc', '.docx', '.xls', '.xlsx', '.txt', '.md']);

function assetFileFilter(req, file, cb) {
  const mime = String(file.mimetype || '').toLowerCase();
  const ext = String(path.extname(file.originalname || '') || '').toLowerCase();
  if (mime.startsWith('image/') || ASSET_DOC_MIME_SET.has(mime) || ASSET_EXT_SET.has(ext)) {
    cb(null, true);
    return;
  }
  cb(new Error('Unsupported asset type. Allowed: image/doc/docx/xls/xlsx/txt/md'));
}

const assetUpload = multer({
  storage,
  fileFilter: assetFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

function sendError(res, status, error, extraFields) {
  if (extraFields) {
    return res.status(status).json({ error, ...extraFields });
  }
  return res.status(status).json({ error });
}

function mapArtworkError(res, error, fallbackStatus = 500) {
  if (error && error.code === 'VERSION_CONFLICT') {
    return sendError(res, 409, error.message, {
      code: 'VERSION_CONFLICT',
      entityType: error.entityType || 'color_scheme',
      expectedVersion: error.expectedVersion,
      actualVersion: error.actualVersion,
      latestData: error.latestData,
    });
  }

  const status = error && error.statusCode ? error.statusCode : fallbackStatus;
  const message = error && error.message ? error.message : 'Internal server error';
  return sendError(res, status, message);
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

function parsePositiveIntegerParam(value, fieldName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: `${fieldName} must be a positive integer.` };
  }
  return { value: parsed };
}

function toAsciiFileName(fileName) {
  const normalized = String(fileName || '')
    .replace(/[\r\n]/g, ' ')
    .replace(/["\\]/g, '_')
    .trim();
  const ascii = normalized
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/\s+/g, ' ');
  return ascii || 'download';
}

function encodeRFC5987Value(fileName) {
  return encodeURIComponent(String(fileName || 'download'))
    .replace(/['()]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, '%2A');
}

function buildAttachmentDisposition(fileName) {
  const safeName = String(fileName || 'download')
    .replace(/[\r\n]/g, ' ')
    .trim();
  const asciiName = toAsciiFileName(safeName);
  const encodedName = encodeRFC5987Value(safeName || 'download');
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`;
}

function parseLayersInput(layers) {
  if (!layers) {
    return [];
  }

  try {
    return typeof layers === 'string' ? JSON.parse(layers) : layers;
  } catch (error) {
    const parseError = new Error('Invalid layers payload. Expected valid JSON array.');
    parseError.statusCode = 400;
    throw parseError;
  }
}

async function cleanupUploadedFiles(files) {
  if (files?.thumbnail?.[0]) {
    await ArtworkService.deleteUploadedImage(files.thumbnail[0].filename);
  }
  if (files?.initialThumbnail?.[0]) {
    await ArtworkService.deleteUploadedImage(files.initialThumbnail[0].filename);
  }
  if (files?.asset?.[0]) {
    await ArtworkService.deleteUploadedImage(files.asset[0].filename);
  }
}

// GET /api/artworks
router.get('/artworks', async (req, res) => {
  try {
    const artworks = await ArtworkService.getAllArtworks();
    res.json(artworks);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

// POST /api/artworks
router.post('/artworks', requireWriteAccess, async (req, res) => {
  try {
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

    if (!code || !name) {
      return sendError(res, 400, 'Artwork code and name are required.');
    }

    const newArtwork = await ArtworkService.createArtwork({ code, name }, extractAuditContext(req));
    return res.json(newArtwork);
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('瀹告彃鐡ㄩ崷')) {
      return sendError(res, 400, error.message);
    }
    return sendError(res, 500, error.message);
  }
});

// DELETE /api/artworks/:id
router.delete('/artworks/:id', requireWriteAccess, async (req, res) => {
  try {
    const result = await ArtworkService.deleteArtwork(req.params.id, extractAuditContext(req));
    res.json(result);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

// POST /api/artworks/:artworkId/schemes
router.post(
  '/artworks/:artworkId/schemes',
  requireWriteAccess,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'initialThumbnail', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { artworkId } = req.params;
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

      if (!name) {
        return sendError(res, 400, 'Scheme name is required.');
      }

      const layers = parseLayersInput(req.body.layers);
      const thumbnail_path = req.files?.thumbnail?.[0]?.filename || null;
      const initial_thumbnail_path = req.files?.initialThumbnail?.[0]?.filename || null;
      if (req.files?.thumbnail?.[0]) {
        await UploadImageService.ensureThumbnailForUpload(req.files.thumbnail[0]);
      }
      if (req.files?.initialThumbnail?.[0]) {
        await UploadImageService.ensureThumbnailForUpload(req.files.initialThumbnail[0]);
      }

      const newScheme = await ArtworkService.createScheme({
        artwork_id: artworkId,
        scheme_name: name,
        thumbnail_path,
        initial_thumbnail_path,
        layers,
      }, extractAuditContext(req));

      return res.json(newScheme);
    } catch (error) {
      await cleanupUploadedFiles(req.files);
      return sendError(res, error.statusCode || 500, error.message);
    }
  }
);

// PUT /api/artworks/:artworkId/schemes/:schemeId
router.put(
  '/artworks/:artworkId/schemes/:schemeId',
  requireWriteAccess,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'initialThumbnail', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { schemeId } = req.params;
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

      if (!name) {
        return sendError(res, 400, 'Scheme name is required.');
      }

      const layers = parseLayersInput(req.body.layers);
      const existingThumbnailPath = req.body.existingThumbnailPath;
      const existingInitialThumbnailPath = req.body.existingInitialThumbnailPath;
      const newThumbnailPath = req.files?.thumbnail?.[0]?.filename || existingThumbnailPath;
      const newInitialThumbnailPath = req.files?.initialThumbnail?.[0]?.filename || existingInitialThumbnailPath;
      if (req.files?.thumbnail?.[0]) {
        await UploadImageService.ensureThumbnailForUpload(req.files.thumbnail[0]);
      }
      if (req.files?.initialThumbnail?.[0]) {
        await UploadImageService.ensureThumbnailForUpload(req.files.initialThumbnail[0]);
      }

      const versionResult = parseVersion(req.body.version);
      if (versionResult.error) {
        return sendError(res, 400, versionResult.error);
      }

      await ArtworkService.updateScheme(schemeId, {
        scheme_name: name,
        thumbnail_path: newThumbnailPath,
        initial_thumbnail_path: newInitialThumbnailPath,
        layers,
      }, versionResult.value, extractAuditContext(req));

      if (req.files?.thumbnail?.[0] && existingThumbnailPath && existingThumbnailPath !== newThumbnailPath) {
        await ArtworkService.deleteUploadedImage(existingThumbnailPath);
      }
      if (
        req.files?.initialThumbnail?.[0] &&
        existingInitialThumbnailPath &&
        existingInitialThumbnailPath !== newInitialThumbnailPath
      ) {
        await ArtworkService.deleteUploadedImage(existingInitialThumbnailPath);
      }

      return res.json({ success: true });
    } catch (error) {
      await cleanupUploadedFiles(req.files);
      return mapArtworkError(res, error, 500);
    }
  }
);

// DELETE /api/artworks/:artworkId/schemes/:schemeId
router.delete('/artworks/:artworkId/schemes/:schemeId', requireWriteAccess, async (req, res) => {
  try {
    const result = await ArtworkService.deleteScheme(req.params.schemeId, extractAuditContext(req));
    res.json(result);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

// GET /api/artworks/:artworkId/schemes/:schemeId/assets
router.get('/artworks/:artworkId/schemes/:schemeId/assets', async (req, res) => {
  try {
    const assets = await ArtworkService.listSchemeAssets(req.params.artworkId, req.params.schemeId);
    return res.json(assets);
  } catch (error) {
    return mapArtworkError(res, error, 500);
  }
});

// GET /api/artworks/:artworkId/schemes/:schemeId/assets/:assetId/preview
router.get('/artworks/:artworkId/schemes/:schemeId/assets/:assetId/preview', async (req, res) => {
  const artworkId = parsePositiveIntegerParam(req.params.artworkId, 'artworkId');
  if (artworkId.error) {
    return sendError(res, 400, artworkId.error);
  }
  const schemeId = parsePositiveIntegerParam(req.params.schemeId, 'schemeId');
  if (schemeId.error) {
    return sendError(res, 400, schemeId.error);
  }
  const assetId = parsePositiveIntegerParam(req.params.assetId, 'assetId');
  if (assetId.error) {
    return sendError(res, 400, assetId.error);
  }

  try {
    const payload = await ArtworkService.getSchemeAssetPreviewPayload(
      artworkId.value,
      schemeId.value,
      assetId.value
    );
    return res.json(payload);
  } catch (error) {
    return mapArtworkError(res, error, 500);
  }
});

// GET /api/artworks/:artworkId/schemes/:schemeId/assets/:assetId/download
router.get('/artworks/:artworkId/schemes/:schemeId/assets/:assetId/download', async (req, res) => {
  const artworkId = parsePositiveIntegerParam(req.params.artworkId, 'artworkId');
  if (artworkId.error) {
    return sendError(res, 400, artworkId.error);
  }
  const schemeId = parsePositiveIntegerParam(req.params.schemeId, 'schemeId');
  if (schemeId.error) {
    return sendError(res, 400, schemeId.error);
  }
  const assetId = parsePositiveIntegerParam(req.params.assetId, 'assetId');
  if (assetId.error) {
    return sendError(res, 400, assetId.error);
  }

  try {
    const payload = await ArtworkService.getSchemeAssetDownloadPayload(
      artworkId.value,
      schemeId.value,
      assetId.value
    );
    if (payload.mimeType) {
      res.type(payload.mimeType);
    } else {
      res.type(payload.filePath || payload.downloadName);
    }
    res.setHeader('Content-Disposition', buildAttachmentDisposition(payload.downloadName));
    return res.sendFile(payload.absolutePath, (error) => {
      if (error && !res.headersSent) {
        res.status(error.statusCode || 404).json({ error: 'Asset file not found.' });
      }
    });
  } catch (error) {
    return mapArtworkError(res, error, 500);
  }
});

// POST /api/artworks/:artworkId/schemes/:schemeId/assets
router.post(
  '/artworks/:artworkId/schemes/:schemeId/assets',
  requireWriteAccess,
  assetUpload.single('asset'),
  async (req, res) => {
    try {
      if (!req.file) {
        return sendError(res, 400, 'asset file is required.');
      }
      const sourceModifiedAt = normalizeSourceModifiedAtInput(req.body?.asset_last_modified);
      const created = await ArtworkService.addSchemeAsset(
        req.params.artworkId,
        req.params.schemeId,
        req.file,
        extractAuditContext(req),
        { sourceModifiedAt }
      );
      return res.json(created);
    } catch (error) {
      if (req.file?.filename) {
        await ArtworkService.deleteUploadedImage(req.file.filename);
      }
      return mapArtworkError(res, error, 500);
    }
  }
);

// DELETE /api/artworks/:artworkId/schemes/:schemeId/assets/:assetId
router.delete(
  '/artworks/:artworkId/schemes/:schemeId/assets/:assetId',
  requireWriteAccess,
  async (req, res) => {
    try {
      const result = await ArtworkService.deleteSchemeAsset(
        req.params.artworkId,
        req.params.schemeId,
        req.params.assetId,
        extractAuditContext(req)
      );
      return res.json(result);
    } catch (error) {
      return mapArtworkError(res, error, 500);
    }
  }
);

// PUT /api/artworks/:artworkId/schemes/:schemeId/assets/reorder
router.put(
  '/artworks/:artworkId/schemes/:schemeId/assets/reorder',
  requireWriteAccess,
  async (req, res) => {
    try {
      const orderedIds = Array.isArray(req.body?.orderedIds)
        ? req.body.orderedIds
        : Array.isArray(req.body)
          ? req.body
          : null;
      if (!orderedIds) {
        return sendError(res, 400, 'orderedIds array is required.');
      }
      const assets = await ArtworkService.reorderSchemeAssets(
        req.params.artworkId,
        req.params.schemeId,
        orderedIds,
        extractAuditContext(req)
      );
      return res.json(assets);
    } catch (error) {
      return mapArtworkError(res, error, 500);
    }
  }
);

module.exports = router;

