/* =========================================================
   Backend Roadmap / 模块导航（重构指引）

   目标：将当前单文件路由拆分为 db / services / routes 三层。
   现状：本文件包含全部表结构、工具方法与路由，易膨胀、易重复（如 /api/artworks 路由出现过两处定义）。

   计划结构：
   - db/index.js        -> 暴露 db 实例，设置 PRAGMA（WAL、busy_timeout=5000、foreign_keys=ON）
   - db/migrations.js   -> 表初始化与后续迁移（本文件中的 initDatabase / runMigrations 将搬到此处）
   - services/formula.js-> replaceColorNameInFormula / cascadeRenameInFormulas（供 routes/mont-marte-colors 调用）
   - routes/
       custom-colors.js       -> /api/custom-colors* 与 /api/custom-colors/:id/history
       mont-marte-colors.js   -> /api/mont-marte-colors*（含 PUT 时触发级联重命名）
       artworks.js            -> /api/artworks*（含 /:id，/:artworkId/schemes 等）
       dictionaries.js        -> /api/suppliers* /api/purchase-links*
       index.js               -> 聚合并导出一个 Router，server.js 仅 app.us});

// 更新自配颜色, router)
   - uploads/ 静态资源目录（保持）

   渐进式迁移步骤：
   1) 提取 db/index.js + db/migrations.js，server.js 改为 require 这两个模块（行为不变）
   2) 提取 services/formula.js（把级联重命名工具迁出），路由引用它
   3) 拆 routes/dictionaries.js 与 routes/mont-marte-colors.js，挂载到 /api
   4) 拆 routes/custom-colors.js 与 routes/artworks.js，删除 server.js 中重复路由
   5) 完成后 server.js 仅负责：创建 app、通用中间件、静态、app.use('/api', routes)、错误兜底

   注意事项：
   - 移动过程中不要改 URL（保持 /api 路径不变）
   - 统一错误返回结构 { error: message }
   - 移除重复定义的路由（当前 /api/artworks 定义了两次，应合并为一处）
   - 在每个新文件顶部加入“用途/输入输出/依赖模块”注释，便于快速理解

   数据库并发建议（已启用后续支持）：
   - 在 db/index.js 开启 PRAGMA journal_mode=WAL 与 busy_timeout=5000
   - 保持所有多步写操作使用事务 db.serialize() + BEGIN/COMMIT

   本注释块请随迁移进度更新，作为团队与未来改造的索引。
   ========================================================= */

// 叠雕画颜色管理系统 - 后端服务器
// 使用 Express.js 和 SQLite 数据库

const express = require('express');
// const sqlite3 = require('sqlite3').verbose();   // 移至 db/index.js
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 新增：集中式 DB 与 迁移引用（阶段A）
const { db } = require('./db/index');                // 从 db/index.js 获取数据库连接
const { initDatabase, runMigrations } = require('./db/migrations'); // 表初始化与迁移

const app = express();
const PORT = 9099;

// 中间件设置
app.use(cors()); // 允许跨域请求
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname,'uploads'))); // 上传文件
// 前端静态资源（纯静态 HTML/JS/CSS）
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
if (fs.existsSync(FRONTEND_DIR)) {
  app.use('/', express.static(FRONTEND_DIR, { extensions:['html'] }));
}

// 确保上传目录存在
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 文件上传配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

// 初始化数据库（阶段A：由 db/migrations.js 提供）
initDatabase();
runMigrations();

// 辅助函数：把配方字符串中出现的旧颜色名精确替换为新颜色名
function replaceColorNameInFormula(formula, oldName, newName) {
    if (!formula || !oldName || oldName === newName) return formula;
    // 公式格式为：颜色名 数量单位 颜色名 数量单位 ...
    // 我们按空白拆分，只在“非数量+单位”的token上做精确匹配替换
    const isAmountToken = (t) => /^[\d.]+[a-zA-Z\u4e00-\u9fa5]+$/.test(t);
    const parts = String(formula).trim().split(/\s+/);
    let changed = false;
    for (let i = 0; i < parts.length; i++) {
        if (!isAmountToken(parts[i]) && parts[i] === oldName) {
            parts[i] = newName;
            changed = true;
        }
    }
    return changed ? parts.join(' ') : formula;
}

