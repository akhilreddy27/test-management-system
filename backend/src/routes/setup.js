const express = require('express');
const router = express.Router();
const setupController = require('../controllers/setupController');

// POST /api/setup/site - Create site configuration
router.post('/site', setupController.createSiteConfiguration);

// GET /api/setup/sites - Get all sites
router.get('/sites', setupController.getSites);

module.exports = router;