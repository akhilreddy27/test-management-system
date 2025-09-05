const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ImageService {
  constructor() {
    this.imagesPath = path.join(__dirname, '../../data/images');
    this.ensureImagesDirectory();
  }

  ensureImagesDirectory() {
    if (!fs.existsSync(this.imagesPath)) {
      fs.mkdirSync(this.imagesPath, { recursive: true });
    }
  }

  // Generate unique filename for image
  generateImageId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Save base64 image to file system
  async saveBase64Image(base64Data, originalName = 'image') {
    try {
      // Extract the base64 data (remove data:image/jpeg;base64, prefix)
      const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Generate unique filename
      const imageId = this.generateImageId();
      const extension = this.getExtensionFromBase64(base64Data);
      const filename = `${imageId}${extension}`;
      const filePath = path.join(this.imagesPath, filename);

      // Save the image file
      fs.writeFileSync(filePath, base64Image, 'base64');

      // Return the image reference
      return {
        imageId,
        filename,
        url: `/api/images/${imageId}`,
        filePath
      };
    } catch (error) {
      console.error('Error saving base64 image:', error);
      throw new Error('Failed to save image');
    }
  }

  // Save uploaded file
  async saveUploadedFile(file) {
    try {
      const imageId = this.generateImageId();
      const extension = path.extname(file.originalname);
      const filename = `${imageId}${extension}`;
      const filePath = path.join(this.imagesPath, filename);

      // Move the uploaded file to our images directory
      fs.renameSync(file.path, filePath);

      return {
        imageId,
        filename,
        url: `/api/images/${imageId}`,
        filePath
      };
    } catch (error) {
      console.error('Error saving uploaded file:', error);
      throw new Error('Failed to save uploaded file');
    }
  }

  // Get image by ID
  getImageById(imageId) {
    try {
      const files = fs.readdirSync(this.imagesPath);
      const imageFile = files.find(file => file.startsWith(imageId));
      
      if (!imageFile) {
        return null;
      }

      const filePath = path.join(this.imagesPath, imageFile);
      return {
        imageId,
        filename: imageFile,
        filePath,
        url: `/api/images/${imageId}`
      };
    } catch (error) {
      console.error('Error getting image by ID:', error);
      return null;
    }
  }

  // Delete image by ID
  deleteImageById(imageId) {
    try {
      const files = fs.readdirSync(this.imagesPath);
      const imageFile = files.find(file => file.startsWith(imageId));
      
      if (imageFile) {
        const filePath = path.join(this.imagesPath, imageFile);
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  // Get extension from base64 data URL
  getExtensionFromBase64(base64Data) {
    const match = base64Data.match(/^data:image\/([a-z]+);base64,/);
    if (match) {
      const format = match[1];
      return `.${format}`;
    }
    return '.jpg'; // default to jpg
  }

  // List all images
  listImages() {
    try {
      const files = fs.readdirSync(this.imagesPath);
      return files.map(filename => {
        const imageId = filename.split('.')[0];
        return {
          imageId,
          filename,
          url: `/api/images/${imageId}`,
          filePath: path.join(this.imagesPath, filename)
        };
      });
    } catch (error) {
      console.error('Error listing images:', error);
      return [];
    }
  }
}

module.exports = new ImageService();
