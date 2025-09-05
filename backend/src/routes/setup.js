const express = require('express');
const router = express.Router();
const setupController = require('../controllers/setupController');
const siteInfoController = require('../controllers/siteInfoController');

// POST /api/setup/site - Create site configuration
router.post('/site', setupController.createSiteConfiguration);

// GET /api/setup/sites - Get all sites
router.get('/sites', setupController.getSites);

// GET /api/setup/site-options - Get site options for dropdown
router.get('/site-options', setupController.getSiteOptions);

// GET /api/setup/phases/:siteName - Get phases for a specific site
console.log('Setting up phases route, method type:', typeof setupController.getPhasesForSite);
router.get('/phases/:siteName', setupController.getPhasesForSite);

// Simple test route without parameters
router.get('/phases-test', (req, res) => {
  console.log('Phases test route hit');
  res.json({ message: 'Phases test route working' });
});

// Test route to verify the method exists
router.get('/test-phases', (req, res) => {
  console.log('Test route hit');
  res.json({ message: 'Test route working' });
});

// Site Info routes
// GET /api/setup/site-info - Get all site information
router.get('/site-info', siteInfoController.getSiteInfo);

// POST /api/setup/site-info - Create new site information
router.post('/site-info', siteInfoController.createSiteInfo);

// PUT /api/setup/site-info/:id - Update site information
router.put('/site-info/:id', siteInfoController.updateSiteInfo);

// DELETE /api/setup/site-info/:id - Delete site information
router.delete('/site-info/:id', siteInfoController.deleteSiteInfo);

module.exports = router;