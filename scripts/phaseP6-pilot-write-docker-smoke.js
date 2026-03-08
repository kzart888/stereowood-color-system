#!/usr/bin/env node
/**
 * Phase P6 Docker rehearsal for pilot write slice.
 * - Builds image (if needed)
 * - Runs disposable container with pilot write flags enabled
 * - Verifies auth + pilot dictionary writes + history feed
 */

const { spawnSync } = require('child_process');

const TAG = process.env.P6_DOCKER_TAG || 'stereowood-color-system:p6-pilot-write';
const PORT = Number.parseInt(process.env.P6_DOCKER_PORT || '9399', 10);
const CONTAINER = process.env.P6_DOCKER_CONTAINER || 'sw-p6-pilot-write';
const BUILD_IF_MISSING = String(process.env.P6_DOCKER_BUILD_IF_MISSING || 'true').toLowerCase() !== 'false';
const FORCE_BUILD = String(process.env.P6_DOCKER_FORCE_BUILD || 'true').toLowerCase() === 'true';
const ADMIN_KEY = process.env.P6_PILOT_ADMIN_KEY || 'pilot-admin-key';

const suffix = `${Date.now()}`;
const DATA_VOL = `sw-p6-data-${suffix}`;
const UPLOADS_VOL = `sw-p6-uploads-${suffix}`;
const BACKUPS_VOL = `sw-p6-backups-${suffix}`;

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
    env: process.env,
  });
  if (result.status !== 0) {
    const msg = [
      `Command failed: ${cmd} ${args.join(' ')}`,
      result.stdout || '',
      result.stderr || '',
    ].join('\n');
    throw new Error(msg.trim());
  }
  return (result.stdout || '').trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, ok: response.ok, data, text, headers: response.headers };
}

