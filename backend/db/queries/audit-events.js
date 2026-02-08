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

module.exports = {
  insertAuditEvent,
  insertEntityChangeEvent,
  getEntityTimeline,
};
