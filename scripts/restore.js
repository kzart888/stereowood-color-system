#!/usr/bin/env node

/**
 * Restore SQLite backup set.
 * Restores .db and optional sidecar files from selected backup in BACKUP_DIR.
 *
 * Optional env:
 * - DB_FILE: override target db file
 * - BACKUP_DIR: override backup source directory
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { resolveDbFile, resolveBackupDir, sidecarFiles } = require('./db-paths');

const dbFile = resolveDbFile();
const backupDir = resolveBackupDir();

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

function listBackups() {
  if (!fs.existsSync(backupDir)) {
    return [];
  }

  return fs
    .readdirSync(backupDir)
    .filter((name) => name.startsWith('backup_') && name.endsWith('.db'))
    .sort()
    .reverse();
}

function removeIfExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
}

function copyIfExists(source, target) {
  if (!fs.existsSync(source)) {
    return false;
  }

  fs.copyFileSync(source, target);
  return true;
}

function backupCurrentDb() {
  if (!fs.existsSync(dbFile)) {
    return null;
  }

  fs.mkdirSync(backupDir, { recursive: true });
  const snapshotDb = path.join(backupDir, `before_restore_${nowStamp()}.db`);
  const copied = [];

  fs.copyFileSync(dbFile, snapshotDb);
  copied.push(snapshotDb);

  for (const sourceSidecar of sidecarFiles(dbFile)) {
    const suffix = sourceSidecar.replace(dbFile, '');
    const targetSidecar = `${snapshotDb}${suffix}`;
    if (copyIfExists(sourceSidecar, targetSidecar)) {
      copied.push(targetSidecar);
    }
  }

  return copied;
}

function restoreBackup(backupName) {
  const sourceDb = path.join(backupDir, backupName);
  if (!fs.existsSync(sourceDb)) {
    throw new Error(`Backup not found: ${sourceDb}`);
  }

  const currentSnapshot = backupCurrentDb();

  removeIfExists(dbFile);
  for (const targetSidecar of sidecarFiles(dbFile)) {
    removeIfExists(targetSidecar);
  }

  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  fs.copyFileSync(sourceDb, dbFile);

  const restored = [dbFile];
  for (const targetSidecar of sidecarFiles(dbFile)) {
    const suffix = targetSidecar.replace(dbFile, '');
    const sourceSidecar = `${sourceDb}${suffix}`;
    if (copyIfExists(sourceSidecar, targetSidecar)) {
      restored.push(targetSidecar);
    }
  }

  return {
    sourceDb,
    restored,
    currentSnapshot,
  };
}

function printBackups(backups) {
  console.log('Available backups:');
  backups.forEach((name, index) => {
    const full = path.join(backupDir, name);
    const stat = fs.statSync(full);
    const sizeMb = (stat.size / 1024 / 1024).toFixed(2);
    console.log(`${index + 1}. ${name} (${sizeMb} MB, ${stat.mtime.toISOString()})`);
  });
}

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  const backups = listBackups();
  if (backups.length === 0) {
    console.error(`Restore failed: no backup_*.db found in ${backupDir}`);
    process.exit(1);
  }

  printBackups(backups);
  console.log(`Target DB: ${dbFile}`);
  console.log(`Backup dir: ${backupDir}`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const picked = await ask(rl, 'Select backup number (0 to cancel): ');
    const index = Number.parseInt(picked, 10);
    if (!Number.isFinite(index) || index === 0) {
      console.log('Restore cancelled.');
      return;
    }

    if (index < 1 || index > backups.length) {
      throw new Error('Invalid backup selection.');
    }

    const selected = backups[index - 1];
    const confirm = await ask(
      rl,
      `Type "yes" to restore ${selected} to ${dbFile}: `
    );

    if (confirm.trim().toLowerCase() !== 'yes') {
      console.log('Restore cancelled.');
      return;
    }

    const result = restoreBackup(selected);
    console.log('RESTORE_RESULT=PASS');
    console.log(`SOURCE_BACKUP=${result.sourceDb}`);
    console.log(`TARGET_DB=${dbFile}`);
    if (result.currentSnapshot && result.currentSnapshot.length > 0) {
      for (const snapshot of result.currentSnapshot) {
        console.log(`PREVIOUS_SNAPSHOT=${snapshot}`);
      }
    }
    for (const restored of result.restored) {
      console.log(`RESTORED_FILE=${restored}`);
    }
  } catch (error) {
    console.error(`RESTORE_RESULT=FAIL`);
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
