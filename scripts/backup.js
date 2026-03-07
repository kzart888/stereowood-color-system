#!/usr/bin/env node

/**
 * Create a SQLite backup set for current runtime DB.
 * Copies .db and available sidecar files (.db-wal/.db-shm/.db-journal).
 *
 * Optional env:
 * - DB_FILE: override source db file
 * - BACKUP_DIR: override backup output directory
 */

const fs = require('fs');
const path = require('path');
const { resolveDbFile, resolveBackupDir, sidecarFiles } = require('./db-paths');

function nowStamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

function copyIfExists(source, target) {
  if (!fs.existsSync(source)) {
    return false;
  }
  fs.copyFileSync(source, target);
  return true;
}

function main() {
  const dbFile = resolveDbFile();
  const backupDir = resolveBackupDir();

  if (!fs.existsSync(dbFile)) {
    console.error(`Backup failed: DB file not found: ${dbFile}`);
    process.exit(1);
  }

  fs.mkdirSync(backupDir, { recursive: true });

  const stamp = nowStamp();
  const backupDb = path.join(backupDir, `backup_${stamp}.db`);
  const copied = [];

  fs.copyFileSync(dbFile, backupDb);
  copied.push(backupDb);

  for (const sidecar of sidecarFiles(dbFile)) {
    const suffix = sidecar.replace(dbFile, '');
    const target = `${backupDb}${suffix}`;
    if (copyIfExists(sidecar, target)) {
      copied.push(target);
    }
  }

  console.log('BACKUP_RESULT=PASS');
  console.log(`DB_FILE=${dbFile}`);
  console.log(`BACKUP_DIR=${backupDir}`);
  console.log(`BACKUP_DB=${backupDb}`);
  console.log(`COPIED_COUNT=${copied.length}`);
  for (const file of copied) {
    console.log(`COPIED_FILE=${file}`);
  }
}

main();
