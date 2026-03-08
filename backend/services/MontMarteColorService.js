const { db } = require('../db/index');
const montMarteColorQueries = require('../db/queries/mont-marte-colors');
const { cascadeRenameInFormulasNoTransaction } = require('./formula');
const AuditService = require('../domains/audit/service');
const UploadImageService = require('./upload-image-service');

function createError(message, statusCode, code, extraFields = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  Object.assign(error, extraFields);
  return error;
}

function parsePositiveId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function parseOptionalId(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return { provided: false, value: null };
  }
  const parsed = parsePositiveId(value);
  if (!parsed) {
    throw createError(`${fieldName} must be a positive integer when provided.`, 400, 'VALIDATION_ERROR');
  }
  return { provided: true, value: parsed };
}

function normalizeStringOrNull(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function parseOptionalVersion(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw createError('version must be a non-negative integer.', 400, 'VALIDATION_ERROR');
  }
  return parsed;
}

function isConstraintError(error) {
  const message = String(error && error.message ? error.message : '').toLowerCase();
  return message.includes('constraint') || message.includes('unique') || message.includes('foreign key');
}

function normalizeWriteInput(body, options = {}) {
  const requireCategory = options.requireCategory !== false;
  const name = normalizeStringOrNull(body.name);
  if (!name) {
    throw createError('Color name is required.', 400, 'VALIDATION_ERROR');
  }

  const supplierIdResult = parseOptionalId(body.supplier_id, 'supplier_id');
  const purchaseLinkIdResult = parseOptionalId(body.purchase_link_id, 'purchase_link_id');
  const categoryIdResult = parseOptionalId(body.category_id, 'category_id');
  const category = normalizeStringOrNull(body.category);

  if (requireCategory && !categoryIdResult.value && !category) {
    throw createError('Either category or category_id is required.', 400, 'VALIDATION_ERROR');
  }

  return {
    name,
    supplier_id: supplierIdResult.value,
    purchase_link_id: purchaseLinkIdResult.value,
    category_id: categoryIdResult.value,
    category,
    categoryProvided: Object.prototype.hasOwnProperty.call(body, 'category'),
    categoryIdProvided: Object.prototype.hasOwnProperty.call(body, 'category_id'),
  };
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

async function runInTransaction(work) {
  await dbRun('BEGIN');
  try {
    const result = await work();
    await dbRun('COMMIT');
    return result;
  } catch (error) {
    try {
      await dbRun('ROLLBACK');
    } catch {
      // ignore rollback failure
    }
    throw error;
  }
}

function mapDbWriteError(error) {
  if (error && error.code && error.statusCode) {
    throw error;
  }

  const message = error && error.message ? String(error.message) : 'Database error';
  if (isConstraintError(error)) {
    throw createError(message, 400, 'DB_CONSTRAINT');
  }

  throw createError(message, 500, 'DB_ERROR');
}

async function safeDeleteUpload(fileName) {
  await UploadImageService.deleteUploadAndThumbnail(fileName);
}

function withThumbPath(row) {
  if (!row) return row;
  return {
    ...row,
    image_thumb_path: UploadImageService.resolveAvailableThumbnailName(row.image_path),
  };
}

class MontMarteColorService {
  async getAllColors() {
    const rows = await montMarteColorQueries.getAllColors();
    return rows.map((row) => withThumbPath(row));
  }

  async createColor(body, fileName, context = {}) {
    const normalized = normalizeWriteInput(body, { requireCategory: true });

    let colorId;
    try {
      colorId = await montMarteColorQueries.createColor({
        ...normalized,
        image_path: fileName || null,
      });
    } catch (error) {
      mapDbWriteError(error);
    }

    const created = withThumbPath(await montMarteColorQueries.getColorById(colorId));
    await AuditService.recordEntityChangeSafe({
      entityType: 'mont_marte_color',
      entityId: colorId,
      action: 'create',
      before: null,
      after: created,
      summary: 'Created Mont-Marte color.',
      context,
    });
    return created;
  }

  async updateColor(idValue, body, fileName, expectedVersion = null, context = {}) {
    const id = parsePositiveId(idValue);
    if (!id) {
      throw createError('Invalid color id.', 400, 'VALIDATION_ERROR');
    }

    const normalized = normalizeWriteInput(body, { requireCategory: false });
    const existing = await montMarteColorQueries.getColorForUpdate(id);
    if (!existing) {
      throw createError('Color not found.', 404, 'NOT_FOUND');
    }

    const normalizedExpectedVersion = parseOptionalVersion(expectedVersion);
    if (normalizedExpectedVersion !== null && existing.version !== normalizedExpectedVersion) {
      const latest = await montMarteColorQueries.getColorById(id);
      throw createError('Color has been modified by another request.', 409, 'VERSION_CONFLICT', {
        expectedVersion: normalizedExpectedVersion,
        actualVersion: latest ? latest.version : existing.version,
        latestData: latest || existing,
        entityType: 'mont_marte_color',
      });
    }

    let imagePath = existing.image_path;
    if (fileName) {
      imagePath = fileName;
    } else if (Object.prototype.hasOwnProperty.call(body, 'existingImagePath')) {
      imagePath = normalizeStringOrNull(body.existingImagePath);
    }

    const finalCategory = normalized.categoryProvided ? normalized.category : existing.category;
    const finalCategoryId = normalized.categoryIdProvided ? normalized.category_id : existing.category_id;

    let updatedReferences = 0;

    try {
      await runInTransaction(async () => {
        const changes = await montMarteColorQueries.updateColor(id, {
          name: normalized.name,
          image_path: imagePath,
          supplier_id: normalized.supplier_id,
          purchase_link_id: normalized.purchase_link_id,
          category: finalCategory,
          category_id: finalCategoryId,
        }, normalizedExpectedVersion);

        if (changes === 0) {
          if (normalizedExpectedVersion !== null) {
            const latest = await montMarteColorQueries.getColorById(id);
            throw createError('Color has been modified by another request.', 409, 'VERSION_CONFLICT', {
              expectedVersion: normalizedExpectedVersion,
              actualVersion: latest ? latest.version : null,
              latestData: latest,
              entityType: 'mont_marte_color',
            });
          }
          throw createError('Color not found.', 404, 'NOT_FOUND');
        }

        if (existing.name && existing.name !== normalized.name) {
          updatedReferences = await cascadeRenameInFormulasNoTransaction(db, existing.name, normalized.name);
        }
      });
    } catch (error) {
      mapDbWriteError(error);
    }

    if (fileName && existing.image_path && existing.image_path !== imagePath) {
      await safeDeleteUpload(existing.image_path);
    }

    const updated = withThumbPath(await montMarteColorQueries.getColorById(id));
    await AuditService.recordEntityChangeSafe({
      entityType: 'mont_marte_color',
      entityId: id,
      action: 'update',
      before: existing,
      after: { ...updated, updatedReferences },
      summary: 'Updated Mont-Marte color.',
      context,
    });
    return { ...updated, updatedReferences };
  }

  async deleteColor(idValue, context = {}) {
    const id = parsePositiveId(idValue);
    if (!id) {
      throw createError('Invalid color id.', 400, 'VALIDATION_ERROR');
    }

    const existing = await montMarteColorQueries.getColorForUpdate(id);
    if (!existing) {
      throw createError('Color not found.', 404, 'NOT_FOUND');
    }

    try {
      const changes = await montMarteColorQueries.deleteColor(id);
      if (changes === 0) {
        throw createError('Color not found.', 404, 'NOT_FOUND');
      }
    } catch (error) {
      mapDbWriteError(error);
    }

    if (existing.image_path) {
      await safeDeleteUpload(existing.image_path);
    }

    await AuditService.recordEntityChangeSafe({
      entityType: 'mont_marte_color',
      entityId: id,
      action: 'delete',
      before: existing,
      after: null,
      summary: 'Deleted Mont-Marte color.',
      context,
    });

    return { success: true, message: 'Color deleted successfully.' };
  }
}

module.exports = new MontMarteColorService();
