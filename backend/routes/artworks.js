/* =========================================================
   Module: backend/routes/artworks.js
   Responsibility: Artworks list and schemes CRUD (with layers and thumbnails)
   Imports/Relations: Uses db from db/index; multer for thumbnails; references custom_colors
   Origin: Extracted from backend/server.js (2025-08), behavior preserved; duplicated GET unified
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   Related: custom-colors routes
   ========================================================= */

const express = require('express');
const router = express.Router();
const { db } = require('../db/index');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config for thumbnails
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/'); },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// GET /api/artworks (unified, includes scheme name alias and layers)
router.get('/artworks', (req, res) => {
  db.all('SELECT * FROM artworks ORDER BY code', [], (err, artworks) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all(
      `SELECT cs.*, a.code as artwork_code 
         FROM color_schemes cs 
         LEFT JOIN artworks a ON cs.artwork_id = a.id`,
      [],
      (err2, schemes) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const schemeIds = schemes.map(s => s.id);
        if (schemeIds.length === 0) {
          const result = artworks.map(art => ({ ...art, schemes: [] }));
          return res.json(result);
        }

        // 拉取所有层并分组到 scheme_id
        const placeholders = schemeIds.map(() => '?').join(',');
        db.all(
          `SELECT sl.scheme_id,
                  sl.layer_number AS layer,
                  COALESCE(cc.color_code, '') AS colorCode
             FROM scheme_layers sl
             LEFT JOIN custom_colors cc ON cc.id = sl.custom_color_id
            WHERE sl.scheme_id IN (${placeholders})
            ORDER BY sl.scheme_id ASC, sl.layer_number ASC`,
          schemeIds,
          (err3, layers) => {
            if (err3) return res.status(500).json({ error: err3.message });

            const layersByScheme = new Map();
            layers.forEach(row => {
              if (!layersByScheme.has(row.scheme_id)) layersByScheme.set(row.scheme_id, []);
              layersByScheme.get(row.scheme_id).push({ layer: Number(row.layer), colorCode: row.colorCode || '' });
            });

            const result = artworks.map(artwork => {
              const artworkSchemes = schemes.filter(s => s.artwork_id === artwork.id);
              return {
                ...artwork,
                schemes: artworkSchemes.map(s => ({
                  id: s.id,
                  scheme_name: s.scheme_name,
                  name: s.scheme_name, // alias for frontend display
                  thumbnail_path: s.thumbnail_path,
                  updated_at: s.updated_at,
                  layers: layersByScheme.get(s.id) || []
                }))
              };
            });
            res.json(result);
          }
        );
      }
    );
  });
});

// POST /api/artworks
router.post('/artworks', (req, res) => {
  const { code, name } = req.body;
  db.run('INSERT INTO artworks (code, name) VALUES (?, ?)', [code, name], function (err) {
    if (err) {
      res.status(400).json({ error: err.message });
    } else {
      res.json({ id: this.lastID, code, name });
    }
  });
});

// GET /api/artworks/:id
router.get('/artworks/:id', (req, res) => {
  const artworkId = req.params.id;

  // 先获取作品基本信息
  db.get('SELECT * FROM artworks WHERE id = ?', [artworkId], (err, artwork) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!artwork) {
      return res.status(404).json({ error: '作品不存在' });
    }

    // 获取该作品的所有配色方案
    db.all(
      `SELECT * FROM color_schemes WHERE artwork_id = ? ORDER BY id`,
      [artworkId],
      (err, schemes) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // 获取每个配色方案的层数据
        const schemePromises = schemes.map((scheme) => {
          return new Promise((resolve) => {
            db.all(
              `SELECT sl.layer_number, sl.custom_color_id, cc.color_code, cc.formula
                 FROM scheme_layers sl
                 LEFT JOIN custom_colors cc ON sl.custom_color_id = cc.id
                WHERE sl.scheme_id = ?
                ORDER BY sl.layer_number`,
              [scheme.id],
              (err, layers) => {
                if (err) {
                  console.error('获取层数据失败:', err);
                  scheme.layers = [];
                } else {
                  scheme.layers = layers;
                }
                resolve(scheme);
              }
            );
          });
        });

        Promise.all(schemePromises).then((schemesWithLayers) => {
          artwork.schemes = schemesWithLayers;
          res.json(artwork);
        });
      }
    );
  });
});

