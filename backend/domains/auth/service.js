const crypto = require('crypto');
const authQueries = require('../../db/queries/auth');
const AuditService = require('../audit/service');

const AUTH_ERROR = {
  VALIDATION: 'AUTH_VALIDATION_ERROR',
  DUPLICATE: 'AUTH_DUPLICATE_ACCOUNT',
  NOT_FOUND: 'AUTH_NOT_FOUND',
  NOT_APPROVED: 'AUTH_NOT_APPROVED',
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  ADMIN_KEY_REQUIRED: 'AUTH_ADMIN_KEY_REQUIRED',
};

function createAuthError(code, message, statusCode = 400, extra = {}) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
}

function normalizeUsername(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.toLowerCase();
}

function validateUsername(username) {
  if (!username || username.length < 3 || username.length > 40) {
    throw createAuthError(AUTH_ERROR.VALIDATION, 'username must be 3-40 characters.', 400);
  }

  if (!/^[a-z0-9._-]+$/.test(username)) {
    throw createAuthError(
      AUTH_ERROR.VALIDATION,
      'username can contain only lowercase letters, numbers, dot, underscore, and hyphen.',
      400
    );
  }
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw createAuthError(AUTH_ERROR.VALIDATION, 'password must be 8-128 characters.', 400);
  }
}

function parseHash(stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return null;
  }
  return { salt: parts[1], hash: parts[2] };
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password, storedHash) {
  const parsed = parseHash(storedHash);
  if (!parsed) return Promise.resolve(false);

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, parsed.salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      const incoming = Buffer.from(parsed.hash, 'hex');
      if (incoming.length !== derivedKey.length) return resolve(false);
      resolve(crypto.timingSafeEqual(incoming, derivedKey));
    });
  });
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

function parseSessionTtlHours() {
  const parsed = Number.parseInt(process.env.SESSION_TTL_HOURS || '12', 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 12;
  }
  return Math.min(parsed, 24 * 30);
}

function createExpiryIso(ttlHours) {
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  return expiresAt.toISOString();
}

function sanitizeAccount(account) {
  if (!account) return null;
  return {
    id: account.id,
    username: account.username,
    status: account.status,
    created_at: account.created_at,
    updated_at: account.updated_at,
    approved_at: account.approved_at || null,
    disabled_at: account.disabled_at || null,
  };
}

function requireAdminKey(adminKey) {
  const configured = process.env.INTERNAL_ADMIN_KEY;
  if (!configured) {
    throw createAuthError(
      AUTH_ERROR.ADMIN_KEY_REQUIRED,
      'Admin approval is not configured. Set INTERNAL_ADMIN_KEY.',
      503
    );
  }
  if (!adminKey || adminKey !== configured) {
    throw createAuthError(AUTH_ERROR.ADMIN_KEY_REQUIRED, 'Invalid admin key.', 403);
  }
}

class AuthService {
  async registerRequest({ username, password }, context = {}) {
    const normalizedUsername = normalizeUsername(username);
    validateUsername(normalizedUsername);
    validatePassword(password);

    const existing = await authQueries.getAccountByUsername(normalizedUsername);
    if (existing) {
      throw createAuthError(AUTH_ERROR.DUPLICATE, 'username already exists.', 409);
    }

    const passwordHash = await hashPassword(password);
    const result = await authQueries.createRegistrationRequest({
      username: normalizedUsername,
      passwordHash,
    });

    const created = await authQueries.getAccountById(result.lastID);
    await AuditService.recordEntityChangeSafe({
      entityType: 'user_account',
      entityId: result.lastID,
      action: 'register_request',
      before: null,
      after: sanitizeAccount(created),
      summary: 'User registration requested.',
      context,
    });

    return sanitizeAccount(created);
  }

  async listPending(adminKey) {
    requireAdminKey(adminKey);
    return authQueries.listPendingAccounts();
  }

