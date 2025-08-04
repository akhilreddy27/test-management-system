const express = require('express');
const router = express.Router();
const testStatusController = require('../controllers/testStatusController');

// GET /api/test-status - Get all test status entries
router.get('/', testStatusController.getAllTestStatus);

// PUT /api/test-status - Update a single test status
router.put('/', testStatusController.updateTestStatus);

// GET /api/test-status/statistics - Get test statistics
router.get('/statistics', testStatusController.getTestStatistics);

module.exports = router;