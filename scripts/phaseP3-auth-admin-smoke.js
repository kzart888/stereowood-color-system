const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.P3_AUTH_SMOKE_PORT || process.env.PORT || '19189', 10);
const START_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 500;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-p3-auth-smoke-'));
const dbFile = path.join(tmpRoot, 'color_management.db');
const adminKey = 'p3-smoke-admin-key';
const username = `p3_user_${Date.now().toString().slice(-6)}`;
const password = 'P3smoke-pass-123';
const changedPassword = 'P3smoke-pass-456';
const managedUser = `p3_admin_created_${Date.now().toString().slice(-6)}`;
const managedChangedPassword = 'P3managed-pass-222';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function request(method, endpoint, body = undefined, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    let payload = null;
    const headers = {
      ...extraHeaders,
    };

    if (body !== undefined) {
      payload = Buffer.from(JSON.stringify(body), 'utf8');
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(payload.length);
    }

    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path: endpoint,
        method,
        headers,
        timeout: 10000,
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (text += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            // ignore non-json
          }
          resolve({ status: res.statusCode, json, text });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`Request timeout: ${method} ${endpoint}`)));
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitForHealth() {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < START_TIMEOUT_MS) {
    try {
      const health = await request('GET', '/health');
      if (health.status === 200) return;
      lastError = new Error(`/health status ${health.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw lastError || new Error('Backend did not become ready in time');
}

async function main() {
  const backendEntry = path.join(__dirname, '..', 'backend', 'server.js');
  const child = spawn(process.execPath, [backendEntry], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      DB_FILE: dbFile,
      AUTH_ENFORCE_WRITES: 'true',
      READ_ONLY_MODE: 'false',
      INTERNAL_ADMIN_KEY: adminKey,
      ALLOW_LEGACY_ADMIN_KEY: 'true',
      SESSION_TTL_HOURS: '12',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const logs = [];
  child.stdout.on('data', (chunk) => logs.push(String(chunk)));
  child.stderr.on('data', (chunk) => logs.push(String(chunk)));

  const stopChild = () =>
    new Promise((resolve) => {
      if (child.killed || child.exitCode !== null) return resolve();
      child.once('exit', () => resolve());
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL');
      }, 5000);
    });

  try {
    await waitForHealth();

    const root = await request('GET', '/');
    assert(root.status === 200, `root page failed: ${root.status}`);
    assert(root.text.includes('js/login-page.js'), 'root page missing login page script');
    assert(root.text.includes('STEREOWOOD'), 'root page missing system title');

    const registration = await request('POST', '/api/auth/register-request', {
      username,
      password,
    });
    assert(registration.status === 201, `register-request failed: ${registration.status}`);
    const accountId = registration.json.account.id;

    const approve = await request('POST', `/api/auth/admin/requests/${accountId}/approve`, {}, {
      'x-admin-key': adminKey,
    });
    assert(approve.status === 200, `approve failed: ${approve.status}`);

    const login1 = await request('POST', '/api/auth/login', { username, password });
    assert(login1.status === 200, `first login failed: ${login1.status}`);
    const token1 = login1.json.token;

    const login2 = await request('POST', '/api/auth/login', { username, password });
    assert(login2.status === 200, `second login failed: ${login2.status}`);
    const token2 = login2.json.token;
    assert(token1 !== token2, 'second login must issue a new token');
    assert(Number.isInteger(login2.json.revoked_sessions), 'login response missing revoked_sessions');
    assert(!Boolean(login2.json.user && login2.json.user.must_change_password), 'self-registered account should not require password change');

    const changePassword = await request(
      'POST',
      '/api/auth/change-password',
      { oldPassword: password, newPassword: changedPassword },
      { authorization: `Bearer ${token2}` }
    );
    assert(changePassword.status === 200, `change-password failed: ${changePassword.status}`);

    const staleWrite = await request(
      'POST',
      '/api/suppliers/upsert',
      { name: `P3 stale token write ${Date.now()}` },
      { authorization: `Bearer ${token1}` }
    );
    assert(staleWrite.status === 401, `expected stale token 401, got ${staleWrite.status}`);

    const createManaged = await request(
      'POST',
      '/api/auth/admin/accounts',
      {
        username: managedUser,
        status: 'approved',
      },
      { 'x-admin-key': adminKey }
    );
    assert(createManaged.status === 201, `admin create account failed: ${createManaged.status}`);
    const managedId = createManaged.json.account.id;

    const listAccounts = await request(
      'GET',
      `/api/auth/admin/accounts?search=${encodeURIComponent(managedUser)}&status=approved`,
      undefined,
      { 'x-admin-key': adminKey }
    );
    assert(listAccounts.status === 200, `admin list accounts failed: ${listAccounts.status}`);
    assert(Array.isArray(listAccounts.json.items), 'admin list accounts missing items');
    assert(
      listAccounts.json.items.some((item) => item.id === managedId),
      'admin list accounts missing created user'
    );

    const managedFirstLogin = await request('POST', '/api/auth/login', {
      username: managedUser,
      password: '123456',
    });
    assert(managedFirstLogin.status === 200, `managed first login failed: ${managedFirstLogin.status}`);
    assert(
      Boolean(managedFirstLogin.json.user && managedFirstLogin.json.user.must_change_password),
      'admin-created account should require password change'
    );
    const managedTokenFirst = managedFirstLogin.json.token;

    const managedChangePassword = await request(
      'POST',
      '/api/auth/change-password',
      { oldPassword: '123456', newPassword: managedChangedPassword },
      { authorization: `Bearer ${managedTokenFirst}` }
    );
    assert(
      managedChangePassword.status === 200,
      `managed change-password failed: ${managedChangePassword.status}`
    );

    const resetPassword = await request(
      'POST',
      `/api/auth/admin/accounts/${managedId}/reset-password`,
      {},
      { 'x-admin-key': adminKey }
    );
    assert(resetPassword.status === 200, `reset password failed: ${resetPassword.status}`);

    const oldPasswordLogin = await request('POST', '/api/auth/login', {
      username: managedUser,
      password: managedChangedPassword,
    });
    assert(oldPasswordLogin.status === 401, `old password should fail, got ${oldPasswordLogin.status}`);

    const managedLogin = await request('POST', '/api/auth/login', {
      username: managedUser,
      password: '123456',
    });
    assert(managedLogin.status === 200, `managed login failed: ${managedLogin.status}`);
    const managedToken = managedLogin.json.token;

    const disableAccount = await request(
      'POST',
      `/api/auth/admin/accounts/${managedId}/disable`,
      { reason: 'smoke test disable' },
      { 'x-admin-key': adminKey }
    );
    assert(disableAccount.status === 200, `disable account failed: ${disableAccount.status}`);

    const disabledLogin = await request('POST', '/api/auth/login', {
      username: managedUser,
      password: '123456',
    });
    assert(disabledLogin.status === 403, `disabled account login should be 403, got ${disabledLogin.status}`);

    const enableAccount = await request(
      'POST',
      `/api/auth/admin/accounts/${managedId}/enable`,
      {},
      { 'x-admin-key': adminKey }
    );
    assert(enableAccount.status === 200, `enable account failed: ${enableAccount.status}`);

    const reLogin = await request('POST', '/api/auth/login', {
      username: managedUser,
      password: '123456',
    });
    assert(reLogin.status === 200, `re-login after enable failed: ${reLogin.status}`);
    const managedToken2 = reLogin.json.token;

    const revokeSessions = await request(
      'POST',
      `/api/auth/admin/accounts/${managedId}/revoke-sessions`,
      {},
      { 'x-admin-key': adminKey }
    );
    assert(revokeSessions.status === 200, `revoke sessions failed: ${revokeSessions.status}`);

    const revokedWrite = await request(
      'POST',
      '/api/suppliers/upsert',
      { name: `P3 revoked write ${Date.now()}` },
      { authorization: `Bearer ${managedToken2}` }
    );
    assert(revokedWrite.status === 401, `revoked session should fail with 401, got ${revokedWrite.status}`);

    const setReadOnlyOn = await request(
      'POST',
      '/api/auth/admin/runtime-flags',
      { readOnlyMode: true },
      { 'x-admin-key': adminKey }
    );
    assert(setReadOnlyOn.status === 200, `enable read-only failed: ${setReadOnlyOn.status}`);

    const blockedWrite = await request(
      'POST',
      '/api/suppliers/upsert',
      { name: `P3 read-only blocked ${Date.now()}` },
      { authorization: `Bearer ${token2}` }
    );
    assert(blockedWrite.status === 503, `read-only write should be 503, got ${blockedWrite.status}`);

    const setReadOnlyOff = await request(
      'POST',
      '/api/auth/admin/runtime-flags',
      { readOnlyMode: false },
      { 'x-admin-key': adminKey }
    );
    assert(setReadOnlyOff.status === 200, `disable read-only failed: ${setReadOnlyOff.status}`);

    const setAuthOff = await request(
      'POST',
      '/api/auth/admin/runtime-flags',
      { authEnforceWrites: false },
      { 'x-admin-key': adminKey }
    );
    assert(setAuthOff.status === 200, `disable auth enforcement failed: ${setAuthOff.status}`);

    const unauthWriteAllowed = await request('POST', '/api/suppliers/upsert', {
      name: `P3 unauth write allowed ${Date.now()}`,
    });
    assert(unauthWriteAllowed.status === 200, `unauth write should pass when auth off, got ${unauthWriteAllowed.status}`);

    const setAuthOn = await request(
      'POST',
      '/api/auth/admin/runtime-flags',
      { authEnforceWrites: true },
      { 'x-admin-key': adminKey }
    );
    assert(setAuthOn.status === 200, `enable auth enforcement failed: ${setAuthOn.status}`);

    const authWrite = await request(
      'POST',
      '/api/suppliers/upsert',
      { name: `P3 auth write pass ${Date.now()}` },
      { authorization: `Bearer ${token2}` }
    );
    assert(authWrite.status === 200, `auth write after re-enable failed: ${authWrite.status}`);

    const accountTimeline = await request('GET', `/api/history/user_account/${accountId}?limit=30`);
    assert(accountTimeline.status === 200, `history timeline failed: ${accountTimeline.status}`);
    assert(Array.isArray(accountTimeline.json.events), 'history timeline missing events');
    const timelineActions = new Set(accountTimeline.json.events.map((event) => event.action));
    assert(timelineActions.has('approve'), 'history timeline missing approve action');
    assert(timelineActions.has('login'), 'history timeline missing login action');

    process.stdout.write(
      [
        `P3_AUTH_SMOKE_PORT=${PORT}`,
        `P3_AUTH_SMOKE_DB=${dbFile}`,
        `P3_AUTH_USER=${username}`,
        `P3_AUTH_MANAGED_USER=${managedUser}`,
        'P3_ADMIN_APIS=PASS',
        'P3_SINGLE_SESSION=PASS',
        'P3_RUNTIME_FLAGS=PASS',
        'P3_AUDIT_TIMELINE=PASS',
      ].join('\n') + '\n'
    );
  } catch (error) {
    process.stderr.write(`P3_AUTH_SMOKE=FAIL\n${error.message}\n`);
    if (logs.length > 0) {
      process.stderr.write('--- backend logs ---\n');
      process.stderr.write(logs.join(''));
      process.stderr.write('\n--- end backend logs ---\n');
    }
    process.exitCode = 1;
  } finally {
    await stopChild();
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
}

main();
