/* =========================================================
   Module: backend/routes/mont-marte-colors.js
   Responsibility: CRUD routes for Mont Marte raw colors
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   ========================================================= */

const express = require('express');
const router = express.Router();
const { db } = require('../db/index');
const { cascadeRenameInFormulas } = require('../services/formula');
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

const SELECT_COLOR_SQL = `
  SELECT m.id, m.name, m.image_path, m.updated_at,
         m.supplier_id, s.name AS supplier_name,
         m.purchase_link_id, p.url AS purchase_link_url,
         m.category,
         m.category_id, mc.name AS category_name, mc.code AS category_code
    FROM mont_marte_colors m
    LEFT JOIN suppliers s ON s.id = m.supplier_id
    LEFT JOIN purchase_links p ON p.id = m.purchase_link_id
    LEFT JOIN mont_marte_categories mc ON mc.id = m.category_id
`;

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

function parseOptionalId(value) {
  if (value === undefined || value === null || value === '') {
    return { provided: false, value: null };
  }
  const parsed = parsePositiveId(value);
  if (!parsed) {
    return { error: 'Expected a positive integer id.' };
  }
  return { provided: true, value: parsed };
}

function normalizeStringOrNull(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function inferDbStatus(error, fallbackStatus = 500) {
  const message = (error && error.message ? String(error.message) : '').toLowerCase();
  if (message.includes('unique') || message.includes('duplicate') || message.includes('constraint')) {
    return 400;
  }
  return fallbackStatus;
}

function buildWriteInput(body, options = {}) {
  const requireCategory = options.requireCategory !== false;
  const normalizedName = normalizeStringOrNull(body.name);
  const categoryText = normalizeStringOrNull(body.category);

  const supplierIdResult = parseOptionalId(body.supplier_id);
  if (supplierIdResult.error) {
    return { error: 'supplier_id must be a positive integer when provided.' };
  }

  const purchaseLinkIdResult = parseOptionalId(body.purchase_link_id);
  if (purchaseLinkIdResult.error) {
    return { error: 'purchase_link_id must be a positive integer when provided.' };
  }

  const categoryIdResult = parseOptionalId(body.category_id);
  if (categoryIdResult.error) {
    return { error: 'category_id must be a positive integer when provided.' };
  }

  if (!normalizedName) {
    return { error: 'Color name is required.' };
  }

  // Backward compatibility: allow either category text or category_id.
  if (requireCategory && !categoryIdResult.value && !categoryText) {
    return { error: 'Either category or category_id is required.' };
  }

  return {
    value: {
      name: normalizedName,
      category: categoryText,
      category_id: categoryIdResult.value,
      supplier_id: supplierIdResult.value,
      purchase_link_id: purchaseLinkIdResult.value,
    },
  };
}

function getColorById(colorId) {
  return new Promise((resolve, reject) => {
    db.get(`${SELECT_COLOR_SQL} WHERE m.id = ?`, [colorId], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

// GET /api/mont-marte-colors
router.get('/mont-marte-colors', (req, res) => {
  db.all(`${SELECT_COLOR_SQL} ORDER BY LOWER(m.name) ASC`, [], (err, rows) => {
    if (err) {
      return sendError(res, 500, err.message);
    }
    return res.json(rows);
  });
});

// POST /api/mont-marte-colors
router.post('/mont-marte-colors', upload.single('image'), async (req, res) => {
  const input = buildWriteInput(req.body, { requireCategory: true });
  if (input.error) {
    return sendError(res, 400, input.error);
  }

  const payload = input.value;
  const imagePath = req.file ? req.file.filename : null;

  db.run(
    `INSERT INTO mont_marte_colors(name, image_path, supplier_id, purchase_link_id, category, category_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      payload.name,
      imagePath,
      payload.supplier_id,
      payload.purchase_link_id,
      payload.category,
      payload.category_id,
    ],
    async function onInsert(err) {
      if (err) {
        return sendError(res, inferDbStatus(err, 500), err.message);
      }

      try {
        const created = await getColorById(this.lastID);
        return res.json(created);
      } catch (readErr) {
        return sendError(res, 500, readErr.message);
      }
    }
  );
});

// PUT /api/mont-marte-colors/:id
router.put('/mont-marte-colors/:id', upload.single('image'), (req, res) => {
  const colorId = parsePositiveId(req.params.id);
  if (!colorId) {
    return sendError(res, 400, 'Invalid color id.');
  }

  const input = buildWriteInput(req.body, { requireCategory: false });
  if (input.error) {
    return sendError(res, 400, input.error);
  }

  const payload = input.value;

  db.get(
    'SELECT name, image_path, category, category_id FROM mont_marte_colors WHERE id = ?',
    [colorId],
    (err, oldData) => {
    if (err) {
      return sendError(res, 500, err.message);
    }
    if (!oldData) {
      return sendError(res, 404, 'Color not found.');
    }

    let newImagePath = oldData.image_path;
    if (req.file) {
      newImagePath = req.file.filename;
    } else if (req.body.existingImagePath !== undefined) {
      newImagePath = normalizeStringOrNull(req.body.existingImagePath);
    }

    const categoryProvided = Object.prototype.hasOwnProperty.call(req.body, 'category');
    const categoryIdProvided = Object.prototype.hasOwnProperty.call(req.body, 'category_id');
    const finalCategory = categoryProvided ? payload.category : oldData.category;
    const finalCategoryId = categoryIdProvided ? payload.category_id : oldData.category_id;

    db.run(
      `UPDATE mont_marte_colors
          SET name = ?, image_path = ?, supplier_id = ?, purchase_link_id = ?, category = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [
        payload.name,
        newImagePath,
        payload.supplier_id,
        payload.purchase_link_id,
        finalCategory,
        finalCategoryId,
        colorId,
      ],
      function onUpdate(updateErr) {
        if (updateErr) {
          return sendError(res, inferDbStatus(updateErr, 500), updateErr.message);
        }

        if (req.file && oldData.image_path && oldData.image_path !== newImagePath) {
          const oldImagePath = path.join(__dirname, '..', 'uploads', path.basename(oldData.image_path));
          fs.unlink(oldImagePath, () => {});
        }

        const respondWithColor = (updatedReferences = 0, warn) => {
          getColorById(colorId)
            .then((row) => res.json({ ...row, updatedReferences, warn }))
            .catch((readErr) => sendError(res, 500, readErr.message));
        };

        if (!oldData.name || oldData.name === payload.name) {
          return respondWithColor(0);
        }

        return cascadeRenameInFormulas(db, oldData.name, payload.name)
          .then((updated) => respondWithColor(updated))
          .catch(() => respondWithColor(0, 'Formula rename cascade failed.'));
      }
    );

      return null;
    }
  );
});

// DELETE /api/mont-marte-colors/:id
router.delete('/mont-marte-colors/:id', (req, res) => {
  const colorId = parsePositiveId(req.params.id);
  if (!colorId) {
    return sendError(res, 400, 'Invalid color id.');
  }

  db.get('SELECT image_path FROM mont_marte_colors WHERE id = ?', [colorId], (err, row) => {
    if (err) {
      return sendError(res, 500, err.message);
    }
    if (!row) {
      return sendError(res, 404, 'Color not found.');
    }

    db.run('DELETE FROM mont_marte_colors WHERE id = ?', [colorId], function onDelete(deleteErr) {
      if (deleteErr) {
        return sendError(res, 500, deleteErr.message);
      }
      if (this.changes === 0) {
        return sendError(res, 404, 'Color not found.');
      }

      if (row.image_path) {
        const imagePath = path.join(__dirname, '..', 'uploads', path.basename(row.image_path));
        fs.unlink(imagePath, () => {});
      }

      return res.json({ success: true, message: 'Color deleted successfully.' });
    });

    return null;
  });
});

module.exports = router;
