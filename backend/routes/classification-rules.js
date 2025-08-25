/* =========================================================
   Module: backend/routes/classification-rules.js
   Responsibility: 分类规则引擎 CRUD API
   Imports/Relations: Uses db from db/index
   Origin: Created for rule-based classification system (2025-08)
   Contract: Mount under /api
   Notes: 配置化规则系统，替代硬编码分类逻辑
   Related: Replaces hardcoded logic in custom-colors.js
   ========================================================= */

const express = require('express');
const router = express.Router();
const { db } = require('../db/index');
const classificationEngine = require('../services/classification-engine');

// GET /api/classification-rules - 获取所有分类规则
router.get('/classification-rules', (req, res) => {
  const sql = `
    SELECT 
      cr.*,
      cc.name as category_name,
      cc.code as category_code
    FROM category_rules cr
    LEFT JOIN color_categories cc ON cr.target_category_id = cc.id
    ORDER BY cr.priority ASC, cr.created_at DESC
  `;
  
  db.all(sql, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// POST /api/classification-rules - 创建新规则
router.post('/classification-rules', (req, res) => {
  const { 
    rule_name, 
    rule_type, 
    source_type, 
    target_category_id, 
    pattern, 
    priority = 100,
    is_active = true 
  } = req.body;
  
  // 验证必填字段
  if (!rule_name || !rule_type || !source_type || !target_category_id) {
    return res.status(400).json({ 
      error: '规则名称、规则类型、源类型和目标分类都是必填项' 
    });
  }
  
  // 验证规则类型
  if (!['color_code_generation', 'auto_classification'].includes(rule_type)) {
    return res.status(400).json({ 
      error: '规则类型必须是 color_code_generation 或 auto_classification' 
    });
  }
  
  // 验证源类型
  if (!['category_code', 'color_name_pattern', 'manual'].includes(source_type)) {
    return res.status(400).json({ 
      error: '源类型必须是 category_code、color_name_pattern 或 manual' 
    });
  }
  
  const sql = `
    INSERT INTO category_rules 
    (rule_name, rule_type, source_type, target_category_id, pattern, priority, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(sql, [rule_name, rule_type, source_type, target_category_id, pattern, priority, is_active], function (err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: '规则名称已存在' });
      } else {
        res.status(500).json({ error: err.message });
      }
    } else {
      // 返回创建的规则详情
      db.get(`
        SELECT 
          cr.*,
          cc.name as category_name,
          cc.code as category_code
        FROM category_rules cr
        LEFT JOIN color_categories cc ON cr.target_category_id = cc.id
        WHERE cr.id = ?
      `, [this.lastID], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json(row);
        }
      });
    }
  });
});

// PUT /api/classification-rules/:id - 更新规则
router.put('/classification-rules/:id', (req, res) => {
  const { id } = req.params;
  const { 
    rule_name, 
    rule_type, 
    source_type, 
    target_category_id, 
    pattern, 
    priority,
    is_active 
  } = req.body;
  
  // 检查规则是否存在
  db.get('SELECT * FROM category_rules WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '规则不存在' });
    }
    
    // 构建更新语句
    const updateFields = [];
    const updateValues = [];
    
    if (rule_name && rule_name !== row.rule_name) {
      updateFields.push('rule_name = ?');
      updateValues.push(rule_name);
    }
    
    if (rule_type && rule_type !== row.rule_type) {
      // 验证规则类型
      if (!['color_code_generation', 'auto_classification'].includes(rule_type)) {
        return res.status(400).json({ 
          error: '规则类型必须是 color_code_generation 或 auto_classification' 
        });
      }
      updateFields.push('rule_type = ?');
      updateValues.push(rule_type);
    }
    
    if (source_type && source_type !== row.source_type) {
      // 验证源类型
      if (!['category_code', 'color_name_pattern', 'manual'].includes(source_type)) {
        return res.status(400).json({ 
          error: '源类型必须是 category_code、color_name_pattern 或 manual' 
        });
      }
      updateFields.push('source_type = ?');
      updateValues.push(source_type);
    }
    
    if (target_category_id && target_category_id !== row.target_category_id) {
      updateFields.push('target_category_id = ?');
      updateValues.push(target_category_id);
    }
    
    if (pattern !== undefined && pattern !== row.pattern) {
      updateFields.push('pattern = ?');
      updateValues.push(pattern);
    }
    
    if (priority !== undefined && priority !== row.priority) {
      updateFields.push('priority = ?');
      updateValues.push(priority);
    }
    
    if (is_active !== undefined && is_active !== row.is_active) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active);
    }
    
    if (updateFields.length === 0) {
      return res.json(row); // 没有变化
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);
    
    db.run(
      `UPDATE category_rules SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues,
      function (err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: '规则名称已存在' });
          } else {
            res.status(500).json({ error: err.message });
          }
        } else {
          // 返回更新后的数据
          db.get(`
            SELECT 
              cr.*,
              cc.name as category_name,
              cc.code as category_code
            FROM category_rules cr
            LEFT JOIN color_categories cc ON cr.target_category_id = cc.id
            WHERE cr.id = ?
          `, [id], (err, updatedRow) => {
            if (err) {
              res.status(500).json({ error: err.message });
            } else {
              res.json(updatedRow);
            }
          });
        }
      }
    );
  });
});

// DELETE /api/classification-rules/:id - 删除规则
router.delete('/classification-rules/:id', (req, res) => {
  const { id } = req.params;
  
  // 检查规则是否存在
  db.get('SELECT * FROM category_rules WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '规则不存在' });
    }
    
    // 检查是否有分类日志引用该规则
    db.get('SELECT COUNT(*) as count FROM color_classification_logs WHERE rule_id = ?', [id], (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (countResult.count > 0) {
        return res.status(400).json({ 
          error: `该规则已被 ${countResult.count} 个分类记录使用，建议停用而非删除` 
        });
      }
      
      // 删除规则
      db.run('DELETE FROM category_rules WHERE id = ?', [id], function (err) {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({ message: '规则删除成功', deleted: row });
        }
      });
    });
  });
});

// POST /api/classification-rules/:id/toggle - 切换规则启用状态
router.post('/classification-rules/:id/toggle', (req, res) => {
  const { id } = req.params;
  
  // 获取当前状态并切换
  db.get('SELECT * FROM category_rules WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '规则不存在' });
    }
    
    const newStatus = !row.is_active;
    
    db.run(
      'UPDATE category_rules SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, id],
      function (err) {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({ 
            message: `规则已${newStatus ? '启用' : '停用'}`, 
            is_active: newStatus 
          });
        }
      }
    );
  });
});

// POST /api/classification-rules/generate-code - 生成颜色编号
router.post('/classification-rules/generate-code', async (req, res) => {
  const { categoryId, existingCodes = [] } = req.body;
  
  if (!categoryId) {
    return res.status(400).json({ error: '分类ID是必填项' });
  }
  
  try {
    const colorCode = await classificationEngine.generateColorCode(categoryId, existingCodes);
    res.json({ colorCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/classification-rules/classify - 自动分类颜色
router.post('/classification-rules/classify', async (req, res) => {
  const { colorName, colorCode = null } = req.body;
  
  if (!colorName) {
    return res.status(400).json({ error: '颜色名称是必填项' });
  }
  
  try {
    const result = await classificationEngine.autoClassifyByName(colorName, colorCode);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/classification-rules/history - 获取分类历史
router.get('/classification-rules/history', async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  
  try {
    const history = await classificationEngine.getClassificationHistory(limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;