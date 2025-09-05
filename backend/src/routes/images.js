const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');

// Upload image via file
router.post('/upload', imageController.getUploadMiddleware(), imageController.uploadImage);

// Upload image via base64 (from camera)
router.post('/upload-base64', imageController.uploadBase64Image);

// Get image by ID
router.get('/:imageId', imageController.getImage);

// Delete image by ID
router.delete('/:imageId', imageController.deleteImage);

// List all images
router.get('/', imageController.listImages);

module.exports = router;
