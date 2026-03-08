const path = require('path');

const DOC_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'txt', 'md']);
const MOJIBAKE_HINT_RE = /[ÃÂâæçèéêëìíîïðñòóôõöùúûüýþÿ]/;
const CJK_RE = /[\u3400-\u9FFF]/g;

function detectExtension(value) {
  const extension = String(path.extname(String(value || '')) || '')
    .replace('.', '')
    .toLowerCase();
  return extension;
}

function cjkScore(value) {
  const text = String(value || '');
  const matched = text.match(CJK_RE);
  return matched ? matched.length : 0;
}

function tryRecoverMojibakeLatin1(value) {
  const raw = String(value || '');
  if (!raw) {
    return raw;
  }

  const decoded = Buffer.from(raw, 'latin1').toString('utf8');
  if (!decoded || decoded === raw || decoded.includes('\uFFFD')) {
    return raw;
  }

  const rawScore = cjkScore(raw);
  const decodedScore = cjkScore(decoded);
  if (decodedScore > rawScore) {
    return decoded;
  }

  if (MOJIBAKE_HINT_RE.test(raw) && decodedScore > 0) {
    return decoded;
  }

  return raw;
}

function normalizeUploadedOriginalName(fileName) {
  const input = String(fileName || '').trim();
  if (!input) {
    return '';
  }

  const recovered = tryRecoverMojibakeLatin1(input);
  return recovered.slice(0, 255);
}

function normalizeSourceModifiedAtInput(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    const byTimestamp = new Date(numericValue);
    if (!Number.isNaN(byTimestamp.getTime())) {
      return byTimestamp.toISOString();
    }
  }

  const byDate = new Date(String(value));
  if (Number.isNaN(byDate.getTime())) {
    return null;
  }
  return byDate.toISOString();
}

function resolveAssetFileTypeLabel(asset = {}) {
  const mimeType = String(asset.mime_type || asset.mimeType || '').toLowerCase();
  if (mimeType.startsWith('image/')) {
    return '图片';
  }

  const extension = detectExtension(
    asset.original_name || asset.originalName || asset.file_path || asset.filePath || ''
  );
  if (!extension) {
    return '文件';
  }

  if (extension === 'txt') return 'TXT 文本';
  if (extension === 'md') return 'Markdown 文档';
  if (extension === 'doc') return 'Word 文档 (.doc)';
  if (extension === 'docx') return 'Word 文档 (.docx)';
  if (extension === 'xls') return 'Excel 表格 (.xls)';
  if (extension === 'xlsx') return 'Excel 表格 (.xlsx)';
  if (DOC_EXTENSIONS.has(extension)) return extension.toUpperCase();
  return extension.toUpperCase();
}

module.exports = {
  detectExtension,
  normalizeUploadedOriginalName,
  normalizeSourceModifiedAtInput,
  resolveAssetFileTypeLabel,
};

