#!/usr/bin/env node
/**
 * Phase 0 encoding audit:
 * - fail on invalid UTF-8 bytes
 * - fail on replacement character U+FFFD
 *
 * Default scope is active runtime/docs, not archives.
 */

const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util');

const repoRoot = path.resolve(__dirname, '..');
const decoder = new TextDecoder('utf-8', { fatal: true });

const allowedExt = new Set([
  '.js',
  '.css',
  '.html',
  '.md',
  '.json',
  '.yml',
  '.yaml',
  '.env',
  '.txt',
  '.sql',
]);

const explicitFiles = new Set([
  'README.md',
  'CLAUDE.md',
  'DEPLOYMENT_CHECKLIST.md',
  '.env',
  '.env.example',
  'Dockerfile',
  'docker-compose.yml',
  '.dockerignore',
  '.gitignore',
  'package.json',
]);

const activeDirs = ['backend', 'frontend/legacy', 'docs', 'scripts'];

function walk(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(repoRoot, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (rel.startsWith('.git') || rel.startsWith('node_modules') || rel.startsWith('archives')) {
        continue;
      }
      walk(full, files);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (allowedExt.has(ext) || explicitFiles.has(rel)) {
      files.push(full);
    }
  }
}

function collectTargets() {
  const files = [];

  for (const dir of activeDirs) {
    const full = path.join(repoRoot, dir);
    if (fs.existsSync(full)) {
      walk(full, files);
    }
  }

  for (const rel of explicitFiles) {
    const full = path.join(repoRoot, rel);
    if (fs.existsSync(full) && !files.includes(full)) {
      files.push(full);
    }
  }

  return files.sort();
}

function main() {
  const targets = collectTargets();
  const invalidUtf8 = [];
  const replacementChar = [];

  for (const file of targets) {
    const rel = path.relative(repoRoot, file).replace(/\\/g, '/');
    const bytes = fs.readFileSync(file);
    let text = '';

    try {
      text = decoder.decode(bytes);
    } catch (error) {
      invalidUtf8.push(rel);
      continue;
    }

    if (text.includes('\uFFFD')) {
      replacementChar.push(rel);
    }
  }

  process.stdout.write(`ENCODING_TARGETS=${targets.length}\n`);
  process.stdout.write(`INVALID_UTF8_COUNT=${invalidUtf8.length}\n`);
  process.stdout.write(`REPLACEMENT_CHAR_COUNT=${replacementChar.length}\n`);

  if (invalidUtf8.length > 0) {
    process.stdout.write('INVALID_UTF8_FILES:\n');
    for (const rel of invalidUtf8) process.stdout.write(`- ${rel}\n`);
  }

  if (replacementChar.length > 0) {
    process.stdout.write('REPLACEMENT_CHAR_FILES:\n');
    for (const rel of replacementChar) process.stdout.write(`- ${rel}\n`);
  }

  if (invalidUtf8.length > 0 || replacementChar.length > 0) {
    process.exitCode = 1;
    return;
  }

  process.stdout.write('ENCODING_AUDIT=PASS\n');
}

main();
