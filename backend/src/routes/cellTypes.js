const express = require('express');
const router = express.Router();
const cellTypesController = require('../controllers/cellTypesController');

// GET /api/cell-types - Get all cell types
router.get('/', cellTypesController.getAllCellTypes);

// GET /api/cell-types/dc-types - Get unique DC Types from site info
router.get('/available-dc-types', cellTypesController.getUniqueDCTypes);

// POST /api/cell-types - Create new cell type
router.post('/', cellTypesController.createCellType);

// GET /api/cell-types/:cellType - Get specific cell type (must be last to avoid conflicts)
router.get('/:cellType', cellTypesController.getCellTypeById);

// PUT /api/cell-types/:cellType - Update cell type
router.put('/:cellType', cellTypesController.updateCellType);

// DELETE /api/cell-types/:cellType - Delete cell type
router.delete('/:cellType', cellTypesController.deleteCellType);

// POST /api/cell-types/cleanup - Clean up cell types file (remove Sub Type column)
router.post('/cleanup', cellTypesController.cleanupCellTypesFile);
router.post('/migrate-test-cases', cellTypesController.migrateTestCasesFile);
router.post('/migrate-test-status', cellTypesController.migrateTestStatusFile);

module.exports = router; 