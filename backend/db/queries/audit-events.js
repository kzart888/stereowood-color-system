const { db } = require('../index');

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
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

async function insertAuditEvent(payload) {
  const result = await dbRun(
    `
    INSERT INTO audit_events (
      entity_type,
      entity_id,
      action,
      actor_id,
      actor_name,
      request_id,
      source,
      ip_address,
      user_agent,
      status,
      error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.entityType,
      payload.entityId,
      payload.action,
      payload.actorId,
      payload.actorName,
      payload.requestId,
      payload.source,
      payload.ipAddress,
      payload.userAgent,
      payload.status,
      payload.errorMessage,
    ]
  );
  return result.lastID;
}

async function insertEntityChangeEvent(payload) {
  const result = await dbRun(
    `
    INSERT INTO entity_change_events (
      audit_event_id,
      entity_type,
      entity_id,
      action,
      before_data,
      after_data,
      change_summary,
      actor_id,
      actor_name,
      request_id,
      source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.auditEventId,
      payload.entityType,
      payload.entityId,
      payload.action,
      payload.beforeData,
      payload.afterData,
      payload.changeSummary,
      payload.actorId,
      payload.actorName,
      payload.requestId,
      payload.source,
    ]
  );
  return result.lastID;
}

async function getEntityTimeline(entityType, entityId, limit = 50) {
  const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 200) : 50;
  return dbAll(
    `
    SELECT
      id,
      audit_event_id,
      entity_type,
      entity_id,
      action,
      before_data,
      after_data,
      change_summary,
      actor_id,
      actor_name,
      request_id,
      source,
      created_at
    FROM entity_change_events
    WHERE entity_type = ? AND entity_id = ?
    ORDER BY id DESC
    LIMIT ?
    `,
    [entityType, entityId, safeLimit]
  );
}

function buildFeedWhereClause(filters = {}) {
  const clauses = [];
  const params = [];

  if (Array.isArray(filters.entityTypes) && filters.entityTypes.length > 0) {
    clauses.push(`entity_type IN (${filters.entityTypes.map(() => '?').join(', ')})`);
    params.push(...filters.entityTypes);
  }

  if (filters.entityType) {
    clauses.push('entity_type = ?');
    params.push(filters.entityType);
  }

  if (Number.isInteger(filters.entityId) && filters.entityId > 0) {
    clauses.push('entity_id = ?');
    params.push(filters.entityId);
  }

  if (filters.actorQuery) {
    clauses.push('(LOWER(COALESCE(actor_name, "")) LIKE ? OR LOWER(COALESCE(actor_id, "")) LIKE ?)');
    params.push(filters.actorQuery, filters.actorQuery);
  }

  if (filters.actionQuery) {
    clauses.push('LOWER(action) LIKE ?');
    params.push(filters.actionQuery);
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

async function listFeed({ filters = {}, limit = 20, offset = 0 } = {}) {
  const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  const { whereClause, params } = buildFeedWhereClause(filters);

  return dbAll(
    `
    SELECT
      id,
      audit_event_id,
      entity_type,
      entity_id,
      action,
      before_data,
      after_data,
      change_summary,
      actor_id,
      actor_name,
      request_id,
      source,
      created_at
    FROM entity_change_events
    ${whereClause}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, safeLimit, safeOffset]
  );
}

async function countFeed(filters = {}) {
  const { whereClause, params } = buildFeedWhereClause(filters);
  const row = await dbGet(
    `
    SELECT COUNT(*) AS total
    FROM entity_change_events
    ${whereClause}
    `,
    params
  );
  return row ? row.total : 0;
}

module.exports = {
  insertAuditEvent,
  insertEntityChangeEvent,
  getEntityTimeline,
  listFeed,
  countFeed,
};
