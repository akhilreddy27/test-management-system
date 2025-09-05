const imageService = require('../services/imageService');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../data/temp'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

class ImageController {
  // Upload image via file
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const imageInfo = await imageService.saveUploadedFile(req.file);
      
      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: imageInfo
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading image',
        error: error.message
      });
    }
  }

  // Upload image via base64 (from camera)
  async uploadBase64Image(req, res) {
    try {
      const { base64Data, originalName } = req.body;
      
      if (!base64Data) {
        return res.status(400).json({
          success: false,
          message: 'No base64 data provided'
        });
      }

      const imageInfo = await imageService.saveBase64Image(base64Data, originalName);
      
      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: imageInfo
      });
    } catch (error) {
      console.error('Error uploading base64 image:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading image',
        error: error.message
      });
    }
  }

  // Get image by ID
  async getImage(req, res) {
    try {
      const { imageId } = req.params;
      const imageInfo = imageService.getImageById(imageId);
      
      if (!imageInfo) {
        return res.status(404).json({
          success: false,
          message: 'Image not found'
        });
      }

      // Send the image file
      res.sendFile(imageInfo.filePath);
    } catch (error) {
      console.error('Error getting image:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving image',
        error: error.message
      });
    }
  }

  // Delete image by ID
  async deleteImage(req, res) {
    try {
      const { imageId } = req.params;
      const deleted = imageService.deleteImageById(imageId);
      
      if (deleted) {
        res.json({
          success: true,
          message: 'Image deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Image not found'
        });
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting image',
        error: error.message
      });
    }
  }

  // List all images
  async listImages(req, res) {
    try {
      const images = imageService.listImages();
      
      res.json({
        success: true,
        data: images
      });
    } catch (error) {
      console.error('Error listing images:', error);
      res.status(500).json({
        success: false,
        message: 'Error listing images',
        error: error.message
      });
    }
  }

  // Get multer upload middleware
  getUploadMiddleware() {
    return upload.single('image');
  }
}

module.exports = new ImageController();
