const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const sqlite3 = require('sqlite3').verbose();

const HOST = '127.0.0.1';
const PORT = Number.parseInt(process.env.A3_DB_DRYRUN_PORT || process.env.PORT || '19129', 10);
const START_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 500;

const sourceDir = path.join(__dirname, '..', 'backend', 'production_db', 'data');
const sourceDb = path.join(sourceDir, 'color_management.db');
const sourceWal = path.join(sourceDir, 'color_management.db-wal');
const sourceShm = path.join(sourceDir, 'color_management.db-shm');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function request(pathname) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path: pathname,
        method: 'GET',
        timeout: 10000,
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (text += chunk));
        res.on('end', () => resolve({ status: res.statusCode, text }));
      }
    );

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`Request timeout: ${pathname}`)));
    req.end();
  });
}

function waitForHealth() {
  const start = Date.now();
  let lastError = null;

  return new Promise(async (resolve, reject) => {
    while (Date.now() - start < START_TIMEOUT_MS) {
      try {
        const res = await request('/health');
        if (res.status === 200) return resolve();
        lastError = new Error(`/health status ${res.status}`);
      } catch (error) {
        lastError = error;
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    reject(lastError || new Error('Backend did not become ready in time'));
  });
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function openDb(file) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function closeDb(db) {
  return new Promise((resolve) => db.close(() => resolve()));
}

async function main() {
  assert(fs.existsSync(sourceDb), `Missing source DB: ${sourceDb}`);
  const hasSourceWal = fs.existsSync(sourceWal);
  const hasSourceShm = fs.existsSync(sourceShm);

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-a3-db-dryrun-'));
  const copiedDb = path.join(tmpRoot, 'color_management.db');

  fs.copyFileSync(sourceDb, copiedDb);
  if (hasSourceWal) {
    fs.copyFileSync(sourceWal, `${copiedDb}-wal`);
  }
  if (hasSourceShm) {
    fs.copyFileSync(sourceShm, `${copiedDb}-shm`);
  }

  const backendEntry = path.join(__dirname, '..', 'backend', 'server.js');
  const child = spawn(process.execPath, [backendEntry], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      DB_FILE: copiedDb,
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
    await stopChild();

    const db = await openDb(copiedDb);
    try {
      const integrity = await dbGet(db, 'PRAGMA integrity_check');
      const quick = await dbGet(db, 'PRAGMA quick_check');
      const fkViolations = await dbAll(db, 'PRAGMA foreign_key_check');

      assert(integrity && integrity.integrity_check === 'ok', 'PRAGMA integrity_check failed');
      assert(quick && quick.quick_check === 'ok', 'PRAGMA quick_check failed');
      assert(fkViolations.length === 0, `PRAGMA foreign_key_check found ${fkViolations.length} violations`);

      const auditTable = await dbGet(
        db,
        "SELECT name FROM sqlite_master WHERE type='table' AND name='audit_events'"
      );
      const changeTable = await dbGet(
        db,
        "SELECT name FROM sqlite_master WHERE type='table' AND name='entity_change_events'"
      );

      assert(Boolean(auditTable), 'audit_events table missing after migration');
      assert(Boolean(changeTable), 'entity_change_events table missing after migration');

      const customHistoryCols = await dbAll(db, 'PRAGMA table_info(custom_colors_history)');
      const schemeHistoryCols = await dbAll(db, 'PRAGMA table_info(color_schemes_history)');
      const customColNames = new Set(customHistoryCols.map((row) => row.name));
      const schemeColNames = new Set(schemeHistoryCols.map((row) => row.name));

      ['change_action', 'actor_id', 'actor_name', 'request_id', 'source'].forEach((name) => {
        assert(customColNames.has(name), `custom_colors_history missing ${name}`);
        assert(schemeColNames.has(name), `color_schemes_history missing ${name}`);
      });

      process.stdout.write(
        [
          `A3_DB_DRYRUN_PORT=${PORT}`,
          `A3_DB_DRYRUN_COPY=${copiedDb}`,
          `A3_SOURCE_WAL_PRESENT=${hasSourceWal}`,
          `A3_SOURCE_SHM_PRESENT=${hasSourceShm}`,
          'A3_MIGRATION_AUDIT_TABLES=OK',
          'A3_MIGRATION_HISTORY_COLUMNS=OK',
          'A3_DB_DRYRUN=PASS',
        ].join('\n') + '\n'
      );
    } finally {
      await closeDb(db);
    }
  } catch (error) {
    process.stderr.write(`A3_DB_DRYRUN=FAIL\n${error.message}\n`);
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
      // best-effort cleanup
    }
  }
}

main();