// POST /api/artworks/:artworkId/schemes
// Body: FormData(name, layers=[{layer, colorCode}], thumbnail?)
router.post('/artworks/:artworkId/schemes', upload.single('thumbnail'), (req, res) => {
  const artworkId = Number(req.params.artworkId);
  const name = String(req.body.name || '').trim();
  if (!artworkId || !name) return res.status(400).json({ error: '参数不完整' });

  let layers = [];
  try { layers = JSON.parse(req.body.layers || '[]'); } catch {}
  const thumbnail_path = req.file ? req.file.filename : null;

  db.serialize(() => {
    db.run('BEGIN');
    db.run(
      `INSERT INTO color_schemes(artwork_id, scheme_name, thumbnail_path) VALUES (?, ?, ?)`,
      [artworkId, name, thumbnail_path],
      function (err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        const schemeId = this.lastID;
        // 批量插入层映射：colorCode -> custom_colors.id
        const insertLayer = db.prepare(
          `INSERT INTO scheme_layers(scheme_id, layer_number, custom_color_id)
             VALUES (?, ?, (SELECT id FROM custom_colors WHERE color_code = ?))`
        );
        layers.forEach((m) => {
          const layer = Number(m.layer);
          const code = String(m.colorCode || '').trim();
          if (Number.isFinite(layer) && layer > 0) {
            insertLayer.run([schemeId, layer, code]);
          }
        });
        insertLayer.finalize((finErr) => {
          if (finErr) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: finErr.message });
          }
          db.run(
            `UPDATE color_schemes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [schemeId],
            () => {
              db.run('COMMIT', () => res.json({ id: schemeId }));
            }
          );
        });
      }
    );
  });
});

// PUT /api/artworks/:artworkId/schemes/:schemeId
// Body: FormData(name, layers=[{layer,colorCode}], thumbnail?, existingThumbnailPath?)
router.put('/artworks/:artworkId/schemes/:schemeId', upload.single('thumbnail'), (req, res) => {
  const artworkId = Number(req.params.artworkId);
  const schemeId = Number(req.params.schemeId);
  const name = String(req.body.name || '').trim();
  if (!artworkId || !schemeId || !name) return res.status(400).json({ error: '参数不完整' });

  let layers = [];
  try { layers = JSON.parse(req.body.layers || '[]'); } catch {}
  const existing = req.body.existingThumbnailPath || null;
  const newThumb = req.file ? req.file.filename : null;

  // 查询旧缩略图以便删除
  db.get(
    `SELECT thumbnail_path FROM color_schemes WHERE id = ? AND artwork_id = ?`,
    [schemeId, artworkId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: '配色方案不存在' });

      const finalThumb = newThumb ? newThumb : existing || row.thumbnail_path || null;

      db.serialize(() => {
        db.run('BEGIN');

        db.run(
          `UPDATE color_schemes 
            SET scheme_name = ?, thumbnail_path = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND artwork_id = ?`,
          [name, finalThumb, schemeId, artworkId],
          (uErr) => {
            if (uErr) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: uErr.message });
            }

            // 重建层映射
            db.run(`DELETE FROM scheme_layers WHERE scheme_id = ?`, [schemeId], (dErr) => {
              if (dErr) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: dErr.message });
              }
              const insertLayer = db.prepare(
                `INSERT INTO scheme_layers(scheme_id, layer_number, custom_color_id)
                   VALUES (?, ?, (SELECT id FROM custom_colors WHERE color_code = ?))`
              );
              layers.forEach((m) => {
                const layer = Number(m.layer);
                const code = String(m.colorCode || '').trim();
                if (Number.isFinite(layer) && layer > 0) {
                  insertLayer.run([schemeId, layer, code]);
                }
              });
              insertLayer.finalize((finErr) => {
                if (finErr) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: finErr.message });
                }

                db.run('COMMIT', () => {
                  // 如有新缩略图，删除旧文件
                  if (newThumb && row.thumbnail_path && row.thumbnail_path !== finalThumb) {
                    const oldPath = path.join(__dirname, '..', 'uploads', row.thumbnail_path);
                    fs.unlink(oldPath, () => {});
                  }
                  res.json({ success: true });
                });
              });
            });
          }
        );
      });
    }
  );
});

module.exports = router;
