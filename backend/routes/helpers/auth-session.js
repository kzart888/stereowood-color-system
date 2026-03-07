const AuthService = require('../../domains/auth/service');

function extractTokenFromRequest(req) {
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

module.exports = {
  extractTokenFromRequest,
  attachAuthUser,
  requireAuthenticatedSession,
};
