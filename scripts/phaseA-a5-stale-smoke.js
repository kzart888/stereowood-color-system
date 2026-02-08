const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.A5_STALE_SMOKE_PORT || process.env.PORT || '19169', 10);
const START_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 500;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-a5-stale-smoke-'));
const dbFile = path.join(tmpRoot, 'color_management.db');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function request(method, endpoint, body = undefined, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    let payload = null;
    const headers = { ...extraHeaders };

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
            // non-json is ignored
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

function assertConflict(result, entityType, expectedVersion) {
  assert(result.status === 409, `expected 409 conflict for ${entityType}, got ${result.status}`);
  assert(result.json && result.json.code === 'VERSION_CONFLICT', `${entityType} missing VERSION_CONFLICT code`);
  assert(result.json.entityType === entityType, `${entityType} conflict entityType mismatch`);
  assert(result.json.expectedVersion === expectedVersion, `${entityType} expectedVersion mismatch`);
  assert(
    Number.isInteger(result.json.actualVersion) && result.json.actualVersion >= expectedVersion,
    `${entityType} actualVersion invalid`
  );
  assert(result.json.latestData && typeof result.json.latestData === 'object', `${entityType} latestData missing`);
}

async function findSchemeVersion(artworkId, schemeId) {
  const list = await request('GET', '/api/artworks');
  assert(list.status === 200 && Array.isArray(list.json), 'GET /api/artworks failed');
  const artwork = list.json.find((row) => Number(row.id) === Number(artworkId));
  assert(artwork, `artwork ${artworkId} not found`);
  const scheme = (artwork.schemes || []).find((row) => Number(row.id) === Number(schemeId));
  assert(scheme, `scheme ${schemeId} not found`);
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

    const category = await request('POST', '/api/categories', {
      code: `Z${suffix}`,
      name: `A5 Stale Category ${suffix}`,
      display_order: 99,
    });
    assert(category.status === 200 && category.json && category.json.id, 'create category failed');
    created.categoryId = category.json.id;

    const customCreate = await request('POST', '/api/custom-colors', {
      color_code: `A5-${suffix}`,
      category_id: created.categoryId,
      formula: 'WHITE:1',
    });
    assert(customCreate.status === 200 && customCreate.json && customCreate.json.id, 'create custom color failed');
    created.customColorId = customCreate.json.id;
    const customVersion = customCreate.json.version;
    assert(Number.isInteger(customVersion), 'custom color version missing');

    const customFresh = await request('PUT', `/api/custom-colors/${created.customColorId}`, {
      formula: 'WHITE:2',
      version: customVersion,
    });
    assert(customFresh.status === 200, `fresh custom-color update failed: ${customFresh.status}`);

    const customStale = await request('PUT', `/api/custom-colors/${created.customColorId}`, {
      formula: 'WHITE:3',
      version: customVersion,
    });
    assertConflict(customStale, 'custom_color', customVersion);

    const mmCreate = await request('POST', '/api/mont-marte-colors', {
      name: `A5 Material ${suffix}`,
      category: 'other',
    });
    assert(mmCreate.status === 200 && mmCreate.json && mmCreate.json.id, 'create mont-marte failed');
    created.montMarteId = mmCreate.json.id;
    const mmVersion = mmCreate.json.version;
    assert(Number.isInteger(mmVersion), 'mont-marte version missing');

    const mmFresh = await request('PUT', `/api/mont-marte-colors/${created.montMarteId}`, {
      name: `A5 Material ${suffix} v2`,
      category: 'other',
      version: mmVersion,
    });
    assert(mmFresh.status === 200, `fresh mont-marte update failed: ${mmFresh.status}`);

    const mmStale = await request('PUT', `/api/mont-marte-colors/${created.montMarteId}`, {
      name: `A5 Material ${suffix} stale`,
      category: 'other',
      version: mmVersion,
    });
    assertConflict(mmStale, 'mont_marte_color', mmVersion);

    const artwork = await request('POST', '/api/artworks', {
      code: `A5${suffix}`,
      name: `A5 Artwork ${suffix}`,
    });
    assert(artwork.status === 200 && artwork.json && artwork.json.id, 'create artwork failed');
    created.artworkId = artwork.json.id;

    const scheme = await request('POST', `/api/artworks/${created.artworkId}/schemes`, {
      name: `A5 Scheme ${suffix}`,
      layers: [],
    });
    assert(scheme.status === 200 && scheme.json && scheme.json.id, 'create scheme failed');
    created.schemeId = scheme.json.id;

    const schemeVersion = await findSchemeVersion(created.artworkId, created.schemeId);

    const schemeFresh = await request('PUT', `/api/artworks/${created.artworkId}/schemes/${created.schemeId}`, {
      name: `A5 Scheme ${suffix} v2`,
      layers: [],
      version: schemeVersion,
    });
    assert(schemeFresh.status === 200, `fresh scheme update failed: ${schemeFresh.status}`);

    const schemeStale = await request('PUT', `/api/artworks/${created.artworkId}/schemes/${created.schemeId}`, {
      name: `A5 Scheme ${suffix} stale`,
      layers: [],
      version: schemeVersion,
    });
    assertConflict(schemeStale, 'color_scheme', schemeVersion);

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
        `A5_STALE_SMOKE_PORT=${PORT}`,
        `A5_STALE_SMOKE_DB=${dbFile}`,
        'A5_STALE_WRITE_CUSTOM_COLOR=PASS',
        'A5_STALE_WRITE_MONT_MARTE=PASS',
        'A5_STALE_WRITE_COLOR_SCHEME=PASS',
      ].join('\n') + '\n'
    );
  } catch (error) {
    process.stderr.write(`A5_STALE_SMOKE=FAIL\n${error.message}\n`);
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
