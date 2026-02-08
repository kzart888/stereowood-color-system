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
    SELECT id, username, password_hash, status, created_at, updated_at, approved_at, disabled_at
    FROM user_accounts
    WHERE LOWER(username) = LOWER(?)
    `,
    [username]
  );
}

function getAccountById(id) {
  return dbGet(
    `
    SELECT id, username, status, created_at, updated_at, approved_at, disabled_at
    FROM user_accounts
    WHERE id = ?
    `,
    [id]
  );
}

function createRegistrationRequest({ username, passwordHash }) {
  return dbRun(
    `
    INSERT INTO user_accounts (username, password_hash, status)
    VALUES (?, ?, 'pending')
    `,
    [username, passwordHash]
  );
}

function listPendingAccounts() {
  return dbAll(
    `
    SELECT id, username, status, created_at, updated_at
    FROM user_accounts
    WHERE status = 'pending'
    ORDER BY created_at ASC
    `
  );
}

function approveAccount(id, approvedBy = null) {
  return dbRun(
    `
    UPDATE user_accounts
    SET status = 'approved', approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
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
    SET status = 'disabled', disabled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
        disabled_by = ?, disabled_reason = ?
    WHERE id = ? AND status = 'pending'
    `,
    [disabledBy, reason, id]
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
      u.status
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

module.exports = {
  getAccountByUsername,
  getAccountById,
  createRegistrationRequest,
  listPendingAccounts,
  approveAccount,
  rejectAccount,
  createSession,
  getActiveSessionByToken,
  touchSession,
  updateLastLogin,
  revokeSessionByToken,
};