// 批量级联更新：把所有自配色配方里旧名称替换成新名称，返回被更新的条数
function cascadeRenameInFormulas(oldName, newName) {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, formula FROM custom_colors', [], (err, rows) => {
            if (err) return reject(err);

            let updatedCount = 0;
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                rows.forEach(row => {
                    const newFormula = replaceColorNameInFormula(row.formula, oldName, newName);
                    if (newFormula !== row.formula) {
                        updatedCount++;
                        db.run(
                            `UPDATE custom_colors 
                               SET formula = ?, updated_at = CURRENT_TIMESTAMP 
                             WHERE id = ?`,
                            [newFormula, row.id]
                        );
                    }
                });
                db.run('COMMIT', (commitErr) => {
                    if (commitErr) return reject(commitErr);
                    resolve(updatedCount);
                });
            });
        });
    });
}

// ==================== API 路由 ====================

// 1. 颜色分类相关API
// 获取所有颜色分类
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM color_categories ORDER BY code', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// 添加新的颜色分类
app.post('/api/categories', (req, res) => {
    const { code, name } = req.body;
    db.run('INSERT INTO color_categories (code, name) VALUES (?, ?)', [code, name], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, code, name });
        }
    });
});

// 2. 蒙马特颜色相关API
// 获取所有蒙马特颜色
// （遗留内联路由尚未拆分：增加 category 字段支持）
app.get('/api/mont-marte-colors', (req, res) => {
  const sql = `
    SELECT m.id, m.name, m.image_path, m.updated_at,
           m.supplier_id, s.name AS supplier_name,
           m.purchase_link_id, p.url AS purchase_link_url,
           m.category
      FROM mont_marte_colors m
      LEFT JOIN suppliers s ON s.id = m.supplier_id
      LEFT JOIN purchase_links p ON p.id = m.purchase_link_id
     ORDER BY LOWER(m.name) ASC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 新增颜色原料（支持 supplier_id / purchase_link_id）
app.post('/api/mont-marte-colors', upload.single('image'), (req, res) => {
  const { name, category } = req.body;
  const supplier_id = req.body.supplier_id ? Number(req.body.supplier_id) : null;
  const purchase_link_id = req.body.purchase_link_id ? Number(req.body.purchase_link_id) : null;
  const image_path = req.file ? req.file.filename : null;

  if (!name || !name.trim()) return res.status(400).json({ error: '颜色名称不能为空' });
  if (!category || !category.trim()) return res.status(400).json({ error: '原料类别不能为空' });

  db.run(
    `INSERT INTO mont_marte_colors(name, image_path, supplier_id, purchase_link_id, category)
     VALUES (?, ?, ?, ?, ?)`,
    [name.trim(), image_path, supplier_id, purchase_link_id, category.trim()],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const id = this.lastID;
      db.get(
        `SELECT m.id, m.name, m.image_path, m.updated_at,
                m.supplier_id, s.name AS supplier_name,
                m.purchase_link_id, p.url AS purchase_link_url,
                m.category
           FROM mont_marte_colors m
           LEFT JOIN suppliers s ON s.id = m.supplier_id
           LEFT JOIN purchase_links p ON p.id = m.purchase_link_id
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


// 获取所有自配颜色
app.get('/api/custom-colors', (req, res) => {
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

// 添加自配颜色
app.post('/api/custom-colors', upload.single('image'), (req, res) => {
    const { category_id, color_code, formula, applicable_layers } = req.body;
    const imagePath = req.file ? req.file.filename : null;
    
    db.run(`INSERT INTO custom_colors (category_id, color_code, image_path, formula, applicable_layers) 
            VALUES (?, ?, ?, ?, ?)`, 
           [category_id, color_code, imagePath, formula, applicable_layers], 
           function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
        } else {
            res.json({ 
                id: this.lastID, 
                category_id, 
                color_code, 
                image_path: imagePath, 
                formula, 
                applicable_layers 
            });
        }
    });
});

// 更新颜色原料时同步级联更新自配色配方中的原料名
app.put('/api/mont-marte-colors/:id', upload.single('image'), (req, res) => {
  const colorId = req.params.id;
  const { name, existingImagePath, category } = req.body;
  const supplier_id = req.body.supplier_id ? Number(req.body.supplier_id) : null;
  const purchase_link_id = req.body.purchase_link_id ? Number(req.body.purchase_link_id) : null;

  db.get('SELECT name, image_path FROM mont_marte_colors WHERE id = ?', [colorId], (err, oldData) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!oldData) return res.status(404).json({ error: '颜色不存在' });

    let newImagePath;
    if (req.file) newImagePath = req.file.filename;
    else if (existingImagePath) newImagePath = existingImagePath;
    else newImagePath = null;

    db.run(
      `UPDATE mont_marte_colors
         SET name = ?, image_path = ?, supplier_id = ?, purchase_link_id = ?, category = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, newImagePath, supplier_id, purchase_link_id, (category||'').trim() || null, colorId],
      function (updateErr) {
        if (updateErr) return res.status(400).json({ error: updateErr.message });

        // 删除旧图片文件（若替换了）
        if (req.file && oldData.image_path && oldData.image_path !== newImagePath) {
          const oldPath = path.join(__dirname, 'uploads', oldData.image_path);
          fs.unlink(oldPath, () => {});
        }

        const doRespond = (updatedReferences = 0, warn) => {
          db.get(
            `SELECT m.id, m.name, m.image_path, m.updated_at,
                    m.supplier_id, s.name AS supplier_name,
                    m.purchase_link_id, p.url AS purchase_link_url,
                    m.category
               FROM mont_marte_colors m
               LEFT JOIN suppliers s ON s.id = m.supplier_id
               LEFT JOIN purchase_links p ON p.id = m.purchase_link_id
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
        db.all('SELECT id, formula FROM custom_colors', [], (selErr, rows) => {
          if (selErr) return doRespond(0, '读取配方失败，未做级联');

          let updated = 0;
          db.serialize(() => {
            db.run('BEGIN');
            rows.forEach(row => {
              const original = String(row.formula || '').trim();
              if (!original) return;

              const parts = original.split(/\s+/);
              const isAmount = (t) => /^[\d.]+[a-zA-Z\u4e00-\u9fa5]+$/.test(t);
              let changed = false;
              for (let i = 0; i < parts.length; i++) {
                if (!isAmount(parts[i]) && parts[i] === oldData.name) {
                  parts[i] = name;
                  changed = true;
                }
              }
              if (changed) {
                updated++;
                const newFormula = parts.join(' ');
                db.run(
                  `UPDATE custom_colors
                      SET formula = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?`,
                  [newFormula, row.id]
                );
              }
            });
            db.run('COMMIT', () => doRespond(updated));
          });
        });
      }
    );
  });
});

