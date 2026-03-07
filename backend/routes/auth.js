const express = require('express');
const AuthService = require('../domains/auth/service');
const { AUTH_ROLE } = require('../domains/auth/service');
const { extractAuditContext } = require('./helpers/request-audit-context');
const {
  extractTokenFromRequest,
  requireAuthenticatedSession,
} = require('./helpers/auth-session');
const { requireRole } = require('./helpers/authz');

const router = express.Router();

const SESSION_COOKIE_NAME = 'sw_session';

function parsePositiveId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function parseFlag(value, fallback = false) {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function getSessionCookieOptions() {
  const ttlHours = Number.parseInt(process.env.SESSION_TTL_HOURS || '720', 10);
  const maxAge = (!Number.isNaN(ttlHours) && ttlHours > 0 ? ttlHours : 24 * 30) * 60 * 60 * 1000;
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: parseFlag(process.env.COOKIE_SECURE, false),
    path: '/',
    maxAge,
  };
}

function setSessionCookie(res, token) {
  const options = getSessionCookieOptions();
  const encoded = encodeURIComponent(token);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encoded}`,
    `Max-Age=${Math.floor(options.maxAge / 1000)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (options.secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`
  );
}

function mapAuthError(res, error) {
  const mapped = AuthService.mapError(error);
  return res.status(mapped.statusCode || 400).json({ error: mapped.message, code: mapped.code });
}

function getActorFromRequest(req) {
  if (req.authUser) {
    return {
      id: req.authUser.id || null,
      username: req.authUser.username || null,
      role: req.authUser.role || AUTH_ROLE.USER,
    };
  }
  return null;
}

router.post('/auth/register-request', async (req, res) => {
  try {
    const account = await AuthService.registerRequest(
      {
        username: req.body.username,
        password: req.body.password,
      },
      extractAuditContext(req)
    );

    return res.status(201).json({
      success: true,
      account,
    });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.get('/auth/admin/pending', requireRole([AUTH_ROLE.SUPER_ADMIN, AUTH_ROLE.ADMIN]), async (req, res) => {
  try {
    const pending = await AuthService.listPending(getActorFromRequest(req));
    return res.json({ pending });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.get('/auth/admin/accounts', requireRole([AUTH_ROLE.SUPER_ADMIN, AUTH_ROLE.ADMIN]), async (req, res) => {
  try {
    const result = await AuthService.listAccounts(
      {
        status: req.query.status,
        search: req.query.search,
        page: req.query.page,
        pageSize: req.query.pageSize,
      },
      getActorFromRequest(req)
    );
    return res.json(result);
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/accounts', requireRole([AUTH_ROLE.SUPER_ADMIN, AUTH_ROLE.ADMIN]), async (req, res) => {
  try {
    const account = await AuthService.createAccountByAdmin(
      {
        username: req.body.username,
        password: req.body.password,
        status: req.body.status,
        role: req.body.role,
      },
      getActorFromRequest(req),
      extractAuditContext(req)
    );
    return res.status(201).json({ success: true, account });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post(
  '/auth/admin/accounts/reset-password-batch',
  requireRole([AUTH_ROLE.SUPER_ADMIN, AUTH_ROLE.ADMIN]),
  async (req, res) => {
    try {
      const confirm = String(req.body.confirm || '').trim().toUpperCase();
      if (confirm !== 'RESET') {
        return res.status(400).json({
          error: 'Secondary confirmation is required.',
          code: 'AUTH_VALIDATION_ERROR',
        });
      }

      const result = await AuthService.resetPasswordBatchByAdmin(
        req.body.ids,
        req.body.password,
        getActorFromRequest(req),
        extractAuditContext(req)
      );
      return res.json({ success: true, ...result });
    } catch (error) {
      return mapAuthError(res, error);
    }
  }
);

router.post(
  '/auth/admin/accounts/:id/reset-password',
  requireRole([AUTH_ROLE.SUPER_ADMIN, AUTH_ROLE.ADMIN]),
  async (req, res) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) {
        return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
      }
      const result = await AuthService.resetPasswordByAdmin(
        id,
        req.body.password,
        getActorFromRequest(req),
        extractAuditContext(req)
      );
      return res.json({ success: true, ...result });
    } catch (error) {
      return mapAuthError(res, error);
    }
  }
);

router.post('/auth/admin/accounts/:id/disable', requireRole([AUTH_ROLE.SUPER_ADMIN, AUTH_ROLE.ADMIN]), async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }
    const account = await AuthService.disableAccountByAdmin(
      id,
      req.body.reason,
      getActorFromRequest(req),
      extractAuditContext(req)
    );
    return res.json({ success: true, account });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/accounts/:id/enable', requireRole([AUTH_ROLE.SUPER_ADMIN, AUTH_ROLE.ADMIN]), async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }
    const account = await AuthService.enableAccountByAdmin(
      id,
      getActorFromRequest(req),
      extractAuditContext(req)
    );
    return res.json({ success: true, account });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.delete('/auth/admin/accounts/:id', requireRole([AUTH_ROLE.SUPER_ADMIN, AUTH_ROLE.ADMIN]), async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }
    const result = await AuthService.deleteAccountByAdmin(
      id,
      getActorFromRequest(req),
      extractAuditContext(req)
    );
    return res.json({ success: true, ...result });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/accounts/:id/revoke-sessions', requireRole([AUTH_ROLE.SUPER_ADMIN, AUTH_ROLE.ADMIN]), async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }
    const result = await AuthService.revokeSessionsByAdmin(
      id,
      getActorFromRequest(req),
      extractAuditContext(req)
    );
    return res.json({ success: true, ...result });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/accounts/:id/promote-admin', requireRole([AUTH_ROLE.SUPER_ADMIN]), async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }
    const account = await AuthService.promoteToAdmin(
      id,
      getActorFromRequest(req),
      extractAuditContext(req)
    );
    return res.json({ success: true, account });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/accounts/:id/demote-admin', requireRole([AUTH_ROLE.SUPER_ADMIN]), async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }
    const account = await AuthService.demoteAdmin(
      id,
      getActorFromRequest(req),
      extractAuditContext(req)
    );
    return res.json({ success: true, account });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.get('/auth/admin/runtime-flags', requireRole([AUTH_ROLE.SUPER_ADMIN, AUTH_ROLE.ADMIN]), async (req, res) => {
  try {
    const flags = await AuthService.getRuntimeFlags(getActorFromRequest(req));
    return res.json({ flags });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/runtime-flags', requireRole([AUTH_ROLE.SUPER_ADMIN, AUTH_ROLE.ADMIN]), async (req, res) => {
  try {
    const flags = await AuthService.setRuntimeFlags(
      {
        authEnforceWrites: req.body.authEnforceWrites,
        readOnlyMode: req.body.readOnlyMode,
      },
      getActorFromRequest(req),
      extractAuditContext(req)
    );
    return res.json({ success: true, flags });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/requests/:id/approve', requireRole([AUTH_ROLE.SUPER_ADMIN, AUTH_ROLE.ADMIN]), async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }

    const approved = await AuthService.approveRequest(
      id,
      getActorFromRequest(req),
      extractAuditContext(req)
    );

    return res.json({ success: true, account: approved });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/requests/:id/reject', requireRole([AUTH_ROLE.SUPER_ADMIN, AUTH_ROLE.ADMIN]), async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }

    const rejected = await AuthService.rejectRequest(
      id,
      req.body.reason,
      getActorFromRequest(req),
      extractAuditContext(req)
    );

    return res.json({ success: true, account: rejected });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const loginResult = await AuthService.login(
      {
        username: req.body.username,
        password: req.body.password,
      },
      extractAuditContext(req)
    );

    setSessionCookie(res, loginResult.token);
    return res.json(loginResult);
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/logout', async (req, res) => {
  try {
    const token = extractTokenFromRequest(req);
    clearSessionCookie(res);
    if (!token) {
      return res.json({ revoked: false });
    }

    const result = await AuthService.logout(token, extractAuditContext(req));
    return res.json(result);
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/change-password', requireAuthenticatedSession, async (req, res) => {
  try {
    const token = extractTokenFromRequest(req);
    const result = await AuthService.changePassword(
      token,
      req.body.oldPassword,
      req.body.newPassword,
      extractAuditContext(req)
    );
    return res.json({ success: true, ...result });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.get('/auth/me', async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ error: 'Not authenticated.', code: 'AUTH_INVALID_CREDENTIALS' });
  }

  return res.json({
    user: {
      id: req.authUser.id,
      username: req.authUser.username,
      role: req.authUser.role || AUTH_ROLE.USER,
      must_change_password: Boolean(req.authUser.mustChangePassword),
    },
    session: req.authSession
      ? {
          session_id: req.authSession.sessionId,
          expires_at: req.authSession.expires_at,
        }
      : null,
  });
});

module.exports = router;
