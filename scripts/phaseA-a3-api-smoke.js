const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.A3_API_SMOKE_PORT || process.env.PORT || '19139', 10);
const START_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 500;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-a3-api-smoke-'));
const dbFile = path.join(tmpRoot, 'color_management.db');
const requestId = `a3-${Date.now()}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function request(method, endpoint, body = undefined) {
  return new Promise((resolve, reject) => {
    let payload = null;
    const headers = {
      'x-actor-id': 'a3-smoke',
      'x-actor-name': 'A3 Smoke',
      'x-request-id': requestId,
      'x-source': 'api-smoke',
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
            // ignore parse errors for empty responses
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

async function expectTimeline(entityType, entityId, expectedMinCount) {
  const timeline = await request('GET', `/api/history/${entityType}/${entityId}?limit=20`);
  assert(timeline.status === 200, `Timeline request failed for ${entityType}/${entityId}: ${timeline.status}`);
  assert(timeline.json && Array.isArray(timeline.json.events), `Timeline payload invalid for ${entityType}/${entityId}`);
  assert(
    timeline.json.events.length >= expectedMinCount,
    `Expected at least ${expectedMinCount} timeline events for ${entityType}/${entityId}, got ${timeline.json.events.length}`
  );
}

async function main() {
  const backendEntry = path.join(__dirname, '..', 'backend', 'server.js');
  const child = spawn(process.execPath, [backendEntry], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      DB_FILE: dbFile,
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
    artworkId: null,
    schemeId: null,
    materialId: null,
    supplierId: null,
  };

  try {
    await waitForHealth();

    const suffix = String(Date.now()).slice(-6);

    const categoryRes = await request('POST', '/api/categories', {
      code: `H${suffix}`,
      name: `A3 Category ${suffix}`,
      display_order: 180,
    });
    assert(categoryRes.status === 200, `POST /api/categories failed: ${categoryRes.status}`);
    created.categoryId = categoryRes.json.id;

    const colorRes = await request('POST', '/api/custom-colors', {
      color_code: `A3-${suffix}`,
      category_id: created.categoryId,
      formula: 'WHITE:1',
    });
    assert(colorRes.status === 200, `POST /api/custom-colors failed: ${colorRes.status}`);
    created.customColorId = colorRes.json.id;

    const colorUpdate = await request('PUT', `/api/custom-colors/${created.customColorId}`, {
      formula: 'WHITE:2',
      version: colorRes.json.version,
    });
    assert(colorUpdate.status === 200, `PUT /api/custom-colors/:id failed: ${colorUpdate.status}`);

    const artworkRes = await request('POST', '/api/artworks', {
      code: `H${suffix}`,
      name: `A3 Artwork ${suffix}`,
    });
    assert(artworkRes.status === 200, `POST /api/artworks failed: ${artworkRes.status}`);
    created.artworkId = artworkRes.json.id;

    const schemeCreate = await request('POST', `/api/artworks/${created.artworkId}/schemes`, {
      name: `A3 Scheme ${suffix}`,
      layers: [],
    });
    assert(schemeCreate.status === 200, `POST /api/artworks/:id/schemes failed: ${schemeCreate.status}`);
    created.schemeId = schemeCreate.json.id;

    const schemeUpdate = await request('PUT', `/api/artworks/${created.artworkId}/schemes/${created.schemeId}`, {
      name: `A3 Scheme ${suffix} Updated`,
      layers: [],
      existingThumbnailPath: null,
      existingInitialThumbnailPath: null,
    });
    assert(schemeUpdate.status === 200, `PUT /api/artworks/:id/schemes/:id failed: ${schemeUpdate.status}`);

    const materialCreate = await request('POST', '/api/mont-marte-colors', {
      name: `A3 Material ${suffix}`,
      category: 'other',
    });
    assert(materialCreate.status === 200, `POST /api/mont-marte-colors failed: ${materialCreate.status}`);
    created.materialId = materialCreate.json.id;

    const materialUpdate = await request('PUT', `/api/mont-marte-colors/${created.materialId}`, {
      name: `A3 Material ${suffix} Updated`,
      category: 'other',
    });
    assert(materialUpdate.status === 200, `PUT /api/mont-marte-colors/:id failed: ${materialUpdate.status}`);

    const supplierRes = await request('POST', '/api/suppliers/upsert', {
      name: `A3 Supplier ${suffix}`,
    });
    assert(supplierRes.status === 200, `POST /api/suppliers/upsert failed: ${supplierRes.status}`);
    created.supplierId = supplierRes.json.id;

    await expectTimeline('custom_color', created.customColorId, 2);
    await expectTimeline('color_scheme', created.schemeId, 2);
    await expectTimeline('mont_marte_color', created.materialId, 2);
    await expectTimeline('category', created.categoryId, 1);
    await expectTimeline('supplier', created.supplierId, 1);

    if (created.schemeId) {
      await request('DELETE', `/api/artworks/${created.artworkId}/schemes/${created.schemeId}`);
    }
    if (created.artworkId) {
      await request('DELETE', `/api/artworks/${created.artworkId}`);
    }
    if (created.customColorId) {
      await request('DELETE', `/api/custom-colors/${created.customColorId}`);
    }
    if (created.materialId) {
      await request('DELETE', `/api/mont-marte-colors/${created.materialId}`);
    }
    if (created.categoryId) {
      await request('DELETE', `/api/categories/${created.categoryId}`);
    }
    if (created.supplierId) {
      await request('DELETE', `/api/suppliers/${created.supplierId}`);
    }

    process.stdout.write(
      [
        `A3_API_SMOKE_PORT=${PORT}`,
        `A3_API_SMOKE_DB=${dbFile}`,
        'A3_API_TIMELINE=PASS',
        'A3_API_SMOKE=PASS',
      ].join('\n') + '\n'
    );
  } catch (error) {
    process.stderr.write(`A3_API_SMOKE=FAIL\n${error.message}\n`);
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

