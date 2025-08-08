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
       index.js               -> 聚合并导出一个 Router，server.js 仅 app.use('/api', router)
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
const { cascadeRenameInFormulas } = require('./services/formula');
const dictionariesRouter = require('./routes/dictionaries');
const montMarteRouter = require('./routes/mont-marte-colors');
const customColorsRouter = require('./routes/custom-colors');
const artworksRouter = require('./routes/artworks');

const app = express();
const PORT = 3000;

// 中间件设置
app.use(cors()); // 允许跨域请求
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('uploads')); // 静态文件服务
app.use('/api', dictionariesRouter);
app.use('/api', montMarteRouter);
app.use('/api', customColorsRouter);
app.use('/api', artworksRouter);

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

// 级联工具迁至 services/formula.js

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

// 注意：自配颜色与作品相关路由已迁移至 routes/custom-colors.js 与 routes/artworks.js
// 此处不再保留 /api/custom-colors* 与 /api/artworks* 的定义，避免重复。

// 统一 404 处理（必须在所有路由之后）
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// 统一错误处理中间件（返回 { error: message }）
// 如需细化，可判断 err.name === 'MulterError' 等场景
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    const status = err && err.status ? err.status : 500;
    const message = err && err.message ? err.message : 'Internal Server Error';
    res.status(status).json({ error: message });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
