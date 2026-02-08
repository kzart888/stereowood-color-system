function flagEnabled(value) {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function requireWriteAccess(req, res, next) {
  if (flagEnabled(process.env.READ_ONLY_MODE)) {
    return res.status(503).json({ error: 'System is running in read-only mode.' });
  }

  if (!flagEnabled(process.env.AUTH_ENFORCE_WRITES)) {
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
