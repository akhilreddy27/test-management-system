const express = require('express');
const router = express.Router();
const cellHardeningController = require('../controllers/cellHardeningController');

// Get cell hardening data
router.get('/', cellHardeningController.getCellHardeningData);

// Get cell hardening summary
router.get('/summary', cellHardeningController.getCellHardeningSummary);

// Add cell hardening entry
router.post('/', cellHardeningController.addCellHardeningEntry);

// Update cell hardening entry
router.put('/:site/:cellType/:cell/:day', cellHardeningController.updateCellHardeningEntry);

// Delete cell hardening entry
router.delete('/:site/:cellType/:cell/:day', cellHardeningController.deleteCellHardeningEntry);

module.exports = router; 