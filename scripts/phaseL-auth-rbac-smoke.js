#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.L_AUTH_SMOKE_PORT || process.env.PORT || '19219', 10);
const START_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-l-auth-rbac-smoke-'));
const dbFile = path.join(tmpRoot, 'color_management.db');

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
        timeout: 10_000,
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
            // ignore
          }
          resolve({ status: res.statusCode, json, text, headers: res.headers });
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
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
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

    const superLogin = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin',
    });
    assert(superLogin.status === 200, `default super admin login failed: ${superLogin.status}`);
    assert(superLogin.json.user.role === 'super_admin', 'default account is not super_admin');
    assert(Boolean(superLogin.json.user.must_change_password), 'default super admin should require password change');
    const superToken = superLogin.json.token;

    const superChange = await request(
      'POST',
      '/api/auth/change-password',
      { oldPassword: 'admin', newPassword: 'AdminStrongPass123' },
      { authorization: `Bearer ${superToken}` }
    );
    assert(superChange.status === 200, `super admin change-password failed: ${superChange.status}`);

    const me = await request('GET', '/api/auth/me', undefined, { authorization: `Bearer ${superToken}` });
    assert(me.status === 200, `/api/auth/me failed: ${me.status}`);
    assert(me.json.user.role === 'super_admin', 'me.role mismatch for super admin');
    assert(!me.json.user.must_change_password, 'super admin must_change_password should be false after change');

    const baseUser = `l_user_${Date.now().toString().slice(-6)}`;
    const createUser = await request(
      'POST',
      '/api/auth/admin/accounts',
      { username: baseUser, role: 'user', status: 'approved' },
      { authorization: `Bearer ${superToken}` }
    );
    assert(createUser.status === 201, `create user failed: ${createUser.status}`);
    const baseUserId = createUser.json && createUser.json.account ? createUser.json.account.id : null;
    assert(baseUserId, 'create user response missing id');

    const promote = await request(
      'POST',
      `/api/auth/admin/accounts/${baseUserId}/promote-admin`,
      {},
      { authorization: `Bearer ${superToken}` }
    );
    assert(promote.status === 200, `promote admin failed: ${promote.status}`);
    assert(promote.json.account.role === 'admin', 'promoted role should be admin');

    const adminLogin = await request('POST', '/api/auth/login', {
      username: baseUser,
      password: '123456',
    });
    assert(adminLogin.status === 200, `promoted admin login failed: ${adminLogin.status}`);
    assert(Boolean(adminLogin.json.user.must_change_password), 'promoted admin should require password change');
    const adminToken = adminLogin.json.token;

    const adminChange = await request(
      'POST',
      '/api/auth/change-password',
      { oldPassword: '123456', newPassword: 'AdminUserStrong123' },
      { authorization: `Bearer ${adminToken}` }
    );
    assert(adminChange.status === 200, `promoted admin change-password failed: ${adminChange.status}`);

    const user2 = `l_user2_${Date.now().toString().slice(-6)}`;
    const createUserByAdmin = await request(
      'POST',
      '/api/auth/admin/accounts',
      { username: user2, role: 'user', status: 'approved' },
      { authorization: `Bearer ${adminToken}` }
    );
    assert(createUserByAdmin.status === 201, `admin create user failed: ${createUserByAdmin.status}`);
    const user2Id = createUserByAdmin.json.account.id;

    const adminPromoteDenied = await request(
      'POST',
      `/api/auth/admin/accounts/${user2Id}/promote-admin`,
      {},
      { authorization: `Bearer ${adminToken}` }
    );
    assert(adminPromoteDenied.status === 403, `admin promote should be denied with 403, got ${adminPromoteDenied.status}`);

    const batchResetMissingConfirm = await request(
      'POST',
      '/api/auth/admin/accounts/reset-password-batch',
      { ids: [user2Id] },
      { authorization: `Bearer ${superToken}` }
    );
    assert(
      batchResetMissingConfirm.status === 400,
      `batch reset without confirmation should be 400, got ${batchResetMissingConfirm.status}`
    );

    const batchReset = await request(
      'POST',
      '/api/auth/admin/accounts/reset-password-batch',
      { ids: [user2Id], confirm: 'RESET' },
      { authorization: `Bearer ${superToken}` }
    );
    assert(batchReset.status === 200, `batch reset failed: ${batchReset.status}`);

    const user2Login = await request('POST', '/api/auth/login', {
      username: user2,
      password: '123456',
    });
    assert(user2Login.status === 200, `user2 default password login failed: ${user2Login.status}`);
    assert(Boolean(user2Login.json.user.must_change_password), 'user2 must_change_password should be true');

    const feed = await request('GET', '/api/history/feed?tab=all&page=1&pageSize=100&action=promote_admin');
    assert(feed.status === 200, `history feed promote_admin failed: ${feed.status}`);
    const items = feed.json && Array.isArray(feed.json.items) ? feed.json.items : [];
    const promoteEvent = items.find((event) => event.action === 'promote_admin' && String(event.entity_id) === String(baseUserId));
    assert(promoteEvent, 'missing promote_admin event in history feed');
    assert(String(promoteEvent.actor_name || '') === 'admin', 'promote_admin actor_name should be username "admin"');

    process.stdout.write(
      [
        `L_AUTH_RBAC_SMOKE_PORT=${PORT}`,
        `L_AUTH_RBAC_DB=${dbFile}`,
        `L_AUTH_SUPER_ADMIN=admin`,
        `L_AUTH_PROMOTED_ADMIN=${baseUser}`,
        `L_AUTH_USER=${user2}`,
        'L_AUTH_RBAC_ROLES=PASS',
        'L_AUTH_RBAC_FIRST_LOGIN_CHANGE=PASS',
        'L_AUTH_RBAC_AUDIT=PASS',
      ].join('\n') + '\n'
    );
  } catch (error) {
    process.stderr.write(`L_AUTH_RBAC_SMOKE=FAIL\n${error.message}\n`);
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
