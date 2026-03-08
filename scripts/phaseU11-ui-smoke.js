#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('@playwright/test');
const XLSX = require('xlsx');

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.U11_UI_SMOKE_PORT || process.env.PORT || '19259', 10);
const START_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-u11-ui-smoke-'));
const dbFile = path.join(tmpRoot, 'color_management.db');
const baseURL = `http://${HOST}:${PORT}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth() {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < START_TIMEOUT_MS) {
    try {
      const response = await fetch(`${baseURL}/health`);
      if (response.status === 200) {
        return;
      }
      lastError = new Error(`/health status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await wait(POLL_INTERVAL_MS);
  }
  throw lastError || new Error('Backend did not become ready in time');
}

async function requestJson(method, endpoint, payload = null, headers = {}) {
  const response = await fetch(`${baseURL}${endpoint}`, {
    method,
    headers: {
      ...(payload !== null ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: payload !== null ? JSON.stringify(payload) : undefined,
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
}

async function requestForm(method, endpoint, formData, headers = {}) {
  const response = await fetch(`${baseURL}${endpoint}`, {
    method,
    headers,
    body: formData,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
}

async function bootstrapData() {
  const firstLogin = await requestJson('POST', '/api/auth/login', {
    username: 'admin',
    password: 'admin',
  });
  assert(firstLogin.status === 200, `bootstrap admin login failed: ${firstLogin.status}`);
  assert(firstLogin.json && firstLogin.json.token, 'bootstrap admin login missing token');

  const updatedPassword = 'U11AdminPass123';
  const changed = await requestJson(
    'POST',
    '/api/auth/change-password',
    { oldPassword: 'admin', newPassword: updatedPassword },
    { authorization: `Bearer ${firstLogin.json.token}` }
  );
  assert(changed.status === 200, `change-password failed: ${changed.status}`);

  const relogin = await requestJson('POST', '/api/auth/login', {
    username: 'admin',
    password: updatedPassword,
  });
  assert(relogin.status === 200, `admin relogin failed: ${relogin.status}`);
  assert(relogin.json && relogin.json.token, 'admin relogin missing token');
  const token = relogin.json.token;

  const colorCode = `UT${Date.now().toString().slice(-4)}`;
  const customColorForm = new FormData();
  customColorForm.append('color_code', colorCode);
  customColorForm.append('formula', '无水乙醇 10ml, 沙比利 0.2g');
  const colorCreated = await requestForm('POST', '/api/custom-colors', customColorForm, {
    authorization: `Bearer ${token}`,
  });
  assert(colorCreated.status === 200, `custom color create failed: ${colorCreated.status}`);

  const artworkCode = `U${Date.now().toString().slice(-4)}`;
  const artwork = await requestJson(
    'POST',
    '/api/artworks',
    { code: artworkCode, name: 'U11自动化作品' },
    { authorization: `Bearer ${token}` }
  );
  assert(artwork.status === 200, `artwork create failed: ${artwork.status}`);
  assert(artwork.json && artwork.json.id, 'artwork create missing id');
  const artworkId = artwork.json.id;

  const schemeForm = new FormData();
  schemeForm.append('name', 'U11方案');
  schemeForm.append(
    'layers',
    JSON.stringify([
      { layer: 1, colorCode },
      { layer: 1, colorCode },
    ])
  );
  const scheme = await requestForm('POST', `/api/artworks/${artworkId}/schemes`, schemeForm, {
    authorization: `Bearer ${token}`,
  });
  assert(scheme.status === 200, `scheme create failed: ${scheme.status}`);
  assert(scheme.json && scheme.json.id, 'scheme create missing id');
  const schemeId = scheme.json.id;

  const txtLastModified = Date.now() - 7_200_000;
  const txtForm = new FormData();
  txtForm.append('asset', new Blob(['U11 文档预览测试内容\n第二行'], { type: 'text/plain;charset=utf-8' }), '中文资料测试.txt');
  txtForm.append('asset_last_modified', String(txtLastModified));
  const txtAsset = await requestForm(
    'POST',
    `/api/artworks/${artworkId}/schemes/${schemeId}/assets`,
    txtForm,
    { authorization: `Bearer ${token}` }
  );
  assert(txtAsset.status === 200, `txt asset upload failed: ${txtAsset.status}`);

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['列1', '列2'],
    ['A1', 'B1'],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const xlsxForm = new FormData();
  xlsxForm.append(
    'asset',
    new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    '表格预览.xlsx'
  );
  xlsxForm.append('asset_last_modified', String(Date.now() - 3_600_000));
  const xlsxAsset = await requestForm(
    'POST',
    `/api/artworks/${artworkId}/schemes/${schemeId}/assets`,
    xlsxForm,
    { authorization: `Bearer ${token}` }
  );
  assert(xlsxAsset.status === 200, `xlsx asset upload failed: ${xlsxAsset.status}`);

  return {
    password: updatedPassword,
    artworkId,
    schemeId,
    colorCode,
  };
}

async function runUiSmoke(data) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
    await page.fill('#username', 'admin');
    await page.fill('#password', data.password);
    await page.click('#login-btn');
    await page.waitForURL('**/app', { timeout: 10_000 });

    const artworksTab = page.locator('.tab-switch-group .tab-switch').nth(2);
    await artworksTab.click({ force: true });
    await expectActiveTab(page, 2);

    const artworksPanel = page.locator('.main-container > div').nth(2);
    await artworksPanel.waitFor({ state: 'visible', timeout: 15_000 });
    await artworksPanel.locator('.artworks-page .artwork-bar').first().waitFor({ state: 'visible', timeout: 15_000 });
    await artworksPanel.locator('.scheme-bar .color-actions .el-button--primary').first().click();
    await page.waitForSelector('.scheme-dialog .el-dialog__body');

    const schemeGap = await page.evaluate(() => {
      const input = document.querySelector('.scheme-dialog .inline-scheme-name .scheme-name-input .el-input__wrapper');
      const rightBracket = document.querySelector('.scheme-dialog .inline-scheme-name .scheme-bracket-end');
      if (!input || !rightBracket) return null;
      const inputRect = input.getBoundingClientRect();
      const bracketRect = rightBracket.getBoundingClientRect();
      return Math.round(bracketRect.left - inputRect.right);
    });
    assert(schemeGap !== null && schemeGap <= 16, `scheme name row gap too large: ${schemeGap}`);

    const chineseRow = page
      .locator('.scheme-dialog .scheme-related-item')
      .filter({ hasText: '中文资料测试.txt' })
      .first();
    await chineseRow.waitFor({ timeout: 10_000 });

    const actionButtons = await chineseRow.locator('.scheme-related-actions .el-button').count();
    assert(actionButtons >= 2, `expected 2 action buttons, got ${actionButtons}`);

    const timeLabel = (await chineseRow.locator('.scheme-related-sub').first().textContent()) || '';
    assert(timeLabel.includes('文件时间：') && !timeLabel.includes('未知'), 'asset modified time label invalid');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      chineseRow.locator('.scheme-related-actions .el-button').first().click(),
    ]);
    const downloadName = download.suggestedFilename();
    assert(downloadName.includes('中文资料测试'), `download filename mismatch: ${downloadName}`);

    await chineseRow.locator('.related-asset-card').click();
    await page.waitForSelector('.asset-preview-dialog .asset-preview-text');
    const txtPreview = (await page.locator('.asset-preview-dialog .asset-preview-text').textContent()) || '';
    assert(txtPreview.includes('U11 文档预览测试内容'), 'txt preview content mismatch');
    await page.locator('.asset-preview-dialog .el-dialog__footer .el-button').first().click();

    const tableRow = page
      .locator('.scheme-dialog .scheme-related-item')
      .filter({ hasText: '表格预览.xlsx' })
      .first();
    await tableRow.locator('.related-asset-card').click();
    await page.waitForSelector('.asset-preview-dialog .asset-preview-table');
    const firstTableCell = (await page.locator('.asset-preview-dialog .asset-preview-table td').first().textContent()) || '';
    assert(firstTableCell.includes('列1'), 'xlsx preview table mismatch');
    await page.locator('.asset-preview-dialog .el-dialog__footer .el-button').first().click();

    const duplicateBadgeCount = await page.locator('.scheme-dialog .layer-dup-indicator .dup-badge').count();
    assert(duplicateBadgeCount >= 1, 'duplicate-layer badge not shown');

    const alignmentDelta = await page.evaluate(() => {
      const layerInput = document.querySelector('.scheme-dialog .mapping-table tbody tr .layer-number-input');
      const colorInput = document.querySelector('.scheme-dialog .mapping-table tbody tr .custom-select-wrapper');
      if (!layerInput || !colorInput) return null;
      const layerRect = layerInput.getBoundingClientRect();
      const colorRect = colorInput.getBoundingClientRect();
      return {
        layerTop: Math.round(layerRect.top),
        colorTop: Math.round(colorRect.top),
        delta: Math.round(layerRect.top - colorRect.top),
      };
    });
    assert(
      alignmentDelta !== null && Math.abs(alignmentDelta.delta) <= 4,
      `layer/color input top alignment drift: ${JSON.stringify(alignmentDelta)}`
    );

    const layerNumberVisibility = await page.evaluate(() => {
      const input = document.querySelector('.scheme-dialog .mapping-table tbody tr .layer-number-input input');
      if (!input) return null;
      const rect = input.getBoundingClientRect();
      return {
        value: input.value,
        clientWidth: Math.round(input.clientWidth),
        scrollWidth: Math.round(input.scrollWidth),
        renderedWidth: Math.round(rect.width),
      };
    });
    assert(layerNumberVisibility, 'unable to capture layer-number input');
    assert(/^\d+$/.test(layerNumberVisibility.value), `layer-number value not visible: ${JSON.stringify(layerNumberVisibility)}`);
    assert(
      layerNumberVisibility.clientWidth >= 26 &&
        layerNumberVisibility.scrollWidth <= layerNumberVisibility.clientWidth + 2,
      `layer-number input appears clipped: ${JSON.stringify(layerNumberVisibility)}`
    );

    const mappingWidths = await page.evaluate(() => {
      const table = document.querySelector('.scheme-dialog .mapping-table');
      const firstRow = document.querySelector('.scheme-dialog .mapping-table tbody tr');
      if (!table || !firstRow) return null;
      const cells = firstRow.querySelectorAll('td');
      if (cells.length < 3) return null;
      const tableWidth = Math.round(table.getBoundingClientRect().width);
      const layerWidth = Math.round(cells[0].getBoundingClientRect().width);
      const colorWidth = Math.round(cells[1].getBoundingClientRect().width);
      const actionWidth = Math.round(cells[2].getBoundingClientRect().width);
      return {
        tableWidth,
        layerWidth,
        colorWidth,
        actionWidth,
        colorRatio: Number((colorWidth / Math.max(1, tableWidth)).toFixed(2)),
      };
    });
    assert(mappingWidths, 'unable to capture mapping column widths');
    assert(mappingWidths.layerWidth >= 96, `layer column width too small: ${JSON.stringify(mappingWidths)}`);
    assert(mappingWidths.actionWidth >= 100, `action column width too small: ${JSON.stringify(mappingWidths)}`);
    assert(mappingWidths.colorRatio <= 0.79, `color column still too wide: ${JSON.stringify(mappingWidths)}`);

    const buttonSizing = await page.evaluate(() => {
      const plusBtn = document.querySelector('.scheme-dialog .mapping-table tbody tr .operation-buttons .mapping-action-btn:nth-child(1)');
      const minusBtn = document.querySelector('.scheme-dialog .mapping-table tbody tr .operation-buttons .mapping-action-btn:nth-child(2)');
      const addBtn = document.querySelector('.scheme-dialog .add-button-container .mapping-action-btn');
      if (!plusBtn || !minusBtn || !addBtn) return null;
      const plusRect = plusBtn.getBoundingClientRect();
      const minusRect = minusBtn.getBoundingClientRect();
      const addRect = addBtn.getBoundingClientRect();
      return {
        plusW: Math.round(plusRect.width),
        plusH: Math.round(plusRect.height),
        minusW: Math.round(minusRect.width),
        minusH: Math.round(minusRect.height),
        addW: Math.round(addRect.width),
        addH: Math.round(addRect.height),
      };
    });
    assert(buttonSizing, 'unable to capture mapping button sizing');
    assert(
      buttonSizing.plusW === buttonSizing.minusW &&
        buttonSizing.plusH === buttonSizing.minusH &&
        buttonSizing.plusW === buttonSizing.addW &&
        buttonSizing.plusH === buttonSizing.addH,
      `mapping buttons size mismatch: ${JSON.stringify(buttonSizing)}`
    );

    process.stdout.write(
      [
        `U11_UI_SMOKE_PORT=${PORT}`,
        `U11_UI_SMOKE_DB=${dbFile}`,
        'U11_NAME_ROW_LAYOUT=PASS',
        'U11_ASSET_METADATA_AND_DOWNLOAD=PASS',
        'U11_TXT_PREVIEW=PASS',
        'U11_XLSX_PREVIEW=PASS',
        'U11_LAYER_ALIGNMENT=PASS',
        'U11_LAYER_NUMBER_VISIBILITY=PASS',
        'U11_MAPPING_COLUMN_WIDTH=PASS',
        'U11_ACTION_BUTTON_UNIFORM=PASS',
      ].join('\n') + '\n'
    );
  } finally {
    await browser.close();
  }
}

async function expectActiveTab(page, targetIndex) {
  const active = page.locator('.tab-switch-group .tab-switch.active');
  await active.first().waitFor({ state: 'visible', timeout: 10_000 });
  const index = await active.first().evaluate((element) => {
    if (!element || !element.parentElement) return -1;
    return Array.from(element.parentElement.children).indexOf(element);
  });
  assert(index === targetIndex, `active tab mismatch, expected ${targetIndex}, got ${index}`);
}

async function main() {
  const backendEntry = path.join(__dirname, '..', 'backend', 'server.js');
  const child = spawn(process.execPath, [backendEntry], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      DB_FILE: dbFile,
      AUTH_ENFORCE_WRITES: 'true',
      READ_ONLY_MODE: 'false',
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
    const data = await bootstrapData();
    await runUiSmoke(data);
  } catch (error) {
    process.stderr.write(`U11_UI_SMOKE=FAIL\n${error.message}\n`);
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
      // best effort cleanup
    }
  }
}

main();
