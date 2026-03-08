#!/usr/bin/env node
/**
 * Phase P6 rollback rehearsal:
 * - Start candidate with pilot write enabled and verify write path works.
 * - Restart same DB with pilot write disabled and verify writes are blocked while reads remain healthy.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.P6_PILOT_ROLLBACK_PORT || '19199', 10);
const START_TIMEOUT_MS = 30_000;
const ADMIN_KEY = process.env.P6_PILOT_ADMIN_KEY || 'pilot-admin-key';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(endpoint, options = {}) {
  const method = options.method || 'GET';
  const headers = Object.assign({}, options.headers || {});
  const payload = options.body !== undefined ? JSON.stringify(options.body) : null;
  if (payload) {
    headers['content-type'] = headers['content-type'] || 'application/json';
    headers['content-length'] = Buffer.byteLength(payload);
  }

  return new Promise((resolve, reject) => {
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
            // non-json
          }
          resolve({ status: res.statusCode, text, json, headers: res.headers });
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`Request timeout: ${method} ${endpoint}`)));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function waitForHealth() {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < START_TIMEOUT_MS) {
    try {
      const health = await request('/health');
      if (health.status === 200) {
        return;
      }
      lastError = new Error(`/health status=${health.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(400);
  }
  throw lastError || new Error('health timeout');
}

function spawnServer({ dbFile, pilotWriteEnabled, logs }) {
  const backendEntry = path.join(__dirname, '..', 'backend', 'server.js');
  const child = spawn(process.execPath, [backendEntry], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      DB_FILE: dbFile,
      ENABLE_PILOT_UI: 'true',
      PILOT_DICTIONARY_WRITE: pilotWriteEnabled ? 'true' : 'false',
      INTERNAL_ADMIN_KEY: ADMIN_KEY,
      ALLOW_LEGACY_ADMIN_KEY: 'true',
      AUTH_ENFORCE_WRITES: 'true',
      READ_ONLY_MODE: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => logs.push(String(chunk)));
  child.stderr.on('data', (chunk) => logs.push(String(chunk)));
  return child;
}

async function stopServer(child) {
  if (!child) return;
  if (!child.killed) {
    child.kill('SIGTERM');
  }
  await new Promise((resolve) => child.once('exit', resolve));
}

async function ensureAuthenticatedToken() {
  const username = `p6rollback${Date.now()}`;
  const password = 'pilotpass123';
  const changedPassword = 'pilotpass456';

  const register = await request('/api/auth/register-request', {
    method: 'POST',
    body: { username, password },
  });
  assert(register.status === 201, `register failed: ${register.status}`);
  const accountId = register.json && register.json.account && register.json.account.id;
  assert(accountId, 'register missing account id');

  const approve = await request(`/api/auth/admin/requests/${accountId}/approve`, {
    method: 'POST',
    headers: { 'x-admin-key': ADMIN_KEY },
    body: {},
  });
  assert(approve.status === 200, `approve failed: ${approve.status}`);

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  assert(login.status === 200, `login failed: ${login.status}`);
  const token = login.json && login.json.token;
  assert(token, 'login missing token');
  assert(
    Boolean(login.json.user) && login.json.user.must_change_password === false,
    'expected must_change_password=false for self-register account',
  );

  const changePassword = await request('/api/auth/change-password', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: { oldPassword: password, newPassword: changedPassword },
  });
  assert(changePassword.status === 200, `change-password failed: ${changePassword.status}`);

  return token;
}

async function main() {
  const logs = [];
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-p6-rollback-'));
  const dbFile = path.join(tmpRoot, 'color_management.db');
  let child = null;

  try {
    child = spawnServer({ dbFile, pilotWriteEnabled: true, logs });
    await waitForHealth();

    const token = await ensureAuthenticatedToken();
    const authHeaders = { authorization: `Bearer ${token}` };

    const writeEnabled = await request('/api/pilot/dictionaries/suppliers/upsert', {
      method: 'POST',
      headers: authHeaders,
      body: { name: `Rollback Supplier ${Date.now()}` },
    });
    assert(writeEnabled.status === 200, `enabled write expected 200, got ${writeEnabled.status}`);

    await stopServer(child);
    child = spawnServer({ dbFile, pilotWriteEnabled: false, logs });
    await waitForHealth();

    const writeDisabled = await request('/api/pilot/dictionaries/suppliers/upsert', {
      method: 'POST',
      headers: authHeaders,
      body: { name: `Rollback Disabled ${Date.now()}` },
    });
    assert(writeDisabled.status === 404, `disabled write expected 404, got ${writeDisabled.status}`);

    const health = await request('/health');
    const suppliers = await request('/api/suppliers');
    assert(health.status === 200, `rollback health check failed: ${health.status}`);
    assert(suppliers.status === 200, `rollback suppliers check failed: ${suppliers.status}`);

    process.stdout.write(`P6_ROLLBACK_DB=${dbFile}\n`);
    process.stdout.write('P6_ROLLBACK_WRITE_ENABLED=PASS\n');
    process.stdout.write('P6_ROLLBACK_WRITE_DISABLED=PASS\n');
    process.stdout.write('PHASE_P6_ROLLBACK_REHEARSAL=PASS\n');
  } catch (error) {
    process.stderr.write(`PHASE_P6_ROLLBACK_REHEARSAL=FAIL\n${error.message}\n`);
    if (logs.length > 0) {
      process.stderr.write('--- backend logs ---\n');
      process.stderr.write(logs.join(''));
      process.stderr.write('\n--- end backend logs ---\n');
    }
    process.exitCode = 1;
  } finally {
    if (child) {
      try {
        await stopServer(child);
      } catch {
        // ignore
      }
    }
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

main();
