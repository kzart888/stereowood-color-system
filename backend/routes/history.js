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

const TAB_ENTITY_TYPES = {
  'custom-colors': ['custom_color', 'category'],
  artworks: ['artwork', 'color_scheme'],
  'mont-marte': ['mont_marte_color', 'supplier', 'purchase_link', 'mont_marte_category'],
  all: [],
};

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

function parsePage(value) {
  if (value === undefined || value === null || value === '') {
    return 1;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parsePageSize(value) {
  if (value === undefined || value === null || value === '') {
    return 20;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return Math.min(parsed, 100);
}

router.get('/history/feed', async (req, res) => {
  const tab = String(req.query.tab || 'all').trim();
  if (!Object.prototype.hasOwnProperty.call(TAB_ENTITY_TYPES, tab)) {
    return res.status(400).json({ error: 'Unsupported tab value.' });
  }

  const entityType = String(req.query.entityType || '').trim();
  if (entityType && !ALLOWED_ENTITY_TYPES.has(entityType)) {
    return res.status(400).json({ error: 'Unsupported entityType.' });
  }

  const entityIdRaw = req.query.entityId;
  const entityId = entityIdRaw === undefined || entityIdRaw === '' ? null : parsePositiveId(entityIdRaw);
  if (entityIdRaw !== undefined && entityIdRaw !== '' && !entityId) {
    return res.status(400).json({ error: 'entityId must be a positive integer when provided.' });
  }

  const page = parsePage(req.query.page);
  if (page === null) {
    return res.status(400).json({ error: 'page must be a positive integer when provided.' });
  }

  const pageSize = parsePageSize(req.query.pageSize);
  if (pageSize === null) {
    return res.status(400).json({ error: 'pageSize must be a positive integer when provided.' });
  }

  const actor = String(req.query.actor || '').trim();
  const action = String(req.query.action || '').trim();
  const entityTypes = entityType ? [] : TAB_ENTITY_TYPES[tab];

  try {
    const feed = await HistoryService.getFeed({
      tab,
      entityType,
      entityTypes,
      entityId,
      actor,
      action,
      page,
      pageSize,
    });
    return res.json(feed);
  } catch (error) {
    return res.status(500).json({ error: error && error.message ? error.message : 'Internal server error' });
  }
});

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
