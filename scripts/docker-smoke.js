#!/usr/bin/env node

/**
 * Docker smoke rehearsal for release gate.
 * - Build image when needed
 * - Run disposable container with disposable volumes
 * - Verify health/api/root contract
 */

const { spawnSync } = require('child_process');

const TAG = process.env.DOCKER_SMOKE_TAG || 'stereowood-color-system:gate-full';
const PORT = Number.parseInt(process.env.DOCKER_SMOKE_PORT || '9299', 10);
const CONTAINER = process.env.DOCKER_SMOKE_CONTAINER || 'sw-gate-full-smoke';
const BUILD_IF_MISSING = String(process.env.DOCKER_SMOKE_BUILD_IF_MISSING || 'true').toLowerCase() !== 'false';
const FORCE_BUILD = String(process.env.DOCKER_SMOKE_FORCE_BUILD || 'false').toLowerCase() === 'true';

const volumeSuffix = `${Date.now()}`;
const DATA_VOL = `sw-gate-data-${volumeSuffix}`;
const UPLOADS_VOL = `sw-gate-uploads-${volumeSuffix}`;
const BACKUPS_VOL = `sw-gate-backups-${volumeSuffix}`;

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

async function requestJson(url) {
  const response = await fetch(url, { method: 'GET' });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // non-json
  }
  return { status: response.status, text, json, headers: response.headers };
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
      '-v',
      `${DATA_VOL}:/data`,
      '-v',
      `${UPLOADS_VOL}:/app/backend/uploads`,
      '-v',
      `${BACKUPS_VOL}:/app/backend/backups`,
      TAG,
    ]);

    const health = await waitForHealth(baseUrl);
    const config = await requestJson(`${baseUrl}/api/config`);
    const customColors = await requestJson(`${baseUrl}/api/custom-colors`);
    const artworks = await requestJson(`${baseUrl}/api/artworks`);
    const root = await fetch(`${baseUrl}/`);
    const rootText = await root.text();
    const rootType = String(root.headers.get('content-type') || '').toLowerCase();

    if (!health.json || health.json.status !== 'ok') {
      throw new Error('/health payload is invalid');
    }
    if (config.status !== 200) {
      throw new Error(`/api/config status=${config.status}`);
    }
    if (customColors.status !== 200) {
      throw new Error(`/api/custom-colors status=${customColors.status}`);
    }
    if (artworks.status !== 200) {
      throw new Error(`/api/artworks status=${artworks.status}`);
    }
    if (root.status !== 200) {
      throw new Error(`/ status=${root.status}`);
    }
    if (!rootType.includes('text/html') || !rootType.includes('charset=utf-8')) {
      throw new Error(`root content-type mismatch: ${rootType}`);
    }
    if (!/<meta\s+charset=["']UTF-8["']\s*\/?>/i.test(rootText)) {
      throw new Error('root page missing UTF-8 meta');
    }

    process.stdout.write(`DOCKER_SMOKE_TAG=${TAG}\n`);
    process.stdout.write(`DOCKER_SMOKE_BASE_URL=${baseUrl}\n`);
    process.stdout.write(`DOCKER_SMOKE_HEALTH=${JSON.stringify(health.json)}\n`);
    process.stdout.write('DOCKER_SMOKE=PASS\n');
  } catch (error) {
    process.stderr.write(`DOCKER_SMOKE=FAIL\n${error.message}\n`);
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

