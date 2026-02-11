#!/usr/bin/env node
/**
 * Phase A7 pilot parity verification:
 * - Verify runtime/read-only API contract for pilot slice.
 * - Verify /pilot page when ENABLE_PILOT_UI=true.
 *
 * Modes:
 * 1) Local spawn mode (default): boots backend with disposable DB.
 * 2) External mode: set PILOT_BASE_URL to validate an existing candidate deployment.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.PILOT_PARITY_PORT || process.env.PORT || '19179', 10);
const START_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 500;
const externalBaseUrl = process.env.PILOT_BASE_URL || '';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseBaseUrl(baseUrl) {
  const parsed = new URL(baseUrl);
  return {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80'),
    basePath: parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, ''),
  };
}

function request(base, endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: base.hostname,
        port: base.port,
        path: `${base.basePath}${endpoint}`,
        method: 'GET',
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
            // non-json response
          }
          resolve({ status: res.statusCode, text, json, headers: res.headers });
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`Request timeout: ${endpoint}`)));
    req.end();
  });
}

async function waitForHealth(base) {
  const start = Date.now();
  let lastError = null;

  while (Date.now() - start < START_TIMEOUT_MS) {
    try {
      const health = await request(base, '/health');
      if (health.status === 200) return;
      lastError = new Error(`/health status ${health.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw lastError || new Error('Backend did not become ready in time');
}

function assertJsonUtf8(endpoint, response) {
  assert(response.status === 200, `Expected 200 for ${endpoint}, got ${response.status}`);
  const type = String(response.headers['content-type'] || '').toLowerCase();
  assert(type.includes('application/json'), `${endpoint} expected JSON content-type, got ${type}`);
  assert(type.includes('charset=utf-8'), `${endpoint} expected utf-8 charset, got ${type}`);
}

async function runChecks(base) {
  const health = await request(base, '/health');
  assertJsonUtf8('/health', health);
  assert(health.json && health.json.status === 'ok', '/health expected { status: "ok" }');

  const config = await request(base, '/api/config');
  assertJsonUtf8('/api/config', config);
  assert(config.json && typeof config.json === 'object', '/api/config expected object payload');
  ['mode', 'testModeItemsPerPage', 'features'].forEach((key) =>
    assert(Object.prototype.hasOwnProperty.call(config.json, key), `/api/config missing ${key}`),
  );
  ['formulaCalculator', 'artworkManagement', 'montMarte', 'pilotExplorer'].forEach((key) =>
    assert(
      config.json.features && Object.prototype.hasOwnProperty.call(config.json.features, key),
      `/api/config.features missing ${key}`,
    ),
  );

  const arrayEndpoints = [
    '/api/custom-colors',
    '/api/categories',
    '/api/suppliers',
    '/api/purchase-links',
  ];

  for (const endpoint of arrayEndpoints) {
    const response = await request(base, endpoint);
    assertJsonUtf8(endpoint, response);
    assert(Array.isArray(response.json), `${endpoint} expected array payload`);
  }

  let pilotPage = await request(base, '/pilot');
  if (pilotPage.status === 301 || pilotPage.status === 302) {
    const location = String(pilotPage.headers.location || '');
    assert(location.includes('/pilot/'), `/pilot redirect target unexpected: ${location}`);
    pilotPage = await request(base, '/pilot/');
  }
  assert(pilotPage.status === 200, `/pilot expected 200, got ${pilotPage.status}`);
  assert(/<meta\s+charset=["']UTF-8["']\s*\/?>/i.test(pilotPage.text), '/pilot missing UTF-8 meta');
  assert(/id=["']pilot-app["']/i.test(pilotPage.text), '/pilot missing pilot-app root node');
  const pilotType = String(pilotPage.headers['content-type'] || '').toLowerCase();
  assert(pilotType.includes('text/html'), `/pilot expected html content-type, got ${pilotType}`);
  assert(pilotType.includes('charset=utf-8'), `/pilot expected utf-8 charset, got ${pilotType}`);
}

async function main() {
  let child = null;
  let tmpRoot = null;
  let base = null;
  const logs = [];

  try {
    if (externalBaseUrl) {
      base = parseBaseUrl(externalBaseUrl);
    } else {
      tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-a7-pilot-'));
      const dbFile = path.join(tmpRoot, 'color_management.db');
      const backendEntry = path.join(__dirname, '..', 'backend', 'server.js');
      child = spawn(process.execPath, [backendEntry], {
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: String(PORT),
          DB_FILE: dbFile,
          ENABLE_PILOT_UI: 'true',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      child.stdout.on('data', (chunk) => logs.push(String(chunk)));
      child.stderr.on('data', (chunk) => logs.push(String(chunk)));
      base = { protocol: 'http:', hostname: HOST, port: String(PORT), basePath: '' };
      await waitForHealth(base);
    }

    await runChecks(base);

    process.stdout.write(
      [
        `PILOT_BASE_URL=${externalBaseUrl || `http://${HOST}:${PORT}`}`,
        `PILOT_MODE=${externalBaseUrl ? 'external' : 'local-spawn'}`,
        'PHASE_A7_PILOT_PARITY=PASS',
      ].join('\n') + '\n',
    );
  } catch (error) {
    process.stderr.write(`PHASE_A7_PILOT_PARITY=FAIL\n${error.message}\n`);
    if (logs.length > 0) {
      process.stderr.write('--- backend logs ---\n');
      process.stderr.write(logs.join(''));
      process.stderr.write('\n--- end backend logs ---\n');
    }
    process.exitCode = 1;
  } finally {
    if (child && !child.killed) {
      child.kill('SIGTERM');
      await new Promise((resolve) => child.once('exit', resolve));
    }
    if (tmpRoot) {
      try {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      } catch {
        // best-effort temp cleanup
      }
    }
  }
}

main();
