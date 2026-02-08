const { db } = require('../index');

const SELECT_COLOR_SQL = `
  SELECT m.id, m.name, m.image_path, m.updated_at, m.version,
         m.supplier_id, s.name AS supplier_name,
         m.purchase_link_id, p.url AS purchase_link_url,
         m.category,
         m.category_id, mc.name AS category_name, mc.code AS category_code
    FROM mont_marte_colors m
    LEFT JOIN suppliers s ON s.id = m.supplier_id
    LEFT JOIN purchase_links p ON p.id = m.purchase_link_id
    LEFT JOIN mont_marte_categories mc ON mc.id = m.category_id
`;

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

function getAllColors() {
  return dbAll(`${SELECT_COLOR_SQL} ORDER BY LOWER(m.name) ASC`);
}

function getColorById(id) {
  return dbGet(`${SELECT_COLOR_SQL} WHERE m.id = ?`, [id]);
}

function getColorForUpdate(id) {
  return dbGet(
    `
    SELECT id, name, image_path, supplier_id, purchase_link_id, category, category_id, version, updated_at
      FROM mont_marte_colors
     WHERE id = ?
    `,
    [id]
  );
}

async function createColor(payload) {
  const result = await dbRun(
    `
    INSERT INTO mont_marte_colors(name, image_path, supplier_id, purchase_link_id, category, category_id)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      payload.name,
      payload.image_path,
      payload.supplier_id,
      payload.purchase_link_id,
      payload.category,
      payload.category_id,
    ]
  );
  return result.lastID;
}

async function updateColor(id, payload, expectedVersion = null) {
  let where = 'id = ?';
  const values = [
    payload.name,
    payload.image_path,
    payload.supplier_id,
    payload.purchase_link_id,
    payload.category,
    payload.category_id,
  ];

  if (expectedVersion !== null && expectedVersion !== undefined) {
    where += ' AND version = ?';
  }

  values.push(id);
  if (expectedVersion !== null && expectedVersion !== undefined) {
    values.push(expectedVersion);
  }

  const result = await dbRun(
    `
    UPDATE mont_marte_colors
       SET name = ?, image_path = ?, supplier_id = ?, purchase_link_id = ?, category = ?, category_id = ?,
           version = version + 1, updated_at = CURRENT_TIMESTAMP
     WHERE ${where}
    `,
    values
  );
  return result.changes;
}

async function deleteColor(id) {
  const result = await dbRun('DELETE FROM mont_marte_colors WHERE id = ?', [id]);
  return result.changes;
}

module.exports = {
  getAllColors,
  getColorById,
  getColorForUpdate,
  createColor,
  updateColor,
  deleteColor,
};
