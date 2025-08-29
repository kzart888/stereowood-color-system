/**
 * STEREOWOOD Color System - 后端服务器
 * 版本: 0.8.1
 * 描述: 精简的模块化服务器，连接所有模块化路由
 * 
 * 本文件仅负责:
 * 1. 创建 Express 应用
 * 2. 配置中间件
 * 3. 连接模块化路由
 * 4. 启动服务器
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 导入模块化组件
const { db } = require('./db/index');                // 数据库连接
const { initDatabase, runMigrations } = require('./db/migrations'); // 数据库初始化
const routes = require('./routes');                  // 所有API路由

const app = express();
const PORT = 9099;

// ========== 中间件配置 ==========
app.use(cors());                                     // 允许跨域请求
app.use(express.json());                            // 解析JSON请求体
app.use(express.urlencoded({ extended: true }));    // 解析URL编码请求体

// 静态文件服务 - 上传的图片
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 前端静态文件服务
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
if (fs.existsSync(FRONTEND_DIR)) {
  app.use('/', express.static(FRONTEND_DIR, { extensions: ['html'] }));
  console.log('前端静态文件目录已配置:', FRONTEND_DIR);
}

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('上传目录已创建:', uploadDir);
}

// ========== 数据库初始化 ==========
console.log('正在初始化数据库...');
initDatabase();
runMigrations();
console.log('数据库初始化完成');

// ========== API路由 ==========
// 所有API路由都在 /api 路径下
// 路由定义在 routes/index.js 中聚合
app.use('/api', routes);
console.log('API路由已加载: /api/*');

// ========== 错误处理中间件 ==========
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack);
  
  // 开发环境返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    res.status(500).json({ 
      error: err.message,
      stack: err.stack 
    });
  } else {
    // 生产环境返回简单错误信息
    res.status(500).json({ 
      error: '服务器内部错误' 
    });
  }
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ 
    error: `路径不存在: ${req.method} ${req.url}` 
  });
});

// ========== 启动服务器 ==========
const server = app.listen(PORT, () => {
  console.log('========================================');
  console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
  console.log('✅ 数据库连接成功 (SQLite WAL模式)');
  console.log('✅ 模块化路由已加载完成');
  console.log('========================================');
  console.log('可用的API端点:');
  console.log('  - /api/custom-colors     自配颜色管理');
  console.log('  - /api/artworks          作品配色管理');
  console.log('  - /api/mont-marte-colors 原料颜色管理');
  console.log('  - /api/categories        颜色分类管理');
  console.log('========================================');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    if (db) {
      db.close(() => {
        console.log('数据库连接已关闭');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

module.exports = app;