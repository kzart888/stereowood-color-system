const express = require('express');
const CategoryService = require('../../domains/categories/service');
const { extractAuditContext } = require('./request-audit-context');
const {
  parseRequiredName,
  buildCategoryCode,
  parseDisplayOrder,
  parsePositiveId,
  parseReorderUpdates,
  mapWriteError,
  sendError,
} = require('./category-route-utils');

function mapCategoryServiceError(res, error, options) {
  if (error && error.code === 'CATEGORY_IN_USE') {
    return sendError(
      res,
      400,
      `Category still has ${error.linkedCount} linked ${options.linkedItemLabel}.`
    );
  }

  if (error && error.code === 'CATEGORY_NOT_FOUND') {
    return sendError(res, 404, 'Category not found.');
  }

  const mapped = mapWriteError(error, options.duplicateCodeMessage);
  return sendError(res, mapped.status, mapped.error);
}

function createCategoryRouter(options) {
  const router = express.Router();

  // GET /api/<basePath>
  router.get(`/${options.basePath}`, async (req, res) => {
    try {
      const rows = await CategoryService.list(options.serviceType);
      return res.json(rows);
    } catch (error) {
      return sendError(res, 500, error.message);
    }
  });

  // POST /api/<basePath>
  router.post(`/${options.basePath}`, async (req, res) => {
    try {
      const normalizedName = parseRequiredName(req.body.name);
      if (!normalizedName) {
        return sendError(res, 400, 'Category name is required.');
      }

      const order = parseDisplayOrder(req.body.display_order);
      if (order === null) {
        return sendError(res, 400, 'display_order must be an integer.');
      }

      const categoryCode = buildCategoryCode(req.body.code, normalizedName, options.codePrefix);
      const created = await CategoryService.create(options.serviceType, {
        code: categoryCode,
        name: normalizedName,
        display_order: order,
      }, extractAuditContext(req));

      return res.json(created);
    } catch (error) {
      return mapCategoryServiceError(res, error, options);
    }
  });

  // PUT /api/<basePath>/reorder
  router.put(`/${options.basePath}/reorder`, async (req, res) => {
    const parseResult = parseReorderUpdates(req.body);
    if (parseResult.error) {
      return sendError(res, 400, parseResult.error);
    }

    const updates = parseResult.value;
    if (updates.length === 0) {
      return res.json({ success: true, message: 'No category order updates provided.' });
    }

    try {
      await CategoryService.reorder(options.serviceType, updates, extractAuditContext(req));
      return res.json({ success: true, message: `Updated ${updates.length} categories.` });
    } catch (error) {
      return mapCategoryServiceError(res, error, options);
    }
  });

  // PUT /api/<basePath>/:id
  router.put(`/${options.basePath}/:id`, async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return sendError(res, 400, 'Invalid category id.');
    }

    const normalizedName = parseRequiredName(req.body.name);
    if (!normalizedName) {
      return sendError(res, 400, 'Category name is required.');
    }

    let code;
    if (req.body.code !== undefined) {
      if (typeof req.body.code !== 'string' || !req.body.code.trim()) {
        return sendError(res, 400, 'Category code cannot be empty when provided.');
      }
      code = req.body.code.trim().toUpperCase();
    }

    try {
      const updated = await CategoryService.update(options.serviceType, id, {
        name: normalizedName,
        code,
      }, extractAuditContext(req));

      if (!updated) {
        return sendError(res, 404, 'Category not found.');
      }

      return res.json({ success: true, message: 'Category updated.' });
    } catch (error) {
      return mapCategoryServiceError(res, error, options);
    }
  });

  // DELETE /api/<basePath>/:id
  router.delete(`/${options.basePath}/:id`, async (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return sendError(res, 400, 'Invalid category id.');
    }

    try {
      await CategoryService.remove(options.serviceType, id, extractAuditContext(req));
      return res.json({ success: true, message: 'Category deleted.' });
    } catch (error) {
      return mapCategoryServiceError(res, error, options);
    }
  });

  return router;
}

module.exports = { createCategoryRouter };
