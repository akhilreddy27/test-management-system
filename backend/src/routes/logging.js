const express = require('express');
const router = express.Router();
const loggingController = require('../controllers/loggingController');
const LoggingMiddleware = require('../middleware/loggingMiddleware');

// Apply logging middleware to all routes
router.use(LoggingMiddleware.logUIChange);

// GET /api/logging/ui-changes - Get all UI change logs with optional filters
router.get('/ui-changes', async (req, res) => {
  try {
    await loggingController.getUIChangeLogs(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/logging/user/:user - Get logs for a specific user
router.get('/user/:user', async (req, res) => {
  try {
    await loggingController.getUserLogs(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/logging/site/:site - Get logs for a specific site
router.get('/site/:site', async (req, res) => {
  try {
    await loggingController.getSiteLogs(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/logging/date-range - Get logs for a specific date range
router.get('/date-range', async (req, res) => {
  try {
    await loggingController.getDateRangeLogs(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/logging/export - Export logs to Excel
router.get('/export', async (req, res) => {
  try {
    await loggingController.exportLogs(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/logging/activity - Log frontend activities
router.post('/activity', async (req, res) => {
  try {
    await loggingController.logFrontendActivity(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; 