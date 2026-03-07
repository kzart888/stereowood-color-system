const AUTH_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
};

function parseFlag(value, fallback = false) {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function hasRole(req, roles = []) {
  if (!req || !req.authUser) return false;
  const role = String(req.authUser.role || AUTH_ROLES.USER);
  return roles.includes(role);
}

function legacyAdminKeyAllowed(req) {
  const configured = process.env.INTERNAL_ADMIN_KEY;
  if (!configured) return false;
  const allowLegacy = parseFlag(process.env.ALLOW_LEGACY_ADMIN_KEY, false);
  if (!allowLegacy) return false;
  const headerKey = req.get('x-admin-key');
  return Boolean(headerKey && headerKey === configured);
}

function attachLegacyAdminActor(req) {
  if (!req.authUser && legacyAdminKeyAllowed(req)) {
    req.authUser = {
      id: null,
      username: 'legacy_admin_key',
      role: AUTH_ROLES.SUPER_ADMIN,
      mustChangePassword: false,
    };
    req.authLegacyAdminKey = true;
  }
}

function requireRole(roles = []) {
  return (req, res, next) => {
    if (roles.length === 0) return next();
    attachLegacyAdminActor(req);
    if (hasRole(req, roles)) return next();
    if (req.authInvalid) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    return res.status(403).json({ error: 'Insufficient permissions.' });
  };
}

function isAdminRole(role) {
  return [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN].includes(String(role || ''));
}

module.exports = {
  AUTH_ROLES,
  hasRole,
  isAdminRole,
  requireRole,
  legacyAdminKeyAllowed,
  attachLegacyAdminActor,
};
