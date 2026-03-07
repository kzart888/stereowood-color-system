#!/usr/bin/env node

/**
 * P1 docs/runtime contract check.
 * Verifies active docs do not drift from core runtime/deploy contract.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const ACTIVE_DOCS = [
  'README.md',
  'DEPLOYMENT_CHECKLIST.md',
  'docs/OPERATIONS.md',
  'docs/development/backend-api.md',
  'docs/architecture/LATEST_ROADMAP_P0_P6.md',
];

const MUST_INCLUDE = [
  { file: 'README.md', pattern: 'http://localhost:9099' },
  { file: 'docs/OPERATIONS.md', pattern: '/health' },
  { file: 'docs/OPERATIONS.md', pattern: 'DB_FILE=/data/color_management.db' },
  { file: 'DEPLOYMENT_CHECKLIST.md', pattern: 'DB_FILE=/data/color_management.db' },
  { file: 'DEPLOYMENT_CHECKLIST.md', pattern: '/health' },
  { file: 'docs/development/backend-api.md', pattern: 'API base path: `/api`' },
  { file: 'docs/development/backend-api.md', pattern: 'Health endpoint: `/health`' },
  { file: 'docs/architecture/LATEST_ROADMAP_P0_P6.md', pattern: 'frontend/legacy' },
  { file: 'docs/architecture/LATEST_ROADMAP_P0_P6.md', pattern: 'port `9099`' },
];

const FORBIDDEN_PATTERNS = [
  /localhost:8088/i,
  /localhost:9000/i,
  /PORT=9000/i,
  /PORT=8088/i,
  /DB_FILE=\/data\/database\.db/i,
];

function readFile(relPath) {
  const fullPath = path.join(ROOT, relPath);
  return fs.readFileSync(fullPath, 'utf8');
}

function main() {
  const failures = [];
  const fileCache = new Map();

  for (const relPath of ACTIVE_DOCS) {
    try {
      fileCache.set(relPath, readFile(relPath));
    } catch (error) {
      failures.push(`Missing active doc: ${relPath}`);
    }
  }

  for (const rule of MUST_INCLUDE) {
    const content = fileCache.get(rule.file);
    if (!content) continue;
    if (!content.includes(rule.pattern)) {
      failures.push(`Missing required contract pattern in ${rule.file}: ${rule.pattern}`);
    }
  }

  for (const relPath of ACTIVE_DOCS) {
    const content = fileCache.get(relPath);
    if (!content) continue;
    for (const re of FORBIDDEN_PATTERNS) {
      if (re.test(content)) {
        failures.push(`Forbidden runtime/deploy drift in ${relPath}: ${re}`);
      }
    }
  }

  if (failures.length > 0) {
    process.stderr.write('DOC_CONTRACT_CHECK=FAIL\n');
    failures.forEach((line) => process.stderr.write(`${line}\n`));
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`DOC_CONTRACT_FILES=${ACTIVE_DOCS.length}\n`);
  process.stdout.write('DOC_CONTRACT_CHECK=PASS\n');
}

main();

