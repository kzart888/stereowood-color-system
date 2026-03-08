#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.AUTH_LOGIN_MATRIX_PORT || process.env.PORT || '19229', 10);
const START_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-auth-login-matrix-'));
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
            // ignore non-json
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

    const bootstrapLogin = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin',
    });
    assert(bootstrapLogin.status === 200, `bootstrap login failed: ${bootstrapLogin.status}`);
    assert(bootstrapLogin.json.user.must_change_password === true, 'bootstrap admin should require password change');
    const adminToken = bootstrapLogin.json.token;

    const adminChangePassword = await request(
      'POST',
      '/api/auth/change-password',
      { oldPassword: 'admin', newPassword: 'AdminStrongPass123' },
      { authorization: `Bearer ${adminToken}` }
    );
    assert(adminChangePassword.status === 200, `admin change-password failed: ${adminChangePassword.status}`);

    const createdByAdmin = `matrix_user_${Date.now().toString().slice(-6)}`;
    const createUser = await request(
      'POST',
      '/api/auth/admin/accounts',
      { username: createdByAdmin, status: 'approved' },
      { authorization: `Bearer ${adminToken}` }
    );
    assert(createUser.status === 201, `admin create account failed: ${createUser.status}`);
    assert(
      createUser.json &&
        createUser.json.account &&
        createUser.json.account.must_change_password === true,
      'admin-created account should require password change'
    );

    const adminCreatedLogin = await request('POST', '/api/auth/login', {
      username: createdByAdmin,
      password: '123456',
    });
    assert(adminCreatedLogin.status === 200, `admin-created account login failed: ${adminCreatedLogin.status}`);
    assert(
      adminCreatedLogin.json.user.must_change_password === true,
      'admin-created account login should still require password change'
    );

    const loginWrongPassword = await request('POST', '/api/auth/login', {
      username: createdByAdmin,
      password: 'wrong-password',
    });
    assert(loginWrongPassword.status === 401, `wrong password should be 401, got ${loginWrongPassword.status}`);
    assert(
      loginWrongPassword.json && loginWrongPassword.json.code === 'AUTH_PASSWORD_INCORRECT',
      `wrong password should return AUTH_PASSWORD_INCORRECT, got ${loginWrongPassword.json && loginWrongPassword.json.code}`
    );

    const loginMissingAccount = await request('POST', '/api/auth/login', {
      username: 'account_not_exists',
      password: 'whatever123',
    });
    assert(
      loginMissingAccount.status === 404,
      `missing account should return 404, got ${loginMissingAccount.status}`
    );
    assert(
      loginMissingAccount.json && loginMissingAccount.json.code === 'AUTH_ACCOUNT_NOT_FOUND',
      `missing account should return AUTH_ACCOUNT_NOT_FOUND, got ${loginMissingAccount.json && loginMissingAccount.json.code}`
    );

    const selfRegistered = `matrix_apply_${Date.now().toString().slice(-6)}`;
    const applyResp = await request('POST', '/api/auth/register-request', {
      username: selfRegistered,
      password: 'ApplyStrongPass123',
    });
    assert(applyResp.status === 201, `register-request failed: ${applyResp.status}`);
    assert(
      applyResp.json && applyResp.json.account && applyResp.json.account.must_change_password === false,
      'self-register request should not require first-login password change'
    );

    const duplicateApply = await request('POST', '/api/auth/register-request', {
      username: selfRegistered,
      password: 'ApplyStrongPass123',
    });
    assert(duplicateApply.status === 409, `duplicate register should be 409, got ${duplicateApply.status}`);
    assert(
      duplicateApply.json && duplicateApply.json.code === 'AUTH_DUPLICATE_ACCOUNT',
      `duplicate register should return AUTH_DUPLICATE_ACCOUNT, got ${duplicateApply.json && duplicateApply.json.code}`
    );

    const pendingLogin = await request('POST', '/api/auth/login', {
      username: selfRegistered,
      password: 'ApplyStrongPass123',
    });
    assert(pendingLogin.status === 403, `pending account login should be 403, got ${pendingLogin.status}`);
    assert(
      pendingLogin.json && pendingLogin.json.code === 'AUTH_NOT_APPROVED',
      `pending account login should return AUTH_NOT_APPROVED, got ${pendingLogin.json && pendingLogin.json.code}`
    );

    const pendingList = await request('GET', '/api/auth/admin/pending', undefined, {
      authorization: `Bearer ${adminToken}`,
    });
    assert(pendingList.status === 200, `pending list failed: ${pendingList.status}`);
    const pendingAccount = (pendingList.json && pendingList.json.pending || []).find(
      (item) => item.username === selfRegistered
    );
    assert(pendingAccount && pendingAccount.id, 'pending account should exist after register-request');

    const approveResp = await request(
      'POST',
      `/api/auth/admin/requests/${pendingAccount.id}/approve`,
      {},
      { authorization: `Bearer ${adminToken}` }
    );
    assert(approveResp.status === 200, `approve request failed: ${approveResp.status}`);

    const approvedLogin = await request('POST', '/api/auth/login', {
      username: selfRegistered,
      password: 'ApplyStrongPass123',
    });
    assert(approvedLogin.status === 200, `approved account login failed: ${approvedLogin.status}`);
    assert(
      approvedLogin.json.user.must_change_password === false,
      'approved self-registered account should not require password change'
    );

    process.stdout.write(
      [
        `AUTH_LOGIN_MATRIX_PORT=${PORT}`,
        `AUTH_LOGIN_MATRIX_DB=${dbFile}`,
        'AUTH_LOGIN_ACCOUNT_NOT_FOUND=PASS',
        'AUTH_LOGIN_PASSWORD_INCORRECT=PASS',
        'AUTH_LOGIN_SELF_REGISTER_POLICY=PASS',
        'AUTH_LOGIN_ADMIN_CREATE_POLICY=PASS',
        'AUTH_LOGIN_MATRIX=PASS',
      ].join('\n') + '\n'
    );
  } catch (error) {
    process.stderr.write(`AUTH_LOGIN_MATRIX=FAIL\n${error.message}\n`);
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
      // best effort cleanup
    }
  }
}

main();
