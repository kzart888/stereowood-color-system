/* =========================================================
   Module: backend/routes/dictionaries.js
   Responsibility: Suppliers and Purchase Links dictionary routes
   Imports/Relations: Uses db from db/index
   Origin: Extracted from backend/server.js (2025-08), behavior preserved
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   Related: mont-marte-colors routes reference these dictionaries via FKs
   ========================================================= */

const express = require('express');
const router = express.Router();
const { db } = require('../db/index');

// 字典表 API：供应商
// GET /api/suppliers
router.get('/suppliers', (req, res) => {
  db.all(`SELECT id, name FROM suppliers ORDER BY LOWER(name) ASC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/suppliers/upsert
router.post('/suppliers/upsert', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name 不能为空' });
  db.get(`SELECT id, name FROM suppliers WHERE LOWER(name) = LOWER(?)`, [name], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.json(row);
    db.run(`INSERT INTO suppliers(name) VALUES (?)`, [name], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ id: this.lastID, name });
    });
  });
});

// DELETE /api/suppliers/:id
router.delete('/suppliers/:id', (req, res) => {
  const id = Number(req.params.id);
  db.get(`SELECT COUNT(*) AS cnt FROM mont_marte_colors WHERE supplier_id = ?`, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row.cnt > 0) return res.status(409).json({ error: `有 ${row.cnt} 处引用，无法删除` });
    db.run(`DELETE FROM suppliers WHERE id = ?`, [id], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ deleted: this.changes > 0 });
    });
  });
});

// 字典表 API：线上采购地址
// GET /api/purchase-links
router.get('/purchase-links', (req, res) => {
  db.all(`SELECT id, url FROM purchase_links ORDER BY LOWER(url) ASC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/purchase-links/upsert
router.post('/purchase-links/upsert', (req, res) => {
  const url = String(req.body.url || '').trim();
  if (!url) return res.status(400).json({ error: 'url 不能为空' });
  db.get(`SELECT id, url FROM purchase_links WHERE LOWER(url) = LOWER(?)`, [url], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.json(row);
    db.run(`INSERT INTO purchase_links(url) VALUES (?)`, [url], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ id: this.lastID, url });
    });
  });
});

module.exports = router;
