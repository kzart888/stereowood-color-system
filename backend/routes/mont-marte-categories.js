/* =========================================================
   Module: backend/routes/mont-marte-categories.js
   Responsibility: Mont-Marte categories full CRUD operations
   Created: 2025-01 (Category System Redesign)
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   Related: mont-marte-colors references category_id
   ========================================================= */

const express = require('express');
const router = express.Router();
const { db } = require('../db/index');

// GET /api/mont-marte-categories - List all categories with material count
router.get('/mont-marte-categories', (req, res) => {
  const query = `
    SELECT 
      mc.id,
      mc.code,
      mc.name,
      mc.display_order,
      mc.created_at,
      mc.updated_at,
      COUNT(materials.id) as material_count
    FROM mont_marte_categories mc
    LEFT JOIN mont_marte_colors materials ON mc.id = materials.category_id
    GROUP BY mc.id
    ORDER BY mc.display_order, mc.id
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// POST /api/mont-marte-categories - Create new category
router.post('/mont-marte-categories', (req, res) => {
  const { code, name, display_order } = req.body;
  
  // Validate input
  if (!name) {
    return res.status(400).json({ error: '分类名称不能为空' });
  }
  
  // Generate code if not provided
  let categoryCode = code;
  if (!categoryCode) {
    // Generate code from first two letters of name or use MC (Material Category) + number
    const prefix = name.length >= 2 ? name.substring(0, 2).toUpperCase() : 'MC';
    categoryCode = prefix;
  }
  
  const order = display_order || 999;
  
  db.run(
    'INSERT INTO mont_marte_categories (code, name, display_order, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
    [categoryCode, name, order],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          res.status(400).json({ error: '分类代码已存在，请使用其他代码' });
        } else {
          res.status(400).json({ error: err.message });
        }
      } else {
        res.json({ 
          id: this.lastID, 
          code: categoryCode, 
          name, 
          display_order: order,
          material_count: 0 
        });
      }
    }
  );
});

// PUT /api/mont-marte-categories/reorder - Batch update display order (must be before /:id)
router.put('/mont-marte-categories/reorder', (req, res) => {
  const updates = req.body; // Array of {id, display_order}
  
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: '请提供更新数组' });
  }
  
  // Use transaction for atomic updates
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    let errors = [];
    let completed = 0;
    
    updates.forEach((update, index) => {
      db.run(
        'UPDATE mont_marte_categories SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [update.display_order, update.id],
        (err) => {
          if (err) {
            errors.push({ id: update.id, error: err.message });
          }
          completed++;
          
          if (completed === updates.length) {
            if (errors.length > 0) {
              db.run('ROLLBACK');
              res.status(400).json({ error: '部分更新失败', details: errors });
            } else {
              db.run('COMMIT');
              res.json({ success: true, message: `成功更新 ${updates.length} 个分类的顺序` });
            }
          }
        }
      );
    });
    
    if (updates.length === 0) {
      db.run('COMMIT');
      res.json({ success: true, message: '没有需要更新的项目' });
    }
  });
});

// PUT /api/mont-marte-categories/:id - Rename category
router.put('/mont-marte-categories/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '分类名称不能为空' });
  }
  
  db.run(
    'UPDATE mont_marte_categories SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: '分类不存在' });
      } else {
        res.json({ success: true, message: '分类名称已更新' });
      }
    }
  );
});

// DELETE /api/mont-marte-categories/:id - Delete category (with protection)
router.delete('/mont-marte-categories/:id', (req, res) => {
  const { id } = req.params;
  
  // First check if category has any materials
  db.get(
    'SELECT COUNT(*) as count FROM mont_marte_colors WHERE category_id = ?',
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (row.count > 0) {
        return res.status(400).json({ 
          error: `该分类下有 ${row.count} 个颜料，无法删除` 
        });
      }
      
      // Safe to delete
      db.run('DELETE FROM mont_marte_categories WHERE id = ?', [id], function (err) {
        if (err) {
          res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
          res.status(404).json({ error: '分类不存在' });
        } else {
          res.json({ success: true, message: '分类已删除' });
        }
      });
    }
  );
});

module.exports = router;