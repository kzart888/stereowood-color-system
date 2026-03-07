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
  toEvent(row) {
    return {
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
    };
  }

  async getTimeline(entityType, entityId, limit = 50) {
    const rows = await auditEventQueries.getEntityTimeline(entityType, entityId, limit);
    return rows.map((row) => this.toEvent(row));
  }

  async getFeed({ tab = 'all', entityType = '', entityTypes = [], entityId = null, actor = '', action = '', page = 1, pageSize = 20 } = {}) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safePageSize = Number.isInteger(pageSize) ? Math.min(Math.max(pageSize, 1), 100) : 20;
    const offset = (safePage - 1) * safePageSize;

    const actorQuery = String(actor || '').trim().toLowerCase();
    const actionQuery = String(action || '').trim().toLowerCase();
    const normalizedEntityType = String(entityType || '').trim();
    const normalizedEntityTypes = Array.isArray(entityTypes) ? entityTypes.filter(Boolean) : [];

    const filters = {
      entityType: normalizedEntityType || undefined,
      entityTypes: normalizedEntityTypes.length > 0 ? normalizedEntityTypes : undefined,
      entityId: Number.isInteger(entityId) ? entityId : undefined,
      actorQuery: actorQuery ? `%${actorQuery}%` : undefined,
      actionQuery: actionQuery ? `%${actionQuery}%` : undefined,
    };

    const [rows, total] = await Promise.all([
      auditEventQueries.listFeed({ filters, limit: safePageSize, offset }),
      auditEventQueries.countFeed(filters),
    ]);

    return {
      items: rows.map((row) => this.toEvent(row)),
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / safePageSize)),
      },
      filters: {
        tab,
        entityType: normalizedEntityType || null,
        entityId: Number.isInteger(entityId) ? entityId : null,
        actor: actor || '',
        action: action || '',
      },
    };
  }
}

module.exports = new HistoryService();
