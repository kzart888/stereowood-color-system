/* =========================================================
   Module: backend/routes/categories.js
   Responsibility: Color categories full CRUD operations
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   ========================================================= */

const express = require('express');
const router = express.Router();
const { db } = require('../db/index');
const {
  parseRequiredName,
  buildCategoryCode,
  parseDisplayOrder,
  parsePositiveId,
  parseReorderUpdates,
  mapWriteError,
  sendError,
} = require('./helpers/category-route-utils');

// GET /api/categories - List all categories with color count
router.get('/categories', (req, res) => {
  const query = `
    SELECT
      cc.id,
      cc.code,
      cc.name,
      cc.display_order,
      cc.created_at,
      cc.updated_at,
      COUNT(colors.id) as color_count
    FROM color_categories cc
    LEFT JOIN custom_colors colors ON cc.id = colors.category_id
    GROUP BY cc.id
    ORDER BY cc.display_order, cc.id
  `;

  db.all(query, (err, rows) => {
    if (err) {
      return sendError(res, 500, err.message);
    }
    return res.json(rows);
  });
});

// POST /api/categories - Create new category
router.post('/categories', (req, res) => {
  const { code, name, display_order } = req.body;

  const normalizedName = parseRequiredName(name);
  if (!normalizedName) {
    return sendError(res, 400, 'Category name is required.');
  }

  const order = parseDisplayOrder(display_order);
  if (order === null) {
    return sendError(res, 400, 'display_order must be an integer.');
  }

  const categoryCode = buildCategoryCode(code, normalizedName, 'CT');

  db.run(
    'INSERT INTO color_categories (code, name, display_order, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
    [categoryCode, normalizedName, order],
    function onInsert(err) {
      if (err) {
        const mapped = mapWriteError(err, 'Category code already exists.');
        return sendError(res, mapped.status, mapped.error);
      }

      return res.json({
        id: this.lastID,
        code: categoryCode,
        name: normalizedName,
        display_order: order,
        color_count: 0,
      });
    }
  );
});

// PUT /api/categories/reorder - Batch update display order (must be before /:id)
router.put('/categories/reorder', (req, res) => {
  const parseResult = parseReorderUpdates(req.body);
  if (parseResult.error) {
    return sendError(res, 400, parseResult.error);
  }

  const updates = parseResult.value;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    if (updates.length === 0) {
      db.run('COMMIT');
      return res.json({ success: true, message: 'No category order updates provided.' });
    }

    const errors = [];
    let completed = 0;

    updates.forEach((update) => {
      db.run(
        'UPDATE color_categories SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [update.display_order, update.id],
        (err) => {
          if (err) {
            errors.push({ id: update.id, error: err.message });
          }
          completed += 1;

          if (completed === updates.length) {
            if (errors.length > 0) {
              db.run('ROLLBACK');
              return sendError(res, 400, 'Failed to reorder some categories.', { details: errors });
            }

            db.run('COMMIT');
            return res.json({ success: true, message: `Updated ${updates.length} categories.` });
          }

          return null;
        }
      );
    });

    return null;
  });
});

// PUT /api/categories/:id - Update category name and/or code
router.put('/categories/:id', (req, res) => {
  const id = parsePositiveId(req.params.id);
  const { name, code } = req.body;

  if (!id) {
    return sendError(res, 400, 'Invalid category id.');
  }

  const normalizedName = parseRequiredName(name);
  if (!normalizedName) {
    return sendError(res, 400, 'Category name is required.');
  }

  const updateFields = ['name = ?'];
  const updateValues = [normalizedName];

  if (code !== undefined) {
    if (typeof code !== 'string' || !code.trim()) {
      return sendError(res, 400, 'Category code cannot be empty when provided.');
    }
    updateFields.push('code = ?');
    updateValues.push(code.trim().toUpperCase());
  }

  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  updateValues.push(id);

  const updateQuery = `UPDATE color_categories SET ${updateFields.join(', ')} WHERE id = ?`;

  db.run(updateQuery, updateValues, function onUpdate(err) {
    if (err) {
      const mapped = mapWriteError(err, 'Category code already exists.');
      return sendError(res, mapped.status, mapped.error);
    }
    if (this.changes === 0) {
      return sendError(res, 404, 'Category not found.');
    }
    return res.json({ success: true, message: 'Category updated.' });
  });
});

// DELETE /api/categories/:id - Delete category (with protection)
router.delete('/categories/:id', (req, res) => {
  const id = parsePositiveId(req.params.id);

  if (!id) {
    return sendError(res, 400, 'Invalid category id.');
  }

  db.get('SELECT COUNT(*) as count FROM custom_colors WHERE category_id = ?', [id], (err, row) => {
    if (err) {
      return sendError(res, 500, err.message);
    }

    if (row.count > 0) {
      return sendError(res, 400, `Category still has ${row.count} linked colors.`);
    }

    db.run('DELETE FROM color_categories WHERE id = ?', [id], function onDelete(deleteErr) {
      if (deleteErr) {
        return sendError(res, 500, deleteErr.message);
      }
      if (this.changes === 0) {
        return sendError(res, 404, 'Category not found.');
      }
      return res.json({ success: true, message: 'Category deleted.' });
    });

    return null;
  });
});

module.exports = router;
