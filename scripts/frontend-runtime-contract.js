#!/usr/bin/env node
/**
 * Phase A0 frontend runtime contract audit:
 * - verify legacy index script references resolve
 * - verify critical load order invariants
 * - verify key global exports used by legacy runtime
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const legacyRoot = path.join(repoRoot, 'frontend', 'legacy');
const loginFile = path.join(legacyRoot, 'index.html');
const appFile = path.join(legacyRoot, 'app.html');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalize(p) {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

function extractScriptSources(html) {
  const matches = [];
  const regex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match = regex.exec(html);
  while (match) {
    matches.push(match[1]);
    match = regex.exec(html);
  }
  return matches;
}

function main() {
  const loginHtml = fs.readFileSync(loginFile, 'utf8');
  const appHtml = fs.readFileSync(appFile, 'utf8');
  const scriptSources = extractScriptSources(appHtml);

  assert(
    /<meta\s+charset=["']UTF-8["']\s*\/?>/i.test(loginHtml),
    'frontend/legacy/index.html is missing UTF-8 charset meta tag.',
  );
  assert(
    /<meta\s+charset=["']UTF-8["']\s*\/?>/i.test(appHtml),
    'frontend/legacy/app.html is missing UTF-8 charset meta tag.',
  );

  const localScripts = scriptSources
    .filter((src) => !/^https?:\/\//i.test(src) && !/^\/\//.test(src))
    .map(normalize);

  const missingScripts = [];
  for (const src of localScripts) {
    const target = path.join(legacyRoot, src);
    if (!fs.existsSync(target)) {
      missingScripts.push(src);
    }
  }

  assert(missingScripts.length === 0, `Missing local script files: ${missingScripts.join(', ')}`);

  const requiredOrder = [
    ['js/utils/helpers.js', 'js/app.js'],
    ['js/api/api.js', 'js/app.js'],
    ['js/components/custom-colors.js', 'js/app.js'],
    ['js/components/artworks.js', 'js/app.js'],
    ['js/components/mont-marte.js', 'js/app.js'],
  ];

  for (const [before, after] of requiredOrder) {
    const iBefore = localScripts.indexOf(before);
    const iAfter = localScripts.indexOf(after);
    assert(iBefore >= 0, `Required script not found: ${before}`);
    assert(iAfter >= 0, `Required script not found: ${after}`);
    assert(iBefore < iAfter, `Script order violation: ${before} must load before ${after}`);
  }

  const requiredExports = [
    { file: 'js/api/api.js', pattern: /window\.api\s*=/, label: 'window.api' },
    { file: 'js/utils/helpers.js', pattern: /window\.helpers\s*=/, label: 'window.helpers' },
    {
      file: 'js/utils/config-helper.js',
      pattern: /window\.ConfigHelper\s*=/,
      label: 'window.ConfigHelper',
    },
    {
      file: 'js/components/custom-colors.js',
      pattern: /window\.CustomColorsComponent\s*=/,
      label: 'window.CustomColorsComponent',
    },
    {
      file: 'js/components/artworks.js',
      pattern: /window\.ArtworksComponent\s*=/,
      label: 'window.ArtworksComponent',
    },
    {
      file: 'js/components/mont-marte.js',
      pattern: /window\.MontMarteComponent\s*=/,
      label: 'window.MontMarteComponent',
    },
    {
      file: 'js/components/color-dictionary/color-dictionary-service.js',
      pattern: /window\.ColorDictionaryService\s*=/,
      label: 'window.ColorDictionaryService',
    },
  ];

  const missingExports = [];
  for (const item of requiredExports) {
    const source = fs.readFileSync(path.join(legacyRoot, item.file), 'utf8');
    if (!item.pattern.test(source)) {
      missingExports.push(item.label);
    }
  }

  assert(
    missingExports.length === 0,
    `Missing required runtime global exports: ${missingExports.join(', ')}`,
  );

  process.stdout.write(
    [
      `RUNTIME_CONTRACT_INDEX=${path.relative(repoRoot, appFile).replace(/\\/g, '/')}`,
      `RUNTIME_CONTRACT_LOGIN=${path.relative(repoRoot, loginFile).replace(/\\/g, '/')}`,
      `RUNTIME_CONTRACT_APP=${path.relative(repoRoot, appFile).replace(/\\/g, '/')}`,
      `RUNTIME_CONTRACT_LOCAL_SCRIPTS=${localScripts.length}`,
      `RUNTIME_CONTRACT_EXPORTS_CHECKED=${requiredExports.length}`,
      'FRONTEND_RUNTIME_CONTRACT=PASS',
    ].join('\n') + '\n',
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`FRONTEND_RUNTIME_CONTRACT=FAIL\n${error.message}\n`);
  process.exitCode = 1;
}
