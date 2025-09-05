const express = require('express');
const router = express.Router();
const testStatusController = require('../controllers/testStatusController');

// GET /api/test-status - Get all test status
router.get('/', testStatusController.getAllTestStatus);

// GET /api/test-status/test/:testId - Get test status by test ID
router.get('/test/:testId', testStatusController.getTestStatusByTestId);

// PUT /api/test-status - Update test status
router.put('/', testStatusController.updateTestStatus);

// PUT /api/test-status/status - Update test status only
router.put('/status', testStatusController.updateTestStatus);

// PUT /api/test-status/note - Update test note only
router.put('/note', testStatusController.updateNote);

// POST /api/test-status/submit - Submit test results
router.post('/submit', testStatusController.submitTestResults);

// GET /api/test-status/statistics - Get test statistics
router.get('/statistics', testStatusController.getTestStatistics);

module.exports = router; 