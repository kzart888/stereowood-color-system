#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(full);
      if (entry.isFile() && full.endsWith('.js')) return [full];
      return [];
    });
}

function normalize(p) {
  return p.replace(/\\/g, '/');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function checkBackendRouteImports() {
  const routeFiles = listFiles(path.join(repoRoot, 'backend', 'routes'));
  const violations = [];
  for (const file of routeFiles) {
    const source = read(file);
    if (/require\((['"])(\.\.\/)+services\//.test(source)) {
      violations.push(`${normalize(path.relative(repoRoot, file))}: must import domains instead of services`);
    }
    if (/require\((['"])(\.\.\/)+db\//.test(source)) {
      violations.push(`${normalize(path.relative(repoRoot, file))}: routes must not import db directly`);
    }
  }
  assert(violations.length === 0, `Backend boundary violations:\n- ${violations.join('\n- ')}`);
}

function checkDomainFolders() {
  const required = [
    'backend/domains/custom-colors/service.js',
    'backend/domains/artworks/service.js',
    'backend/domains/materials/service.js',
    'backend/domains/categories/service.js',
    'backend/domains/dictionaries/service.js',
    'backend/domains/shared/README.md',
  ];
  const missing = required.filter((rel) => !fs.existsSync(path.join(repoRoot, rel)));
  assert(missing.length === 0, `Missing required domain boundary files: ${missing.join(', ')}`);
}

function checkFrontendBoundaryEntry() {
  const requiredFiles = [
    'frontend/legacy/js/adapters/http-client.js',
    'frontend/legacy/js/adapters/api-gateway.js',
    'frontend/legacy/js/compat/runtime-bridge.js',
  ];
  const missing = requiredFiles.filter((rel) => !fs.existsSync(path.join(repoRoot, rel)));
  assert(missing.length === 0, `Missing frontend boundary files: ${missing.join(', ')}`);

  const appHtml = read(path.join(repoRoot, 'frontend/legacy/app.html'));
  assert(appHtml.includes('js/adapters/http-client.js'), 'app.html missing http-client.js');
  assert(appHtml.includes('js/adapters/api-gateway.js'), 'app.html missing api-gateway.js');
  assert(appHtml.includes('js/compat/runtime-bridge.js'), 'app.html missing runtime-bridge.js');

  const loginHtml = read(path.join(repoRoot, 'frontend/legacy/index.html'));
  assert(loginHtml.includes('js/login-page.js'), 'index.html missing login-page.js');
}

function main() {
  checkDomainFolders();
  checkBackendRouteImports();
  checkFrontendBoundaryEntry();

  process.stdout.write(
    [
      'ARCH_BOUNDARY_BACKEND=PASS',
      'ARCH_BOUNDARY_FRONTEND=PASS',
      'ARCH_BOUNDARY_CHECK=PASS',
    ].join('\n') + '\n',
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`ARCH_BOUNDARY_CHECK=FAIL\n${error.message}\n`);
  process.exitCode = 1;
}
