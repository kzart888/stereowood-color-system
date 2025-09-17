/**
 * Business logic for Mont Marte raw materials.
 * Previously the route handler mixed SQL, validation and file management in a
 * single monolithic file. Moving the responsibilities here keeps the HTTP
 * layer thin and makes the logic reusable.
 */

const path = require('path');
const fs = require('fs/promises');

const defaultQueries = require('../db/queries/montMarteColors');
const { cascadeRenameInFormulas: defaultCascadeRenameInFormulas } = require('./formula');
const { db: defaultDb } = require('../db');

function serviceError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normaliseCategory(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') {
    return null;
  }
  return trimmed;
}

class MontMarteService {
  constructor(dependencies = {}) {
    const {
      queries = defaultQueries,
      cascadeRenameInFormulas = defaultCascadeRenameInFormulas,
      db = defaultDb,
      uploadRoot = path.join(__dirname, '..', 'uploads'),
    } = dependencies;

    this.queries = queries;
    this.cascadeRenameInFormulas = cascadeRenameInFormulas;
    this.db = db;
    this.uploadRoot = uploadRoot;
  }

  async listColors() {
    return this.queries.getAll();
  }

  async createColor(payload) {
    const name = (payload.name || '').trim();
    const category = normaliseCategory(payload.category);

    if (!name) {
      throw serviceError('颜色名称不能为空', 400);
    }
    if (payload.categoryId == null && !category) {
      throw serviceError('原料类别不能为空', 400);
    }

    const insertPayload = {
      name,
      image_path: payload.imageFilename || null,
      supplier_id: payload.supplierId ?? null,
      purchase_link_id: payload.purchaseLinkId ?? null,
      category,
      category_id: payload.categoryId ?? null,
    };

    const newId = await this.queries.insertColor(insertPayload);
    return this.queries.getById(newId);
  }

  async updateColor(id, payload) {
    const existing = await this.queries.getBasicById(id);
    if (!existing) {
      throw serviceError('颜色不存在', 404);
    }

    const name = (payload.name || '').trim();
    if (!name) {
      throw serviceError('颜色名称不能为空', 400);
    }

    const category = normaliseCategory(payload.category);
    if (payload.categoryId == null && !category) {
      throw serviceError('原料类别不能为空', 400);
    }

    const nextImage = this.resolveNextImage(existing.image_path, payload);

    const updatePayload = {
      name,
      image_path: nextImage,
      supplier_id: payload.supplierId ?? null,
      purchase_link_id: payload.purchaseLinkId ?? null,
      category,
      category_id: payload.categoryId ?? null,
    };

    await this.queries.updateColor(id, updatePayload);

    let updatedReferences = 0;
    let warn;
    if (existing.name && existing.name !== name) {
      try {
        updatedReferences = await this.cascadeRenameInFormulas(this.db, existing.name, name);
      } catch (error) {
        warn = '读取配方失败，未做级联';
      }
    }

    if (payload.uploadedImage && existing.image_path && existing.image_path !== nextImage) {
      await this.discardUpload(existing.image_path);
    }

    if (!payload.uploadedImage && payload.existingImagePath !== undefined && nextImage === null && existing.image_path) {
      await this.discardUpload(existing.image_path);
    }

    const fresh = await this.queries.getById(id);
    return { ...fresh, updatedReferences, warn };
  }

  resolveNextImage(currentImage, payload) {
    if (payload.uploadedImage) {
      return payload.uploadedImage;
    }
    if (payload.existingImagePath !== undefined) {
      const normalised = payload.existingImagePath;
      if (normalised === null || normalised === '') {
        return null;
      }
      return normalised;
    }
    return currentImage;
  }

  async deleteColor(id) {
    const existing = await this.queries.getBasicById(id);
    if (!existing) {
      throw serviceError('颜色不存在', 404);
    }

    const changes = await this.queries.deleteColor(id);
    if (!changes) {
      throw serviceError('颜色不存在', 404);
    }

    await this.discardUpload(existing.image_path);
    return { success: true, message: '颜色删除成功' };
  }

  async discardUpload(fileName) {
    if (!fileName) return;
    const fullPath = path.join(this.uploadRoot, path.basename(fileName));
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        // Ignore deletion errors silently in production paths to avoid leaking stack traces.
      }
    }
  }
}

const montMarteService = new MontMarteService();

module.exports = montMarteService;
module.exports.MontMarteService = MontMarteService;
