#!/usr/bin/env node
/**
 * Phase 0 smoke test:
 * 1) boot backend on a dedicated test port
 * 2) verify /health and /
 * 3) verify root HTML includes UTF-8 charset meta
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const SMOKE_PORT = Number.parseInt(process.env.SMOKE_PORT || process.env.PORT || '19099', 10);
const HOST = '127.0.0.1';
const START_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 500;

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: HOST,
        port: SMOKE_PORT,
        path: pathname,
        method: 'GET',
        timeout: 5000,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      },
    );

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`Request timeout: ${pathname}`)));
    req.end();
  });
}

async function waitForHealth() {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < START_TIMEOUT_MS) {
    try {
      const health = await request('/health');
      if (health.status === 200) return;
      lastError = new Error(`Unexpected /health status: ${health.status}`);
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
      PORT: String(SMOKE_PORT),
      NODE_ENV: process.env.NODE_ENV || 'production',
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

  try {
    await waitForHealth();

    const health = await request('/health');
    const root = await request('/');
    const hasUtf8Meta = /<meta\s+charset=["']UTF-8["']\s*\/?>/i.test(root.body);

    const failures = [];
    if (health.status !== 200) failures.push(`/health expected 200, got ${health.status}`);
    if (root.status !== 200) failures.push(`/ expected 200, got ${root.status}`);
    if (!hasUtf8Meta) failures.push('root HTML missing UTF-8 charset meta');

    if (failures.length > 0) {
      throw new Error(`Smoke test failed: ${failures.join('; ')}`);
    }

    process.stdout.write(
      [
        `SMOKE_PORT=${SMOKE_PORT}`,
        `HEALTH_STATUS=${health.status}`,
        `ROOT_STATUS=${root.status}`,
        `ROOT_HAS_UTF8_META=${hasUtf8Meta}`,
        'PHASE0_SMOKE=PASS',
      ].join('\n') + '\n',
    );
  } catch (error) {
    process.stderr.write(`PHASE0_SMOKE=FAIL\n${error.message}\n`);
    if (logs.length > 0) {
      process.stderr.write('--- backend logs ---\n');
      process.stderr.write(logs.join(''));
      process.stderr.write('\n--- end backend logs ---\n');
    }
    process.exitCode = 1;
  } finally {
    await stopChild();
  }
}

main();
