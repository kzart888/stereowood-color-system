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

// Load environment variables from .env file
require('dotenv').config();

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

// 设置UTF-8字符编码
app.use((req, res, next) => {
    // 只在JSON响应时设置Content-Type
    const originalJson = res.json;
    res.json = function(data) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return originalJson.call(this, data);
    };
    next();
});

// 静态文件服务 - 上传的图片
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 前端静态文件服务
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
if (fs.existsSync(FRONTEND_DIR)) {
  app.use('/', express.static(FRONTEND_DIR, { extensions: ['html'] }));
}

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ========== 数据库初始化 ==========
initDatabase();
runMigrations();

// ========== API路由 ==========
// 所有API路由都在 /api 路径下
// 路由定义在 routes/index.js 中聚合
app.use('/api', routes);

// ========== System Config Endpoint ==========
// Expose application mode to frontend
app.get('/api/config', (req, res) => {
  res.json({
    mode: process.env.MODE || 'production',
    testModeItemsPerPage: parseInt(process.env.TEST_MODE_ITEMS_PER_PAGE) || 3,
    features: {
      formulaCalculator: process.env.ENABLE_FORMULA_CALCULATOR === 'true',
      artworkManagement: process.env.ENABLE_ARTWORK_MANAGEMENT === 'true',
      montMarte: process.env.ENABLE_MONT_MARTE === 'true'
    }
  });
});

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
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  server.close(() => {
    if (db) {
      db.close(() => {
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

module.exports = app;