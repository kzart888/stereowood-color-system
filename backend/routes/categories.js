/* =========================================================
   Module: backend/routes/categories.js
   Responsibility: Color categories full CRUD operations
   Imports/Relations: Uses db from db/index
   Origin: Extracted from backend/server.js (2025-08), enhanced 2025-01
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   Related: custom-colors references category_id
   ========================================================= */

const express = require('express');
const router = express.Router();
const { db } = require('../db/index');

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
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// POST /api/categories - Create new category
router.post('/categories', (req, res) => {
  const { code, name, display_order } = req.body;
  
  // Validate input
  if (!name) {
    return res.status(400).json({ error: '分类名称不能为空' });
  }
  
  // Generate code if not provided
  let categoryCode = code;
  if (!categoryCode) {
    // Generate code from first two letters of name or use CT (Category) + number
    const prefix = name.length >= 2 ? name.substring(0, 2).toUpperCase() : 'CT';
    categoryCode = prefix;
  }
  
  const order = display_order || 999;
  
  db.run(
    'INSERT INTO color_categories (code, name, display_order, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
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
          color_count: 0 
        });
      }
    }
  );
});

// PUT /api/categories/reorder - Batch update display order (must be before /:id)
router.put('/categories/reorder', (req, res) => {
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
        'UPDATE color_categories SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
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

// PUT /api/categories/:id - Update category name and/or code
router.put('/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name, code } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '分类名称不能为空' });
  }
  
  // Build update query dynamically based on provided fields
  let updateFields = ['name = ?'];
  let updateValues = [name];
  
  if (code !== undefined) {
    updateFields.push('code = ?');
    updateValues.push(code.toUpperCase());
  }
  
  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  updateValues.push(id);
  
  const updateQuery = `UPDATE color_categories SET ${updateFields.join(', ')} WHERE id = ?`;
  
  db.run(
    updateQuery,
    updateValues,
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

// DELETE /api/categories/:id - Delete category (with protection)
router.delete('/categories/:id', (req, res) => {
  const { id } = req.params;
  
  // First check if category has any colors
  db.get(
    'SELECT COUNT(*) as count FROM custom_colors WHERE category_id = ?',
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (row.count > 0) {
        return res.status(400).json({ 
          error: `该分类下有 ${row.count} 个颜色，无法删除` 
        });
      }
      
      // Safe to delete
      db.run('DELETE FROM color_categories WHERE id = ?', [id], function (err) {
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