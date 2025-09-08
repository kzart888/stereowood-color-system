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

  // 初始化所有默认分类（使用英文代码）
  // 注意：这些将在 runMigrations 中进一步完善
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

    // 迁移：添加 initial_thumbnail_path 到 color_schemes 表
    if (!(await columnExists('color_schemes', 'initial_thumbnail_path'))) {
      await runSafe(`ALTER TABLE color_schemes ADD COLUMN initial_thumbnail_path TEXT NULL`);
    }

    // 迁移：custom_colors_history 去除对 custom_colors 的外键约束，避免删除父记录时受阻
    // 检测是否存在外键引用
    const hasHistoryFK = await new Promise((resolve) => {
      db.all(`PRAGMA foreign_key_list(custom_colors_history)`, (err, rows) => {
        if (err) { return resolve(false); }
        resolve(Array.isArray(rows) && rows.some(r => r && r.table === 'custom_colors'));
      });
    });
    if (hasHistoryFK) {
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
                      resolve();
                    });
                  });
                });
              });
            });
        });
      });
    }

    // 并发控制优化：添加版本字段到关键表
    if (!(await columnExists('custom_colors', 'version'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN version INTEGER DEFAULT 1`);
    }
    
    if (!(await columnExists('color_schemes', 'version'))) {
      await runSafe(`ALTER TABLE color_schemes ADD COLUMN version INTEGER DEFAULT 1`);
    }
    
    if (!(await columnExists('mont_marte_colors', 'version'))) {
      await runSafe(`ALTER TABLE mont_marte_colors ADD COLUMN version INTEGER DEFAULT 1`);
    }

    // Phase 1: Add color information columns (v0.8.4)
    // RGB columns
    if (!(await columnExists('custom_colors', 'rgb_r'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN rgb_r INTEGER`);
    }
    if (!(await columnExists('custom_colors', 'rgb_g'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN rgb_g INTEGER`);
    }
    if (!(await columnExists('custom_colors', 'rgb_b'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN rgb_b INTEGER`);
    }
    
    // CMYK columns
    if (!(await columnExists('custom_colors', 'cmyk_c'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN cmyk_c REAL`);
    }
    if (!(await columnExists('custom_colors', 'cmyk_m'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN cmyk_m REAL`);
    }
    if (!(await columnExists('custom_colors', 'cmyk_y'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN cmyk_y REAL`);
    }
    if (!(await columnExists('custom_colors', 'cmyk_k'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN cmyk_k REAL`);
    }
    
    // HEX and Pantone columns
    if (!(await columnExists('custom_colors', 'hex_color'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN hex_color TEXT`);
    }
    if (!(await columnExists('custom_colors', 'pantone_coated'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN pantone_coated TEXT`);
    }
    if (!(await columnExists('custom_colors', 'pantone_uncoated'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN pantone_uncoated TEXT`);
    }
    
    // Add same columns to custom_colors_history table
    if (!(await columnExists('custom_colors_history', 'rgb_r'))) {
      await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN rgb_r INTEGER`);
    }
    if (!(await columnExists('custom_colors_history', 'rgb_g'))) {
      await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN rgb_g INTEGER`);
    }
    if (!(await columnExists('custom_colors_history', 'rgb_b'))) {
      await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN rgb_b INTEGER`);
    }
    if (!(await columnExists('custom_colors_history', 'cmyk_c'))) {
      await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN cmyk_c REAL`);
    }
    if (!(await columnExists('custom_colors_history', 'cmyk_m'))) {
      await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN cmyk_m REAL`);
    }
    if (!(await columnExists('custom_colors_history', 'cmyk_y'))) {
      await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN cmyk_y REAL`);
    }
    if (!(await columnExists('custom_colors_history', 'cmyk_k'))) {
      await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN cmyk_k REAL`);
    }
    if (!(await columnExists('custom_colors_history', 'hex_color'))) {
      await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN hex_color TEXT`);
    }
    if (!(await columnExists('custom_colors_history', 'pantone_coated'))) {
      await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN pantone_coated TEXT`);
    }
    if (!(await columnExists('custom_colors_history', 'pantone_uncoated'))) {
      await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN pantone_uncoated TEXT`);
    }

    // ==================================================================
    // Phase 1: Category System Redesign (2025-01)
    // ==================================================================
    
    // 1. Add display_order and updated_at to color_categories
    if (!(await columnExists('color_categories', 'display_order'))) {
      await runSafe(`ALTER TABLE color_categories ADD COLUMN display_order INTEGER DEFAULT 0`);
    }
    if (!(await columnExists('color_categories', 'updated_at'))) {
      // SQLite doesn't allow CURRENT_TIMESTAMP as default in ALTER TABLE
      await runSafe(`ALTER TABLE color_categories ADD COLUMN updated_at DATETIME`);
      // Set initial values for existing rows
      await runSafe(`UPDATE color_categories SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL`);
    }
    
    // 2. Create mont_marte_categories table
    await runSafe(`
      CREATE TABLE IF NOT EXISTS mont_marte_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 3. Add category_id to mont_marte_colors
    if (!(await columnExists('mont_marte_colors', 'category_id'))) {
      await runSafe(`ALTER TABLE mont_marte_colors ADD COLUMN category_id INTEGER`);
      // Add foreign key in future migration after data is migrated
    }
    
    // 4. Initialize/Update color categories with English codes
    // First, update existing SJ to ES
    await runSafe(`UPDATE color_categories SET code = 'ES', updated_at = CURRENT_TIMESTAMP WHERE code = 'SJ'`);
    
    // Then insert all categories (using INSERT OR IGNORE to be idempotent)
    const colorCategories = [
      { code: 'BU', name: '蓝色系', order: 1 },
      { code: 'YE', name: '黄色系', order: 2 },
      { code: 'RD', name: '红色系', order: 3 },
      { code: 'GN', name: '绿色系', order: 4 },
      { code: 'VT', name: '紫色系', order: 5 },
      { code: 'ES', name: '色精', order: 6 },
      { code: 'OT', name: '其他', order: 999 }
    ];
    
    for (const cat of colorCategories) {
      await runSafe(
        `INSERT OR IGNORE INTO color_categories (code, name, display_order) VALUES (?, ?, ?)`,
        [cat.code, cat.name, cat.order]
      );
      // Update display_order if already exists
      await runSafe(
        `UPDATE color_categories SET display_order = ? WHERE code = ?`,
        [cat.order, cat.code]
      );
    }
    
    // 5. Initialize mont_marte_categories
    const montMarteCategories = [
      { code: 'WB', name: '水性漆', order: 1 },
      { code: 'OB', name: '油性漆', order: 2 },
      { code: 'OT', name: '其他', order: 999 }
    ];
    
    for (const cat of montMarteCategories) {
      await runSafe(
        `INSERT OR IGNORE INTO mont_marte_categories (code, name, display_order) VALUES (?, ?, ?)`,
        [cat.code, cat.name, cat.order]
      );
    }
    
    // 6. Migrate Mont-Marte text categories to IDs
    // Map existing text values to new category IDs
    const categoryMapping = {
      'water': 'WB',
      'oil': 'OB',
      'other': 'OT'
    };
    
    for (const [oldValue, newCode] of Object.entries(categoryMapping)) {
      await runSafe(`
        UPDATE mont_marte_colors 
        SET category_id = (SELECT id FROM mont_marte_categories WHERE code = ?)
        WHERE category = ? AND category_id IS NULL
      `, [newCode, oldValue]);
    }
    
    // Handle any unmapped categories as 'OT' (Other)
    await runSafe(`
      UPDATE mont_marte_colors 
      SET category_id = (SELECT id FROM mont_marte_categories WHERE code = 'OT')
      WHERE category IS NOT NULL AND category_id IS NULL
    `);
    
    // 7. DISABLED: Auto-categorization based on prefix
    // This was causing issues with custom category codes like "BW" for "黑白灰色系"
    // Users should have full control over their categorization
    // Commenting out to prevent automatic recategorization
    /*
    const otCategoryId = await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM color_categories WHERE code = 'OT'`, (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.id : null);
      });
    });
    
    if (otCategoryId) {
      // Update colors where the prefix doesn't match the category code
      await runSafe(`
        UPDATE custom_colors 
        SET category_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id IN (
          SELECT cc.id 
          FROM custom_colors cc
          JOIN color_categories cat ON cc.category_id = cat.id
          WHERE UPPER(SUBSTR(cc.color_code, 1, 2)) != cat.code
            AND cat.code != 'OT'
            AND cat.code != 'ES'
        )
      `, [otCategoryId]);
    }
    */
    
  } catch (e) {
    console.error('数据库迁移失败:', e);
  }
}

module.exports = { initDatabase, runMigrations };