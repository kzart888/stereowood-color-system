const dictionaryQueries = require('../db/queries/dictionaries');
const AuditService = require('../domains/audit/service');

function createError(message, statusCode, code, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  Object.assign(error, extra);
  return error;
}

function parsePositiveId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function normalizeRequiredString(value, fieldName) {
  const normalized = typeof value === 'string' ? value.trim() : String(value || '').trim();
  if (!normalized) {
    throw createError(`${fieldName} is required.`, 400, 'VALIDATION_ERROR');
  }
  return normalized;
}

class DictionaryService {
  async listSuppliers() {
    return dictionaryQueries.listSuppliers();
  }

  async upsertSupplier(nameInput, context = {}) {
    const name = normalizeRequiredString(nameInput, 'name');
    const existing = await dictionaryQueries.findSupplierByName(name);
    if (existing) {
      return existing;
    }
    const created = await dictionaryQueries.createSupplier(name);
    await AuditService.recordEntityChangeSafe({
      entityType: 'supplier',
      entityId: created.id,
      action: 'create',
      before: null,
      after: created,
      summary: 'Created supplier dictionary entry.',
      context,
    });
    return created;
  }

  async deleteSupplier(idInput, context = {}) {
    const id = parsePositiveId(idInput);
    if (!id) {
      throw createError('Invalid supplier id.', 400, 'VALIDATION_ERROR');
    }

    const usage = await dictionaryQueries.countSupplierReferences(id);
    if (usage && usage.cnt > 0) {
      throw createError(`Supplier is used by ${usage.cnt} mont-marte colors.`, 409, 'SUPPLIER_IN_USE', {
        referenceCount: usage.cnt,
      });
    }

    const existing = await dictionaryQueries.findSupplierById(id);
    const result = await dictionaryQueries.deleteSupplier(id);
    if (result.changes > 0) {
      await AuditService.recordEntityChangeSafe({
        entityType: 'supplier',
        entityId: id,
        action: 'delete',
        before: existing,
        after: null,
        summary: 'Deleted supplier dictionary entry.',
        context,
      });
    }
    return { deleted: result.changes > 0 };
  }

  async listPurchaseLinks() {
    return dictionaryQueries.listPurchaseLinks();
  }

  async upsertPurchaseLink(urlInput, context = {}) {
    const url = normalizeRequiredString(urlInput, 'url');
    const existing = await dictionaryQueries.findPurchaseLinkByUrl(url);
    if (existing) {
      return existing;
    }
    const created = await dictionaryQueries.createPurchaseLink(url);
    await AuditService.recordEntityChangeSafe({
      entityType: 'purchase_link',
      entityId: created.id,
      action: 'create',
      before: null,
      after: created,
      summary: 'Created purchase-link dictionary entry.',
      context,
    });
    return created;
  }
}

module.exports = new DictionaryService();
