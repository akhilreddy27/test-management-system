const express = require('express');
const router = express.Router();
const testCasesController = require('../controllers/testCasesController');

// GET /api/test-cases - Get all test cases (with optional site filter)
router.get('/', testCasesController.getAllTestCases);

// GET /api/test-cases/site/:site - Get test cases for a specific site
router.get('/site/:site', testCasesController.getTestCasesBySite);

// GET /api/test-cases/cell-types - Get available cell types
router.get('/cell-types', testCasesController.getCellTypes);

// GET /api/test-cases/cell-type-configurations - Get cell type configurations
router.get('/cell-type-configurations', testCasesController.getCellTypeConfigurations);

// GET /api/test-cases/sites - Get available sites
router.get('/sites', testCasesController.getSites);

router.get('/configurations', testCasesController.getTestCaseConfigurations);

// POST /api/test-cases - Create a new test case
router.post('/', testCasesController.createTestCase);

// PUT /api/test-cases/:id - Update an existing test case
router.put('/:id', testCasesController.updateTestCase);

// DELETE /api/test-cases/:id - Delete a test case
router.delete('/:id', testCasesController.deleteTestCase);

module.exports = router;