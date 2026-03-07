const express = require('express');
const AuthService = require('../domains/auth/service');
const { extractAuditContext } = require('./helpers/request-audit-context');
const { extractTokenFromRequest } = require('./helpers/auth-session');

const router = express.Router();

function parsePositiveId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function mapAuthError(res, error) {
  const mapped = AuthService.mapError(error);
  return res.status(mapped.statusCode || 400).json({ error: mapped.message, code: mapped.code });
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

router.get('/auth/admin/pending', async (req, res) => {
  try {
    const pending = await AuthService.listPending(req.get('x-admin-key'));
    return res.json({ pending });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.get('/auth/admin/accounts', async (req, res) => {
  try {
    const result = await AuthService.listAccounts(
      {
        status: req.query.status,
        search: req.query.search,
        page: req.query.page,
        pageSize: req.query.pageSize,
      },
      req.get('x-admin-key')
    );
    return res.json(result);
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/accounts', async (req, res) => {
  try {
    const account = await AuthService.createAccountByAdmin(
      {
        username: req.body.username,
        password: req.body.password,
        status: req.body.status,
      },
      req.get('x-admin-key'),
      extractAuditContext(req)
    );
    return res.status(201).json({ success: true, account });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/accounts/:id/reset-password', async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }
    const result = await AuthService.resetPasswordByAdmin(
      id,
      req.body.password,
      req.get('x-admin-key'),
      extractAuditContext(req)
    );
    return res.json({ success: true, ...result });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/accounts/:id/disable', async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }
    const account = await AuthService.disableAccountByAdmin(
      id,
      req.body.reason,
      req.get('x-admin-key'),
      extractAuditContext(req)
    );
    return res.json({ success: true, account });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/accounts/:id/enable', async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }
    const account = await AuthService.enableAccountByAdmin(
      id,
      req.get('x-admin-key'),
      extractAuditContext(req)
    );
    return res.json({ success: true, account });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.delete('/auth/admin/accounts/:id', async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }
    const result = await AuthService.deleteAccountByAdmin(
      id,
      req.get('x-admin-key'),
      extractAuditContext(req)
    );
    return res.json({ success: true, ...result });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/accounts/:id/revoke-sessions', async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }
    const result = await AuthService.revokeSessionsByAdmin(
      id,
      req.get('x-admin-key'),
      extractAuditContext(req)
    );
    return res.json({ success: true, ...result });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.get('/auth/admin/runtime-flags', async (req, res) => {
  try {
    const flags = await AuthService.getRuntimeFlags(req.get('x-admin-key'));
    return res.json({ flags });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/runtime-flags', async (req, res) => {
  try {
    const flags = await AuthService.setRuntimeFlags(
      {
        authEnforceWrites: req.body.authEnforceWrites,
        readOnlyMode: req.body.readOnlyMode,
      },
      req.get('x-admin-key'),
      extractAuditContext(req)
    );
    return res.json({ success: true, flags });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/requests/:id/approve', async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }

    const approved = await AuthService.approveRequest(
      id,
      req.get('x-admin-key'),
      extractAuditContext(req)
    );

    return res.json({ success: true, account: approved });
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/admin/requests/:id/reject', async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid account id.', code: 'AUTH_VALIDATION_ERROR' });
    }

    const rejected = await AuthService.rejectRequest(
      id,
      req.body.reason,
      req.get('x-admin-key'),
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

    return res.json(loginResult);
  } catch (error) {
    return mapAuthError(res, error);
  }
});

router.post('/auth/logout', async (req, res) => {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return res.status(400).json({ error: 'Session token is required.', code: 'AUTH_VALIDATION_ERROR' });
    }

    const result = await AuthService.logout(token, extractAuditContext(req));
    return res.json(result);
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

