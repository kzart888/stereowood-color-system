const { db } = require('../index');

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function getAccountByUsername(username) {
  return dbGet(
    `
    SELECT
      id,
      username,
      password_hash,
      role,
      status,
      must_change_password,
      password_changed_at,
      created_at,
      updated_at,
      approved_at,
      disabled_at,
      last_login_at
    FROM user_accounts
    WHERE LOWER(username) = LOWER(?)
    `,
    [username]
  );
}

function getAccountById(id) {
  return dbGet(
    `
    SELECT
      id,
      username,
      role,
      status,
      must_change_password,
      password_changed_at,
      created_at,
      updated_at,
      approved_at,
      disabled_at,
      last_login_at
    FROM user_accounts
    WHERE id = ?
    `,
    [id]
  );
}

function getFirstSuperAdmin() {
  return dbGet(
    `
    SELECT id, username, role, status
    FROM user_accounts
    WHERE role = 'super_admin'
    ORDER BY id ASC
    LIMIT 1
    `
  );
}

function countSuperAdmins() {
  return dbGet(
    `
    SELECT COUNT(*) AS total
    FROM user_accounts
    WHERE role = 'super_admin'
    `
  ).then((row) => (row ? row.total : 0));
}

function createRegistrationRequest({ username, passwordHash }) {
  return dbRun(
    `
    INSERT INTO user_accounts (username, password_hash, role, status, must_change_password)
    VALUES (?, ?, 'user', 'pending', 1)
    `,
    [username, passwordHash]
  );
}

function createBootstrapSuperAdmin({ username, passwordHash }) {
  return dbRun(
    `
    INSERT INTO user_accounts (
      username,
      password_hash,
      role,
      status,
      must_change_password,
      approved_at
    ) VALUES (?, ?, 'super_admin', 'approved', 1, CURRENT_TIMESTAMP)
    `,
    [username, passwordHash]
  );
}

function listPendingAccounts() {
  return dbAll(
    `
    SELECT id, username, role, status, must_change_password, created_at, updated_at
    FROM user_accounts
    WHERE status = 'pending'
    ORDER BY created_at ASC
    `
  );
}

