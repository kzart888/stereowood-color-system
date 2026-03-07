const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.P4_AUDIT_SMOKE_PORT || process.env.PORT || '19199', 10);
const START_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 500;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-p4-audit-smoke-'));
const dbFile = path.join(tmpRoot, 'color_management.db');
const actorName = `p4-operator-${Date.now().toString().slice(-6)}`;

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
            // ignore non-json payload
          }
          resolve({ status: res.statusCode, text, json });
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
      AUTH_ENFORCE_WRITES: 'false',
      READ_ONLY_MODE: 'false',
      ENABLE_PILOT_UI: 'false',
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

    const root = await request('GET', '/');
    assert(root.status === 200, `root page failed: ${root.status}`);
    assert(root.text.includes('audit-timeline-panel-component'), 'root page missing audit panel mount');
    assert(root.text.includes('js/components/audit-timeline-panel.js'), 'root page missing audit panel script');

    const panelComponent = fs.readFileSync(
      path.join(__dirname, '..', 'frontend', 'legacy', 'js', 'components', 'audit-timeline-panel.js'),
      'utf8'
    );
    assert(panelComponent.includes('操作记录'), 'audit panel component missing expected UTF-8 Chinese label');

    const supplier = await request(
      'POST',
      '/api/suppliers/upsert',
      { name: `P4 supplier ${Date.now()}` },
      { 'x-actor-name': actorName, 'x-source': 'p4-smoke' }
    );
    assert(supplier.status === 200, `supplier upsert failed: ${supplier.status}`);

    const purchaseLink = await request(
      'POST',
      '/api/purchase-links/upsert',
      { url: `https://example.com/p4/${Date.now()}` },
      { 'x-actor-name': actorName, 'x-source': 'p4-smoke' }
    );
    assert(purchaseLink.status === 200, `purchase-link upsert failed: ${purchaseLink.status}`);

    const feed = await request('GET', '/api/history/feed?tab=mont-marte&page=1&pageSize=20');
    assert(feed.status === 200, `history feed failed: ${feed.status}`);
    assert(feed.json && Array.isArray(feed.json.items), 'history feed missing items array');
    assert(feed.json.pagination && Number.isFinite(feed.json.pagination.total), 'history feed missing pagination');
    assert(feed.json.items.length > 0, 'history feed returned no items');

    const firstEvent = feed.json.items[0];
    assert(firstEvent.entity_type, 'history feed item missing entity_type');
    assert(firstEvent.entity_id, 'history feed item missing entity_id');

    const actorFiltered = await request(
      'GET',
      `/api/history/feed?tab=mont-marte&page=1&pageSize=20&actor=${encodeURIComponent(actorName)}`
    );
    assert(actorFiltered.status === 200, `actor filtered feed failed: ${actorFiltered.status}`);
    assert(
      actorFiltered.json.items.some((item) => item.actor_name === actorName),
      'actor filtered feed missing expected actor records'
    );

    const scoped = await request(
      'GET',
      `/api/history/feed?tab=all&page=1&pageSize=20&entityType=${encodeURIComponent(firstEvent.entity_type)}&entityId=${firstEvent.entity_id}`
    );
    assert(scoped.status === 200, `entity scoped feed failed: ${scoped.status}`);
    assert(
      scoped.json.items.every(
        (item) => item.entity_type === firstEvent.entity_type && item.entity_id === firstEvent.entity_id
      ),
      'entity scoped feed returned out-of-scope records'
    );

    process.stdout.write(
      [
        `P4_AUDIT_SMOKE_PORT=${PORT}`,
        `P4_AUDIT_SMOKE_DB=${dbFile}`,
        'P4_AUDIT_FEED_API=PASS',
        'P4_AUDIT_FEED_FILTERS=PASS',
        'P4_AUDIT_PANEL_MOUNT=PASS',
        'P4_UTF8_LABELS=PASS',
      ].join('\n') + '\n'
    );
  } catch (error) {
    process.stderr.write(`P4_AUDIT_SMOKE=FAIL\n${error.message}\n`);
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
