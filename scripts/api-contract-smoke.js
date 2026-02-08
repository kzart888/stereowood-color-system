#!/usr/bin/env node
/**
 * Phase A0 API contract smoke:
 * - boot backend against disposable DB
 * - verify core read endpoints
 * - verify core write paths with create/update/delete lifecycle
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.CONTRACT_PORT || process.env.PORT || '19109', 10);
const START_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 500;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-a0-contract-'));
const dbFile = path.join(tmpRoot, 'color_management.db');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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
            // non-json payloads are ignored
          }
          resolve({ status: res.statusCode, text, json, headers: res.headers });
        });
      },
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

async function expectArrayGet(endpoint) {
  const response = await request('GET', endpoint);
  assert(response.status === 200, `Expected 200 for GET ${endpoint}, got ${response.status}`);
  assert(Array.isArray(response.json), `Expected array payload for GET ${endpoint}`);
  return response.json;
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
      if (child.killed) return resolve();
      child.once('exit', () => resolve());
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL');
      }, 5000);
    });

  const created = {
    categoryId: null,
    customColorId: null,
    customColorVersion: null,
    artworkId: null,
    schemeId: null,
    montMarteColorId: null,
  };

  try {
    await waitForHealth();

    // Read contract checks
    await expectArrayGet('/api/categories');
    await expectArrayGet('/api/custom-colors');
    await expectArrayGet('/api/artworks');
    await expectArrayGet('/api/mont-marte-colors');

    const now = Date.now();
    const suffix = String(now).slice(-6);

    // Write contract checks: categories
    const createdCategory = await request('POST', '/api/categories', {
      code: `A${suffix}`,
      name: `A0 Contract Category ${suffix}`,
      display_order: 100,
    });
    assert(createdCategory.status === 200, `POST /api/categories failed: ${createdCategory.status}`);
    assert(createdCategory.json && createdCategory.json.id, 'POST /api/categories missing id');
    created.categoryId = createdCategory.json.id;

    const updatedCategory = await request('PUT', `/api/categories/${created.categoryId}`, {
      code: `A${suffix}`,
      name: `A0 Contract Category ${suffix} Updated`,
    });
    assert(updatedCategory.status === 200, `PUT /api/categories/:id failed: ${updatedCategory.status}`);

    // Write contract checks: custom colors
    const createdColor = await request('POST', '/api/custom-colors', {
      color_code: `A0-${suffix}`,
      category_id: created.categoryId,
      formula: 'WHITE:1',
    });
    assert(createdColor.status === 200, `POST /api/custom-colors failed: ${createdColor.status}`);
    assert(createdColor.json && createdColor.json.id, 'POST /api/custom-colors missing id');
    created.customColorId = createdColor.json.id;
    created.customColorVersion = createdColor.json.version;

    if (Number.isInteger(created.customColorVersion)) {
      const updatedColor = await request('PUT', `/api/custom-colors/${created.customColorId}`, {
        formula: 'WHITE:2',
        version: created.customColorVersion,
      });
      assert(updatedColor.status === 200, `PUT /api/custom-colors/:id failed: ${updatedColor.status}`);
    }

    // Write contract checks: artworks and schemes
    const artworkCode = `A0${suffix}`;
    const createdArtwork = await request('POST', '/api/artworks', {
      code: artworkCode,
      name: `A0 Contract Artwork ${suffix}`,
    });
    assert(createdArtwork.status === 200, `POST /api/artworks failed: ${createdArtwork.status}`);
    assert(createdArtwork.json && createdArtwork.json.id, 'POST /api/artworks missing id');
    created.artworkId = createdArtwork.json.id;

    const createdScheme = await request('POST', `/api/artworks/${created.artworkId}/schemes`, {
      name: `A0 Scheme ${suffix}`,
      layers: [],
    });
    assert(
      createdScheme.status === 200,
      `POST /api/artworks/:id/schemes failed: ${createdScheme.status}`,
    );
    if (createdScheme.json && createdScheme.json.id) {
      created.schemeId = createdScheme.json.id;
    }

    // Write contract checks: mont-marte colors
    const createdMontMarte = await request('POST', '/api/mont-marte-colors', {
      name: `A0 Material ${suffix}`,
      category: 'other',
    });
    assert(
      createdMontMarte.status === 200,
      `POST /api/mont-marte-colors failed: ${createdMontMarte.status}`,
    );
    assert(createdMontMarte.json && createdMontMarte.json.id, 'POST /api/mont-marte-colors missing id');
    created.montMarteColorId = createdMontMarte.json.id;

    const updatedMontMarte = await request(
      'PUT',
      `/api/mont-marte-colors/${created.montMarteColorId}`,
      {
        name: `A0 Material ${suffix} Updated`,
        category: 'other',
      },
    );
    assert(
      updatedMontMarte.status === 200,
      `PUT /api/mont-marte-colors/:id failed: ${updatedMontMarte.status}`,
    );

    // Cleanup (reverse dependency order)
    if (created.schemeId) {
      await request('DELETE', `/api/artworks/${created.artworkId}/schemes/${created.schemeId}`);
    }
    if (created.artworkId) {
      await request('DELETE', `/api/artworks/${created.artworkId}`);
    }
    if (created.customColorId) {
      await request('DELETE', `/api/custom-colors/${created.customColorId}`);
    }
    if (created.montMarteColorId) {
      await request('DELETE', `/api/mont-marte-colors/${created.montMarteColorId}`);
    }
    if (created.categoryId) {
      await request('DELETE', `/api/categories/${created.categoryId}`);
    }

    process.stdout.write(
      [
        `CONTRACT_PORT=${PORT}`,
        `CONTRACT_DB_FILE=${dbFile}`,
        'CONTRACT_ENDPOINT_GROUPS=categories,custom-colors,artworks,mont-marte-colors',
        'API_CONTRACT_SMOKE=PASS',
      ].join('\n') + '\n',
    );
  } catch (error) {
    process.stderr.write(`API_CONTRACT_SMOKE=FAIL\n${error.message}\n`);
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
      // best-effort temp cleanup
    }
  }
}

main();
