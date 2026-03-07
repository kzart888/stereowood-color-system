const express = require('express');
const DictionaryService = require('../domains/dictionaries/service');
const { extractAuditContext } = require('./helpers/request-audit-context');
const { requireWriteAccess } = require('./helpers/write-access');
const { requireAuthenticatedSession } = require('./helpers/auth-session');

const router = express.Router();

const ENABLE_PILOT_UI = process.env.ENABLE_PILOT_UI === 'true';
const ENABLE_PILOT_DICTIONARY_WRITE = process.env.PILOT_DICTIONARY_WRITE === 'true';

function pilotWriteEnabled(req, res, next) {
  if (!ENABLE_PILOT_UI || !ENABLE_PILOT_DICTIONARY_WRITE) {
    return res.status(404).json({ error: 'Pilot dictionary write is disabled.' });
  }
  return next();
}

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

router.post(
  '/pilot/dictionaries/suppliers/upsert',
  pilotWriteEnabled,
  requireAuthenticatedSession,
  requireWriteAccess,
  async (req, res) => {
    try {
      const row = await DictionaryService.upsertSupplier(req.body.name, extractAuditContext(req));
      return res.json(row);
    } catch (error) {
      return mapServiceError(res, error);
    }
  }
);

router.delete(
  '/pilot/dictionaries/suppliers/:id',
  pilotWriteEnabled,
  requireAuthenticatedSession,
  requireWriteAccess,
  async (req, res) => {
    try {
      const result = await DictionaryService.deleteSupplier(req.params.id, extractAuditContext(req));
      return res.json(result);
    } catch (error) {
      return mapServiceError(res, error);
    }
  }
);

router.post(
  '/pilot/dictionaries/purchase-links/upsert',
  pilotWriteEnabled,
  requireAuthenticatedSession,
  requireWriteAccess,
  async (req, res) => {
    try {
      const row = await DictionaryService.upsertPurchaseLink(req.body.url, extractAuditContext(req));
      return res.json(row);
    } catch (error) {
      return mapServiceError(res, error);
    }
  }
);

module.exports = router;
