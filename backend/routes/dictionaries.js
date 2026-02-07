const express = require('express');
const DictionaryService = require('../services/DictionaryService');

const router = express.Router();

function sendError(res, status, error, extraFields) {
  if (extraFields) {
    return res.status(status).json({ error, ...extraFields });
  }
  return res.status(status).json({ error });
}

function mapServiceError(res, error) {
  const status = error && error.statusCode ? error.statusCode : 500;
  const message = error && error.message ? error.message : 'Internal server error';
  return sendError(res, status, message);
}

router.get('/suppliers', async (req, res) => {
  try {
    const rows = await DictionaryService.listSuppliers();
    return res.json(rows);
  } catch (error) {
    return mapServiceError(res, error);
  }
});

router.post('/suppliers/upsert', async (req, res) => {
  try {
    const row = await DictionaryService.upsertSupplier(req.body.name);
    return res.json(row);
  } catch (error) {
    return mapServiceError(res, error);
  }
});

router.delete('/suppliers/:id', async (req, res) => {
  try {
    const result = await DictionaryService.deleteSupplier(req.params.id);
    return res.json(result);
  } catch (error) {
    return mapServiceError(res, error);
  }
});

router.get('/purchase-links', async (req, res) => {
  try {
    const rows = await DictionaryService.listPurchaseLinks();
    return res.json(rows);
  } catch (error) {
    return mapServiceError(res, error);
  }
});

router.post('/purchase-links/upsert', async (req, res) => {
  try {
    const row = await DictionaryService.upsertPurchaseLink(req.body.url);
    return res.json(row);
  } catch (error) {
    return mapServiceError(res, error);
  }
});

module.exports = router;
