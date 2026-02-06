/* =========================================================
   Module: backend/services/formula.js
   Responsibility: Utilities for parsing and updating formula strings
   Imports/Relations: Receives a db (sqlite3.Database) instance from callers
   Contract:
     - replaceColorNameInFormula(formula, oldName, newName) -> string
     - cascadeRenameInFormulas(db, oldName, newName) -> Promise<number>
   Notes:
     - Token-level exact match replacement.
     - Amount tokens in forms like "10g" and "10 g" are not treated as names.
     - All multi-row writes occur in a single transaction (BEGIN/COMMIT).
   ========================================================= */

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

/**
 * Replace color name tokens in a formula string with a new name.
 * Only exact matches on non-amount tokens are replaced.
 * @param {string} formula
 * @param {string} oldName
 * @param {string} newName
 * @returns {string}
 */
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

/**
 * Cascade rename across all custom_colors.formula, replacing oldName with newName.
 * @param {import('sqlite3').Database} db
 * @param {string} oldName
 * @param {string} newName
 * @returns {Promise<number>} Number of updated rows
 */
function cascadeRenameInFormulas(db, oldName, newName) {
  return new Promise((resolve, reject) => {
    if (!oldName || oldName === newName) return resolve(0);
    db.all('SELECT id, formula FROM custom_colors', [], (err, rows) => {
      if (err) return reject(err);

      let updatedCount = 0;
      db.serialize(() => {
        db.run('BEGIN');
        rows.forEach((row) => {
          const original = String(row.formula || '').trim();
          if (!original) return;
          const next = replaceColorNameInFormula(original, oldName, newName);
          if (next !== original) {
            updatedCount += 1;
            db.run(
              `UPDATE custom_colors
                   SET formula = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
              [next, row.id]
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
  replaceColorNameInFormula,
  cascadeRenameInFormulas,
};