// 获取自配颜色历史记录
app.get('/api/custom-colors/:id/history', (req, res) => {
    const colorId = req.params.id;
    db.all('SELECT * FROM custom_colors_history WHERE custom_color_id = ? ORDER BY archived_at DESC', 
           [colorId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// 删除自配颜色
app.delete('/api/custom-colors/:id', (req, res) => {
    const colorId = req.params.id;
    
    // 首先检查颜色是否存在，并获取图片路径
    db.get('SELECT * FROM custom_colors WHERE id = ?', [colorId], (err, color) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!color) {
            return res.status(404).json({ error: '颜色不存在' });
        }
        
        // 检查是否被配色方案引用
        db.get(`
            SELECT COUNT(*) as count 
            FROM scheme_layers 
            WHERE custom_color_id = ?
        `, [colorId], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (result && result.count > 0) {
                return res.status(400).json({ 
                    error: '此颜色已被配色方案使用，无法删除' 
                });
            }
            
            // 保存到历史记录（可选）
            db.run(`INSERT INTO custom_colors_history 
                    (custom_color_id, color_code, image_path, formula, applicable_layers) 
                    VALUES (?, ?, ?, ?, ?)`,
                   [colorId, color.color_code, color.image_path, 
                    color.formula, color.applicable_layers], (err) => {
                if (err) {
                    console.error('保存历史记录失败:', err);
                    // 历史记录保存失败不影响删除操作
                }
            });
            
            // 删除数据库记录
            db.run('DELETE FROM custom_colors WHERE id = ?', [colorId], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ error: '颜色不存在' });
                }
                
                // 如果有图片，尝试删除图片文件
                if (color.image_path) {
                    const imagePath = path.join(__dirname, 'uploads', color.image_path);
                    fs.unlink(imagePath, (err) => {
                        if (err) {
                            console.error('删除图片文件失败:', err);
                            // 图片删除失败不影响整体操作
                        } else {
                            console.log('旧图片已删除:', color.image_path);
                        }
                    });
                }
                
                res.json({ 
                    success: true, 
                    message: '自配颜色删除成功',
                    deletedColor: color.color_code
                });
            });
        });
    });
});

