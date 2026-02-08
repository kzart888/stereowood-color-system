const auditEventQueries = require('../../db/queries/audit-events');

function parseJsonOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

class HistoryService {
  async getTimeline(entityType, entityId, limit = 50) {
    const rows = await auditEventQueries.getEntityTimeline(entityType, entityId, limit);
    return rows.map((row) => ({
      id: row.id,
      audit_event_id: row.audit_event_id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      action: row.action,
      before_data: parseJsonOrNull(row.before_data),
      after_data: parseJsonOrNull(row.after_data),
      change_summary: row.change_summary,
      actor_id: row.actor_id,
      actor_name: row.actor_name,
      request_id: row.request_id,
      source: row.source,
      created_at: row.created_at,
    }));
  }
}

module.exports = new HistoryService();
