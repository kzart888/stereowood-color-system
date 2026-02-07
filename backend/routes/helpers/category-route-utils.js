const DEFAULT_DISPLAY_ORDER = 999;

function parseRequiredName(name) {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildCategoryCode(code, name, fallbackPrefix) {
  if (typeof code === 'string' && code.trim()) {
    return code.trim().toUpperCase();
  }

  const namePrefix = name.slice(0, 2).toUpperCase();
  return namePrefix || fallbackPrefix;
}

function parseDisplayOrder(displayOrder) {
  if (displayOrder === undefined || displayOrder === null || displayOrder === '') {
    return DEFAULT_DISPLAY_ORDER;
  }

  const parsed = Number.parseInt(displayOrder, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parsePositiveId(idValue) {
  const parsed = Number.parseInt(idValue, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function parseReorderUpdates(updates) {
  if (!Array.isArray(updates)) {
    return { error: 'Request body must be an array of { id, display_order }.' };
  }

  const normalized = [];
  for (const update of updates) {
    const id = parsePositiveId(update && update.id);
    const displayOrder = parseDisplayOrder(update && update.display_order);

    if (!id || displayOrder === null) {
      return { error: 'Each reorder entry must include valid id and display_order integers.' };
    }

    normalized.push({ id, display_order: displayOrder });
  }

  return { value: normalized };
}

function mapWriteError(err, duplicateCodeMessage) {
  if (err && typeof err.message === 'string' && err.message.includes('UNIQUE')) {
    return { status: 400, error: duplicateCodeMessage };
  }

  return { status: 500, error: err && err.message ? err.message : 'Internal server error' };
}

function sendError(res, status, error, extraFields) {
  if (extraFields) {
    return res.status(status).json({ error, ...extraFields });
  }
  return res.status(status).json({ error });
}

module.exports = {
  DEFAULT_DISPLAY_ORDER,
  parseRequiredName,
  buildCategoryCode,
  parseDisplayOrder,
  parsePositiveId,
  parseReorderUpdates,
  mapWriteError,
  sendError,
};
