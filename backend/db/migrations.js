/* =========================================================
   妯″潡锛歞b/migrations.js
   鑱岃矗锛氭暟鎹簱琛ㄥ垵濮嬪寲涓庡悗缁縼绉汇€?
   寮曠敤锛歴erver.js 鍦ㄥ惎鍔ㄦ椂璋冪敤 initDatabase() 涓?runMigrations()銆?
   鏉ユ簮锛?
   - initDatabase(): 杩佺Щ鑷?server.js 涓?鈥滃垱寤烘暟鎹簱琛ㄧ粨鏋勨€?鍏紶琛紙1..8锛?
   - runMigrations(): 杩佺Щ鑷?server.js 搴曢儴鐨勨€滃惎鍔ㄨ縼绉烩€濓紙suppliers / purchase_links 瀛楀吀琛?+ mont_marte_colors 鍒楁墿灞曪級
   渚濊禆锛歞b/index.js 瀵煎嚭鐨?db 杩炴帴
   绾﹀畾锛氫笉淇敼 URL锛屼笉鏀瑰彉鐜版湁璺敱琛屼负銆備粎璐熻矗 DDL銆?
   ========================================================= */

const { db } = require('./index');
const fs = require('fs').promises;
const path = require('path');
const {
  normalizeUploadedOriginalName,
} = require('../domains/shared/asset-file-utils');

// 宸ュ叿锛氭鏌ュ垪鏄惁瀛樺湪锛堢敤浜庡鍒楄縼绉伙級
function columnExists(table, column) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
      if (err) return reject(err);
      resolve(rows.some(r => r.name === column));
    });
  });
}

// 宸ュ叿锛氬畨鍏ㄦ墽琛?SQL锛堢敤浜?CREATE/ALTER锛?
function runSafe(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function allRows(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function tableExists(table) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
      [table],
      (err, row) => {
        if (err) return reject(err);
        resolve(Boolean(row));
      }
    );
  });
}

// 鍒濆鍖栨牳蹇冭〃锛堜笌鍘?server.js 淇濇寔涓€鑷达級
async function initDatabase() {
  // 椤哄簭涓庡師瀹炵幇淇濇寔涓€鑷达紝渚夸簬瀵圭収
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
    pure_rgb_r INTEGER,
    pure_rgb_g INTEGER,
    pure_rgb_b INTEGER,
    pure_hex_color TEXT,
    pure_generated_at DATETIME,
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
    pure_rgb_r INTEGER,
    pure_rgb_g INTEGER,
    pure_rgb_b INTEGER,
    pure_hex_color TEXT,
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

  // 鍒濆鍖栨墍鏈夐粯璁ゅ垎绫伙紙浣跨敤鑻辨枃浠ｇ爜锛?
  // 娉ㄦ剰锛氳繖浜涘皢鍦?runMigrations 涓繘涓€姝ュ畬鍠?
}