// 4. 画作品相关API
// 获取所有画作品及其配色方案
// 统一：旧的 /api/artworks（无 layers）版本已弃用，保留注释防回归
// app.get('/api/artworks', ...)  // replaced below with enhanced version including layers

// 添加新画作品
app.post('/api/artworks', (req, res) => {
  const { code, name } = req.body || {};
  const c = String(code||'').trim();
  const n = String(name||'').trim();
  if (!c || !n) return res.status(400).json({ error: '作品编号或名称不能为空' });
  // 与前端规则保持：编号 3-5 位 A-Z0-9；名称 中英文数字空格、不含横杠
  if (!/^[A-Z0-9]{3,5}$/.test(c)) return res.status(400).json({ error: '作品编号格式不合法' });
  if (!/^[A-Za-z0-9\u4e00-\u9fa5 ]+$/.test(n) || n.includes('-')) return res.status(400).json({ error: '作品名称格式不合法' });
  db.run('INSERT INTO artworks (code, name) VALUES (?, ?)', [c, n], function(err) {
    if (err) {
      // 唯一约束冲突
      if (err.message && /UNIQUE/i.test(err.message)) {
        return res.status(409).json({ error: '该作品编号已存在' });
      }
      return res.status(400).json({ error: err.message });
    }
    res.json({ id: this.lastID, code: c, name: n });
  });
});

// 调试辅助：获取所有作品 code 列表（便于前端定位某前缀冲突）
app.get('/api/_debug/artwork-codes', (req, res) => {
  db.all('SELECT id, code, name FROM artworks ORDER BY code', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 获取作品详情（包含所有配色方案）
app.get('/api/artworks/:id', (req, res) => {
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
        db.all(`
            SELECT * FROM color_schemes 
            WHERE artwork_id = ?
            ORDER BY id
        `, [artworkId], (err, schemes) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // 获取每个配色方案的层数据
            const schemePromises = schemes.map(scheme => {
                return new Promise((resolve) => {
                    db.all(`
                        SELECT 
                            sl.layer_number,
                            sl.custom_color_id,
                            cc.color_code,
                            cc.formula
                        FROM scheme_layers sl
                        LEFT JOIN custom_colors cc ON sl.custom_color_id = cc.id
                        WHERE sl.scheme_id = ?
                        ORDER BY sl.layer_number
                    `, [scheme.id], (err, layers) => {
                        if (err) {
                            console.error('获取层数据失败:', err);
                            scheme.layers = [];
                        } else {
                            scheme.layers = layers;
                        }
                        resolve(scheme);
                    });
                });
            });
            
            Promise.all(schemePromises).then(schemesWithLayers => {
                artwork.schemes = schemesWithLayers;
                res.json(artwork);
            });
        });
    });
});

