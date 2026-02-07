const AMOUNT_TOKEN_RE = /^[\d]+(?:\.[\d]+)?[a-zA-Z\u4e00-\u9fa5%]+$/;
const NUMBER_ONLY_RE = /^[\d]+(?:\.[\d]+)?$/;
const UNIT_ONLY_RE = /^[a-zA-Z\u4e00-\u9fa5%]+$/;

function isCombinedAmountToken(token) {
  return AMOUNT_TOKEN_RE.test(String(token || ''));
}

function isNumberOnlyToken(token) {
  return NUMBER_ONLY_RE.test(String(token || ''));
}

function isUnitOnlyToken(token) {
  return UNIT_ONLY_RE.test(String(token || ''));
}

function replaceColorNameInFormula(formula, oldName, newName) {
  if (!formula || !oldName || oldName === newName) return formula;

  const parts = String(formula).trim().split(/\s+/);
  let changed = false;

  for (let i = 0; i < parts.length; ) {
    const token = parts[i];

    if (isCombinedAmountToken(token)) {
      i += 1;
      continue;
    }

    if (isNumberOnlyToken(token) && isUnitOnlyToken(parts[i + 1])) {
      i += 2;
      continue;
    }

    if (token === oldName) {
      parts[i] = newName;
      changed = true;
    }

    i += 1;
  }

  return changed ? parts.join(' ') : formula;
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function cascadeRenameInFormulasNoTransaction(db, oldName, newName) {
  if (!oldName || oldName === newName) return 0;

  const rows = await dbAll(db, 'SELECT id, formula FROM custom_colors', []);
  let updatedCount = 0;

  for (const row of rows) {
    const original = String(row.formula || '').trim();
    if (!original) continue;

    const next = replaceColorNameInFormula(original, oldName, newName);
    if (next !== original) {
      await dbRun(
        db,
        `UPDATE custom_colors
            SET formula = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [next, row.id]
      );
      updatedCount += 1;
    }
  }

  return updatedCount;
}

async function cascadeRenameInFormulas(db, oldName, newName) {
  await dbRun(db, 'BEGIN');
  try {
    const updatedCount = await cascadeRenameInFormulasNoTransaction(db, oldName, newName);
    await dbRun(db, 'COMMIT');
    return updatedCount;
  } catch (error) {
    try {
      await dbRun(db, 'ROLLBACK');
    } catch {
      // ignore rollback failure
    }
    throw error;
  }
}

module.exports = {
  replaceColorNameInFormula,
  cascadeRenameInFormulas,
  cascadeRenameInFormulasNoTransaction,
};
