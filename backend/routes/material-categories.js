/* =========================================================
   Module: backend/routes/material-categories.js
   Responsibility: Material categories CRUD for mont_marte_colors
   Imports/Relations: Uses db from db/index
   Origin: Created for dynamic category management (2025-08)
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   Related: mont_marte_colors references category field
   ========================================================= */

const express = require('express');
const router = express.Router();
const { db } = require('../db/index');

// GET /api/material_categories
router.get('/material_categories', (req, res) => {
  // 获取所有分类（包括已使用的和仅在标签表中的），按排序号或创建时间排序
  db.all(`
    SELECT * FROM (
      SELECT 
        COALESCE(m.category, l.value) as value,
        COALESCE(l.label, m.category) as label,
        COALESCE(COUNT(m.id), 0) as count,
        COALESCE(MIN(m.created_at), l.created_at) as first_used,
        l.order_index as sort_order
      FROM material_category_labels l
      LEFT JOIN mont_marte_colors m ON l.value = m.category
      GROUP BY l.value, l.label, l.order_index
      
      UNION
      
      SELECT 
        m.category as value,
        m.category as label,
        COUNT(*) as count,
        MIN(m.created_at) as first_used,
        NULL as sort_order
      FROM mont_marte_colors m
      WHERE m.category IS NOT NULL AND m.category != ''
        AND m.category NOT IN (SELECT value FROM material_category_labels WHERE value IS NOT NULL)
      GROUP BY m.category
    )
    ORDER BY 
      CASE WHEN sort_order IS NOT NULL THEN sort_order ELSE 999 END ASC,
      first_used ASC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      // 对于没有自定义标签的分类，使用默认中文标签
      const defaultLabels = {
        'acrylic': '丙烯色',
        'essence': '色精', 
        'water': '水性漆',
        'oil': '油性漆',
        'other': '其他'
      };
      
      const mappedRows = rows.map(row => ({
        ...row,
        label: row.label === row.value ? (defaultLabels[row.value] || row.value) : row.label,
        order: row.sort_order
      }));
      
      res.json(mappedRows);
    }
  });
});

// POST /api/material_categories
router.post('/material_categories', (req, res) => {
  const { name, label } = req.body;
  const categoryName = name || label; // 支持两种参数名
  
  // 验证必填字段
  if (!categoryName) {
    return res.status(400).json({ error: '分类名称是必填项' });
  }
  
  // 自动生成分类值（英文value）
  function generateValue(name) {
    // 中文到拼音的简单映射
    const pinyinMap = {
      '丙烯': 'binglian', '丙烯色': 'binglian',
      '色精': 'sejing',  
      '水性': 'shuixing', '水性漆': 'shuixing',
      '油性': 'youxing', '油性漆': 'youxing',
      '其他': 'other',
      '金属': 'jinshu', '金属色': 'jinshu',
      '荧光': 'yingguang', '荧光色': 'yingguang',
      '珠光': 'zhuguang', '珠光色': 'zhuguang'
    };
    
    // 先尝试预设映射
    for (const [chinese, pinyin] of Object.entries(pinyinMap)) {
      if (name.includes(chinese)) {
        return pinyin;
      }
    }
    
    // 如果没有预设映射，生成简化value
    return name.toLowerCase()
      .replace(/色$/, '') // 去掉结尾的"色"
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      || 'category_' + Date.now().toString().slice(-6); // 使用时间戳后6位
  }
  
  let value = generateValue(categoryName);
  
  // 检查生成的分类值是否已存在（包括在mont_marte_colors和material_category_labels表中）
  db.get(`
    SELECT 
      (SELECT COUNT(*) FROM mont_marte_colors WHERE category = ?) +
      (SELECT COUNT(*) FROM material_category_labels WHERE value = ?) as total_count
  `, [value, value], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // 如果值已存在，添加数字后缀
    if (row.total_count > 0) {
      let counter = 1;
      const checkUnique = (testValue) => {
        db.get(`
          SELECT 
            (SELECT COUNT(*) FROM mont_marte_colors WHERE category = ?) +
            (SELECT COUNT(*) FROM material_category_labels WHERE value = ?) as total_count
        `, [testValue, testValue], (err2, row2) => {
          if (err2) {
            return res.status(500).json({ error: err2.message });
          }
          if (row2.total_count > 0) {
            counter++;
            checkUnique(value + '_' + counter);
          } else {
            value = testValue;
            saveCategory();
          }
        });
      };
      checkUnique(value + '_' + counter);
    } else {
      saveCategory();
    }
    
    function saveCategory() {
      // 保存分类标签映射
      db.run(
        `INSERT INTO material_category_labels (value, label, created_at, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [value, categoryName],
        function (err) {
          if (err) {
            res.status(500).json({ error: err.message });
          } else {
            res.json({ 
              value, 
              label: categoryName, 
              count: 0,
              message: '分类添加成功'
            });
          }
        }
      );
    }
  });
});