  async approveRequest(id, adminKey, context = {}) {
    requireAdminKey(adminKey);
    const result = await authQueries.approveAccount(id, context.actorId || null);
    if (result.changes === 0) {
      throw createAuthError(AUTH_ERROR.NOT_FOUND, 'Pending account not found.', 404);
    }

    const approved = await authQueries.getAccountById(id);
    await AuditService.recordEntityChangeSafe({
      entityType: 'user_account',
      entityId: id,
      action: 'approve',
      before: null,
      after: sanitizeAccount(approved),
      summary: 'User registration approved.',
      context,
    });

    return sanitizeAccount(approved);
  }

  async rejectRequest(id, reason, adminKey, context = {}) {
    requireAdminKey(adminKey);
    const result = await authQueries.rejectAccount(id, context.actorId || null, reason || null);
    if (result.changes === 0) {
      throw createAuthError(AUTH_ERROR.NOT_FOUND, 'Pending account not found.', 404);
    }

    const rejected = await authQueries.getAccountById(id);
    await AuditService.recordEntityChangeSafe({
      entityType: 'user_account',
      entityId: id,
      action: 'reject',
      before: null,
      after: sanitizeAccount(rejected),
      summary: 'User registration rejected.',
      context,
    });

    return sanitizeAccount(rejected);
  }

  async login({ username, password }, context = {}) {
    const normalizedUsername = normalizeUsername(username);
    validateUsername(normalizedUsername);
    validatePassword(password);

    const account = await authQueries.getAccountByUsername(normalizedUsername);
    if (!account) {
      throw createAuthError(AUTH_ERROR.INVALID_CREDENTIALS, 'Invalid credentials.', 401);
    }

    const verified = await verifyPassword(password, account.password_hash);
    if (!verified) {
      throw createAuthError(AUTH_ERROR.INVALID_CREDENTIALS, 'Invalid credentials.', 401);
    }

    if (account.status !== 'approved') {
      throw createAuthError(AUTH_ERROR.NOT_APPROVED, `Account status is ${account.status}.`, 403);
    }

    const ttlHours = parseSessionTtlHours();
    const expiresAt = createExpiryIso(ttlHours);
    const token = createToken();
    await authQueries.createSession({ userId: account.id, token, expiresAt });
    await authQueries.updateLastLogin(account.id);

    await AuditService.recordEntityChangeSafe({
      entityType: 'user_account',
      entityId: account.id,
      action: 'login',
      before: null,
      after: { username: account.username, expires_at: expiresAt },
      summary: 'User logged in.',
      context: {
        ...context,
        actorId: String(account.id),
        actorName: account.username,
      },
    });

    return {
      token,
      expires_at: expiresAt,
      user: sanitizeAccount(account),
    };
  }

  async logout(token, context = {}) {
    if (!token) {
      throw createAuthError(AUTH_ERROR.VALIDATION, 'Session token is required.', 400);
    }

    const active = await authQueries.getActiveSessionByToken(token);
    const result = await authQueries.revokeSessionByToken(token);

    if (result.changes > 0 && active) {
      await AuditService.recordEntityChangeSafe({
        entityType: 'user_account',
        entityId: active.user_id,
        action: 'logout',
        before: null,
        after: null,
        summary: 'User logged out.',
        context: {
          ...context,
          actorId: String(active.user_id),
          actorName: active.username,
        },
      });
    }

    return { revoked: result.changes > 0 };
  }

  async resolveSession(token) {
    if (!token) return null;
    const session = await authQueries.getActiveSessionByToken(token);
    if (!session) return null;

    await authQueries.touchSession(session.session_id);
    return {
      sessionId: session.session_id,
      token,
      user: {
        id: session.user_id,
        username: session.username,
        status: session.status,
      },
      expires_at: session.expires_at,
    };
  }

  mapError(error) {
    if (error && error.code && error.statusCode) {
      return error;
    }

    if (String(error && error.message ? error.message : '').toLowerCase().includes('unique')) {
      return createAuthError(AUTH_ERROR.DUPLICATE, 'username already exists.', 409);
    }

    return createAuthError(AUTH_ERROR.VALIDATION, error && error.message ? error.message : 'Auth error.', 400);
  }
}

module.exports = new AuthService();
module.exports.AUTH_ERROR = AUTH_ERROR;
