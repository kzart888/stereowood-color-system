const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const DEFAULT_THUMB_SIZE = 256;

function getUploadsDir() {
  return path.join(__dirname, '..', 'uploads');
}

function normalizeUploadName(filePath) {
  if (!filePath) return null;
  return path.basename(String(filePath));
}

function buildThumbnailName(filePath, size = DEFAULT_THUMB_SIZE) {
  const normalized = normalizeUploadName(filePath);
  if (!normalized) return null;
  const ext = path.extname(normalized);
  const base = ext ? normalized.slice(0, -ext.length) : normalized;
  return `${base}.thumb${size}.jpg`;
}

function isImageFile(file = {}) {
  const mime = String(file.mimetype || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  const ext = String(path.extname(file.originalname || file.filename || file.file_path || '') || '').toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.svg'].includes(ext);
}

function isImageMimeOrPath(mimeType, filePath) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  const ext = String(path.extname(filePath || '') || '').toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.svg'].includes(ext);
}

async function ensureImageThumbnail(filePath, options = {}) {
  const size = Number.isInteger(options.size) ? options.size : DEFAULT_THUMB_SIZE;
  const normalized = normalizeUploadName(filePath);
  if (!normalized) return null;

  const uploadsDir = getUploadsDir();
  const sourcePath = path.join(uploadsDir, normalized);
  const thumbnailName = buildThumbnailName(normalized, size);
  const thumbnailPath = path.join(uploadsDir, thumbnailName);

  try {
    await sharp(sourcePath)
      .rotate()
      .resize(size, size, {
        fit: 'cover',
        position: 'attention',
        kernel: sharp.kernel.lanczos3,
      })
      .sharpen(0.6)
      .jpeg({
        quality: 86,
        mozjpeg: true,
        chromaSubsampling: '4:4:4',
      })
      .toFile(thumbnailPath);
    return thumbnailName;
  } catch (error) {
    console.warn('[upload-image-service] thumbnail generation failed:', normalized, error.message);
    return null;
  }
}

async function ensureThumbnailForUpload(file, options = {}) {
  if (!file || !file.filename || !isImageFile(file)) {
    return null;
  }
  return ensureImageThumbnail(file.filename, options);
}

async function deleteUploadAndThumbnail(filePath, options = {}) {
  const size = Number.isInteger(options.size) ? options.size : DEFAULT_THUMB_SIZE;
  const normalized = normalizeUploadName(filePath);
  if (!normalized) return;
  const uploadsDir = getUploadsDir();
  const thumbnailName = buildThumbnailName(normalized, size);
  const candidates = [normalized, thumbnailName];

  for (const name of candidates) {
    if (!name) continue;
    try {
      await fs.unlink(path.join(uploadsDir, name));
    } catch {
      // best-effort cleanup
    }
  }
}

module.exports = {
  DEFAULT_THUMB_SIZE,
  normalizeUploadName,
  buildThumbnailName,
  isImageFile,
  isImageMimeOrPath,
  ensureImageThumbnail,
  ensureThumbnailForUpload,
  deleteUploadAndThumbnail,
};
