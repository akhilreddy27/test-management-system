const express = require('express');
const router = express.Router();
const testCasesController = require('../controllers/testCasesController');

// GET /api/test-cases - Get all test cases (with optional site filter)
router.get('/', testCasesController.getAllTestCases);

// GET /api/test-cases/site/:site - Get test cases for a specific site
router.get('/site/:site', testCasesController.getTestCasesBySite);

// GET /api/test-cases/cell-types - Get available cell types
router.get('/cell-types', testCasesController.getCellTypes);

// GET /api/test-cases/sites - Get available sites
router.get('/sites', testCasesController.getSites);

module.exports = router;