// PUT /api/material_categories/reorder
router.put('/material_categories/reorder', (req, res) => {
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
      
      const { id: value, order } = item;
      
      // 确保该分类在标签表中存在，如果不存在则插入
      db.run(
        `INSERT OR IGNORE INTO material_category_labels (value, label, order_index, created_at, updated_at) 
         SELECT ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         WHERE NOT EXISTS (SELECT 1 FROM material_category_labels WHERE value = ?)`,
        [value, value, order, value],
        function (insertErr) {
          if (insertErr && !hasError) {
            hasError = true;
            db.run('ROLLBACK');
            return res.status(500).json({ error: insertErr.message });
          }
          
          // 更新排序
          db.run(
            'UPDATE material_category_labels SET order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE value = ?',
            [order, value],
            function (updateErr) {
              if (updateErr && !hasError) {
                hasError = true;
                db.run('ROLLBACK');
                return res.status(500).json({ error: updateErr.message });
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
        }
      );
    });
  });
});

// PUT /api/material_categories/:value
router.put('/material_categories/:value', (req, res) => {
  const oldValue = decodeURIComponent(req.params.value);
  const { value: newValue, label } = req.body;
  
  // 如果没有提供新值，说明只是更新标签
  const actualNewValue = newValue || oldValue;
  
  // 检查旧分类是否存在（在两个表中检查）
  db.get(`
    SELECT 
      COALESCE((SELECT COUNT(*) FROM mont_marte_colors WHERE category = ?), 0) as usage_count,
      COALESCE((SELECT COUNT(*) FROM material_category_labels WHERE value = ?), 0) as label_exists
  `, [oldValue, oldValue], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row.usage_count === 0 && row.label_exists === 0) {
      return res.status(404).json({ error: '分类不存在' });
    }
    
    // 如果分类值发生变化，检查新值是否已被使用
    if (actualNewValue !== oldValue) {
      db.get('SELECT COUNT(*) as count FROM mont_marte_colors WHERE category = ?', [actualNewValue], (err, existingRow) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (existingRow.count > 0) {
          return res.status(400).json({ error: '新的分类值已存在' });
        }
        updateCategory();
      });
    } else {
      // 只是更新标签，保存到 material_category_labels 表
      updateLabel();
    }
    
    function updateLabel() {
      // 更新或插入标签映射
      db.run(
        `INSERT OR REPLACE INTO material_category_labels (value, label, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [oldValue, label || oldValue],
        function (err) {
          if (err) {
            res.status(500).json({ error: err.message });
          } else {
            res.json({ 
              value: oldValue, 
              label: label || oldValue, 
              count: row.usage_count,
              message: '分类标签已更新'
            });
          }
        }
      );
    }
    
    function updateCategory() {
      // 更新所有使用旧分类值的记录
      db.run(
        'UPDATE mont_marte_colors SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ?',
        [actualNewValue, oldValue],
        function (err) {
          if (err) {
            res.status(500).json({ error: err.message });
          } else {
            // 同时更新标签映射
            db.run(
              `DELETE FROM material_category_labels WHERE value = ?`,
              [oldValue],
              () => {
                db.run(
                  `INSERT OR REPLACE INTO material_category_labels (value, label, updated_at) 
                   VALUES (?, ?, CURRENT_TIMESTAMP)`,
                  [actualNewValue, label || actualNewValue],
                  (labelErr) => {
                    res.json({ 
                      value: actualNewValue, 
                      label: label || actualNewValue, 
                      count: this.changes,
                      message: `已更新${this.changes}个颜料的分类`
                    });
                  }
                );
              }
            );
          }
        }
      );
    }
  });
});

// DELETE /api/material_categories/:value
router.delete('/material_categories/:value', (req, res) => {
  const value = decodeURIComponent(req.params.value);
  
  // 检查分类是否存在（在两个表中检查）以及使用数量
  db.get(`
    SELECT 
      COALESCE((SELECT COUNT(*) FROM mont_marte_colors WHERE category = ?), 0) as usage_count,
      COALESCE((SELECT COUNT(*) FROM material_category_labels WHERE value = ?), 0) as label_exists
  `, [value, value], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // 检查分类是否存在（在任一表中）
    if (row.usage_count === 0 && row.label_exists === 0) {
      return res.status(404).json({ error: '分类不存在' });
    }
    
    // 如果有颜料使用该分类，不能删除
    if (row.usage_count > 0) {
      return res.status(400).json({ error: `该分类下还有${row.usage_count}个颜料，无法删除` });
    }
    
    // 删除标签映射（如果存在）
    db.run('DELETE FROM material_category_labels WHERE value = ?', [value], function (deleteErr) {
      if (deleteErr) {
        return res.status(500).json({ error: deleteErr.message });
      }
      
      res.json({ 
        message: '分类删除成功', 
        deleted: { value, count: row.usage_count }
      });
    });
  });
});

// 批量清理空分类值（工具接口）
router.post('/material_categories/cleanup', (req, res) => {
  db.run(
    `UPDATE mont_marte_colors 
     SET category = NULL, updated_at = CURRENT_TIMESTAMP 
     WHERE category = '' OR category IS NULL`,
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ 
          message: '清理完成', 
          cleaned: this.changes 
        });
      }
    }
  );
});

module.exports = router;