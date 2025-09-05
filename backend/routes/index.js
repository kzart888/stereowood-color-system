/* =========================================================
   Module: backend/routes/index.js
   Responsibility: Aggregate API routes and export a single Router
   Imports/Relations: Mounts categories, dictionaries, mont-marte-colors, custom-colors, artworks
   Origin: New for Stage E cleanup (2025-08)
   Contract: server.js should `app.use('/api', router)`
   Notes: Order is not critical; routes don’t overlap
   Related: server.js
   ========================================================= */

const express = require('express');
const router = express.Router();

// Mount each route module
// Note: Each route file already defines its full path (e.g., /custom-colors)
// So we mount them at the root level here
router.use(require('./categories'));
router.use(require('./mont-marte-categories'));
router.use(require('./dictionaries'));
router.use(require('./mont-marte-colors'));
router.use(require('./custom-colors'));
router.use(require('./artworks'));

module.exports = router;
