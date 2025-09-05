const express = require('express');
const router = express.Router();
const siteInfoController = require('../controllers/siteInfoController');

// Get all site information
router.get('/', siteInfoController.getSiteInfo);

// Create new site information
router.post('/', siteInfoController.createSiteInfo);

// Update site information
router.put('/:id', siteInfoController.updateSiteInfo);

// Delete site information
router.delete('/:id', siteInfoController.deleteSiteInfo);

module.exports = router;
