/* =========================================================
   Module: backend/services/formula.js
   Responsibility: Utilities for parsing and updating formula strings
   Imports/Relations: Receives a db (sqlite3.Database) instance from callers
   Origin: Extracted from backend/server.js (2025-08), no behavior change intended
   Contract:
     - replaceColorNameInFormula(formula, oldName, newName) -> string
     - cascadeRenameInFormulas(db, oldName, newName) -> Promise<number>
   Notes:
     - Token-level exact match replacement. Amount tokens like "3g/5滴/2ml" are not treated as names.
     - All multi-row writes occur in a single transaction (BEGIN/COMMIT).
   Related: routes that update mont_marte_colors name should call cascadeRenameInFormulas
   ========================================================= */

/**
 * Returns true when token looks like an amount with unit (e.g., 3g, 5滴, 2ml)
 * @param {string} t
 * @returns {boolean}
 */
function isAmountToken(t) {
  return /^[\d.]+[a-zA-Z\u4e00-\u9fa5]+$/.test(String(t || ''));
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
  for (let i = 0; i < parts.length; i++) {
    if (!isAmountToken(parts[i]) && parts[i] === oldName) {
      parts[i] = newName;
      changed = true;
    }
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
            updatedCount++;
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
