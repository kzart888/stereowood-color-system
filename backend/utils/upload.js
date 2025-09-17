/**
 * Shared factory for disk-based upload handlers.
 * The previous implementation duplicated the same Multer configuration
 * across multiple route files. Centralising the logic keeps file handling
 * consistent and makes future tweaks (e.g. naming strategy) trivial.
 */

const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

function ensureDirectory(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

/**
 * Create a configured Multer instance that stores files under the shared
 * `backend/uploads` directory. A sub directory can be specified when a
 * feature needs its own folder while still reusing the naming strategy.
 *
 * @param {object} [options]
 * @param {string} [options.subDirectory] Optional folder relative to uploads
 * @returns {import('multer').Multer}
 */
function createUploadHandler(options = {}) {
  const { subDirectory } = options;
  const targetDir = subDirectory
    ? path.join(UPLOAD_ROOT, subDirectory)
    : UPLOAD_ROOT;

  ensureDirectory(targetDir);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, targetDir),
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });

  return multer({ storage });
}

module.exports = { createUploadHandler };
