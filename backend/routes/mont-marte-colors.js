/* =========================================================
   Module: backend/routes/mont-marte-colors.js
   Responsibility: CRUD routes for Mont Marte raw colors
   Imports/Relations: Uses db from db/index, cascadeRenameInFormulas from services/formula
   Origin: Extracted from backend/server.js (2025-08), behavior preserved
   Contract: Mount under /api
   Notes: Handles image upload via multer to /uploads, and deletes replaced old images
   Related: dictionaries.js (suppliers/purchase_links) for FKs
   ========================================================= */

const express = require('express');
const router = express.Router();
const { db } = require('../db/index');
const { cascadeRenameInFormulas } = require('../services/formula');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config (same as server.js)
const storage = multer.diskStorage({
  destination: function (req, file, cb) { 
    cb(null, path.join(__dirname, '..', 'uploads')); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// GET /api/mont-marte-colors
router.get('/mont-marte-colors', (req, res) => {
  const sql = `
  SELECT m.id, m.name, m.image_path, m.updated_at,
           m.supplier_id, s.name AS supplier_name,
       m.purchase_link_id, p.url AS purchase_link_url,
       m.category,
       m.category_id, mc.name AS category_name, mc.code AS category_code
      FROM mont_marte_colors m
      LEFT JOIN suppliers s ON s.id = m.supplier_id
      LEFT JOIN purchase_links p ON p.id = m.purchase_link_id
      LEFT JOIN mont_marte_categories mc ON mc.id = m.category_id
     ORDER BY LOWER(m.name) ASC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/mont-marte-colors
router.post('/mont-marte-colors', upload.single('image'), async (req, res) => {
  const { name, category, category_id } = req.body;
  const supplier_id = req.body.supplier_id ? Number(req.body.supplier_id) : null;
  const purchase_link_id = req.body.purchase_link_id ? Number(req.body.purchase_link_id) : null;
  const actualCategoryId = category_id ? Number(category_id) : null;
  
  let image_path = null;
  // 处理图片上传
  if (req.file) {
    image_path = req.file.filename;
    console.log('蒙马特颜色图片上传成功:', image_path);
  }

  if (!name || !name.trim()) return res.status(400).json({ error: '颜色名称不能为空' });
  // Support both old (category text) and new (category_id) for backward compatibility
  if (!actualCategoryId && (!category || !category.trim())) {
    return res.status(400).json({ error: '原料类别不能为空' });
  }

  db.run(
  `INSERT INTO mont_marte_colors(name, image_path, supplier_id, purchase_link_id, category, category_id)
   VALUES (?, ?, ?, ?, ?, ?)`,
  [name.trim(), image_path, supplier_id, purchase_link_id, category ? category.trim() : null, actualCategoryId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const id = this.lastID;
      db.get(
  `SELECT m.id, m.name, m.image_path, m.updated_at,
                m.supplier_id, s.name AS supplier_name,
    m.purchase_link_id, p.url AS purchase_link_url,
    m.category, m.category_id, mc.name AS category_name, mc.code AS category_code
           FROM mont_marte_colors m
           LEFT JOIN suppliers s ON s.id = m.supplier_id
           LEFT JOIN purchase_links p ON p.id = m.purchase_link_id
           LEFT JOIN mont_marte_categories mc ON mc.id = m.category_id
          WHERE m.id = ?`,
        [id],
        (err2, row) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json(row);
        }
      );
    }
  );
});

// PUT /api/mont-marte-colors/:id
router.put('/mont-marte-colors/:id', upload.single('image'), async (req, res) => {
  const colorId = req.params.id;
  const { name, existingImagePath, category, category_id } = req.body;
  const supplier_id = req.body.supplier_id ? Number(req.body.supplier_id) : null;
  const purchase_link_id = req.body.purchase_link_id ? Number(req.body.purchase_link_id) : null;
  const actualCategoryId = category_id ? Number(category_id) : null;

  db.get('SELECT name, image_path FROM mont_marte_colors WHERE id = ?', [colorId], async (err, oldData) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!oldData) return res.status(404).json({ error: '颜色不存在' });

    let newImagePath;
    
    // 处理新上传的图片
    if (req.file) {
      newImagePath = req.file.filename;
      console.log('蒙马特颜色编辑图片上传成功:', newImagePath);
    } else if (existingImagePath) {
      newImagePath = existingImagePath;
    } else {
      newImagePath = null;
    }

    db.run(
      `UPDATE mont_marte_colors
         SET name = ?, image_path = ?, supplier_id = ?, purchase_link_id = ?, category = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, newImagePath, supplier_id, purchase_link_id, (category||'').trim() || null, actualCategoryId, colorId],
      function (updateErr) {
        if (updateErr) return res.status(400).json({ error: updateErr.message });

        // 删除旧图片文件（若替换了）
        if (req.file && oldData.image_path && oldData.image_path !== newImagePath) {
          const oldImagePath = path.join(__dirname, '..', 'uploads', oldData.image_path);
          fs.unlink(oldImagePath, (err) => {
            if (err) console.log('删除旧图片失败:', err.message);
            else console.log('删除旧图片成功:', oldData.image_path);
          });
        }

        const doRespond = (updatedReferences = 0, warn) => {
          db.get(
      `SELECT m.id, m.name, m.image_path, m.updated_at,
                    m.supplier_id, s.name AS supplier_name,
        m.purchase_link_id, p.url AS purchase_link_url,
        m.category, m.category_id, mc.name AS category_name, mc.code AS category_code
               FROM mont_marte_colors m
               LEFT JOIN suppliers s ON s.id = m.supplier_id
               LEFT JOIN purchase_links p ON p.id = m.purchase_link_id
               LEFT JOIN mont_marte_categories mc ON mc.id = m.category_id
              WHERE m.id = ?`,
            [colorId],
            (qErr, row) => {
              if (qErr) return res.status(500).json({ error: qErr.message });
              res.json({ ...row, updatedReferences, warn });
            }
          );
        };

        // 若名称未变更，直接返回
        if (!oldData.name || oldData.name === name) {
          return doRespond(0);
        }

        // 级联替换 custom_colors.formula 中的旧名称为新名称（按 token 精确替换）
        cascadeRenameInFormulas(db, oldData.name, name)
          .then((updated) => doRespond(updated))
          .catch(() => doRespond(0, '读取配方失败，未做级联'));
      }
    );
  });
});

// DELETE /api/mont-marte-colors/:id
router.delete('/mont-marte-colors/:id', (req, res) => {
  const colorId = req.params.id;

  function deleteColor() {
    // 获取图片路径以便删除文件
    db.get('SELECT image_path FROM mont_marte_colors WHERE id = ?', [colorId], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 删除数据库记录
      db.run('DELETE FROM mont_marte_colors WHERE id = ?', [colorId], function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '颜色不存在' });
        }

        // 如果有图片，尝试删除图片文件
        if (row && row.image_path) {
          const imagePath = path.join(__dirname, '..', 'uploads', row.image_path);
          fs.unlink(imagePath, (err) => {
            if (err) console.error('删除图片文件失败:', err);
            else console.log('删除图片文件成功:', row.image_path);
          });
        }

        res.json({ success: true, message: '颜色删除成功' });
      });
    });
  }

  // 直接调用删除函数（暂时跳过引用检查）
  deleteColor();
});

module.exports = router;
