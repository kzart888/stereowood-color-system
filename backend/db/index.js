/* =========================================================
   模块：db/index.js
   职责：集中创建并导出 SQLite 连接，设置全局 PRAGMA。
   引用：server.js、db/migrations.js、后续各 routes/* 与 services/* 通过此处获取 db。
   来源：原 server.js 中的“数据库连接”与隐含 PRAGMA 需求（Roadmap 中建议）。
   注意：
   - DB 文件路径：默认位于 backend 根目录（与原 server.js 一致）
   - 并发设置：开启 WAL、busy_timeout=5000、foreign_keys=ON
   - 仅导出 db，不做建表；建表迁移由 db/migrations.js 负责
   ========================================================= */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 与原 server.js 保持一致：数据库文件在 backend 根目录，可通过环境变量 DB_FILE 覆盖（便于 Docker 卷映射）
const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'color_management.db');

// 创建连接
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功 (db/index.js)');
  }
});

// 全局 PRAGMA（并发与稳定性）
db.serialize(() => {
  // 写放大下提升并发读
  db.run('PRAGMA journal_mode = WAL;');
  // 短时间写冲突自动等待，减少 “SQLITE_BUSY”
  db.run('PRAGMA busy_timeout = 5000;');
  // 让外键约束生效
  db.run('PRAGMA foreign_keys = ON;');
});

module.exports = { db };