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

    // 并发控制优化：添加版本字段到关键表
    if (!(await columnExists('custom_colors', 'version'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN version INTEGER DEFAULT 1`);
      console.log('[迁移] custom_colors 版本字段添加完成');
    }
    
    if (!(await columnExists('color_schemes', 'version'))) {
      await runSafe(`ALTER TABLE color_schemes ADD COLUMN version INTEGER DEFAULT 1`);
      console.log('[迁移] color_schemes 版本字段添加完成');
    }
    
    if (!(await columnExists('mont_marte_colors', 'version'))) {
      await runSafe(`ALTER TABLE mont_marte_colors ADD COLUMN version INTEGER DEFAULT 1`);
      console.log('[迁移] mont_marte_colors 版本字段添加完成');
    }

    // 添加颜料分类标签映射表
    await runSafe(`
      CREATE TABLE IF NOT EXISTS material_category_labels (
        value TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[迁移] material_category_labels 表创建完成');

    // 添加排序字段到color_categories表
    if (!(await columnExists('color_categories', 'order_index'))) {
      await runSafe(`ALTER TABLE color_categories ADD COLUMN order_index INTEGER NULL`);
      console.log('[迁移] color_categories order_index 字段添加完成');
    }
    
    // 添加排序字段到material_category_labels表
    if (!(await columnExists('material_category_labels', 'order_index'))) {
      await runSafe(`ALTER TABLE material_category_labels ADD COLUMN order_index INTEGER NULL`);
      console.log('[迁移] material_category_labels order_index 字段添加完成');
    }

    // 规则引擎：分类规则表
    await runSafe(`
      CREATE TABLE IF NOT EXISTS category_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_name TEXT NOT NULL UNIQUE,
        rule_type TEXT NOT NULL, -- 'color_code_generation' | 'auto_classification'
        source_type TEXT NOT NULL, -- 'category_code' | 'color_name_pattern' | 'manual'
        target_category_id INTEGER NOT NULL,
        pattern TEXT, -- 正则表达式模式或匹配规则
        priority INTEGER DEFAULT 100, -- 优先级，数值越小越优先
        is_active BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (target_category_id) REFERENCES color_categories (id) ON DELETE CASCADE
      )
    `);
    console.log('[迁移] category_rules 分类规则表创建完成');

    // 规则引擎：分类映射表（用于处理分类代码变更历史）
    await runSafe(`
      CREATE TABLE IF NOT EXISTS category_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        old_code TEXT NOT NULL,
        new_code TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        mapping_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        FOREIGN KEY (category_id) REFERENCES color_categories (id) ON DELETE CASCADE
      )
    `);
    console.log('[迁移] category_mappings 分类映射表创建完成');

    // 规则引擎：颜色分类日志表（用于审计自动分类结果）
    await runSafe(`
      CREATE TABLE IF NOT EXISTS color_classification_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        color_id INTEGER NOT NULL,
        original_category_id INTEGER,
        new_category_id INTEGER,
        classification_method TEXT NOT NULL, -- 'rule_engine' | 'manual' | 'migration'
        rule_id INTEGER, -- 如果是规则引擎分类，记录使用的规则ID
        confidence_score REAL, -- 置信度分数(0-1)
        color_name TEXT,
        color_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (color_id) REFERENCES custom_colors (id) ON DELETE CASCADE,
        FOREIGN KEY (original_category_id) REFERENCES color_categories (id),
        FOREIGN KEY (new_category_id) REFERENCES color_categories (id),
        FOREIGN KEY (rule_id) REFERENCES category_rules (id)
      )
    `);
    console.log('[迁移] color_classification_logs 分类日志表创建完成');

    // 初始化默认分类规则（幂等操作）
    await initializeDefaultRules();

    // 修复"其他"分类代码格式（OTHER -> OT）
    await fixOtherCategoryCode();

    console.log('数据库迁移完成 (db/migrations.js)');
  } catch (e) {
    console.error('数据库迁移失败:', e);
  }
}

// 初始化默认分类规则
async function initializeDefaultRules() {
  try {
    console.log('[迁移] 开始初始化默认分类规则...');
    
    // 获取所有现有分类
    const categories = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM color_categories ORDER BY code ASC', (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
    
    // 为每个分类创建默认规则（如果不存在）
    for (const category of categories) {
      // 1. 编号生成规则
      const codeGenRuleName = `${category.code}_编号生成`;
      await runSafe(`
        INSERT OR IGNORE INTO category_rules 
        (rule_name, rule_type, source_type, target_category_id, pattern, priority, is_active)
        VALUES (?, 'color_code_generation', 'category_code', ?, ?, 10, true)
      `, [codeGenRuleName, category.id, `${category.code}{number}`]);
      
      // 2. 自动分类规则（基于分类代码前缀）
      const autoClassifyRuleName = `${category.code}_自动分类`;
      await runSafe(`
        INSERT OR IGNORE INTO category_rules 
        (rule_name, rule_type, source_type, target_category_id, pattern, priority, is_active)
        VALUES (?, 'auto_classification', 'category_code', ?, ?, 20, true)
      `, [autoClassifyRuleName, category.id, category.code]);
    }
    
    // 添加一些通用的名称模式规则
    const commonRules = [
      {
        name: '蓝色系_名称模式',
        type: 'auto_classification',
        sourceType: 'color_name_pattern',
        pattern: '(蓝|blue|BU|bu)',
        categoryCode: 'BU',
        priority: 30
      },
      {
        name: '绿色系_名称模式',
        type: 'auto_classification',
        sourceType: 'color_name_pattern',
        pattern: '(绿|green|GN|gn)',
        categoryCode: 'GN',
        priority: 30
      },
      {
        name: '红色系_名称模式',
        type: 'auto_classification',
        sourceType: 'color_name_pattern',
        pattern: '(红|red|RD|rd)',
        categoryCode: 'RD',
        priority: 30
      },
      {
        name: '棕色系_名称模式',
        type: 'auto_classification',
        sourceType: 'color_name_pattern',
        pattern: '(棕|咖|褐|brown|BR|br)',
        categoryCode: 'BR',
        priority: 30
      },
      {
        name: '黄色系_名称模式',
        type: 'auto_classification',
        sourceType: 'color_name_pattern',
        pattern: '(黄|金|yellow|YL|yl)',
        categoryCode: 'YL',
        priority: 30
      }
    ];
    
    for (const rule of commonRules) {
      // 查找对应的分类ID
      const category = categories.find(c => c.code === rule.categoryCode);
      if (category) {
        await runSafe(`
          INSERT OR IGNORE INTO category_rules 
          (rule_name, rule_type, source_type, target_category_id, pattern, priority, is_active)
          VALUES (?, ?, ?, ?, ?, ?, true)
        `, [rule.name, rule.type, rule.sourceType, category.id, rule.pattern, rule.priority]);
      }
    }
    
    // 统计初始化的规则数量
    const ruleCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM category_rules', (err, row) => {
        if (err) return reject(err);
        resolve(row.count);
      });
    });
    
    console.log(`[迁移] 默认分类规则初始化完成，共 ${ruleCount} 条规则`);
    
  } catch (error) {
    console.error('[迁移] 初始化默认规则失败:', error);
  }
}

// 修复"其他"分类代码格式
async function fixOtherCategoryCode() {
  try {
    console.log('[迁移] 开始修复"其他"分类代码格式...');
    
    // 检查是否存在代码为"OTHER"的分类
    const otherCategory = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM color_categories WHERE code = ?', ['OTHER'], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    
    if (otherCategory) {
      // 更新代码从 OTHER 到 OT
      await runSafe('UPDATE color_categories SET code = ? WHERE code = ?', ['OT', 'OTHER']);
      console.log('[迁移] "其他"分类代码已从 OTHER 更新为 OT');
    } else {
      console.log('[迁移] 未找到代码为 OTHER 的分类，跳过修复');
    }
    
  } catch (error) {
    console.error('[迁移] 修复"其他"分类代码失败:', error);
  }
}

module.exports = { initDatabase, runMigrations };