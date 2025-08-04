const express = require('express');
const router = express.Router();
const testCasesController = require('../controllers/testCasesController');

// GET /api/test-cases - Get all test cases
router.get('/', testCasesController.getAllTestCases);

// GET /api/test-cases/cell-types - Get available cell types
router.get('/cell-types', testCasesController.getCellTypes);

module.exports = router;