function listAccounts({ status = 'all', search = '', limit = 20, offset = 0 } = {}) {
  const clauses = [];
  const params = [];

  if (status && status !== 'all') {
    clauses.push('status = ?');
    params.push(status);
  }

  if (search && String(search).trim() !== '') {
    clauses.push('LOWER(username) LIKE ?');
    params.push(`%${String(search).trim().toLowerCase()}%`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return dbAll(
    `
    SELECT
      id,
      username,
      role,
      status,
      must_change_password,
      password_changed_at,
      created_at,
      updated_at,
      approved_at,
      disabled_at,
      last_login_at
    FROM user_accounts
    ${whereClause}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );
}

function countAccounts({ status = 'all', search = '' } = {}) {
  const clauses = [];
  const params = [];

  if (status && status !== 'all') {
    clauses.push('status = ?');
    params.push(status);
  }

  if (search && String(search).trim() !== '') {
    clauses.push('LOWER(username) LIKE ?');
    params.push(`%${String(search).trim().toLowerCase()}%`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return dbGet(
    `
    SELECT COUNT(*) AS total
    FROM user_accounts
    ${whereClause}
    `,
    params
  ).then((row) => (row ? row.total : 0));
}

function approveAccount(id, approvedBy = null) {
  return dbRun(
    `
    UPDATE user_accounts
    SET status = 'approved',
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        approved_by = ?
    WHERE id = ? AND status = 'pending'
    `,
    [approvedBy, id]
  );
}

function rejectAccount(id, disabledBy = null, reason = null) {
  return dbRun(
    `
    UPDATE user_accounts
    SET status = 'disabled',
        disabled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        disabled_by = ?,
        disabled_reason = ?
    WHERE id = ? AND status = 'pending'
    `,
    [disabledBy, reason, id]
  );
}

function createAccountByAdmin({
  username,
  passwordHash,
  role = 'user',
  status = 'approved',
  approvedBy = null,
  mustChangePassword = 1,
}) {
  return dbRun(
    `
    INSERT INTO user_accounts (
      username,
      password_hash,
      role,
      status,
      must_change_password,
      approved_by,
      approved_at,
      disabled_by,
      disabled_reason,
      disabled_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      CASE WHEN ? = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END,
      CASE WHEN ? = 'disabled' THEN ? ELSE NULL END,
      CASE WHEN ? = 'disabled' THEN ? ELSE NULL END,
      CASE WHEN ? = 'disabled' THEN CURRENT_TIMESTAMP ELSE NULL END
    )
    `,
    [
      username,
      passwordHash,
      role,
      status,
      mustChangePassword ? 1 : 0,
      approvedBy,
      status,
      status,
      approvedBy,
      status,
      'Created as disabled by admin.',
      status,
    ]
  );
}

function resetPassword(id, passwordHash) {
  return dbRun(
    `
    UPDATE user_accounts
    SET password_hash = ?,
        must_change_password = 1,
        password_changed_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [passwordHash, id]
  );
}

function changePassword(id, passwordHash) {
  return dbRun(
    `
    UPDATE user_accounts
    SET password_hash = ?,
        must_change_password = 0,
        password_changed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [passwordHash, id]
  );
}

function updateRole(id, role) {
  return dbRun(
    `
    UPDATE user_accounts
    SET role = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [role, id]
  );
}

function disableAccount(id, disabledBy = null, reason = null) {
  return dbRun(
    `
    UPDATE user_accounts
    SET status = 'disabled',
        disabled_by = ?,
        disabled_reason = ?,
        disabled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status != 'disabled'
    `,
    [disabledBy, reason, id]
  );
}

function enableAccount(id) {
  return dbRun(
    `
    UPDATE user_accounts
    SET status = 'approved',
        disabled_by = NULL,
        disabled_reason = NULL,
        disabled_at = NULL,
        approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status != 'approved'
    `,
    [id]
  );
}

function deleteAccount(id) {
  return dbRun(
    `
    DELETE FROM user_accounts
    WHERE id = ?
    `,
    [id]
  );
}

function createSession({ userId, token, expiresAt }) {
  return dbRun(
    `
    INSERT INTO user_sessions (user_id, session_token, expires_at)
    VALUES (?, ?, ?)
    `,
    [userId, token, expiresAt]
  );
}

function getActiveSessionByToken(token) {
  return dbGet(
    `
    SELECT
      s.id AS session_id,
      s.user_id,
      s.expires_at,
      s.revoked_at,
      u.username,
      u.role,
      u.status,
      u.must_change_password
    FROM user_sessions s
    JOIN user_accounts u ON u.id = s.user_id
    WHERE s.session_token = ?
      AND s.revoked_at IS NULL
      AND s.expires_at > CURRENT_TIMESTAMP
    `,
    [token]
  );
}

function touchSession(sessionId) {
  return dbRun(
    `
    UPDATE user_sessions
    SET last_seen_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [sessionId]
  );
}

function updateLastLogin(userId) {
  return dbRun(
    `
    UPDATE user_accounts
    SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [userId]
  );
}

function revokeSessionByToken(token) {
  return dbRun(
    `
    UPDATE user_sessions
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE session_token = ? AND revoked_at IS NULL
    `,
    [token]
  );
}

function revokeSessionsByUserId(userId) {
  return dbRun(
    `
    UPDATE user_sessions
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND revoked_at IS NULL
    `,
    [userId]
  );
}

module.exports = {
  getAccountByUsername,
  getAccountById,
  getFirstSuperAdmin,
  countSuperAdmins,
  createRegistrationRequest,
  createBootstrapSuperAdmin,
  listPendingAccounts,
  listAccounts,
  countAccounts,
  approveAccount,
  rejectAccount,
  createAccountByAdmin,
  resetPassword,
  changePassword,
  updateRole,
  disableAccount,
  enableAccount,
  deleteAccount,
  createSession,
  getActiveSessionByToken,
  touchSession,
  updateLastLogin,
  revokeSessionsByUserId,
  revokeSessionByToken,
};
