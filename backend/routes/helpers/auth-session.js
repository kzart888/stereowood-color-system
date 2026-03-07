const AuthService = require('../../domains/auth/service');

function parseCookies(cookieHeader) {
  const result = {};
  if (!cookieHeader) return result;

  String(cookieHeader)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const index = pair.indexOf('=');
      if (index <= 0) return;
      const key = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (!key) return;
      result[key] = decodeURIComponent(value || '');
    });

  return result;
}

function extractTokenFromRequest(req) {
  const cookies = parseCookies(req.get('cookie'));
  if (cookies.sw_session) return String(cookies.sw_session).trim();

  const authHeader = req.get('authorization');
  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }

  const alt = req.get('x-session-token');
  if (alt) return String(alt).trim();

  return null;
}

async function attachAuthUser(req, res, next) {
  try {
    const token = extractTokenFromRequest(req);
    req.authToken = token;
    req.authUser = null;
    req.authSession = null;
    req.authInvalid = false;

    if (!token) {
      return next();
    }

    const session = await AuthService.resolveSession(token);
    if (!session || !session.user || session.user.status !== 'approved') {
      req.authInvalid = true;
      return next();
    }

    req.authSession = session;
    req.authUser = {
      id: session.user.id,
      username: session.user.username,
      role: session.user.role || 'user',
      mustChangePassword: Boolean(session.user.must_change_password),
    };

    return next();
  } catch (error) {
    console.warn('Auth context attach failed:', error && error.message ? error.message : error);
    req.authUser = null;
    req.authSession = null;
    req.authInvalid = false;
    return next();
  }
}

function requireAuthenticatedSession(req, res, next) {
  if (req.authUser) {
    return next();
  }

  if (req.authInvalid) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  return res.status(401).json({ error: 'Authentication required.' });
}

function requirePasswordUpdated(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.authUser.mustChangePassword) {
    return res.status(403).json({
      error: 'Password change required before accessing this resource.',
      code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
    });
  }
  return next();
}

module.exports = {
  extractTokenFromRequest,
  attachAuthUser,
  requireAuthenticatedSession,
  requirePasswordUpdated,
  parseCookies,
};
