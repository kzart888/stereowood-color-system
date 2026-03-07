function getHeaderValue(req, name) {
  const value = req.get(name);
  if (!value) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function extractAuditContext(req) {
  const forwardedFor = getHeaderValue(req, 'x-forwarded-for');
  const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.ip || req.connection?.remoteAddress || null);

  if (req && req.authUser) {
    return {
      actorId: req.authUser.id !== null && req.authUser.id !== undefined ? String(req.authUser.id) : null,
      actorName: req.authUser.username || null,
      requestId: getHeaderValue(req, 'x-request-id'),
      source: getHeaderValue(req, 'x-source') || 'api',
      ipAddress,
      userAgent: getHeaderValue(req, 'user-agent'),
    };
  }

  return {
    actorId: getHeaderValue(req, 'x-actor-id'),
    actorName: getHeaderValue(req, 'x-actor-name'),
    requestId: getHeaderValue(req, 'x-request-id'),
    source: getHeaderValue(req, 'x-source') || 'api',
    ipAddress,
    userAgent: getHeaderValue(req, 'user-agent'),
  };
}

module.exports = { extractAuditContext };
