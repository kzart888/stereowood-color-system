const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.A4_AUTH_SMOKE_PORT || process.env.PORT || '19149', 10);
const START_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 500;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-a4-auth-smoke-'));
const dbFile = path.join(tmpRoot, 'color_management.db');
const adminKey = 'a4-smoke-admin-key';
const username = `a4_user_${Date.now().toString().slice(-6)}`;
const password = 'A4smoke-pass-123';
const changedPassword = 'A4smoke-pass-456';

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
            // ignore json parse error
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

    const registration = await request('POST', '/api/auth/register-request', {
      username,
      password,
    });
    assert(registration.status === 201, `register-request failed: ${registration.status}`);
    assert(registration.json && registration.json.account && registration.json.account.id, 'register-response missing account');
    const accountId = registration.json.account.id;

    const pending = await request('GET', '/api/auth/admin/pending', undefined, {
      'x-admin-key': adminKey,
    });
    assert(pending.status === 200, `admin pending failed: ${pending.status}`);
    assert(
      Array.isArray(pending.json.pending) && pending.json.pending.some((row) => row.id === accountId),
      'pending list missing registered account'
    );

    const approve = await request('POST', `/api/auth/admin/requests/${accountId}/approve`, {}, {
      'x-admin-key': adminKey,
    });
    assert(approve.status === 200, `approve failed: ${approve.status}`);

    const unauthWrite = await request('POST', '/api/suppliers/upsert', {
      name: `A4 Supplier NoAuth ${Date.now()}`,
    });
    assert(unauthWrite.status === 401, `expected unauth write 401, got ${unauthWrite.status}`);

    const login = await request('POST', '/api/auth/login', {
      username,
      password,
    });
    assert(login.status === 200, `login failed: ${login.status}`);
    assert(login.json && login.json.token && login.json.user && login.json.user.id, 'login response missing token/user');
    const token = login.json.token;
    const actorId = String(login.json.user.id);
    assert(Boolean(login.json.user.must_change_password), 'expected must_change_password=true on first login');

    const changePassword = await request(
      'POST',
      '/api/auth/change-password',
      { oldPassword: password, newPassword: changedPassword },
      { authorization: `Bearer ${token}` }
    );
    assert(changePassword.status === 200, `change-password failed: ${changePassword.status}`);

    const readNoAuth = await request('GET', '/api/suppliers');
    assert(readNoAuth.status === 200, `expected read without auth 200, got ${readNoAuth.status}`);

    const supplierName = `A4 Supplier Auth ${Date.now()}`;
    const authWrite = await request(
      'POST',
      '/api/suppliers/upsert',
      { name: supplierName },
      { authorization: `Bearer ${token}` }
    );
    assert(authWrite.status === 200, `protected write failed: ${authWrite.status}`);
    assert(authWrite.json && authWrite.json.id, 'protected write missing supplier id');
    const supplierId = authWrite.json.id;

    const timeline = await request('GET', `/api/history/supplier/${supplierId}?limit=10`);
    assert(timeline.status === 200, `supplier timeline failed: ${timeline.status}`);
    assert(timeline.json && Array.isArray(timeline.json.events), 'supplier timeline missing events');

    const createEvent = timeline.json.events.find((event) => event.action === 'create');
    assert(createEvent, 'supplier create event not found in timeline');
    assert(String(createEvent.actor_id || '') === actorId, `timeline actor_id mismatch, expected ${actorId}`);

    const logout = await request('POST', '/api/auth/logout', undefined, {
      authorization: `Bearer ${token}`,
    });
    assert(logout.status === 200, `logout failed: ${logout.status}`);

    const staleTokenWrite = await request(
      'POST',
      '/api/suppliers/upsert',
      { name: `A4 Supplier Stale ${Date.now()}` },
      { authorization: `Bearer ${token}` }
    );
    assert(staleTokenWrite.status === 401, `expected stale token write 401, got ${staleTokenWrite.status}`);

    process.stdout.write(
      [
        `A4_AUTH_SMOKE_PORT=${PORT}`,
        `A4_AUTH_SMOKE_DB=${dbFile}`,
        `A4_AUTH_USER=${username}`,
        'A4_AUTH_FLOW=PASS',
        'A4_AUDIT_ACTOR_BINDING=PASS',
      ].join('\n') + '\n'
    );
  } catch (error) {
    process.stderr.write(`A4_AUTH_SMOKE=FAIL\n${error.message}\n`);
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
