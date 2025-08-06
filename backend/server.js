// 叠雕画颜色管理系统 - 后端服务器
// 使用 Express.js 和 SQLite 数据库

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 中间件设置
app.use(cors()); // 允许跨域请求
app.use(express.json({ limit: '10mb' })); // 解析JSON，支持大文件
app.use(express.static('uploads')); // 静态文件服务

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

// 初始化数据库
const db = new sqlite3.Database('color_management.db', (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    } else {
        console.log('数据库连接成功');
        initDatabase();
    }
});

// 创建数据库表结构
function initDatabase() {
    // 1. 颜色分类表 (色系表)
    db.run(`CREATE TABLE IF NOT EXISTS color_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,        -- 例如: BU, YE, RD, GN, VT
        name TEXT NOT NULL,               -- 例如: 蓝色系, 黄色系
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. 蒙马特颜色表 (基础颜料)
    db.run(`CREATE TABLE IF NOT EXISTS mont_marte_colors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,               -- 颜色名称: 朱红, 桔黄等
        image_path TEXT,                  -- 颜色照片路径
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. 自配颜色表
    db.run(`CREATE TABLE IF NOT EXISTS custom_colors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,              -- 关联颜色分类
        color_code TEXT UNIQUE NOT NULL,  -- 颜色编号: BU001, YE005等
        image_path TEXT,                  -- 自配色块图片路径
        formula TEXT,                     -- 配方: "蓝5g 紫红10g 灰2g"
        applicable_layers TEXT,           -- 适用画层: "078-蝶恋花(4)(8)(12)"
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES color_categories (id)
    )`);

    // 4. 自配颜色历史记录表 (用于版本回溯)
    db.run(`CREATE TABLE IF NOT EXISTS custom_colors_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        custom_color_id INTEGER,          -- 关联自配颜色
        color_code TEXT,
        image_path TEXT,
        formula TEXT,
        applicable_layers TEXT,
        archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (custom_color_id) REFERENCES custom_colors (id)
    )`);

    // 5. 画作品表
    db.run(`CREATE TABLE IF NOT EXISTS artworks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,        -- 画编号: 078-太极鱼, 009-星芒
        name TEXT NOT NULL,               -- 画名称
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 6. 配色方案表
    db.run(`CREATE TABLE IF NOT EXISTS color_schemes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        artwork_id INTEGER,               -- 关联画作品
        scheme_name TEXT NOT NULL,        -- 配色方案名: 金黄, 蓝棕, 南海岸等
        thumbnail_path TEXT,              -- 缩略图路径
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (artwork_id) REFERENCES artworks (id)
    )`);

    // 7. 配色方案详情表 (层号与自配色对应关系)
    db.run(`CREATE TABLE IF NOT EXISTS scheme_layers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheme_id INTEGER,                -- 关联配色方案
        layer_number INTEGER,             -- 层号
        custom_color_id INTEGER,          -- 关联自配颜色
        FOREIGN KEY (scheme_id) REFERENCES color_schemes (id),
        FOREIGN KEY (custom_color_id) REFERENCES custom_colors (id)
    )`);

    // 8. 配色方案历史记录表
    db.run(`CREATE TABLE IF NOT EXISTS color_schemes_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheme_id INTEGER,
        scheme_name TEXT,
        thumbnail_path TEXT,
        layers_data TEXT,                 -- JSON格式存储层号-颜色关系
        archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scheme_id) REFERENCES color_schemes (id)
    )`);

    console.log('数据库表初始化完成');
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
app.get('/api/mont-marte-colors', (req, res) => {
    db.all('SELECT * FROM mont_marte_colors ORDER BY name', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// 添加蒙马特颜色
app.post('/api/mont-marte-colors', upload.single('image'), (req, res) => {
    const { name } = req.body;
    const imagePath = req.file ? req.file.filename : null;
    
    db.run('INSERT INTO mont_marte_colors (name, image_path) VALUES (?, ?)', 
           [name, imagePath], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, name, image_path: imagePath });
        }
    });
});

// 3. 自配颜色相关API
// 根据分类获取自配颜色
app.get('/api/custom-colors/:categoryId', (req, res) => {
    const categoryId = req.params.categoryId;
    const sql = `
        SELECT cc.*, cat.name as category_name, cat.code as category_code
        FROM custom_colors cc
        LEFT JOIN color_categories cat ON cc.category_id = cat.id
        WHERE cc.category_id = ?
        ORDER BY cc.color_code
    `;
    
    db.all(sql, [categoryId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
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

// 更新自配颜色 (同时创建历史记录)
app.put('/api/custom-colors/:id', upload.single('image'), (req, res) => {
    const colorId = req.params.id;
    const { category_id, color_code, formula, applicable_layers } = req.body;
    const imagePath = req.file ? req.file.filename : req.body.existing_image;
    
    // 首先获取当前数据，用于创建历史记录
    db.get('SELECT * FROM custom_colors WHERE id = ?', [colorId], (err, currentData) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // 创建历史记录
        if (currentData) {
            db.run(`INSERT INTO custom_colors_history 
                    (custom_color_id, color_code, image_path, formula, applicable_layers) 
                    VALUES (?, ?, ?, ?, ?)`,
                   [colorId, currentData.color_code, currentData.image_path, 
                    currentData.formula, currentData.applicable_layers]);
        }
        
        // 更新当前数据
        db.run(`UPDATE custom_colors 
                SET category_id = ?, color_code = ?, image_path = ?, formula = ?, 
                    applicable_layers = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?`,
               [category_id, color_code, imagePath, formula, applicable_layers, colorId],
               function(err) {
            if (err) {
                res.status(400).json({ error: err.message });
            } else {
                res.json({ 
                    id: colorId, 
                    category_id, 
                    color_code, 
                    image_path: imagePath, 
                    formula, 
                    applicable_layers 
                });
            }
        });
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

// 4. 画作品相关API
// 获取所有画作品及其配色方案
app.get('/api/artworks', (req, res) => {
    // 先获取所有作品
    db.all('SELECT * FROM artworks ORDER BY code', [], (err, artworks) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // 获取所有配色方案
        db.all(`
            SELECT cs.*, a.code as artwork_code 
            FROM color_schemes cs 
            LEFT JOIN artworks a ON cs.artwork_id = a.id
        `, [], (err, schemes) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // 将配色方案分组到对应的作品
            const result = artworks.map(artwork => {
                const artworkSchemes = schemes.filter(s => s.artwork_id === artwork.id);
                return {
                    ...artwork,
                    schemes: artworkSchemes.map(s => ({
                        id: s.id,
                        scheme_name: s.scheme_name,
                        thumbnail_path: s.thumbnail_path,
                        updated_at: s.updated_at
                    }))
                };
            });
            
            res.json(result);
        });
    });
});

// 添加新画作品
app.post('/api/artworks', (req, res) => {
    const { code, name } = req.body;
    db.run('INSERT INTO artworks (code, name) VALUES (?, ?)', [code, name], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, code, name });
        }
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

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});