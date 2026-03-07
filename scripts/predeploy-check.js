#!/usr/bin/env node

/**
 * Pre-deploy checklist automation.
 * Validates contract/config before Synology cutover.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const baseUrlArg = process.argv.find((arg) => arg.startsWith('--base-url='));
const skipHttp = process.argv.includes('--skip-http');
const baseUrl = process.env.PREDEPLOY_BASE_URL || (baseUrlArg ? baseUrlArg.split('=')[1] : '');

const checks = [];

function ok(name, detail) {
  checks.push({ name, status: 'PASS', detail });
}

function fail(name, detail) {
  checks.push({ name, status: 'FAIL', detail });
}

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', env: process.env });
  return {
    code: result.status,
    out: (result.stdout || '').trim(),
    err: (result.stderr || '').trim(),
  };
}

async function checkHttp(targetBaseUrl) {
  const endpoints = ['/health', '/api/config', '/api/custom-colors', '/api/artworks', '/'];
  for (const endpoint of endpoints) {
    const response = await fetch(`${targetBaseUrl}${endpoint}`);
    if (response.status !== 200) {
      fail(`HTTP ${endpoint}`, `expected 200, got ${response.status}`);
      continue;
    }
    ok(`HTTP ${endpoint}`, '200');
  }
}

async function main() {
  // Static files
  ['Dockerfile', 'docker-compose.yml', 'README.md', 'docs/OPERATIONS.md', 'DEPLOYMENT_CHECKLIST.md'].forEach(
    (name) => {
      if (fs.existsSync(path.join(ROOT, name))) ok(`file ${name}`, 'exists');
      else fail(`file ${name}`, 'missing');
    }
  );

  // Compose contract
  try {
    const compose = read('docker-compose.yml');
    [
      'PORT=9099',
      'DB_FILE=/data/color_management.db',
      '/data',
      '/app/backend/uploads',
      '/app/backend/backups',
      '/health',
    ].forEach((pattern) => {
      if (compose.includes(pattern)) ok(`compose contains ${pattern}`, 'ok');
      else fail(`compose contains ${pattern}`, 'missing');
    });
  } catch (error) {
    fail('read docker-compose.yml', error.message);
  }

  // Dockerfile contract
  try {
    const dockerfile = read('Dockerfile');
    ['/health', 'PORT=9099', 'DB_FILE=/data/color_management.db'].forEach((pattern) => {
      if (dockerfile.includes(pattern)) ok(`Dockerfile contains ${pattern}`, 'ok');
      else fail(`Dockerfile contains ${pattern}`, 'missing');
    });
  } catch (error) {
    fail('read Dockerfile', error.message);
  }

  // Docs contract check
  const docsContract = run('node', ['scripts/docs-contract-check.js']);
  if (docsContract.code === 0) ok('docs contract check', docsContract.out || 'PASS');
  else fail('docs contract check', docsContract.err || docsContract.out || 'failed');

  // Docker status check
  const dockerStatus = run('docker', ['desktop', 'status', '--format', 'json']);
  if (dockerStatus.code === 0 && dockerStatus.out.toLowerCase().includes('running')) {
    ok('docker desktop status', dockerStatus.out);
  } else {
    fail('docker desktop status', dockerStatus.err || dockerStatus.out || 'unknown');
  }

  // Live endpoint checks
  if (skipHttp) {
    ok('http smoke', 'skipped by --skip-http');
  } else if (baseUrl) {
    try {
      await checkHttp(baseUrl.replace(/\/$/, ''));
    } catch (error) {
      fail('http smoke', error.message);
    }
  } else {
    ok('http smoke', 'skipped (no --base-url and PREDEPLOY_BASE_URL not set)');
  }

  // Print report
  process.stdout.write('PREDEPLOY_CHECK_REPORT\n');
  checks.forEach((item) => {
    process.stdout.write(`[${item.status}] ${item.name} :: ${item.detail}\n`);
  });

  const failed = checks.filter((item) => item.status === 'FAIL');
  if (failed.length > 0) {
    process.stderr.write(`PREDEPLOY_CHECK=FAIL (${failed.length} failed)\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write('PREDEPLOY_CHECK=PASS\n');
}

main();