async function waitForHealth(baseUrl) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < 90_000) {
    try {
      const health = await requestJson(`${baseUrl}/health`);
      if (health.status === 200) {
        return health;
      }
      lastError = new Error(`/health status=${health.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(1000);
  }
  throw lastError || new Error('health timeout');
}

function cleanup() {
  try {
    run('docker', ['rm', '-f', CONTAINER]);
  } catch {
    // ignore
  }
  try {
    run('docker', ['volume', 'rm', DATA_VOL, UPLOADS_VOL, BACKUPS_VOL]);
  } catch {
    // ignore
  }
}

function ensureImage() {
  let hasImage = true;
  try {
    run('docker', ['image', 'inspect', TAG]);
  } catch {
    hasImage = false;
  }

  if (FORCE_BUILD || (!hasImage && BUILD_IF_MISSING)) {
    run('docker', ['build', '-t', TAG, '.'], { stdio: 'inherit' });
    return;
  }

  if (!hasImage) {
    throw new Error(`Docker image not found and build disabled: ${TAG}`);
  }
}

async function main() {
  const baseUrl = `http://127.0.0.1:${PORT}`;
  const username = `p6docker${Date.now()}`;
  const password = 'pilotpass123';
  const changedPassword = 'pilotpass456';
  cleanup();

  try {
    ensureImage();

    run('docker', [
      'run',
      '-d',
      '--name',
      CONTAINER,
      '-p',
      `${PORT}:9099`,
      '-e',
      'NODE_ENV=production',
      '-e',
      'PORT=9099',
      '-e',
      'DB_FILE=/data/color_management.db',
      '-e',
      'ENABLE_PILOT_UI=true',
      '-e',
      'PILOT_DICTIONARY_WRITE=true',
      '-e',
      'AUTH_ENFORCE_WRITES=true',
      '-e',
      'READ_ONLY_MODE=false',
      '-e',
      `INTERNAL_ADMIN_KEY=${ADMIN_KEY}`,
      '-e',
      'ALLOW_LEGACY_ADMIN_KEY=true',
      '-v',
      `${DATA_VOL}:/data`,
      '-v',
      `${UPLOADS_VOL}:/app/backend/uploads`,
      '-v',
      `${BACKUPS_VOL}:/app/backend/backups`,
      TAG,
    ]);

    await waitForHealth(baseUrl);

    const config = await requestJson(`${baseUrl}/api/config`);
    if (!config.ok || !config.data || !config.data.features || config.data.features.pilotDictionaryWrite !== true) {
      throw new Error('pilotDictionaryWrite feature flag is not enabled in /api/config');
    }

    const register = await requestJson(`${baseUrl}/api/auth/register-request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (register.status !== 201) {
      throw new Error(`register failed: ${register.status}`);
    }
    const accountId = register.data && register.data.account ? register.data.account.id : null;
    if (!accountId) {
      throw new Error('register response missing account id');
    }

    const approve = await requestJson(`${baseUrl}/api/auth/admin/requests/${accountId}/approve`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({}),
    });
    if (approve.status !== 200) {
      throw new Error(`approve failed: ${approve.status}`);
    }

    const login = await requestJson(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (login.status !== 200 || !login.data || !login.data.token) {
      throw new Error(`login failed: ${login.status}`);
    }
    const authHeader = { authorization: `Bearer ${login.data.token}`, 'content-type': 'application/json' };
    if (!login.data.user || login.data.user.must_change_password !== false) {
      throw new Error('expected must_change_password=false for self-register account');
    }

    const changePassword = await requestJson(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ oldPassword: password, newPassword: changedPassword }),
    });
    if (changePassword.status !== 200) {
      throw new Error(`change-password failed: ${changePassword.status}`);
    }

    const supplierName = `P6 Docker Supplier ${Date.now()}`;
    const supplierUpsert = await requestJson(`${baseUrl}/api/pilot/dictionaries/suppliers/upsert`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ name: supplierName }),
    });
    if (supplierUpsert.status !== 200 || !supplierUpsert.data || !supplierUpsert.data.id) {
      throw new Error(`supplier upsert failed: ${supplierUpsert.status}`);
    }

    const purchaseUrl = `https://pilot.example/docker/${Date.now()}`;
    const purchaseUpsert = await requestJson(`${baseUrl}/api/pilot/dictionaries/purchase-links/upsert`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ url: purchaseUrl }),
    });
    if (purchaseUpsert.status !== 200 || !purchaseUpsert.data || !purchaseUpsert.data.id) {
      throw new Error(`purchase-link upsert failed: ${purchaseUpsert.status}`);
    }

    const history = await requestJson(`${baseUrl}/api/history/feed?tab=mont-marte&page=1&pageSize=50`);
    if (history.status !== 200 || !history.data || !Array.isArray(history.data.items)) {
      throw new Error(`history feed failed: ${history.status}`);
    }
    const hasSupplierEvent = history.data.items.some(
      (item) => item && item.entity_type === 'supplier' && item.action === 'create',
    );
    const hasPurchaseEvent = history.data.items.some(
      (item) => item && item.entity_type === 'purchase_link' && item.action === 'create',
    );
    if (!hasSupplierEvent || !hasPurchaseEvent) {
      throw new Error('missing supplier/purchase_link create events in history feed');
    }

    process.stdout.write(`P6_DOCKER_BASE_URL=${baseUrl}\n`);
    process.stdout.write(`P6_DOCKER_ACCOUNT=${username}\n`);
    process.stdout.write(`P6_DOCKER_SUPPLIER_ID=${supplierUpsert.data.id}\n`);
    process.stdout.write(`P6_DOCKER_PURCHASE_LINK_ID=${purchaseUpsert.data.id}\n`);
    process.stdout.write('PHASE_P6_PILOT_WRITE_DOCKER_SMOKE=PASS\n');
  } catch (error) {
    process.stderr.write(`PHASE_P6_PILOT_WRITE_DOCKER_SMOKE=FAIL\n${error.message}\n`);
    try {
      const logs = run('docker', ['logs', CONTAINER]);
      if (logs) {
        process.stderr.write('--- container logs ---\n');
        process.stderr.write(`${logs}\n`);
      }
    } catch {
      // ignore
    }
    process.exitCode = 1;
  } finally {
    cleanup();
  }
}

main();
