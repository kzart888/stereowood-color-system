/* =========================================================
   Module: backend/routes/custom-colors.js
   Responsibility: CRUD routes for Custom Colors and their history
   Imports/Relations: Uses db from db/index; multer for image upload
   Origin: Extracted from backend/server.js (2025-08), behavior preserved
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   Related: artworks routes (scheme_layers references custom_colors)
   ========================================================= */

const express = require('express');
const router = express.Router();
const { db } = require('../db/index');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config (same as server.js)
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/'); },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// GET /api/custom-colors
router.get('/custom-colors', (req, res) => {
  const sql = `
        SELECT cc.*, cat.name as category_name, cat.code as category_code
        FROM custom_colors cc
        LEFT JOIN color_categories cat ON cc.category_id = cat.id
        ORDER BY cc.color_code
    `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// POST /api/custom-colors
router.post('/custom-colors', upload.single('image'), (req, res) => {
  const { category_id, color_code, formula, applicable_layers } = req.body;
  const imagePath = req.file ? req.file.filename : null;

  db.run(
    `INSERT INTO custom_colors (category_id, color_code, image_path, formula, applicable_layers)
            VALUES (?, ?, ?, ?, ?)`,
    [category_id, color_code, imagePath, formula, applicable_layers],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({
          id: this.lastID,
          category_id,
          color_code,
          image_path: imagePath,
          formula,
          applicable_layers,
        });
      }
    }
  );
});

// GET /api/custom-colors/:id/history
router.get('/custom-colors/:id/history', (req, res) => {
  const colorId = req.params.id;
  db.all(
    'SELECT * FROM custom_colors_history WHERE custom_color_id = ? ORDER BY archived_at DESC',
    [colorId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    }
  );
});

// DELETE /api/custom-colors/:id
router.delete('/custom-colors/:id', (req, res) => {
  const colorId = req.params.id;

  // 检查颜色是否存在，并获取图片路径
  db.get('SELECT * FROM custom_colors WHERE id = ?', [colorId], (err, color) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!color) {
      return res.status(404).json({ error: '颜色不存在' });
    }

    // 检查是否被配色方案引用
    db.get(
      `SELECT COUNT(*) as count FROM scheme_layers WHERE custom_color_id = ?`,
      [colorId],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (result && result.count > 0) {
          return res.status(400).json({ error: '此颜色已被配色方案使用，无法删除' });
        }

        // 保存到历史记录（可选）
        db.run(
          `INSERT INTO custom_colors_history 
                    (custom_color_id, color_code, image_path, formula, applicable_layers) 
                    VALUES (?, ?, ?, ?, ?)`,
          [colorId, color.color_code, color.image_path, color.formula, color.applicable_layers],
          (err) => {
            if (err) {
              console.error('保存历史记录失败:', err);
              // 历史记录保存失败不影响删除操作
            }
          }
        );

        // 删除数据库记录
        db.run('DELETE FROM custom_colors WHERE id = ?', [colorId], function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: '颜色不存在' });
          }

          // 如果有图片，尝试删除图片文件
          if (color.image_path) {
            const imagePath = path.join(__dirname, '..', 'uploads', color.image_path);
            fs.unlink(imagePath, (err) => {
              if (err) {
                console.error('删除图片文件失败:', err);
                // 图片删除失败不影响整体操作
              } else {
                console.log('旧图片已删除:', color.image_path);
              }
            });
          }

          res.json({ success: true, message: '自配颜色删除成功', deletedColor: color.color_code });
        });
      }
    );
  });
});

// PUT /api/custom-colors/:id
router.put('/custom-colors/:id', upload.single('image'), (req, res) => {
  const colorId = req.params.id;
  const { category_id, color_code, formula, applicable_layers, existingImagePath } = req.body;
  const imagePath = req.file ? req.file.filename : existingImagePath || null;

  db.get('SELECT * FROM custom_colors WHERE id = ?', [colorId], (err, oldData) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!oldData) return res.status(404).json({ error: '自配颜色不存在' });

    db.run(
      `UPDATE custom_colors SET 
                category_id = ?, 
                color_code = ?, 
                image_path = ?, 
                formula = ?, 
                applicable_layers = ?, 
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
      [category_id, color_code, imagePath, formula, applicable_layers, colorId],
      function (updateErr) {
        if (updateErr) return res.status(400).json({ error: updateErr.message });

        // 删除旧图片文件（如有新图且旧图不同）
        if (req.file && oldData.image_path && oldData.image_path !== imagePath) {
          const oldImagePath = path.join(__dirname, '..', 'uploads', oldData.image_path);
          fs.unlink(oldImagePath, () => {});
        }

        db.get('SELECT * FROM custom_colors WHERE id = ?', [colorId], (err2, row) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json(row);
        });
      }
    );
  });
});

module.exports = router;
