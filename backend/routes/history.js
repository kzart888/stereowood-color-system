const express = require('express');
const HistoryService = require('../domains/history/service');

const router = express.Router();

const ALLOWED_ENTITY_TYPES = new Set([
  'custom_color',
  'artwork',
  'color_scheme',
  'mont_marte_color',
  'supplier',
  'purchase_link',
  'category',
  'mont_marte_category',
  'user_account',
]);

function parsePositiveId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function parseLimit(value) {
  if (value === undefined || value === null || value === '') {
    return 50;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return Math.min(parsed, 200);
}

router.get('/history/:entityType/:entityId', async (req, res) => {
  const entityType = String(req.params.entityType || '').trim();
  if (!ALLOWED_ENTITY_TYPES.has(entityType)) {
    return res.status(400).json({ error: 'Unsupported entityType.' });
  }

  const entityId = parsePositiveId(req.params.entityId);
  if (!entityId) {
    return res.status(400).json({ error: 'entityId must be a positive integer.' });
  }

  const limit = parseLimit(req.query.limit);
  if (limit === null) {
    return res.status(400).json({ error: 'limit must be a positive integer when provided.' });
  }

  try {
    const events = await HistoryService.getTimeline(entityType, entityId, limit);
    return res.json({ entityType, entityId, events });
  } catch (error) {
    return res.status(500).json({ error: error && error.message ? error.message : 'Internal server error' });
  }
});

module.exports = router;
