/* =========================================================
   模块：db/migrations.js
   职责：数据库表初始化与后续迁移。
   引用：server.js 在启动时调用 initDatabase() 与 runMigrations()。
   来源：
   - initDatabase(): 迁移自 server.js 中 “创建数据库表结构” 八张表（1..8）
   - runMigrations(): 迁移自 server.js 底部的“启动迁移”（suppliers / purchase_links 字典表 + mont_marte_colors 列扩展）
   依赖：db/index.js 导出的 db 连接
   约定：不修改 URL，不改变现有路由行为。仅负责 DDL。
   ========================================================= */

const { db } = require('./index');

// 工具：检查列是否存在（用于增列迁移）
function columnExists(table, column) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
      if (err) return reject(err);
      resolve(rows.some(r => r.name === column));
    });
  });
}

// 工具：安全执行 SQL（用于 CREATE/ALTER）
function runSafe(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

// 初始化核心表（与原 server.js 保持一致）
async function initDatabase() {
  // 顺序与原实现保持一致，便于对照
  db.run(`CREATE TABLE IF NOT EXISTS color_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS mont_marte_colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS custom_colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    color_code TEXT UNIQUE NOT NULL,
    image_path TEXT,
    formula TEXT,
    applicable_layers TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES color_categories (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS custom_colors_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    custom_color_id INTEGER,
    color_code TEXT,
    image_path TEXT,
    formula TEXT,
    applicable_layers TEXT,
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (custom_color_id) REFERENCES custom_colors (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS artworks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS color_schemes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artwork_id INTEGER,
    scheme_name TEXT NOT NULL,
    thumbnail_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artwork_id) REFERENCES artworks (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS scheme_layers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheme_id INTEGER,
    layer_number INTEGER,
    custom_color_id INTEGER,
    FOREIGN KEY (scheme_id) REFERENCES color_schemes (id),
    FOREIGN KEY (custom_color_id) REFERENCES custom_colors (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS color_schemes_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheme_id INTEGER,
    scheme_name TEXT,
    thumbnail_path TEXT,
    layers_data TEXT,
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scheme_id) REFERENCES color_schemes (id)
  )`);

  console.log('数据库表初始化完成 (db/migrations.js)');
  
  // 确保新增色系"色精"存在（代码 SJ）—— 幂等插入
  db.run('INSERT OR IGNORE INTO color_categories (code, name) VALUES (?, ?)', ['SJ', '色精'], (err) => {
    if (err) console.warn('确保色精色系存在时出错:', err.message);
    else console.log('色精色系已确保存在');
  });
}

// 后续迁移：创建字典表与原表增列（保持与原 server.js 一致）
async function runMigrations() {
  try {
    await runSafe(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runSafe(`
      CREATE TABLE IF NOT EXISTS purchase_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    if (!(await columnExists('mont_marte_colors', 'supplier_id'))) {
      await runSafe(`ALTER TABLE mont_marte_colors ADD COLUMN supplier_id INTEGER NULL`);
    }
    if (!(await columnExists('mont_marte_colors', 'purchase_link_id'))) {
      await runSafe(`ALTER TABLE mont_marte_colors ADD COLUMN purchase_link_id INTEGER NULL`);
    }
    if (!(await columnExists('mont_marte_colors', 'category'))) {
      await runSafe(`ALTER TABLE mont_marte_colors ADD COLUMN category TEXT NULL`);
    }

    // 迁移：custom_colors_history 去除对 custom_colors 的外键约束，避免删除父记录时受阻
    // 检测是否存在外键引用
    const hasHistoryFK = await new Promise((resolve) => {
      db.all(`PRAGMA foreign_key_list(custom_colors_history)`, (err, rows) => {
        if (err) { console.error('检测 custom_colors_history 外键失败', err); return resolve(false); }
        resolve(Array.isArray(rows) && rows.some(r => r && r.table === 'custom_colors'));
      });
    });
    if (hasHistoryFK) {
      console.log('[迁移] 重建 custom_colors_history 去除外键约束');
      await new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN');
          db.run(`CREATE TABLE IF NOT EXISTS custom_colors_history_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              custom_color_id INTEGER,
              color_code TEXT,
              image_path TEXT,
              formula TEXT,
              applicable_layers TEXT,
              archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, function (e1) {
              if (e1) { db.run('ROLLBACK'); return reject(e1); }
              db.run(`INSERT INTO custom_colors_history_new (id, custom_color_id, color_code, image_path, formula, applicable_layers, archived_at)
                      SELECT id, custom_color_id, color_code, image_path, formula, applicable_layers, archived_at FROM custom_colors_history`, function (e2) {
                if (e2) { db.run('ROLLBACK'); return reject(e2); }
                db.run('DROP TABLE custom_colors_history', function (e3) {
                  if (e3) { db.run('ROLLBACK'); return reject(e3); }
                  db.run('ALTER TABLE custom_colors_history_new RENAME TO custom_colors_history', function (e4) {
                    if (e4) { db.run('ROLLBACK'); return reject(e4); }
                    db.run('COMMIT', (e5) => {
                      if (e5) return reject(e5);
                      console.log('[迁移] custom_colors_history 外键移除完成');
                      resolve();
                    });
                  });
                });
              });
            });
        });
      });
    }

    console.log('数据库迁移完成 (db/migrations.js)');
  } catch (e) {
    console.error('数据库迁移失败:', e);
  }
}

module.exports = { initDatabase, runMigrations };