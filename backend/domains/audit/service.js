const auditEventQueries = require('../../db/queries/audit-events');

function normalizeActorContext(context = {}) {
  return {
    actorId: context.actorId ? String(context.actorId) : null,
    actorName: context.actorName ? String(context.actorName) : null,
    requestId: context.requestId ? String(context.requestId) : null,
    source: context.source ? String(context.source) : 'api',
    ipAddress: context.ipAddress ? String(context.ipAddress) : null,
    userAgent: context.userAgent ? String(context.userAgent) : null,
  };
}

function serializeSnapshot(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

class AuditService {
  async recordEntityChange({ entityType, entityId, action, before, after, summary, context = {} }) {
    if (!entityType || !action) {
      return null;
    }

    const actor = normalizeActorContext(context);
    const status = 'ok';

    const auditEventId = await auditEventQueries.insertAuditEvent({
      entityType,
      entityId,
      action,
      actorId: actor.actorId,
      actorName: actor.actorName,
      requestId: actor.requestId,
      source: actor.source,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      status,
      errorMessage: null,
    });

    const changeEventId = await auditEventQueries.insertEntityChangeEvent({
      auditEventId,
      entityType,
      entityId,
      action,
      beforeData: serializeSnapshot(before),
      afterData: serializeSnapshot(after),
      changeSummary: summary || null,
      actorId: actor.actorId,
      actorName: actor.actorName,
      requestId: actor.requestId,
      source: actor.source,
    });

    return { auditEventId, changeEventId };
  }

  async recordEntityChangeSafe(payload) {
    try {
      return await this.recordEntityChange(payload);
    } catch (error) {
      console.warn('A3 audit event write failed:', error && error.message ? error.message : error);
      return null;
    }
  }
}

module.exports = new AuditService();
