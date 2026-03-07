const crypto = require('crypto');
const authQueries = require('../../db/queries/auth');
const AuditService = require('../audit/service');
const RuntimeFlags = require('./runtime-flags');

const AUTH_ERROR = {
  VALIDATION: 'AUTH_VALIDATION_ERROR',
  DUPLICATE: 'AUTH_DUPLICATE_ACCOUNT',
  NOT_FOUND: 'AUTH_NOT_FOUND',
  NOT_APPROVED: 'AUTH_NOT_APPROVED',
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  ADMIN_KEY_REQUIRED: 'AUTH_ADMIN_KEY_REQUIRED',
  INVALID_STATUS: 'AUTH_INVALID_STATUS',
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
    last_login_at: account.last_login_at || null,
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

function parsePage(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

function parsePageSize(value, fallback = 20) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 100);
}

function normalizeAdminStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return 'all';
  if (['all', 'pending', 'approved', 'disabled'].includes(normalized)) {
    return normalized;
  }
  throw createAuthError(AUTH_ERROR.INVALID_STATUS, 'status must be one of all/pending/approved/disabled.', 400);
}

function parseRuntimeBooleanField(value, name) {
  if (typeof value === 'boolean') return value;
  if (value === undefined) return undefined;
  throw createAuthError(AUTH_ERROR.VALIDATION, `${name} must be a boolean.`, 400);
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

  async listAccounts({ status, search, page, pageSize } = {}, adminKey) {
    requireAdminKey(adminKey);
    const normalizedStatus = normalizeAdminStatus(status || 'all');
    const safePage = parsePage(page, 1);
    const safePageSize = parsePageSize(pageSize, 20);
    const offset = (safePage - 1) * safePageSize;
    const safeSearch = String(search || '').trim();

    const [items, total] = await Promise.all([
      authQueries.listAccounts({
        status: normalizedStatus,
        search: safeSearch,
        limit: safePageSize,
        offset,
      }),
      authQueries.countAccounts({ status: normalizedStatus, search: safeSearch }),
    ]);

    return {
      items: items.map((item) => sanitizeAccount(item)),
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
      },
    };
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
    const revoked = await authQueries.revokeSessionsByUserId(account.id);
    await authQueries.createSession({ userId: account.id, token, expiresAt });
    await authQueries.updateLastLogin(account.id);

    await AuditService.recordEntityChangeSafe({
      entityType: 'user_account',
      entityId: account.id,
      action: 'login',
      before: { revoked_sessions: revoked.changes || 0 },
      after: { username: account.username, expires_at: expiresAt, revoked_sessions: revoked.changes || 0 },
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
      revoked_sessions: revoked.changes || 0,
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

  async createAccountByAdmin({ username, password, status }, adminKey, context = {}) {
    requireAdminKey(adminKey);
    const normalizedUsername = normalizeUsername(username);
    validateUsername(normalizedUsername);
    validatePassword(password);

    const normalizedStatus = normalizeAdminStatus(status || 'approved');
    if (!['approved', 'disabled'].includes(normalizedStatus)) {
      throw createAuthError(AUTH_ERROR.INVALID_STATUS, 'admin create supports approved/disabled status only.', 400);
    }

    const existing = await authQueries.getAccountByUsername(normalizedUsername);
    if (existing) {
      throw createAuthError(AUTH_ERROR.DUPLICATE, 'username already exists.', 409);
    }

    const passwordHash = await hashPassword(password);
    const result = await authQueries.createAccountByAdmin({
      username: normalizedUsername,
      passwordHash,
      status: normalizedStatus,
      approvedBy: context.actorId || null,
    });

    const created = await authQueries.getAccountById(result.lastID);
    await AuditService.recordEntityChangeSafe({
      entityType: 'user_account',
      entityId: result.lastID,
      action: 'admin_create',
      before: null,
      after: sanitizeAccount(created),
      summary: 'Admin created account.',
      context,
    });

    return sanitizeAccount(created);
  }

  async resetPasswordByAdmin(id, password, adminKey, context = {}) {
    requireAdminKey(adminKey);
    validatePassword(password);
    const existing = await authQueries.getAccountById(id);
    if (!existing) {
      throw createAuthError(AUTH_ERROR.NOT_FOUND, 'Account not found.', 404);
    }

    const passwordHash = await hashPassword(password);
    await authQueries.resetPassword(id, passwordHash);
    const revokeResult = await authQueries.revokeSessionsByUserId(id);
    const updated = await authQueries.getAccountById(id);

    await AuditService.recordEntityChangeSafe({
      entityType: 'user_account',
      entityId: id,
      action: 'password_reset',
      before: sanitizeAccount(existing),
      after: { ...sanitizeAccount(updated), revoked_sessions: revokeResult.changes || 0 },
      summary: 'Admin reset account password.',
      context,
    });

    return {
      account: sanitizeAccount(updated),
      revoked_sessions: revokeResult.changes || 0,
    };
  }

  async disableAccountByAdmin(id, reason, adminKey, context = {}) {
    requireAdminKey(adminKey);
    const existing = await authQueries.getAccountById(id);
    if (!existing) {
      throw createAuthError(AUTH_ERROR.NOT_FOUND, 'Account not found.', 404);
    }

    const result = await authQueries.disableAccount(id, context.actorId || null, reason || null);
    if (result.changes === 0) {
      const latest = await authQueries.getAccountById(id);
      return sanitizeAccount(latest);
    }

    const revokeResult = await authQueries.revokeSessionsByUserId(id);
    const updated = await authQueries.getAccountById(id);

    await AuditService.recordEntityChangeSafe({
      entityType: 'user_account',
      entityId: id,
      action: 'disable',
      before: sanitizeAccount(existing),
      after: { ...sanitizeAccount(updated), revoked_sessions: revokeResult.changes || 0 },
      summary: 'Admin disabled account.',
      context,
    });

    return sanitizeAccount(updated);
  }

  async enableAccountByAdmin(id, adminKey, context = {}) {
    requireAdminKey(adminKey);
    const existing = await authQueries.getAccountById(id);
    if (!existing) {
      throw createAuthError(AUTH_ERROR.NOT_FOUND, 'Account not found.', 404);
    }

    const result = await authQueries.enableAccount(id);
    if (result.changes === 0) {
      const latest = await authQueries.getAccountById(id);
      return sanitizeAccount(latest);
    }

    const updated = await authQueries.getAccountById(id);
    await AuditService.recordEntityChangeSafe({
      entityType: 'user_account',
      entityId: id,
      action: 'enable',
      before: sanitizeAccount(existing),
      after: sanitizeAccount(updated),
      summary: 'Admin enabled account.',
      context,
    });

    return sanitizeAccount(updated);
  }

  async deleteAccountByAdmin(id, adminKey, context = {}) {
    requireAdminKey(adminKey);
    if (context.actorId && String(context.actorId) === String(id)) {
      throw createAuthError(AUTH_ERROR.VALIDATION, 'Admin cannot delete own account.', 400);
    }

    const existing = await authQueries.getAccountById(id);
    if (!existing) {
      throw createAuthError(AUTH_ERROR.NOT_FOUND, 'Account not found.', 404);
    }

    await authQueries.revokeSessionsByUserId(id);
    const result = await authQueries.deleteAccount(id);
    if (result.changes === 0) {
      throw createAuthError(AUTH_ERROR.NOT_FOUND, 'Account not found.', 404);
    }

    await AuditService.recordEntityChangeSafe({
      entityType: 'user_account',
      entityId: id,
      action: 'delete',
      before: sanitizeAccount(existing),
      after: null,
      summary: 'Admin deleted account.',
      context,
    });

    return { deleted: true, id };
  }

  async revokeSessionsByAdmin(id, adminKey, context = {}) {
    requireAdminKey(adminKey);
    const existing = await authQueries.getAccountById(id);
    if (!existing) {
      throw createAuthError(AUTH_ERROR.NOT_FOUND, 'Account not found.', 404);
    }

    const result = await authQueries.revokeSessionsByUserId(id);
    await AuditService.recordEntityChangeSafe({
      entityType: 'user_account',
      entityId: id,
      action: 'session_revoke',
      before: sanitizeAccount(existing),
      after: { revoked_sessions: result.changes || 0 },
      summary: 'Admin revoked user sessions.',
      context,
    });

    return { revoked_sessions: result.changes || 0 };
  }

  async getRuntimeFlags(adminKey) {
    requireAdminKey(adminKey);
    return RuntimeFlags.getFlags();
  }

  async setRuntimeFlags(nextFlags, adminKey, context = {}) {
    requireAdminKey(adminKey);
    const patch = {};

    const enforceWrites = parseRuntimeBooleanField(nextFlags.authEnforceWrites, 'authEnforceWrites');
    const readOnlyMode = parseRuntimeBooleanField(nextFlags.readOnlyMode, 'readOnlyMode');

    if (enforceWrites === undefined && readOnlyMode === undefined) {
      throw createAuthError(AUTH_ERROR.VALIDATION, 'At least one runtime flag must be provided.', 400);
    }

    if (enforceWrites !== undefined) patch.authEnforceWrites = enforceWrites;
    if (readOnlyMode !== undefined) patch.readOnlyMode = readOnlyMode;

    const before = RuntimeFlags.getFlags();
    const after = RuntimeFlags.setFlags(patch);

    await AuditService.recordEntityChangeSafe({
      entityType: 'user_account',
      entityId: context.actorId || null,
      action: 'runtime_flags_update',
      before,
      after,
      summary: 'Admin updated runtime write-access flags.',
      context,
    });

    return after;
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
