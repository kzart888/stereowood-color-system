/* =========================================================
   Module: backend/routes/categories.js
   Responsibility: Color categories CRUD (currently list + create)
   Imports/Relations: Uses db from db/index
   Origin: Extracted from backend/server.js (2025-08), behavior preserved
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   Related: custom-colors references category_id
   ========================================================= */

const express = require('express');
const router = express.Router();
const { db } = require('../db/index');

// GET /api/categories
router.get('/categories', (req, res) => {
  db.all('SELECT * FROM color_categories ORDER BY code', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// POST /api/categories
router.post('/categories', (req, res) => {
  const { code, name } = req.body;
  db.run('INSERT INTO color_categories (code, name) VALUES (?, ?)', [code, name], function (err) {
    if (err) {
      res.status(400).json({ error: err.message });
    } else {
      res.json({ id: this.lastID, code, name });
    }
  });
});

module.exports = router;
