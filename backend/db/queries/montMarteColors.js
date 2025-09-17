/**
 * Mont Marte raw color queries.
 * Centralises SQL used by the material routes so that business logic can live
 * in a dedicated service instead of being duplicated in Express handlers.
 */

const { db } = require('../index');

const BASE_SELECT = `
  SELECT
    m.id,
    m.name,
    m.image_path,
    m.updated_at,
    m.supplier_id,
    s.name AS supplier_name,
    m.purchase_link_id,
    p.url AS purchase_link_url,
    m.category,
    m.category_id,
    mc.name AS category_name,
    mc.code AS category_code
  FROM mont_marte_colors m
  LEFT JOIN suppliers s ON s.id = m.supplier_id
  LEFT JOIN purchase_links p ON p.id = m.purchase_link_id
  LEFT JOIN mont_marte_categories mc ON mc.id = m.category_id
`;

function getAll() {
  return new Promise((resolve, reject) => {
    db.all(`${BASE_SELECT}\nORDER BY LOWER(m.name) ASC`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getById(id) {
  return new Promise((resolve, reject) => {
    db.get(`${BASE_SELECT}\nWHERE m.id = ?`, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getBasicById(id) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, name, image_path FROM mont_marte_colors WHERE id = ?`,
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function insertColor(data) {
  const {
    name,
    image_path,
    supplier_id,
    purchase_link_id,
    category,
    category_id,
  } = data;

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO mont_marte_colors
        (name, image_path, supplier_id, purchase_link_id, category, category_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, image_path, supplier_id, purchase_link_id, category, category_id],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function updateColor(id, data) {
  const updates = [];
  const values = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.image_path !== undefined) {
    updates.push('image_path = ?');
    values.push(data.image_path);
  }
  if (data.supplier_id !== undefined) {
    updates.push('supplier_id = ?');
    values.push(data.supplier_id);
  }
  if (data.purchase_link_id !== undefined) {
    updates.push('purchase_link_id = ?');
    values.push(data.purchase_link_id);
  }
  if (data.category !== undefined) {
    updates.push('category = ?');
    values.push(data.category);
  }
  if (data.category_id !== undefined) {
    updates.push('category_id = ?');
    values.push(data.category_id);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  return new Promise((resolve, reject) => {
    const sql = `UPDATE mont_marte_colors SET ${updates.join(', ')} WHERE id = ?`;
    db.run(sql, values, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

function deleteColor(id) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM mont_marte_colors WHERE id = ?`, [id], function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

module.exports = {
  getAll,
  getById,
  getBasicById,
  insertColor,
  updateColor,
  deleteColor,
};
