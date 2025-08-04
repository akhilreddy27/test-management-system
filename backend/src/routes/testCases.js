const express = require('express');
const router = express.Router();
const testCasesController = require('../controllers/testCasesController');

// GET /api/test-cases - Get all test cases
router.get('/', testCasesController.getAllTestCases);

module.exports = router;