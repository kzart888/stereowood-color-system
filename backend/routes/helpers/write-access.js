const RuntimeFlags = require('../../domains/auth/runtime-flags');

function requireWriteAccess(req, res, next) {
  if (RuntimeFlags.isReadOnlyMode()) {
    return res.status(503).json({ error: 'System is running in read-only mode.' });
  }

  if (!RuntimeFlags.isAuthEnforceWrites()) {
    return next();
  }

  if (req.authUser) {
    return next();
  }

  if (req.authInvalid) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  return res.status(401).json({ error: 'Authentication required for write operations.' });
}

module.exports = {
  requireWriteAccess,
};

