const { db } = require('../index');

function getAllColors() {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT c.*, cat.name as category_name, cat.code as category_code
      FROM custom_colors c
      LEFT JOIN color_categories cat ON c.category_id = cat.id
      ORDER BY c.created_at DESC
      `,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getColorById(id) {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT c.*, cat.name as category_name, cat.code as category_code
      FROM custom_colors c
      LEFT JOIN color_categories cat ON c.category_id = cat.id
      WHERE c.id = ?
      `,
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

function getColorByCode(colorCode) {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT c.*, cat.name as category_name, cat.code as category_code
      FROM custom_colors c
      LEFT JOIN color_categories cat ON c.category_id = cat.id
      WHERE c.color_code = ?
      `,
      [colorCode],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

function createColor(colorData) {
  const {
    category_id,
    color_code,
    image_path,
    formula,
    applicable_layers,
    rgb_r,
    rgb_g,
    rgb_b,
    cmyk_c,
    cmyk_m,
    cmyk_y,
    cmyk_k,
    hex_color,
    pantone_coated,
    pantone_uncoated,
    pure_rgb_r,
    pure_rgb_g,
    pure_rgb_b,
    pure_hex_color,
    pure_generated_at,
  } = colorData;

  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO custom_colors (
        category_id, color_code, image_path, formula, applicable_layers,
        rgb_r, rgb_g, rgb_b,
        cmyk_c, cmyk_m, cmyk_y, cmyk_k,
        hex_color, pantone_coated, pantone_uncoated,
        pure_rgb_r, pure_rgb_g, pure_rgb_b, pure_hex_color, pure_generated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        category_id,
        color_code,
        image_path,
        formula,
        applicable_layers,
        rgb_r,
        rgb_g,
        rgb_b,
        cmyk_c,
        cmyk_m,
        cmyk_y,
        cmyk_k,
        hex_color,
        pantone_coated,
        pantone_uncoated,
        pure_rgb_r,
        pure_rgb_g,
        pure_rgb_b,
        pure_hex_color,
        pure_generated_at,
      ],
      function onInsert(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function updateColor(id, colorData, expectedVersion = null) {
  return new Promise((resolve, reject) => {
    const updates = [];
    const values = [];

    if (colorData.category_id !== undefined) {
      updates.push('category_id = ?');
      values.push(colorData.category_id);
    }
    if (colorData.color_code !== undefined) {
      updates.push('color_code = ?');
      values.push(colorData.color_code);
    }
    if (colorData.image_path !== undefined) {
      updates.push('image_path = ?');
      values.push(colorData.image_path);
    }
    if (colorData.formula !== undefined) {
      updates.push('formula = ?');
      values.push(colorData.formula);
    }
    if (colorData.applicable_layers !== undefined) {
      updates.push('applicable_layers = ?');
      values.push(colorData.applicable_layers);
    }

    if (colorData.rgb_r !== undefined) {
      updates.push('rgb_r = ?');
      values.push(colorData.rgb_r);
    }
    if (colorData.rgb_g !== undefined) {
      updates.push('rgb_g = ?');
      values.push(colorData.rgb_g);
    }
    if (colorData.rgb_b !== undefined) {
      updates.push('rgb_b = ?');
      values.push(colorData.rgb_b);
    }
    if (colorData.cmyk_c !== undefined) {
      updates.push('cmyk_c = ?');
      values.push(colorData.cmyk_c);
    }
    if (colorData.cmyk_m !== undefined) {
      updates.push('cmyk_m = ?');
      values.push(colorData.cmyk_m);
    }
    if (colorData.cmyk_y !== undefined) {
      updates.push('cmyk_y = ?');
      values.push(colorData.cmyk_y);
    }
    if (colorData.cmyk_k !== undefined) {
      updates.push('cmyk_k = ?');
      values.push(colorData.cmyk_k);
    }
    if (colorData.hex_color !== undefined) {
      updates.push('hex_color = ?');
      values.push(colorData.hex_color);
    }
    if (colorData.pantone_coated !== undefined) {
      updates.push('pantone_coated = ?');
      values.push(colorData.pantone_coated);
    }
    if (colorData.pantone_uncoated !== undefined) {
      updates.push('pantone_uncoated = ?');
      values.push(colorData.pantone_uncoated);
    }
    if (colorData.pure_rgb_r !== undefined) {
      updates.push('pure_rgb_r = ?');
      values.push(colorData.pure_rgb_r);
    }
    if (colorData.pure_rgb_g !== undefined) {
      updates.push('pure_rgb_g = ?');
      values.push(colorData.pure_rgb_g);
    }
    if (colorData.pure_rgb_b !== undefined) {
      updates.push('pure_rgb_b = ?');
      values.push(colorData.pure_rgb_b);
    }
    if (colorData.pure_hex_color !== undefined) {
      updates.push('pure_hex_color = ?');
      values.push(colorData.pure_hex_color);
    }
    if (colorData.pure_generated_at !== undefined) {
      updates.push('pure_generated_at = ?');
      values.push(colorData.pure_generated_at);
    }

    if (updates.length === 0) {
      resolve(0);
      return;
    }

    updates.push('version = version + 1');
    updates.push('updated_at = CURRENT_TIMESTAMP');

    let where = 'id = ?';
    values.push(id);
    if (expectedVersion !== null && expectedVersion !== undefined) {
      where += ' AND version = ?';
      values.push(expectedVersion);
    }

    const sql = `UPDATE custom_colors SET ${updates.join(', ')} WHERE ${where}`;

    db.run(sql, values, function onUpdate(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

function deleteColor(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM custom_colors WHERE id = ?', [id], function onDelete(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

function archiveColorHistory(colorId, colorData, metadata = {}) {
  const { color_code, image_path, formula, applicable_layers } = colorData;

  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO custom_colors_history
      (custom_color_id, color_code, image_path, formula, applicable_layers,
      pure_rgb_r, pure_rgb_g, pure_rgb_b, pure_hex_color,
      change_action, actor_id, actor_name, request_id, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        colorId,
        color_code,
        image_path,
        formula,
        applicable_layers,
        colorData.pure_rgb_r ?? null,
        colorData.pure_rgb_g ?? null,
        colorData.pure_rgb_b ?? null,
        colorData.pure_hex_color ?? null,
        metadata.changeAction || 'UPDATE',
        metadata.actorId || null,
        metadata.actorName || null,
        metadata.requestId || null,
        metadata.source || 'api',
      ],
      function onArchive(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getColorHistory(colorId) {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT * FROM custom_colors_history
      WHERE custom_color_id = ?
      ORDER BY archived_at DESC
      `,
      [colorId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function updateFormulasWithNewName(oldName, newName, replaceFunc) {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, formula FROM custom_colors', [], (err, rows) => {
      if (err) return reject(err);

      let updatedCount = 0;
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        rows.forEach((row) => {
          const newFormula = replaceFunc(row.formula, oldName, newName);
          if (newFormula !== row.formula) {
            updatedCount += 1;
            db.run(
              `UPDATE custom_colors SET formula = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [newFormula, row.id]
            );
          }
        });
        db.run('COMMIT', (commitErr) => {
          if (commitErr) return reject(commitErr);
          resolve(updatedCount);
        });
      });
    });
  });
}

module.exports = {
  getAllColors,
  getColorById,
  getColorByCode,
  createColor,
  updateColor,
  deleteColor,
  archiveColorHistory,
  getColorHistory,
  updateFormulasWithNewName,
};
