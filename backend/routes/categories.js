/* =========================================================
   Module: backend/routes/categories.js
   Responsibility: Color categories CRUD (currently list + create)
   Imports/Relations: Uses db from db/index
   Origin: Extracted from backend/server.js (2025-08), behavior preserved
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   Related: custom-colors references category_id
   ========================================================= */

const express = require('express');
const router = express.Router();
const { db } = require('../db/index');

// GET /api/categories
router.get('/categories', (req, res) => {
  db.all(`
    SELECT id, code, name, created_at, order_index
    FROM color_categories 
    ORDER BY 
      CASE WHEN order_index IS NOT NULL THEN order_index ELSE 999 END ASC,
      code ASC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      // 添加 order 字段映射
      const mappedRows = rows.map(row => ({
        ...row,
        order: row.order_index
      }));
      res.json(mappedRows);
    }
  });
});

// POST /api/categories
router.post('/categories', (req, res) => {
  const { code, name } = req.body;
  
  // 验证必填字段
  if (!code || !name) {
    return res.status(400).json({ error: '分类代码和名称都是必填项' });
  }
  
  // 检查代码是否已存在
  db.get('SELECT id FROM color_categories WHERE code = ?', [code], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      return res.status(400).json({ error: '分类代码已存在' });
    }
    
    // 插入新分类
    db.run('INSERT INTO color_categories (code, name) VALUES (?, ?)', [code, name], function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, code, name });
      }
    });
  });
});

// PUT /api/categories/reorder
router.put('/categories/reorder', (req, res) => {
  const { orders } = req.body;
  
  if (!Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({ error: '排序数据无效' });
  }
  
  // 开启事务
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    let completed = 0;
    let hasError = false;
    
    orders.forEach((item, index) => {
      if (hasError) return;
      
      const { id, order } = item;
      
      db.run(
        'UPDATE color_categories SET order_index = ? WHERE id = ?',
        [order, id],
        function (err) {
          if (err && !hasError) {
            hasError = true;
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          
          completed++;
          
          // 所有更新完成
          if (completed === orders.length && !hasError) {
            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                return res.status(500).json({ error: commitErr.message });
              }
              res.json({ message: '排序保存成功', updated: completed });
            });
          }
        }
      );
    });
  });
});

// PUT /api/categories/:id
router.put('/categories/:id', (req, res) => {
  const { id } = req.params;
  const { code, name } = req.body;
  
  // 验证必填字段
  if (!name) {
    return res.status(400).json({ error: '分类名称是必填项' });
  }
  
  // 移除虚拟分类限制，允许所有分类一视同仁地进行编辑
  
  // 检查分类是否存在
  db.get('SELECT * FROM color_categories WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '分类不存在' });
    }
    
    // 如果代码发生变化，检查新代码是否已被使用
    const checkCodeQuery = code && code !== row.code 
      ? 'SELECT id FROM color_categories WHERE code = ? AND id != ?'
      : null;
      
    if (checkCodeQuery) {
      db.get(checkCodeQuery, [code, id], (err, existingRow) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (existingRow) {
          return res.status(400).json({ error: '分类代码已存在' });
        }
        updateCategory();
      });
    } else {
      updateCategory();
    }
    
    function updateCategory() {
      // 构建更新语句
      const updateFields = [];
      const updateValues = [];
      let codeChanged = false;
      
      if (code && code !== row.code) {
        updateFields.push('code = ?');
        updateValues.push(code);
        codeChanged = true;
      }
      
      if (name !== row.name) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }
      
      if (updateFields.length === 0) {
        return res.json(row); // 没有变化
      }
      
      updateValues.push(id);
      
      // 如果代码发生变更，检查影响范围并添加警告信息
      if (codeChanged) {
        db.get('SELECT COUNT(*) as count FROM custom_colors WHERE category_id = ?', [id], (err, countResult) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          const affectedCount = countResult.count;
          performUpdate(affectedCount);
        });
      } else {
        performUpdate(0);
      }
      
      function performUpdate(affectedCount) {
        db.run(
          `UPDATE color_categories SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues,
          function (err) {
            if (err) {
              res.status(500).json({ error: err.message });
            } else {
              // 返回更新后的数据
              db.get('SELECT * FROM color_categories WHERE id = ?', [id], (err, updatedRow) => {
                if (err) {
                  res.status(500).json({ error: err.message });
                } else {
                  const result = { ...updatedRow };
                  
                  // 如果代码变更且有影响的自配色，添加警告信息
                  if (codeChanged && affectedCount > 0) {
                    result.warning = {
                      type: 'code_changed',
                      message: `色系代码已从 "${row.code}" 更改为 "${code}"，将影响 ${affectedCount} 个自配色的编号和自动分类`,
                      affectedCount: affectedCount,
                      oldCode: row.code,
                      newCode: code
                    };
                  }
                  
                  res.json(result);
                }
              });
            }
          }
        );
      }
    }
  });
});

// DELETE /api/categories/:id
router.delete('/categories/:id', (req, res) => {
  const { id } = req.params;
  
  // 移除虚拟分类限制，允许所有分类一视同仁地进行删除
  
  // 检查分类是否存在
  db.get('SELECT * FROM color_categories WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '分类不存在' });
    }
    
    // 检查是否有自配色使用该分类
    db.get('SELECT COUNT(*) as count FROM custom_colors WHERE category_id = ?', [id], (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (countResult.count > 0) {
        return res.status(400).json({ error: `该分类下还有${countResult.count}个自配色，无法删除` });
      }
      
      // 删除分类
      db.run('DELETE FROM color_categories WHERE id = ?', [id], function (err) {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({ message: '分类删除成功', deleted: row });
        }
      });
    });
  });
});

module.exports = router;
