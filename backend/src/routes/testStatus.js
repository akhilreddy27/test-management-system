const express = require('express');
const router = express.Router();
const testStatusController = require('../controllers/testStatusController');

// GET /api/test-status - Get all test status
router.get('/', testStatusController.getAllTestStatus);

// PUT /api/test-status - Update test status
router.put('/', testStatusController.updateTestStatus);

// POST /api/test-status/submit - Submit test results
router.post('/submit', testStatusController.submitTestResults);

// GET /api/test-status/statistics - Get test statistics
router.get('/statistics', testStatusController.getTestStatistics);

module.exports = router; 