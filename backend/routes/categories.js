/* =========================================================
   Module: backend/routes/categories.js
   Responsibility: Color categories route adapter
   Contract: Mount under /api
   Notes: Returns errors as { error: message }
   ========================================================= */

const { createCategoryRouter } = require('./helpers/category-route-factory');

module.exports = createCategoryRouter({
  basePath: 'categories',
  serviceType: 'color',
  codePrefix: 'CT',
  linkedItemLabel: 'colors',
  duplicateCodeMessage: 'Category code already exists.',
});
