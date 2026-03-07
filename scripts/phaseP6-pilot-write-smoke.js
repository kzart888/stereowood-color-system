#!/usr/bin/env node
/**
 * Phase P6 pilot write smoke:
 * 1) Flag OFF -> pilot write endpoint blocked.
 * 2) Flag ON  -> auth required + dictionary write succeeds + history records present.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const BASE_PORT = Number.parseInt(process.env.P6_PILOT_SMOKE_PORT || '19189', 10);
const START_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 500;
const ADMIN_KEY = process.env.P6_PILOT_ADMIN_KEY || 'pilot-admin-key';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(port, endpoint, options = {}) {
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
        port,
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
          resolve({
            status: res.statusCode,
            text,
            json,
            headers: res.headers,
          });
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

async function waitForHealth(port) {
  const start = Date.now();
  let lastError = null;

  while (Date.now() - start < START_TIMEOUT_MS) {
    try {
      const health = await request(port, '/health');
      if (health.status === 200) {
        return;
      }
      lastError = new Error(`/health status=${health.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw lastError || new Error('health timeout');
}

function spawnServer({ port, pilotWriteEnabled }) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-p6-pilot-write-'));
  const dbFile = path.join(tmpRoot, 'color_management.db');
  const backendEntry = path.join(__dirname, '..', 'backend', 'server.js');
  const logs = [];

  const child = spawn(process.execPath, [backendEntry], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
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

  return { child, tmpRoot, dbFile, logs, port };
}

async function stopServer(handle) {
  if (!handle) return;
  if (handle.child && !handle.child.killed) {
    handle.child.kill('SIGTERM');
    await new Promise((resolve) => handle.child.once('exit', resolve));
  }
  if (handle.tmpRoot) {
    try {
      fs.rmSync(handle.tmpRoot, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
}

async function runFlagOffCheck(port) {
  const handle = spawnServer({ port, pilotWriteEnabled: false });
  try {
    await waitForHealth(port);
    const config = await request(port, '/api/config');
    assert(config.status === 200, 'flag-off /api/config failed');
    assert(
      config.json &&
        config.json.features &&
        Object.prototype.hasOwnProperty.call(config.json.features, 'pilotDictionaryWrite'),
      'flag-off /api/config missing features.pilotDictionaryWrite',
    );
    assert(config.json.features.pilotDictionaryWrite === false, 'flag-off feature should be false');

    const blocked = await request(port, '/api/pilot/dictionaries/suppliers/upsert', {
      method: 'POST',
      body: { name: 'P6-off-supplier' },
    });
    assert(blocked.status === 404, `flag-off write expected 404, got ${blocked.status}`);

    return {
      status: 'PASS',
      blockedStatus: blocked.status,
    };
  } finally {
    await stopServer(handle);
  }
}

async function runFlagOnCheck(port) {
  const handle = spawnServer({ port, pilotWriteEnabled: true });
  const trace = {};
  try {
    await waitForHealth(port);

    const config = await request(port, '/api/config');
    assert(config.status === 200, 'flag-on /api/config failed');
    assert(config.json && config.json.features && config.json.features.pilotDictionaryWrite === true, 'flag-on feature should be true');

    const username = `p6pilot${Date.now()}`;
    const password = 'pilotpass123';
    const changedPassword = 'pilotpass456';
    trace.username = username;

    const register = await request(port, '/api/auth/register-request', {
      method: 'POST',
      body: { username, password },
    });
    assert(register.status === 201, `register expected 201, got ${register.status}`);
    const accountId = register.json && register.json.account ? register.json.account.id : null;
    assert(accountId, 'register missing account id');
    trace.accountId = accountId;

    const approve = await request(port, `/api/auth/admin/requests/${accountId}/approve`, {
      method: 'POST',
      headers: { 'x-admin-key': ADMIN_KEY },
      body: {},
    });
    assert(approve.status === 200, `approve expected 200, got ${approve.status}`);

    const unauthWrite = await request(port, '/api/pilot/dictionaries/suppliers/upsert', {
      method: 'POST',
      body: { name: 'P6-no-auth' },
    });
    assert(unauthWrite.status === 401, `unauth write expected 401, got ${unauthWrite.status}`);

    const login = await request(port, '/api/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    assert(login.status === 200, `login expected 200, got ${login.status}`);
    const token = login.json && login.json.token;
    assert(token, 'login missing token');
    trace.revokedSessions = login.json.revoked_sessions || 0;
    assert(Boolean(login.json.user && login.json.user.must_change_password), 'expected must_change_password=true on first login');

    const authHeaders = { authorization: `Bearer ${token}` };
    const changePassword = await request(port, '/api/auth/change-password', {
      method: 'POST',
      headers: authHeaders,
      body: { oldPassword: password, newPassword: changedPassword },
    });
    assert(changePassword.status === 200, `change-password expected 200, got ${changePassword.status}`);

    const supplierName = `P6 Supplier ${Date.now()}`;
    const purchaseUrl = `https://pilot.example/${Date.now()}`;

    const upsertSupplier = await request(port, '/api/pilot/dictionaries/suppliers/upsert', {
      method: 'POST',
      headers: authHeaders,
      body: { name: supplierName },
    });
    assert(upsertSupplier.status === 200, `supplier upsert expected 200, got ${upsertSupplier.status}`);
    assert(upsertSupplier.json && upsertSupplier.json.id, 'supplier upsert missing id');
    trace.supplierId = upsertSupplier.json.id;

    const upsertPurchaseLink = await request(port, '/api/pilot/dictionaries/purchase-links/upsert', {
      method: 'POST',
      headers: authHeaders,
      body: { url: purchaseUrl },
    });
    assert(upsertPurchaseLink.status === 200, `purchase-link upsert expected 200, got ${upsertPurchaseLink.status}`);
    assert(upsertPurchaseLink.json && upsertPurchaseLink.json.id, 'purchase-link upsert missing id');
    trace.purchaseLinkId = upsertPurchaseLink.json.id;

    const history = await request(port, '/api/history/feed?tab=mont-marte&page=1&pageSize=50');
    assert(history.status === 200, `history feed expected 200, got ${history.status}`);
    const items = history.json && Array.isArray(history.json.items) ? history.json.items : [];
    const supplierEvent = items.find((item) => item.entity_type === 'supplier' && item.action === 'create');
    const purchaseEvent = items.find((item) => item.entity_type === 'purchase_link' && item.action === 'create');
    assert(supplierEvent, 'missing supplier create history event');
    assert(purchaseEvent, 'missing purchase_link create history event');

    return {
      status: 'PASS',
      trace,
    };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    throw new Error(`${message}\nTRACE=${JSON.stringify(trace)}`);
  } finally {
    await stopServer(handle);
  }
}

async function main() {
  try {
    const off = await runFlagOffCheck(BASE_PORT);
    const on = await runFlagOnCheck(BASE_PORT + 1);

    process.stdout.write(`P6_PILOT_WRITE_FLAG_OFF=${off.status}\n`);
    process.stdout.write(`P6_PILOT_WRITE_FLAG_ON=${on.status}\n`);
    process.stdout.write(`P6_PILOT_WRITE_TRACE=${JSON.stringify(on.trace)}\n`);
    process.stdout.write('PHASE_P6_PILOT_WRITE_SMOKE=PASS\n');
  } catch (error) {
    process.stderr.write(`PHASE_P6_PILOT_WRITE_SMOKE=FAIL\n${error.message}\n`);
    process.exitCode = 1;
  }
}

main();
