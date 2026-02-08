/* =========================================================
   Module: backend/routes/mont-marte-categories.js
   Responsibility: Mont-Marte categories route adapter
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   ========================================================= */

const { createCategoryRouter } = require('./helpers/category-route-factory');

module.exports = createCategoryRouter({
  basePath: 'mont-marte-categories',
  serviceType: 'montMarte',
  codePrefix: 'MC',
  linkedItemLabel: 'materials',
  duplicateCodeMessage: 'Category code already exists.',
});
