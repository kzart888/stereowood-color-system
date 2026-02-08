const express = require('express');
const DictionaryService = require('../domains/dictionaries/service');
const { extractAuditContext } = require('./helpers/request-audit-context');

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
    const row = await DictionaryService.upsertSupplier(req.body.name, extractAuditContext(req));
    return res.json(row);
  } catch (error) {
    return mapServiceError(res, error);
  }
});

router.delete('/suppliers/:id', async (req, res) => {
  try {
    const result = await DictionaryService.deleteSupplier(req.params.id, extractAuditContext(req));
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
    const row = await DictionaryService.upsertPurchaseLink(req.body.url, extractAuditContext(req));
    return res.json(row);
  } catch (error) {
    return mapServiceError(res, error);
  }
});

module.exports = router;
