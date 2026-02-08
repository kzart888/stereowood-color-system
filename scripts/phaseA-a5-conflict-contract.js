const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.A5_CONTRACT_PORT || process.env.PORT || '19179', 10);
const START_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 500;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-a5-contract-'));
const dbFile = path.join(tmpRoot, 'color_management.db');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function request(method, endpoint, body = undefined) {
  return new Promise((resolve, reject) => {
    let payload = null;
    const headers = {};

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
            // ignore
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

function validateConflictPayload(response, entityType) {
  assert(response.status === 409, `${entityType} expected 409, got ${response.status}`);
  const payload = response.json || {};
  const keys = ['error', 'code', 'entityType', 'expectedVersion', 'actualVersion', 'latestData'];
  keys.forEach((key) => {
    assert(Object.prototype.hasOwnProperty.call(payload, key), `${entityType} missing key: ${key}`);
  });
  assert(payload.code === 'VERSION_CONFLICT', `${entityType} code mismatch`);
  assert(payload.entityType === entityType, `${entityType} entityType mismatch`);
  assert(Number.isInteger(payload.expectedVersion), `${entityType} expectedVersion not integer`);
  assert(Number.isInteger(payload.actualVersion), `${entityType} actualVersion not integer`);
  assert(payload.latestData && typeof payload.latestData === 'object', `${entityType} latestData missing`);
  return {
    keys,
    code: payload.code,
    entityType: payload.entityType,
  };
}

async function getSchemeVersion(artworkId, schemeId) {
  const list = await request('GET', '/api/artworks');
  assert(list.status === 200 && Array.isArray(list.json), 'GET /api/artworks failed');
  const artwork = list.json.find((row) => Number(row.id) === Number(artworkId));
  assert(artwork, 'artwork not found');
  const scheme = (artwork.schemes || []).find((row) => Number(row.id) === Number(schemeId));
  assert(scheme, 'scheme not found');
  assert(Number.isInteger(scheme.version), 'scheme version missing');
  return scheme.version;
}

async function main() {
  const backendEntry = path.join(__dirname, '..', 'backend', 'server.js');
  const child = spawn(process.execPath, [backendEntry], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      DB_FILE: dbFile,
      AUTH_ENFORCE_WRITES: 'false',
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

  const created = {
    categoryId: null,
    customColorId: null,
    montMarteId: null,
    artworkId: null,
    schemeId: null,
  };

  try {
    await waitForHealth();
    const suffix = String(Date.now()).slice(-6);
    const snapshot = {};

    const category = await request('POST', '/api/categories', {
      code: `Y${suffix}`,
      name: `A5 Contract Category ${suffix}`,
      display_order: 98,
    });
    assert(category.status === 200 && category.json && category.json.id, 'create category failed');
    created.categoryId = category.json.id;

    const colorCreate = await request('POST', '/api/custom-colors', {
      color_code: `A5C-${suffix}`,
      category_id: created.categoryId,
      formula: 'WHITE:1',
    });
    assert(colorCreate.status === 200 && colorCreate.json && colorCreate.json.id, 'create custom color failed');
    created.customColorId = colorCreate.json.id;
    const colorVersion = colorCreate.json.version;
    await request('PUT', `/api/custom-colors/${created.customColorId}`, { formula: 'WHITE:2', version: colorVersion });
    const colorConflict = await request('PUT', `/api/custom-colors/${created.customColorId}`, {
      formula: 'WHITE:3',
      version: colorVersion,
    });
    snapshot.custom_color = validateConflictPayload(colorConflict, 'custom_color');

    const mmCreate = await request('POST', '/api/mont-marte-colors', {
      name: `A5 Contract Material ${suffix}`,
      category: 'other',
    });
    assert(mmCreate.status === 200 && mmCreate.json && mmCreate.json.id, 'create mont-marte failed');
    created.montMarteId = mmCreate.json.id;
    const mmVersion = mmCreate.json.version;
    await request('PUT', `/api/mont-marte-colors/${created.montMarteId}`, {
      name: `A5 Contract Material ${suffix} v2`,
      category: 'other',
      version: mmVersion,
    });
    const mmConflict = await request('PUT', `/api/mont-marte-colors/${created.montMarteId}`, {
      name: `A5 Contract Material ${suffix} stale`,
      category: 'other',
      version: mmVersion,
    });
    snapshot.mont_marte_color = validateConflictPayload(mmConflict, 'mont_marte_color');

    const artwork = await request('POST', '/api/artworks', {
      code: `A5K${suffix}`,
      name: `A5 Contract Artwork ${suffix}`,
    });
    assert(artwork.status === 200 && artwork.json && artwork.json.id, 'create artwork failed');
    created.artworkId = artwork.json.id;

    const scheme = await request('POST', `/api/artworks/${created.artworkId}/schemes`, {
      name: `A5 Contract Scheme ${suffix}`,
      layers: [],
    });
    assert(scheme.status === 200 && scheme.json && scheme.json.id, 'create scheme failed');
    created.schemeId = scheme.json.id;

    const schemeVersion = await getSchemeVersion(created.artworkId, created.schemeId);
    await request('PUT', `/api/artworks/${created.artworkId}/schemes/${created.schemeId}`, {
      name: `A5 Contract Scheme ${suffix} v2`,
      layers: [],
      version: schemeVersion,
    });
    const schemeConflict = await request('PUT', `/api/artworks/${created.artworkId}/schemes/${created.schemeId}`, {
      name: `A5 Contract Scheme ${suffix} stale`,
      layers: [],
      version: schemeVersion,
    });
    snapshot.color_scheme = validateConflictPayload(schemeConflict, 'color_scheme');

    if (created.schemeId && created.artworkId) {
      await request('DELETE', `/api/artworks/${created.artworkId}/schemes/${created.schemeId}`);
    }
    if (created.artworkId) {
      await request('DELETE', `/api/artworks/${created.artworkId}`);
    }
    if (created.customColorId) {
      await request('DELETE', `/api/custom-colors/${created.customColorId}`);
    }
    if (created.montMarteId) {
      await request('DELETE', `/api/mont-marte-colors/${created.montMarteId}`);
    }
    if (created.categoryId) {
      await request('DELETE', `/api/categories/${created.categoryId}`);
    }

    process.stdout.write(
      [
        `A5_CONTRACT_PORT=${PORT}`,
        `A5_CONTRACT_DB=${dbFile}`,
        `A5_CONFLICT_SNAPSHOT=${JSON.stringify(snapshot)}`,
        'A5_CONFLICT_CONTRACT=PASS',
      ].join('\n') + '\n'
    );
  } catch (error) {
    process.stderr.write(`A5_CONFLICT_CONTRACT=FAIL\n${error.message}\n`);
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
