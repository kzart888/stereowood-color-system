const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CONTAINER_BACKUP_DIR = '/app/backend/backups';
const DEFAULT_LOCAL_DB = path.join(REPO_ROOT, 'backend', 'color_management.db');

function toAbsolutePath(targetPath) {
  if (!targetPath) {
    return null;
  }

  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }

  return path.resolve(REPO_ROOT, targetPath);
}

function resolveDbFile() {
  return toAbsolutePath(process.env.DB_FILE) || DEFAULT_LOCAL_DB;
}

function resolveBackupDir() {
  const fromEnv = toAbsolutePath(process.env.BACKUP_DIR);
  if (fromEnv) {
    return fromEnv;
  }

  if (fs.existsSync(CONTAINER_BACKUP_DIR)) {
    return CONTAINER_BACKUP_DIR;
  }

  return path.join(REPO_ROOT, 'backups');
}

function sidecarFiles(dbFile) {
  return [`${dbFile}-wal`, `${dbFile}-shm`, `${dbFile}-journal`];
}

module.exports = {
  resolveDbFile,
  resolveBackupDir,
  sidecarFiles,
};