// 新增缺失：删除配色方案（含层与缩略图）与删除作品（需无方案） —— 防止前端调用 404
app.delete('/api/artworks/:artworkId/schemes/:schemeId', (req, res) => {
  const artworkId = Number(req.params.artworkId);
  const schemeId = Number(req.params.schemeId);
  if (!artworkId || !schemeId) return res.status(400).json({ error: '参数不完整' });
  db.get('SELECT * FROM color_schemes WHERE id = ? AND artwork_id = ?', [schemeId, artworkId], (err, scheme) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!scheme) return res.status(404).json({ error: '配色方案不存在' });
    const thumb = scheme.thumbnail_path;
    db.serialize(() => {
      db.run('BEGIN');
      db.run('DELETE FROM scheme_layers WHERE scheme_id = ?', [schemeId], (e1) => {
        if (e1) { db.run('ROLLBACK'); return res.status(500).json({ error: e1.message }); }
        db.run('DELETE FROM color_schemes WHERE id = ?', [schemeId], (e2) => {
          if (e2) { db.run('ROLLBACK'); return res.status(500).json({ error: e2.message }); }
          db.run('COMMIT', () => {
            if (thumb) {
              const filePath = path.join('uploads', thumb);
              fs.unlink(filePath, () => {});
            }
            res.json({ success: true });
          });
        });
      });
    });
  });
});

app.delete('/api/artworks/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: '参数不完整' });
  db.get('SELECT COUNT(*) AS cnt FROM color_schemes WHERE artwork_id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row && row.cnt > 0) return res.status(400).json({ error: '该作品下仍有配色方案，无法删除' });
    db.run('DELETE FROM artworks WHERE id = ?', [id], function (dErr) {
      if (dErr) return res.status(500).json({ error: dErr.message });
      if (this.changes === 0) return res.status(404).json({ error: '作品不存在' });
      res.json({ success: true });
    });
  });
});

// 删除蒙马特颜色
app.delete('/api/mont-marte-colors/:id', (req, res) => {
    const colorId = req.params.id;
    
    // 首先检查是否被自配颜色引用
    // TODO: 当自配颜色功能完善后，需要检查 custom_colors 表中的 formula 字段
    // 是否包含了这个颜色的名称
    /*
    db.get('SELECT name FROM mont_marte_colors WHERE id = ?', [colorId], (err, color) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!color) {
            return res.status(404).json({ error: '颜色不存在' });
        }
        
        // 检查是否在自配颜色配方中被引用
        db.get(`
            SELECT COUNT(*) as count 
            FROM custom_colors 
            WHERE formula LIKE '%' || ? || '%'
        `, [color.name], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (result.count > 0) {
                return res.status(400).json({ 
                    error: '此颜色已被自配色引用，暂时无法删除' 
                });
            }
            
            // 执行删除
            deleteColor();
        });
    });
    */
    
    // 暂时直接删除，后续完善引用检查
    function deleteColor() {
        // 获取图片路径以便删除文件
        db.get('SELECT image_path FROM mont_marte_colors WHERE id = ?', [colorId], (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // 删除数据库记录
            db.run('DELETE FROM mont_marte_colors WHERE id = ?', [colorId], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ error: '颜色不存在' });
                }
                
                // 如果有图片，尝试删除图片文件
                if (row && row.image_path) {
                    const imagePath = path.join(__dirname, 'uploads', row.image_path);
                    fs.unlink(imagePath, (err) => {
                        if (err) {
                            console.error('删除图片文件失败:', err);
                            // 图片删除失败不影响整体操作
                        }
                    });
                }
                
                res.json({ success: true, message: '颜色删除成功' });
            });
        });
    }
    
    // 直接调用删除函数（暂时跳过引用检查）
    deleteColor();
});

