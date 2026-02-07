const { db } = require('../index');

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function listSuppliers() {
  return dbAll('SELECT id, name FROM suppliers ORDER BY LOWER(name) ASC');
}

function findSupplierByName(name) {
  return dbGet('SELECT id, name FROM suppliers WHERE LOWER(name) = LOWER(?)', [name]);
}

async function createSupplier(name) {
  const result = await dbRun('INSERT INTO suppliers(name) VALUES (?)', [name]);
  return { id: result.lastID, name };
}

function countSupplierReferences(id) {
  return dbGet('SELECT COUNT(*) AS cnt FROM mont_marte_colors WHERE supplier_id = ?', [id]);
}

function deleteSupplier(id) {
  return dbRun('DELETE FROM suppliers WHERE id = ?', [id]);
}

function listPurchaseLinks() {
  return dbAll('SELECT id, url FROM purchase_links ORDER BY LOWER(url) ASC');
}

function findPurchaseLinkByUrl(url) {
  return dbGet('SELECT id, url FROM purchase_links WHERE LOWER(url) = LOWER(?)', [url]);
}

async function createPurchaseLink(url) {
  const result = await dbRun('INSERT INTO purchase_links(url) VALUES (?)', [url]);
  return { id: result.lastID, url };
}

module.exports = {
  listSuppliers,
  findSupplierByName,
  createSupplier,
  countSupplierReferences,
  deleteSupplier,
  listPurchaseLinks,
  findPurchaseLinkByUrl,
  createPurchaseLink,
};
