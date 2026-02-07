const fs = require('fs').promises;
const path = require('path');
const montMarteColorQueries = require('../db/queries/mont-marte-colors');
const { db } = require('../db/index');
const { cascadeRenameInFormulas } = require('./formula');

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

function mapDbWriteError(error) {
  const message = error && error.message ? String(error.message) : 'Database error';
  const lower = message.toLowerCase();

  if (lower.includes('constraint') || lower.includes('unique') || lower.includes('duplicate')) {
    throw createError(message, 400, 'DB_CONSTRAINT');
  }

  throw createError(message, 500, 'DB_ERROR');
}

async function safeDeleteUpload(fileName) {
  if (!fileName) return;
  const absolutePath = path.join(__dirname, '..', 'uploads', path.basename(fileName));
  try {
    await fs.unlink(absolutePath);
  } catch {
    // Keep operation successful even if file is already absent.
  }
}

class MontMarteColorService {
  async getAllColors() {
    return montMarteColorQueries.getAllColors();
  }

  async createColor(body, fileName) {
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

    return montMarteColorQueries.getColorById(colorId);
  }

  async updateColor(idValue, body, fileName) {
    const id = parsePositiveId(idValue);
    if (!id) {
      throw createError('Invalid color id.', 400, 'VALIDATION_ERROR');
    }

    const normalized = normalizeWriteInput(body, { requireCategory: false });
    const existing = await montMarteColorQueries.getColorForUpdate(id);
    if (!existing) {
      throw createError('Color not found.', 404, 'NOT_FOUND');
    }

    let imagePath = existing.image_path;
    if (fileName) {
      imagePath = fileName;
    } else if (Object.prototype.hasOwnProperty.call(body, 'existingImagePath')) {
      imagePath = normalizeStringOrNull(body.existingImagePath);
    }

    const finalCategory = normalized.categoryProvided ? normalized.category : existing.category;
    const finalCategoryId = normalized.categoryIdProvided ? normalized.category_id : existing.category_id;

    try {
      await montMarteColorQueries.updateColor(id, {
        name: normalized.name,
        image_path: imagePath,
        supplier_id: normalized.supplier_id,
        purchase_link_id: normalized.purchase_link_id,
        category: finalCategory,
        category_id: finalCategoryId,
      });
    } catch (error) {
      mapDbWriteError(error);
    }

    if (fileName && existing.image_path && existing.image_path !== imagePath) {
      await safeDeleteUpload(existing.image_path);
    }

    let updatedReferences = 0;
    let warn;
    if (existing.name && existing.name !== normalized.name) {
      try {
        updatedReferences = await cascadeRenameInFormulas(db, existing.name, normalized.name);
      } catch {
        warn = 'Formula rename cascade failed.';
      }
    }

    const updated = await montMarteColorQueries.getColorById(id);
    return { ...updated, updatedReferences, warn };
  }

  async deleteColor(idValue) {
    const id = parsePositiveId(idValue);
    if (!id) {
      throw createError('Invalid color id.', 400, 'VALIDATION_ERROR');
    }

    const existing = await montMarteColorQueries.getColorForUpdate(id);
    if (!existing) {
      throw createError('Color not found.', 404, 'NOT_FOUND');
    }

    try {
      await montMarteColorQueries.deleteColor(id);
    } catch (error) {
      mapDbWriteError(error);
    }

    if (existing.image_path) {
      await safeDeleteUpload(existing.image_path);
    }

    return { success: true, message: 'Color deleted successfully.' };
  }
}

module.exports = new MontMarteColorService();
