#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = [
  'frontend/legacy/js/app.js',
  'frontend/legacy/js/components',
  'frontend/legacy/js/modules',
];

const findings = [];

function isJsFile(filePath) {
  return filePath.toLowerCase().endsWith('.js');
}

function walk(dirPath, collector) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, collector);
      continue;
    }
    if (entry.isFile() && isJsFile(fullPath)) {
      collector.push(fullPath);
    }
  }
}

function loadTargetFiles() {
  const files = [];
  for (const rel of TARGETS) {
    const fullPath = path.join(ROOT, rel);
    if (!fs.existsSync(fullPath)) continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, files);
    } else if (stat.isFile() && isJsFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function addFinding(filePath, lineNo, line, reason) {
  findings.push({
    file: path.relative(ROOT, filePath).replace(/\\/g, '/'),
    line: lineNo,
    reason,
    code: line.trim(),
  });
}

function scanFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNo = index + 1;
    const lower = line.toLowerCase();

    if (/\bwindow\.api\b/.test(line)) {
      addFinding(filePath, lineNo, line, 'window.api usage is forbidden in active modules.');
    }

    const hasAxios = /axios\.(get|post|put|delete)\s*\(/i.test(line);
    const hasFetch = /\bfetch\s*\(/i.test(line);
    const hasApiPath = lower.includes('/api');
    if ((hasAxios || hasFetch) && hasApiPath) {
      addFinding(filePath, lineNo, line, 'Direct axios/fetch call to /api is forbidden; use api-gateway.');
    }
  });
}

function main() {
  const files = loadTargetFiles();
  files.forEach(scanFile);

  process.stdout.write(`P5_NETWORK_SCAN_FILES=${files.length}\n`);
  if (findings.length > 0) {
    process.stderr.write(`P5_NETWORK_SCAN=FAIL (${findings.length} findings)\n`);
    findings.forEach((item) => {
      process.stderr.write(`${item.file}:${item.line} ${item.reason}\n`);
      process.stderr.write(`  ${item.code}\n`);
    });
    process.exitCode = 1;
    return;
  }

  process.stdout.write('P5_NETWORK_SCAN=PASS\n');
}

main();
