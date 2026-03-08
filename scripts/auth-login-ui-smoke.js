#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('@playwright/test');

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.AUTH_LOGIN_UI_SMOKE_PORT || process.env.PORT || '19239', 10);
const START_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-auth-login-ui-smoke-'));
const dbFile = path.join(tmpRoot, 'color_management.db');
const baseURL = `http://${HOST}:${PORT}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function request(method, endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path: endpoint,
        method,
        timeout: 10_000,
      },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode || 0));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`Request timeout: ${method} ${endpoint}`)));
    req.end();
  });
}

async function waitForHealth() {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < START_TIMEOUT_MS) {
    try {
      const status = await request('GET', '/health');
      if (status === 200) return;
      lastError = new Error(`/health status ${status}`);
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

  let browser = null;
  try {
    await waitForHealth();

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#username');
    await page.waitForSelector('#password');
    await page.waitForSelector('#login-btn');
    await page.waitForSelector('#apply-btn');

    const hasLegacyRegisterBlock = await page.$('#register-section');
    assert(!hasLegacyRegisterBlock, 'legacy register section should not exist');

    const applyUsername = `ui_apply_${Date.now().toString().slice(-6)}`;
    const applyPassword = 'ApplyStrongPass123';

    await page.fill('#username', applyUsername);
    await page.fill('#password', applyPassword);
    await page.click('#apply-btn');
    await page.waitForTimeout(350);
    const applySuccess = (await page.textContent('#login-success')) || '';
    assert(applySuccess.includes('申请已提交'), 'apply success message mismatch');

    await page.click('#apply-btn');
    await page.waitForTimeout(350);
    const applyDuplicate = (await page.textContent('#login-error')) || '';
    assert(applyDuplicate.includes('账号已存在'), 'duplicate apply message mismatch');

    await page.fill('#username', 'admin');
    await page.fill('#password', 'wrong-password');
    await page.click('#login-btn');
    await page.waitForTimeout(350);
    const wrongPasswordMessage = (await page.textContent('#login-error')) || '';
    assert(wrongPasswordMessage.includes('密码错误'), 'wrong password message mismatch');

    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin');
    await page.click('#login-btn');
    await page.waitForTimeout(350);

    const changeVisible = await page.isVisible('#change-password-section');
    assert(changeVisible, 'change-password section should appear for bootstrap admin');

    await page.fill('#current-password', 'admin');
    await page.fill('#new-password', 'AdminStrongPass123');
    await page.fill('#confirm-password', 'AdminStrongPass123');
    await page.click('#change-password-btn');
    await page.waitForURL('**/app', { timeout: 10_000 });

    process.stdout.write(
      [
        `AUTH_LOGIN_UI_SMOKE_PORT=${PORT}`,
        `AUTH_LOGIN_UI_SMOKE_DB=${dbFile}`,
        'AUTH_LOGIN_UI_SINGLE_FORM=PASS',
        'AUTH_LOGIN_UI_APPLY_FLOW=PASS',
        'AUTH_LOGIN_UI_ERROR_COPY=PASS',
        'AUTH_LOGIN_UI_FORCE_CHANGE=PASS',
      ].join('\n') + '\n'
    );
  } catch (error) {
    process.stderr.write(`AUTH_LOGIN_UI_SMOKE=FAIL\n${error.message}\n`);
    if (logs.length > 0) {
      process.stderr.write('--- backend logs ---\n');
      process.stderr.write(logs.join(''));
      process.stderr.write('\n--- end backend logs ---\n');
    }
    process.exitCode = 1;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    await stopChild();
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // best effort cleanup
    }
  }
}

main();
