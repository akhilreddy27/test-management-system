const express = require('express');
const router = express.Router();
const loggingController = require('../controllers/loggingController');

// POST /api/logging/activity - Log frontend activities
router.post('/activity', async (req, res) => {
  try {
    await loggingController.logFrontendActivity(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; 