// 字典表 API：供应商
app.get('/api/suppliers', (req, res) => {
  db.all(`SELECT id, name FROM suppliers ORDER BY LOWER(name) ASC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Upsert 供应商（name 不区分大小写去重）
app.post('/api/suppliers/upsert', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name 不能为空' });
  db.get(`SELECT id, name FROM suppliers WHERE LOWER(name) = LOWER(?)`, [name], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.json(row);
    db.run(`INSERT INTO suppliers(name) VALUES (?)`, [name], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ id: this.lastID, name });
    });
  });
});

// 删除供应商（若被引用则 409）
app.delete('/api/suppliers/:id', (req, res) => {
  const id = Number(req.params.id);
  db.get(`SELECT COUNT(*) AS cnt FROM mont_marte_colors WHERE supplier_id = ?`, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row.cnt > 0) return res.status(409).json({ error: `有 ${row.cnt} 处引用，无法删除` });
    db.run(`DELETE FROM suppliers WHERE id = ?`, [id], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ deleted: this.changes > 0 });
    });
  });
});

// 字典表 API：线上采购地址
app.get('/api/purchase-links', (req, res) => {
  db.all(`SELECT id, url FROM purchase_links ORDER BY LOWER(url) ASC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/purchase-links/upsert', (req, res) => {
  const url = String(req.body.url || '').trim();
  if (!url) return res.status(400).json({ error: 'url 不能为空' });
  db.get(`SELECT id, url FROM purchase_links WHERE LOWER(url) = LOWER(?)`, [url], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.json(row);
    db.run(`INSERT INTO purchase_links(url) VALUES (?)`, [url], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ id: this.lastID, url });
    });
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 添加配色方案（含缩略图与层-自配色映射）
// 请求体：FormData(name, layers=[{layer, colorCode}], thumbnail?)
// 注意：layers 为 JSON 字符串
app.post('/api/artworks/:artworkId/schemes', upload.single('thumbnail'), (req, res) => {
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
        layers.forEach(m => {
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
          db.run(`UPDATE color_schemes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [schemeId], () => {
            db.run('COMMIT', () => res.json({ id: schemeId }));
          });
        });
      }
    );
  });
});

// 更新配色方案（可替换缩略图并重建层映射）
// 请求体：FormData(name, layers=[{layer,colorCode}], thumbnail?, existingThumbnailPath?)
app.put('/api/artworks/:artworkId/schemes/:schemeId', upload.single('thumbnail'), (req, res) => {
  const artworkId = Number(req.params.artworkId);
  const schemeId = Number(req.params.schemeId);
  const name = String(req.body.name || '').trim();
  if (!artworkId || !schemeId || !name) return res.status(400).json({ error: '参数不完整' });

  let layers = [];
  try { layers = JSON.parse(req.body.layers || '[]'); } catch {}
  const existing = req.body.existingThumbnailPath || null;
  const newThumb = req.file ? req.file.filename : null;

  // 查询旧缩略图以便删除
  db.get(`SELECT thumbnail_path FROM color_schemes WHERE id = ? AND artwork_id = ?`, [schemeId, artworkId], (err, row) => {
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
            layers.forEach(m => {
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
                  const oldPath = path.join(__dirname, 'uploads', row.thumbnail_path);
                  fs.unlink(oldPath, () => {});
                }
                res.json({ success: true });
              });
            });
          });
        }
      );
    });
  });
});

// 新版本：/api/artworks 返回每个方案的 layers 数组（{layer, colorCode}），并提供 name 别名
app.get('/api/artworks', (req, res) => {
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
          const emptyResult = artworks.map(art => ({ ...art, schemes: [] }));
          return res.json(emptyResult);
        }
        const placeholders = schemeIds.map(()=>'?').join(',');
        db.all(
          `SELECT sl.scheme_id, sl.layer_number AS layer, COALESCE(cc.color_code,'') AS colorCode
             FROM scheme_layers sl
             LEFT JOIN custom_colors cc ON cc.id = sl.custom_color_id
            WHERE sl.scheme_id IN (${placeholders})
            ORDER BY sl.scheme_id ASC, sl.layer_number ASC`,
          schemeIds,
          (err3, layerRows) => {
            if (err3) return res.status(500).json({ error: err3.message });
            const layersByScheme = new Map();
            layerRows.forEach(r => {
              if (!layersByScheme.has(r.scheme_id)) layersByScheme.set(r.scheme_id, []);
              layersByScheme.get(r.scheme_id).push({ layer: Number(r.layer), colorCode: r.colorCode || '' });
            });
            const result = artworks.map(art => {
              const relatedSchemes = schemes.filter(s => s.artwork_id === art.id);
              return {
                ...art,
                schemes: relatedSchemes.map(s => ({
                  id: s.id,
                  scheme_name: s.scheme_name,
                  name: s.scheme_name,
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

// 确保新增色系“色精”存在（代码 SJ）—— 幂等插入
db.run('INSERT OR IGNORE INTO color_categories (code, name) VALUES (?, ?)', ['SJ', '色精'], (err)=>{
  if (err) console.warn('确保色精色系存在时出错:', err.message);
});

// 更新自配颜色
app.put('/api/custom-colors/:id', upload.single('image'), (req, res) => {
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
                    const oldImagePath = path.join(__dirname, 'uploads', oldData.image_path);
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

// 强制合并自配色：更新引用后删除重复 (Phase A)
// POST /api/custom-colors/force-merge  Body: { keepId, removeIds:[], signature? }
app.post('/api/custom-colors/force-merge', (req, res) => {
  const keepId = Number(req.body.keepId);
  let removeIds = Array.isArray(req.body.removeIds) ? req.body.removeIds.map(Number) : [];
  const providedSig = req.body.signature ? String(req.body.signature) : null;
  if (!keepId || !Number.isInteger(keepId)) return res.status(400).json({ error: 'keepId 无效' });
  removeIds = [...new Set(removeIds.filter(id=> Number.isInteger(id) && id>0 && id!==keepId))];
  if (!removeIds.length) return res.status(400).json({ error: 'removeIds 不能为空' });

  // 统一的配方解析函数（与前端 FormulaParser.parse 保持一致）
  function parseFormula(formula) {
    const result = [];
    if (!formula || !(formula = String(formula).trim())) return result;
    const tokens = formula.split(/\s+/);
    const amountRe = /^([\d]+(?:\.[\d]+)?)([a-zA-Z\u4e00-\u9fa5%]+)$/; // 形式: 15g / 3ml
    const numberOnlyRe = /^[\d]+(?:\.[\d]+)?$/; // 形式: 15
    const unitOnlyRe = /^[a-zA-Z\u4e00-\u9fa5%]+$/; // 形式: g / ml / 滴
    
    for (let i = 0; i < tokens.length; i++) {
      const nameToken = tokens[i];
      if (!nameToken) continue;
      const next = tokens[i + 1];
      let consumed = 0;
      let base = 0; let unit = ''; let valid = false;
      
      // 1) 紧随一个 "数值+单位" token
      if (next && amountRe.test(next)) {
        const m = next.match(amountRe);
        base = parseFloat(m[1]); unit = m[2]; valid = isFinite(base); consumed = 1;
      } else if (next && numberOnlyRe.test(next) && tokens[i + 2] && unitOnlyRe.test(tokens[i + 2])) {
        // 2) 形式: 名称 15 g
        base = parseFloat(next); unit = tokens[i + 2]; valid = isFinite(base); consumed = 2;
      }
      
      if (consumed > 0) {
        result.push({ name: nameToken, base: valid ? base : 0, unit, invalid: !valid });
        i += consumed; // 跳过消耗的 token
      } else {
        // 未匹配数量
        result.push({ name: nameToken, base: 0, unit: '', invalid: true });
      }
    }
    return result;
  }
  
  // 统一的签名生成函数（与前端 buildRatioSignature 保持一致）
  function buildSig(formula) {
    if (!formula) return '';
    let ings = parseFormula(formula) || [];
    ings = ings.filter(i => i && !i.invalid && i.name && isFinite(i.base) && i.base > 0);
    if (!ings.length) return '';
    
    ings = ings.map(i => ({ 
      name: (i.name || '').trim().toLowerCase(), 
      unit: (i.unit || '').trim().toLowerCase(), 
      amt: Number(i.base) 
    }));
    
    // 使用简单字符串排序，确保与前端一致
    ings.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      if (a.unit < b.unit) return -1;
      if (a.unit > b.unit) return 1;
      return 0;
    });
    
    // 放大为整数
    const decimals = ings.map(i => { 
      const s = String(i.amt); 
      const m = s.split('.')[1]; 
      return m ? m.length : 0; 
    });
    const scale = Math.pow(10, Math.max(...decimals));
    let ints = ings.map(i => Math.round(i.amt * scale));
    
    if (ints.every(v => v === 0)) { // 回退：浮点比
      const base = ings[0].amt;
      return ings.map(i => `${i.name}#${i.unit}#${Math.round((i.amt / base) * 1e6) / 1e6}`).join('|');
    }
    
    // GCD 约简
    function gcd(a, b) { 
      a = Math.abs(a); 
      b = Math.abs(b); 
      while (b) { 
        const t = a % b; 
        a = b; 
        b = t; 
      } 
      return a || 1; 
    }
    
    function gcdArray(arr) { 
      return arr.reduce((g, v) => gcd(g, v), arr[0] || 1); 
    }
    
    const g = gcdArray(ints);
    if (g > 1) ints = ints.map(v => v / g);
    return ings.map((ing, idx) => `${ing.name}#${ing.unit}#${ints[idx]}`).join('|');
  }

  const placeholders = removeIds.map(()=>'?').join(',');
  db.get('SELECT id, formula, color_code, image_path, applicable_layers FROM custom_colors WHERE id=?',[keepId], (eKeep, keepRow)=>{
    if(eKeep) return res.status(500).json({ error:eKeep.message });
    if(!keepRow) return res.status(404).json({ error:'保留记录不存在' });
    db.all(`SELECT id, formula, color_code, image_path, applicable_layers FROM custom_colors WHERE id IN (${placeholders})`, removeIds, (eRem, remRows)=>{
      if(eRem) return res.status(500).json({ error:eRem.message });
      if(!remRows || remRows.length!==removeIds.length) return res.status(400).json({ error:'部分 removeIds 不存在' });
      if(providedSig){ 
        try { 
          const kSig=buildSig(keepRow.formula||''); 
          console.log('[DEBUG] 保留记录配方:', keepRow.formula);
          console.log('[DEBUG] 保留记录签名:', kSig);
          console.log('[DEBUG] 前端提供签名:', providedSig);
          
          if(!kSig) return res.status(400).json({ error:'保留记录配方为空' }); 
          for(const r of remRows){ 
            const s=buildSig(r.formula||''); 
            console.log('[DEBUG] 删除记录配方:', r.formula, '签名:', s);
            if(s!==kSig) return res.status(400).json({ error:'签名不一致，拒绝合并' }); 
          } 
          if(kSig!==providedSig) return res.status(400).json({ error:'前端签名与服务端计算不一致' }); 
        } catch(err){ 
          console.error('[DEBUG] 签名校验异常:', err);
          return res.status(500).json({ error:'签名校验失败:'+err.message }); 
        } 
      }
      db.get(`SELECT COUNT(*) AS cnt FROM scheme_layers WHERE custom_color_id IN (${placeholders})`, removeIds, (eCnt, cntRow)=>{
        if(eCnt) return res.status(500).json({ error:eCnt.message });
        const affected = cntRow? Number(cntRow.cnt)||0 : 0;
        db.serialize(()=>{
          db.run('BEGIN');
          db.run(`UPDATE scheme_layers SET custom_color_id=? WHERE custom_color_id IN (${placeholders})`, [keepId, ...removeIds], function(eUpd){
            if(eUpd){ db.run('ROLLBACK'); return res.status(500).json({ error:eUpd.message }); }
            const hist = db.prepare(`INSERT INTO custom_colors_history (custom_color_id,color_code,image_path,formula,applicable_layers) VALUES (?,?,?,?,?)`);
            remRows.forEach(r=> hist.run([r.id, r.color_code, r.image_path, r.formula, r.applicable_layers]));
            hist.finalize(eHist=>{
              if(eHist){ db.run('ROLLBACK'); return res.status(500).json({ error:eHist.message }); }
              db.run(`DELETE FROM custom_colors WHERE id IN (${placeholders})`, removeIds, function(eDel){
                if(eDel){ db.run('ROLLBACK'); return res.status(500).json({ error:eDel.message }); }
                db.run(`UPDATE color_schemes SET updated_at = CURRENT_TIMESTAMP WHERE id IN (SELECT DISTINCT scheme_id FROM scheme_layers WHERE custom_color_id = ?)`, [keepId], (eSche)=>{
                  if(eSche){ db.run('ROLLBACK'); return res.status(500).json({ error:eSche.message }); }
                  db.run('COMMIT', eCom=>{
                    if(eCom) return res.status(500).json({ error:eCom.message });
                    res.json({ success:true, updatedLayers: affected, deleted: removeIds.length });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
// ========== /强制合并 ==========
