const { db } = require('../db/index');

const CATEGORY_CONFIG = {
  color: {
    categoryTable: 'color_categories',
    itemTable: 'custom_colors',
    itemForeignKey: 'category_id',
    countAlias: 'color_count',
  },
  montMarte: {
    categoryTable: 'mont_marte_categories',
    itemTable: 'mont_marte_colors',
    itemForeignKey: 'category_id',
    countAlias: 'material_count',
  },
};

function getConfig(type) {
  const config = CATEGORY_CONFIG[type];
  if (!config) {
    const error = new Error(`Unsupported category type: ${type}`);
    error.code = 'INVALID_CATEGORY_TYPE';
    throw error;
  }
  return config;
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

class CategoryService {
  async list(type) {
    const config = getConfig(type);

    const sql = `
      SELECT
        c.id,
        c.code,
        c.name,
        c.display_order,
        c.created_at,
        c.updated_at,
        COUNT(i.id) as ${config.countAlias}
      FROM ${config.categoryTable} c
      LEFT JOIN ${config.itemTable} i ON c.id = i.${config.itemForeignKey}
      GROUP BY c.id
      ORDER BY c.display_order, c.id
    `;

    return dbAll(sql);
  }

  async create(type, payload) {
    const config = getConfig(type);
    const { code, name, display_order } = payload;

    const sql = `
      INSERT INTO ${config.categoryTable} (code, name, display_order, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const result = await dbRun(sql, [code, name, display_order]);

    return {
      id: result.lastID,
      code,
      name,
      display_order,
      [config.countAlias]: 0,
    };
  }

  async reorder(type, updates) {
    const config = getConfig(type);

    await dbRun('BEGIN TRANSACTION');
    try {
      for (const update of updates) {
        await dbRun(
          `UPDATE ${config.categoryTable} SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [update.display_order, update.id]
        );
      }
      await dbRun('COMMIT');
    } catch (error) {
      try {
        await dbRun('ROLLBACK');
      } catch {
        // Ignore rollback failure and return original write error.
      }
      throw error;
    }
  }

  async update(type, id, payload) {
    const config = getConfig(type);
    const { name, code } = payload;
    const fields = ['name = ?'];
    const values = [name];

    if (code !== undefined) {
      fields.push('code = ?');
      values.push(code);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE ${config.categoryTable} SET ${fields.join(', ')} WHERE id = ?`;
    const result = await dbRun(sql, values);
    return result.changes > 0;
  }

  async remove(type, id) {
    const config = getConfig(type);
    const countRow = await dbGet(
      `SELECT COUNT(*) as count FROM ${config.itemTable} WHERE ${config.itemForeignKey} = ?`,
      [id]
    );

    if (countRow && countRow.count > 0) {
      const error = new Error('Category has linked records.');
      error.code = 'CATEGORY_IN_USE';
      error.linkedCount = countRow.count;
      throw error;
    }

    const result = await dbRun(`DELETE FROM ${config.categoryTable} WHERE id = ?`, [id]);
    if (result.changes === 0) {
      const error = new Error('Category not found.');
      error.code = 'CATEGORY_NOT_FOUND';
      throw error;
    }
  }
}

module.exports = new CategoryService();
