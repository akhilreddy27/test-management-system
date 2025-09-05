const excelService = require('../services/excelService');
const path = require('path');

const SITE_INFO_FILE = path.join(__dirname, '../../data/site_info.xlsx');

class SiteInfoController {
  async getSiteInfo(req, res) {
    try {
      const data = await excelService.readExcel(SITE_INFO_FILE);
      
      // Transform data to include IDs and proper field names
      const siteInfoList = data.map((row, index) => ({
        id: index + 1,
        network: row['Network'] || '',
        dcType: row['DC Type'] || '',
        subType: row['Sub Type'] || '',
        dcNumber: row['DC Number'] || '',
        city: row['City'] || '',
        state: row['State'] || ''
      }));

      res.json({
        success: true,
        data: siteInfoList
      });
    } catch (error) {
      console.error('Error reading site info:', error);
      res.status(500).json({
        success: false,
        message: 'Error reading site information',
        error: error.message
      });
    }
  }

  async createSiteInfo(req, res) {
    try {
      const { network, dcType, subType, dcNumber, city, state } = req.body;

      // Validate required fields
      if (!network || !dcType || !subType || !dcNumber || !city || !state) {
        return res.status(400).json({
          success: false,
          message: 'Network, DC Type, Sub Type, DC Number, City, and State are required'
        });
      }

      // Read existing data
      let existingData = [];
      try {
        existingData = await excelService.readExcel(SITE_INFO_FILE);
      } catch (error) {
        // File might not exist yet, that's okay
        console.log('Site info file does not exist yet, creating new one');
      }

      // Add new site info
      const newSiteInfo = {
        'Network': network,
        'DC Type': dcType,
        'Sub Type': subType,
        'DC Number': dcNumber,
        'City': city,
        'State': state
      };

      existingData.push(newSiteInfo);

      // Write back to Excel
      await excelService.writeExcel(SITE_INFO_FILE, existingData, ['Network', 'DC Type', 'Sub Type', 'DC Number', 'City', 'State']);

      res.json({
        success: true,
        message: 'Site information created successfully',
        data: {
          id: existingData.length,
          network,
          dcType,
          subType,
          dcNumber,
          city,
          state
        }
      });
    } catch (error) {
      console.error('Error creating site info:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating site information',
        error: error.message
      });
    }
  }

  async updateSiteInfo(req, res) {
    try {
      const { id } = req.params;
      const { network, dcType, subType, dcNumber, city, state } = req.body;

      // Validate required fields
      if (!network || !dcType || !subType || !dcNumber || !city || !state) {
        return res.status(400).json({
          success: false,
          message: 'Network, DC Type, Sub Type, DC Number, City, and State are required'
        });
      }

      // Read existing data
      const existingData = await excelService.readExcel(SITE_INFO_FILE);
      const rowIndex = parseInt(id) - 1;

      if (rowIndex < 0 || rowIndex >= existingData.length) {
        return res.status(404).json({
          success: false,
          message: 'Site information not found'
        });
      }

      // Update the row
      existingData[rowIndex] = {
        'Network': network,
        'DC Type': dcType,
        'Sub Type': subType,
        'DC Number': dcNumber,
        'City': city,
        'State': state
      };

      // Write back to Excel
      await excelService.writeExcel(SITE_INFO_FILE, existingData, ['Network', 'DC Type', 'Sub Type', 'DC Number', 'City', 'State']);

      res.json({
        success: true,
        message: 'Site information updated successfully',
        data: {
          id: parseInt(id),
          network,
          dcType,
          subType,
          dcNumber,
          city,
          state
        }
      });
    } catch (error) {
      console.error('Error updating site info:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating site information',
        error: error.message
      });
    }
  }

  async deleteSiteInfo(req, res) {
    try {
      const { id } = req.params;

      // Read existing data
      const existingData = await excelService.readExcel(SITE_INFO_FILE);
      const rowIndex = parseInt(id) - 1;

      if (rowIndex < 0 || rowIndex >= existingData.length) {
        return res.status(404).json({
          success: false,
          message: 'Site information not found'
        });
      }

      // Remove the row
      existingData.splice(rowIndex, 1);

      // Write back to Excel
      await excelService.writeExcel(SITE_INFO_FILE, existingData, ['Network', 'DC Type', 'Sub Type', 'DC Number', 'City', 'State']);

      res.json({
        success: true,
        message: 'Site information deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting site info:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting site information',
        error: error.message
      });
    }
  }
}

module.exports = new SiteInfoController();