// 鍚庣画杩佺Щ锛氬垱寤哄瓧鍏歌〃涓庡師琛ㄥ鍒楋紙淇濇寔涓庡師 server.js 涓€鑷达級
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

    if (!(await columnExists('scheme_layers', 'manual_formula'))) {
      await runSafe(`ALTER TABLE scheme_layers ADD COLUMN manual_formula TEXT`);
    }

    if (!(await columnExists('mont_marte_colors', 'supplier_id'))) {
      await runSafe(`ALTER TABLE mont_marte_colors ADD COLUMN supplier_id INTEGER NULL`);
    }
    if (!(await columnExists('mont_marte_colors', 'purchase_link_id'))) {
      await runSafe(`ALTER TABLE mont_marte_colors ADD COLUMN purchase_link_id INTEGER NULL`);
    }
    if (!(await columnExists('mont_marte_colors', 'category'))) {
      await runSafe(`ALTER TABLE mont_marte_colors ADD COLUMN category TEXT NULL`);
    }

    // 杩佺Щ锛氭坊鍔?initial_thumbnail_path 鍒?color_schemes 琛?
    if (!(await columnExists('color_schemes', 'initial_thumbnail_path'))) {
      await runSafe(`ALTER TABLE color_schemes ADD COLUMN initial_thumbnail_path TEXT NULL`);
    }

    // Scheme related assets table (supports image/doc attachments)
    await runSafe(`
      CREATE TABLE IF NOT EXISTS color_scheme_assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheme_id INTEGER NOT NULL,
        asset_type TEXT NOT NULL DEFAULT 'document',
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER,
        source_modified_at DATETIME,
        sort_order INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scheme_id) REFERENCES color_schemes (id) ON DELETE CASCADE
      )
    `);
    await runSafe(`CREATE INDEX IF NOT EXISTS idx_color_scheme_assets_scheme_sort ON color_scheme_assets(scheme_id, sort_order)`);
    await runSafe(`CREATE UNIQUE INDEX IF NOT EXISTS idx_color_scheme_assets_scheme_file ON color_scheme_assets(scheme_id, file_path)`);
    if (!(await columnExists('color_scheme_assets', 'source_modified_at'))) {
      await runSafe(`ALTER TABLE color_scheme_assets ADD COLUMN source_modified_at DATETIME`);
    }

    // Backfill existing initial thumbnail into first related asset slot when missing.
    await runSafe(`
      INSERT INTO color_scheme_assets (
        scheme_id,
        asset_type,
        original_name,
        file_path,
        mime_type,
        file_size,
        sort_order,
        source_modified_at
      )
      SELECT
        cs.id,
        'image',
        COALESCE(NULLIF(TRIM(cs.initial_thumbnail_path), ''), 'legacy-image'),
        cs.initial_thumbnail_path,
        'image/*',
        NULL,
        COALESCE(
          (SELECT MAX(a.sort_order) + 1 FROM color_scheme_assets a WHERE a.scheme_id = cs.id),
          1
        ),
        NULL
      FROM color_schemes cs
      WHERE cs.initial_thumbnail_path IS NOT NULL
        AND TRIM(cs.initial_thumbnail_path) <> ''
        AND NOT EXISTS (
          SELECT 1 FROM color_scheme_assets a
          WHERE a.scheme_id = cs.id
            AND a.file_path = cs.initial_thumbnail_path
        )
    `);

    // Backfill related asset source modified time from file mtime when available.
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const assetsMissingModifiedTime = await allRows(
      `
      SELECT id, file_path
      FROM color_scheme_assets
      WHERE source_modified_at IS NULL
        AND file_path IS NOT NULL
        AND TRIM(file_path) <> ''
      `
    );
    for (const asset of assetsMissingModifiedTime) {
      const storedName = path.basename(String(asset.file_path || '').trim());
      if (!storedName) {
        continue;
      }
      const absolutePath = path.join(uploadsDir, storedName);
      try {
        const stat = await fs.stat(absolutePath);
        if (stat && stat.isFile()) {
          await runSafe(
            `UPDATE color_scheme_assets SET source_modified_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [stat.mtime.toISOString(), asset.id]
          );
        }
      } catch {
        // best-effort backfill only
      }
    }

    // Best-effort fix for mojibake legacy file names in related assets.
    const assetNames = await allRows(`
      SELECT id, original_name
      FROM color_scheme_assets
      WHERE original_name IS NOT NULL
        AND TRIM(original_name) <> ''
    `);
    for (const row of assetNames) {
      const currentName = String(row.original_name || '');
      const normalizedName = normalizeUploadedOriginalName(currentName);
      if (normalizedName && normalizedName !== currentName) {
        await runSafe(
          `UPDATE color_scheme_assets SET original_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [normalizedName, row.id]
        );
      }
    }

    // 杩佺Щ锛歝ustom_colors_history 鍘婚櫎瀵?custom_colors 鐨勫閿害鏉燂紝閬垮厤鍒犻櫎鐖惰褰曟椂鍙楅樆
    // 妫€娴嬫槸鍚﹀瓨鍦ㄥ閿紩鐢?
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

    // 骞跺彂鎺у埗浼樺寲锛氭坊鍔犵増鏈瓧娈靛埌鍏抽敭琛?
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
    // This was causing issues with custom category codes like "BW" for "榛戠櫧鐏拌壊绯?
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
    

    // 8. Ensure pure color columns exist on custom colors tables
    if (!(await columnExists('custom_colors', 'pure_rgb_r'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN pure_rgb_r INTEGER`);
    }
    if (!(await columnExists('custom_colors', 'pure_rgb_g'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN pure_rgb_g INTEGER`);
    }
    if (!(await columnExists('custom_colors', 'pure_rgb_b'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN pure_rgb_b INTEGER`);
    }
    if (!(await columnExists('custom_colors', 'pure_hex_color'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN pure_hex_color TEXT`);
    }
    if (!(await columnExists('custom_colors', 'pure_generated_at'))) {
      await runSafe(`ALTER TABLE custom_colors ADD COLUMN pure_generated_at DATETIME`);
    }

    if (!(await columnExists('custom_colors_history', 'pure_rgb_r'))) {
      await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN pure_rgb_r INTEGER`);
    }
    if (!(await columnExists('custom_colors_history', 'pure_rgb_g'))) {
      await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN pure_rgb_g INTEGER`);
    }
    if (!(await columnExists('custom_colors_history', 'pure_rgb_b'))) {
      await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN pure_rgb_b INTEGER`);
    }
    if (!(await columnExists('custom_colors_history', 'pure_hex_color'))) {
      await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN pure_hex_color TEXT`);
    }
    // ==================================================================
    // Phase A3: History and audit foundation (additive)
    // ==================================================================
    await runSafe(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        action TEXT NOT NULL,
        actor_id TEXT,
        actor_name TEXT,
        request_id TEXT,
        source TEXT DEFAULT 'api',
        ip_address TEXT,
        user_agent TEXT,
        status TEXT DEFAULT 'ok',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runSafe(`
      CREATE TABLE IF NOT EXISTS entity_change_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_event_id INTEGER,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        before_data TEXT,
        after_data TEXT,
        change_summary TEXT,
        actor_id TEXT,
        actor_name TEXT,
        request_id TEXT,
        source TEXT DEFAULT 'api',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (audit_event_id) REFERENCES audit_events (id)
      )
    `);

    await runSafe(`CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id, id DESC)`);
    await runSafe(`CREATE INDEX IF NOT EXISTS idx_audit_events_request ON audit_events(request_id)`);
    await runSafe(`CREATE INDEX IF NOT EXISTS idx_entity_change_events_entity ON entity_change_events(entity_type, entity_id, id DESC)`);
    await runSafe(`CREATE INDEX IF NOT EXISTS idx_entity_change_events_audit ON entity_change_events(audit_event_id)`);

    if (await tableExists('custom_colors_history')) {
      if (!(await columnExists('custom_colors_history', 'change_action'))) {
        await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN change_action TEXT DEFAULT 'UPDATE'`);
      }
      if (!(await columnExists('custom_colors_history', 'actor_id'))) {
        await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN actor_id TEXT`);
      }
      if (!(await columnExists('custom_colors_history', 'actor_name'))) {
        await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN actor_name TEXT`);
      }
      if (!(await columnExists('custom_colors_history', 'request_id'))) {
        await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN request_id TEXT`);
      }
      if (!(await columnExists('custom_colors_history', 'source'))) {
        await runSafe(`ALTER TABLE custom_colors_history ADD COLUMN source TEXT DEFAULT 'api'`);
      }
    }

    if (await tableExists('color_schemes_history')) {
      if (!(await columnExists('color_schemes_history', 'change_action'))) {
        await runSafe(`ALTER TABLE color_schemes_history ADD COLUMN change_action TEXT DEFAULT 'UPDATE'`);
      }
      if (!(await columnExists('color_schemes_history', 'actor_id'))) {
        await runSafe(`ALTER TABLE color_schemes_history ADD COLUMN actor_id TEXT`);
      }
      if (!(await columnExists('color_schemes_history', 'actor_name'))) {
        await runSafe(`ALTER TABLE color_schemes_history ADD COLUMN actor_name TEXT`);
      }
      if (!(await columnExists('color_schemes_history', 'request_id'))) {
        await runSafe(`ALTER TABLE color_schemes_history ADD COLUMN request_id TEXT`);
      }
      if (!(await columnExists('color_schemes_history', 'source'))) {
        await runSafe(`ALTER TABLE color_schemes_history ADD COLUMN source TEXT DEFAULT 'api'`);
      }
    }

    // ==================================================================
    // Phase A4: Internal auth and session foundation (additive)
    // ==================================================================
    await runSafe(`
      CREATE TABLE IF NOT EXISTS user_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        status TEXT NOT NULL DEFAULT 'pending',
        must_change_password INTEGER NOT NULL DEFAULT 1,
        password_changed_at DATETIME,
        approved_by TEXT,
        approved_at DATETIME,
        disabled_by TEXT,
        disabled_reason TEXT,
        disabled_at DATETIME,
        last_login_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runSafe(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES user_accounts (id)
      )
    `);

    await runSafe(`CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON user_accounts(username)`);
    await runSafe(`CREATE INDEX IF NOT EXISTS idx_user_accounts_status ON user_accounts(status, id DESC)`);
    await runSafe(`CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)`);
    await runSafe(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, id DESC)`);
    await runSafe(`CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(session_token, revoked_at, expires_at)`);

    if (!(await columnExists('user_accounts', 'role'))) {
      await runSafe(`ALTER TABLE user_accounts ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
      await runSafe(`UPDATE user_accounts SET role = 'user' WHERE role IS NULL OR TRIM(role) = ''`);
    }
    if (!(await columnExists('user_accounts', 'must_change_password'))) {
      await runSafe(`ALTER TABLE user_accounts ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 1`);
      await runSafe(`UPDATE user_accounts SET must_change_password = 1 WHERE must_change_password IS NULL`);
    }
    if (!(await columnExists('user_accounts', 'password_changed_at'))) {
      await runSafe(`ALTER TABLE user_accounts ADD COLUMN password_changed_at DATETIME`);
    }
    await runSafe(`CREATE INDEX IF NOT EXISTS idx_user_accounts_role ON user_accounts(role, id DESC)`);
    await runSafe(`
      UPDATE user_accounts
      SET must_change_password = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE status = 'pending'
        AND role = 'user'
        AND COALESCE(must_change_password, 1) = 1
        AND approved_by IS NULL
        AND password_changed_at IS NULL
    `);

  } catch (e) {
    console.error('鏁版嵁搴撹縼绉诲け璐?', e);
  }
}

module.exports = { initDatabase, runMigrations };



