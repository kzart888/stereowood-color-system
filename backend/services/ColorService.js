const { db } = require('../db/index');
const colorQueries = require('../db/queries/colors');
const AuditService = require('../domains/audit/service');
const UploadImageService = require('./upload-image-service');

const COLOR_ERROR = {
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE: 'DUPLICATE_COLOR_CODE',
  IN_USE: 'COLOR_IN_USE',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  MERGE_INVALID: 'MERGE_INVALID',
  DB_ERROR: 'DB_ERROR',
};

function createColorError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function isConstraintError(error) {
  const message = String(error && error.message ? error.message : '').toLowerCase();
  return message.includes('constraint') || message.includes('foreign key') || message.includes('unique');
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

class ColorService {
  withThumbPath(row) {
    if (!row) return row;
    return {
      ...row,
      image_thumb_path: UploadImageService.resolveAvailableThumbnailName(row.image_path),
    };
  }

  validateRGB(r, g, b) {
    const channels = [
      { key: 'R', value: r },
      { key: 'G', value: g },
      { key: 'B', value: b },
    ];

    channels.forEach((channel) => {
      if (channel.value !== null && channel.value !== undefined) {
        if (!Number.isInteger(channel.value) || channel.value < 0 || channel.value > 255) {
          throw createColorError(
            COLOR_ERROR.VALIDATION,
            `RGB ${channel.key} must be an integer between 0 and 255.`
          );
        }
      }
    });
  }

  validateCMYK(c, m, y, k) {
    const channels = [
      { key: 'C', value: c },
      { key: 'M', value: m },
      { key: 'Y', value: y },
      { key: 'K', value: k },
    ];

    channels.forEach((channel) => {
      if (channel.value !== null && channel.value !== undefined) {
        if (typeof channel.value !== 'number' || channel.value < 0 || channel.value > 100) {
          throw createColorError(
            COLOR_ERROR.VALIDATION,
            `CMYK ${channel.key} must be a number between 0 and 100.`
          );
        }
      }
    });
  }

  validateHEX(hex) {
    if (hex !== null && hex !== undefined && hex !== '') {
      const hexPattern = /^#?[0-9A-Fa-f]{6}$/;
      if (!hexPattern.test(hex)) {
        throw createColorError(COLOR_ERROR.VALIDATION, 'HEX color must be a 6-digit hex value.');
      }
    }
  }

  validateColorData(colorData) {
    if (!colorData) return;

    if ('rgb_r' in colorData || 'rgb_g' in colorData || 'rgb_b' in colorData) {
      this.validateRGB(colorData.rgb_r, colorData.rgb_g, colorData.rgb_b);
    }

    if ('cmyk_c' in colorData || 'cmyk_m' in colorData || 'cmyk_y' in colorData || 'cmyk_k' in colorData) {
      this.validateCMYK(colorData.cmyk_c, colorData.cmyk_m, colorData.cmyk_y, colorData.cmyk_k);
    }

    if ('hex_color' in colorData) {
      this.validateHEX(colorData.hex_color);
    }

    if ('pure_rgb_r' in colorData || 'pure_rgb_g' in colorData || 'pure_rgb_b' in colorData) {
      this.validateRGB(colorData.pure_rgb_r, colorData.pure_rgb_g, colorData.pure_rgb_b);
    }

    if ('pure_hex_color' in colorData) {
      this.validateHEX(colorData.pure_hex_color);
    }
  }

  normalizePureColorPayload(colorData) {
    if (!colorData) return;

    if (colorData.clear_pure_color) {
      colorData.pure_rgb_r = null;
      colorData.pure_rgb_g = null;
      colorData.pure_rgb_b = null;
      colorData.pure_hex_color = null;
      colorData.pure_generated_at = null;
      delete colorData.clear_pure_color;
      return;
    }

    const hasPureField = ['pure_rgb_r', 'pure_rgb_g', 'pure_rgb_b', 'pure_hex_color'].some(
      (key) => key in colorData
    );
    const hasTimestampField = 'pure_generated_at' in colorData;

    if (!hasPureField && !hasTimestampField) {
      return;
    }

    if (!('pure_rgb_r' in colorData)) colorData.pure_rgb_r = null;
    if (!('pure_rgb_g' in colorData)) colorData.pure_rgb_g = null;
    if (!('pure_rgb_b' in colorData)) colorData.pure_rgb_b = null;
    if (!('pure_hex_color' in colorData)) colorData.pure_hex_color = null;

    const hasColor =
      (colorData.pure_hex_color && colorData.pure_hex_color !== '') ||
      [colorData.pure_rgb_r, colorData.pure_rgb_g, colorData.pure_rgb_b].some(
        (v) => v !== null && v !== undefined
      );

    if (hasColor) {
      colorData.pure_generated_at = colorData.pure_generated_at || new Date().toISOString();
    } else if (!hasTimestampField) {
      colorData.pure_generated_at = null;
    }
  }

  async getAllColors() {
    const colors = await colorQueries.getAllColors();
    return colors.map((row) => this.withThumbPath(row));
  }

  async getColorById(id) {
    const color = this.withThumbPath(await colorQueries.getColorById(id));
    if (!color) {
      throw createColorError(COLOR_ERROR.NOT_FOUND, 'Custom color not found.');
    }
    return color;
  }

  async createColor(colorData, context = {}) {
    if (!colorData || !colorData.color_code) {
      throw createColorError(COLOR_ERROR.VALIDATION, 'color_code is required.');
    }

    this.validateColorData(colorData);
    this.normalizePureColorPayload(colorData);

    const existing = await colorQueries.getColorByCode(colorData.color_code);
    if (existing) {
      throw createColorError(COLOR_ERROR.DUPLICATE, 'Color code already exists.');
    }

    try {
      const colorId = await colorQueries.createColor(colorData);
      const created = await this.getColorById(colorId);
      await AuditService.recordEntityChangeSafe({
        entityType: 'custom_color',
        entityId: colorId,
        action: 'create',
        before: null,
        after: created,
        summary: 'Created custom color.',
        context,
      });
      return created;
    } catch (error) {
      if (isConstraintError(error)) {
        throw createColorError(COLOR_ERROR.DUPLICATE, 'Color code already exists.');
      }
      throw createColorError(COLOR_ERROR.DB_ERROR, error.message);
    }
  }

  async updateColor(id, colorData, expectedVersion = null, context = {}) {
    this.validateColorData(colorData);
    this.normalizePureColorPayload(colorData);

    const existing = await colorQueries.getColorById(id);
    if (!existing) {
      throw createColorError(COLOR_ERROR.NOT_FOUND, 'Custom color not found.');
    }

    if (expectedVersion !== null && expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw createColorError(COLOR_ERROR.VERSION_CONFLICT, 'Color has been modified by another request.', {
        expectedVersion,
        actualVersion: existing.version,
        latestData: existing,
        entityType: 'custom_color',
      });
    }

    if (
      colorData.color_code !== undefined &&
      colorData.color_code !== existing.color_code
    ) {
      const codeExists = await colorQueries.getColorByCode(colorData.color_code);
      if (codeExists) {
        throw createColorError(COLOR_ERROR.DUPLICATE, 'Color code already exists.');
      }
    }

    if (Object.keys(colorData).length === 0) {
      return existing;
    }

    const shouldArchive =
      (colorData.formula !== undefined && colorData.formula !== existing.formula) ||
      (colorData.color_code !== undefined && colorData.color_code !== existing.color_code) ||
      (colorData.applicable_layers !== undefined &&
        colorData.applicable_layers !== existing.applicable_layers);

    let changes;
    try {
      changes = await colorQueries.updateColor(id, colorData, expectedVersion);
    } catch (error) {
      if (isConstraintError(error)) {
        throw createColorError(COLOR_ERROR.DUPLICATE, 'Color code already exists.');
      }
      throw createColorError(COLOR_ERROR.DB_ERROR, error.message);
    }

    if (expectedVersion !== null && expectedVersion !== undefined && changes === 0) {
      const latest = await colorQueries.getColorById(id);
      throw createColorError(COLOR_ERROR.VERSION_CONFLICT, 'Color has been modified by another request.', {
        expectedVersion,
        actualVersion: latest ? latest.version : null,
        latestData: latest,
        entityType: 'custom_color',
      });
    }

    if (changes === 0) {
      return existing;
    }

    if (shouldArchive) {
      try {
        await colorQueries.archiveColorHistory(id, existing, {
          changeAction: 'UPDATE',
          actorId: context.actorId,
          actorName: context.actorName,
          requestId: context.requestId,
          source: context.source,
        });
      } catch (error) {
        console.warn('Custom color history archive failed (update):', error.message);
      }
    }

    const updated = await this.getColorById(id);
    await AuditService.recordEntityChangeSafe({
      entityType: 'custom_color',
      entityId: id,
      action: 'update',
      before: existing,
      after: updated,
      summary: 'Updated custom color.',
      context,
    });
    return updated;
  }

  async deleteColor(id, context = {}) {
    const color = await colorQueries.getColorById(id);
    if (!color) {
      throw createColorError(COLOR_ERROR.NOT_FOUND, 'Custom color not found.');
    }

    if (color.image_path) {
      await UploadImageService.deleteUploadAndThumbnail(color.image_path);
    }

    try {
      const changes = await colorQueries.deleteColor(id);
      if (changes === 0) {
        throw createColorError(COLOR_ERROR.NOT_FOUND, 'Custom color not found.');
      }

      try {
        await colorQueries.archiveColorHistory(id, color, {
          changeAction: 'DELETE',
          actorId: context.actorId,
          actorName: context.actorName,
          requestId: context.requestId,
          source: context.source,
        });
      } catch (error) {
        console.warn('Custom color history archive failed (delete):', error.message);
      }

      await AuditService.recordEntityChangeSafe({
        entityType: 'custom_color',
        entityId: id,
        action: 'delete',
        before: color,
        after: null,
        summary: 'Deleted custom color.',
        context,
      });

      return { success: true, deletedId: id };
    } catch (error) {
      if (error.code === COLOR_ERROR.NOT_FOUND) {
        throw error;
      }
      if (isConstraintError(error)) {
        throw createColorError(COLOR_ERROR.IN_USE, 'Color is still referenced by schemes.');
      }
      throw createColorError(COLOR_ERROR.DB_ERROR, error.message);
    }
  }

  async getColorHistory(colorId) {
    const color = await colorQueries.getColorById(colorId);
    if (!color) {
      throw createColorError(COLOR_ERROR.NOT_FOUND, 'Custom color not found.');
    }

    const history = await colorQueries.getColorHistory(colorId);
    return { current: color, history };
  }

  async deleteUploadedImage(imagePath) {
    if (!imagePath) return;
    await UploadImageService.deleteUploadAndThumbnail(imagePath);
  }

  async forceMerge({ keepId, removeIds, signature }, context = {}) {
    if (!keepId || !Array.isArray(removeIds) || removeIds.length === 0) {
      throw createColorError(COLOR_ERROR.MERGE_INVALID, 'Invalid merge payload.');
    }

    const keepRow = await colorQueries.getColorById(keepId);
    if (!keepRow) {
      throw createColorError(COLOR_ERROR.NOT_FOUND, 'Keep color record not found.');
    }

    const placeholders = removeIds.map(() => '?').join(',');
    const removeRows = await dbAll(
      `SELECT * FROM custom_colors WHERE id IN (${placeholders})`,
      removeIds
    );

    if (!removeRows || removeRows.length !== removeIds.length) {
      throw createColorError(COLOR_ERROR.MERGE_INVALID, 'Some removeIds do not exist.');
    }

    if (signature) {
      // Reserved for future signature enforcement.
    }

    await dbRun('BEGIN');
    try {
      const updatedLayersResult = await dbRun(
        `UPDATE scheme_layers SET custom_color_id = ? WHERE custom_color_id IN (${placeholders})`,
        [keepId, ...removeIds]
      );

      for (const row of removeRows) {
        await dbRun(
          `
          INSERT INTO custom_colors_history
          (custom_color_id, color_code, image_path, formula, applicable_layers,
           rgb_r, rgb_g, rgb_b, cmyk_c, cmyk_m, cmyk_y, cmyk_k,
           hex_color, pantone_coated, pantone_uncoated,
           change_action, actor_id, actor_name, request_id, source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            row.id,
            row.color_code,
            row.image_path,
            row.formula,
            row.applicable_layers,
            row.rgb_r,
            row.rgb_g,
            row.rgb_b,
            row.cmyk_c,
            row.cmyk_m,
            row.cmyk_y,
            row.cmyk_k,
            row.hex_color,
            row.pantone_coated,
            row.pantone_uncoated,
            'MERGE_REMOVE',
            context.actorId || null,
            context.actorName || null,
            context.requestId || null,
            context.source || 'api',
          ]
        );
      }

      await dbRun(`DELETE FROM custom_colors WHERE id IN (${placeholders})`, removeIds);

      await dbRun(
        `
        UPDATE color_schemes
           SET updated_at = CURRENT_TIMESTAMP
         WHERE id IN (
           SELECT DISTINCT scheme_id FROM scheme_layers WHERE custom_color_id = ?
         )
        `,
        [keepId]
      );

      await dbRun('COMMIT');

      await AuditService.recordEntityChangeSafe({
        entityType: 'custom_color',
        entityId: keepId,
        action: 'merge',
        before: {
          keep: keepRow,
          removed: removeRows,
        },
        after: {
          keepId,
          removedIds: removeIds,
        },
        summary: 'Merged duplicate custom colors.',
        context,
      });

      return {
        success: true,
        updatedLayers: updatedLayersResult.changes,
        deleted: removeIds.length,
      };
    } catch (error) {
      try {
        await dbRun('ROLLBACK');
      } catch {
        // ignore rollback failure
      }

      if (error && error.code) {
        throw error;
      }
      throw createColorError(COLOR_ERROR.DB_ERROR, error.message);
    }
  }
}

module.exports = new ColorService();









