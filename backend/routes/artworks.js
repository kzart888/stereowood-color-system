/**
 * Artwork routes
 * Responsibility: /api/artworks endpoints
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ArtworkService = require('../services/ArtworkService');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

function sendError(res, status, error) {
  return res.status(status).json({ error });
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
router.post('/artworks', async (req, res) => {
  try {
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

    if (!code || !name) {
      return sendError(res, 400, 'Artwork code and name are required.');
    }

    const newArtwork = await ArtworkService.createArtwork({ code, name });
    return res.json(newArtwork);
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('宸插瓨鍦')) {
      return sendError(res, 400, error.message);
    }
    return sendError(res, 500, error.message);
  }
});

// DELETE /api/artworks/:id
router.delete('/artworks/:id', async (req, res) => {
  try {
    const result = await ArtworkService.deleteArtwork(req.params.id);
    res.json(result);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

// POST /api/artworks/:artworkId/schemes
router.post(
  '/artworks/:artworkId/schemes',
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

      const newScheme = await ArtworkService.createScheme({
        artwork_id: artworkId,
        scheme_name: name,
        thumbnail_path,
        initial_thumbnail_path,
        layers,
      });

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

      await ArtworkService.updateScheme(schemeId, {
        scheme_name: name,
        thumbnail_path: newThumbnailPath,
        initial_thumbnail_path: newInitialThumbnailPath,
        layers,
      });

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
      return sendError(res, error.statusCode || 500, error.message);
    }
  }
);

// DELETE /api/artworks/:artworkId/schemes/:schemeId
router.delete('/artworks/:artworkId/schemes/:schemeId', async (req, res) => {
  try {
    const result = await ArtworkService.deleteScheme(req.params.schemeId);
    res.json(result);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

module.exports = router;
