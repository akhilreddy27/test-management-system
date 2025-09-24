const excelService = require('../services/excelService');
const LoggingMiddleware = require('../middleware/loggingMiddleware');

class CellTypesController {

  // New method to get unique DC Types from site info
  async getUniqueDCTypes(req, res) {
    try {
      console.log('Getting unique DC Types...');
      const siteInfo = excelService.readSiteInfo();
      console.log('Site info loaded:', siteInfo);
      
      // Get unique DC Types from site info
      const dcTypes = [...new Set(siteInfo.map(site => site['DC_TYPE']).filter(Boolean))].sort();
      console.log('Extracted DC Types:', dcTypes);
      
      res.json({
        success: true,
        data: dcTypes,
        count: dcTypes.length
      });
    } catch (error) {
      console.error('Error getting unique DC Types:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting unique DC Types',
        error: error.message
      });
    }
  }

  async getAllCellTypes(req, res) {
    try {
      const cellTypes = excelService.readCellTypes();
      res.json({
        success: true,
        data: cellTypes,
        count: cellTypes.length
      });
    } catch (error) {
      console.error('Error getting cell types:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting cell types',
        error: error.message
      });
    }
  }

  async getCellTypeById(req, res) {
    try {
      const { cellType } = req.params;
      const cellTypes = excelService.readCellTypes();
      const foundCellType = cellTypes.find(ct => ct.cellType === cellType);
      
      if (!foundCellType) {
        return res.status(404).json({
          success: false,
          message: 'Cell type not found'
        });
      }

      res.json({
        success: true,
        data: foundCellType
      });
    } catch (error) {
      console.error('Error getting cell type:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting cell type',
        error: error.message
      });
    }
  }

  async createCellType(req, res) {
    try {
      const cellTypeData = req.body;
      
      // Validate required fields
      if (!cellTypeData.cellType || !cellTypeData.cellType.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Cell Type is required'
        });
      }

      const existingCellTypes = excelService.readCellTypes();
      const existingCellType = existingCellTypes.find(ct => ct.cellType === cellTypeData.cellType);
      
      if (existingCellType) {
        return res.status(400).json({
          success: false,
          message: 'Cell type already exists'
        });
      }

      // Prepare the new cell type data for Excel format
      const newCellType = {
        cellType: cellTypeData.cellType,
        dcType: cellTypeData.dcType || '',
        hasMultipleDriveways: cellTypeData.hasMultipleDriveways || false,
        numberOfDriveways: cellTypeData.hasMultipleDriveways ? cellTypeData.numberOfDriveways : 1,
        drivewayTypes: cellTypeData.drivewayTypes || [],
        description: cellTypeData.description || '',
        status: cellTypeData.status || 'ACTIVE'
      };

      // Add to existing cell types
      const updatedCellTypes = [...existingCellTypes, newCellType];
      
      // Write back to Excel
      excelService.writeCellTypes(updatedCellTypes);

      LoggingMiddleware.logAction(
        'CREATE_CELL_TYPE',
        `Created new cell type: ${cellTypeData.cellType}`,
        req
      );

      res.json({
        success: true,
        message: 'Cell type created successfully',
        data: newCellType
      });
    } catch (error) {
      console.error('Error creating cell type:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating cell type',
        error: error.message
      });
    }
  }

  async updateCellType(req, res) {
    try {
      const { cellType } = req.params;
      const cellTypeData = req.body;
      
      const existingCellTypes = excelService.readCellTypes();
      const existingCellTypeIndex = existingCellTypes.findIndex(ct => ct.cellType === cellType);
      
      if (existingCellTypeIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Cell type not found'
        });
      }

      // Prepare the updated cell type data for Excel format
      const updatedCellType = {
        cellType: cellTypeData.cellType || cellType,
        dcType: cellTypeData.dcType || '',
        hasMultipleDriveways: cellTypeData.hasMultipleDriveways || false,
        numberOfDriveways: cellTypeData.hasMultipleDriveways ? cellTypeData.numberOfDriveways : 1,
        drivewayTypes: cellTypeData.drivewayTypes || [],
        description: cellTypeData.description || '',
        status: cellTypeData.status || 'ACTIVE'
      };

      // Update the cell type
      existingCellTypes[existingCellTypeIndex] = updatedCellType;
      
      // Write back to Excel
      excelService.writeCellTypes(existingCellTypes);

      LoggingMiddleware.logAction(
        'UPDATE_CELL_TYPE',
        `Updated cell type: ${cellType}`,
        req
      );

      res.json({
        success: true,
        message: 'Cell type updated successfully',
        data: updatedCellType
      });
    } catch (error) {
      console.error('Error updating cell type:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating cell type',
        error: error.message
      });
    }
  }

  async deleteCellType(req, res) {
    try {
      const { cellType } = req.params;
      
      const existingCellTypes = excelService.readCellTypes();
      const existingCellTypeIndex = existingCellTypes.findIndex(ct => ct.cellType === cellType);
      
      if (existingCellTypeIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Cell type not found'
        });
      }

      // Remove the cell type
      const updatedCellTypes = existingCellTypes.filter(ct => ct.cellType !== cellType);
      
      // Write back to Excel
      excelService.writeCellTypes(updatedCellTypes);

      LoggingMiddleware.logAction(
        'DELETE_CELL_TYPE',
        `Deleted cell type: ${cellType}`,
        req
      );

      res.json({
        success: true,
        message: 'Cell type deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting cell type:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting cell type',
        error: error.message
      });
    }
  }

  async cleanupCellTypesFile(req, res) {
    try {
      const result = excelService.cleanupCellTypesFile();
      
      if (result) {
        LoggingMiddleware.logAction(
          'CLEANUP_CELL_TYPES',
          'Cleaned up cell types file - removed Sub Type column',
          req
        );

        res.json({
          success: true,
          message: 'Cell types file cleaned up successfully - Sub Type column removed'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to clean up cell types file'
        });
      }
    } catch (error) {
      console.error('Error cleaning up cell types file:', error);
      res.status(500).json({
        success: false,
        message: 'Error cleaning up cell types file',
        error: error.message
      });
    }
  }

  async migrateTestCasesFile(req, res) {
    try {
      const result = excelService.migrateTestCasesFile();
      
      if (result) {
        LoggingMiddleware.logAction(
          'MIGRATE_TEST_CASES',
          'Migrated test cases file - added DC Type and Sub Type columns',
          req
        );

        res.json({
          success: true,
          message: 'Test cases file migrated successfully - DC Type and Sub Type columns added'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to migrate test cases file'
        });
      }
    } catch (error) {
      console.error('Error migrating test cases file:', error);
      res.status(500).json({
        success: false,
        message: 'Error migrating test cases file',
        error: error.message
      });
    }
  }

  async migrateTestStatusFile(req, res) {
    try {
      const result = excelService.migrateTestStatusFile();
      
      if (result) {
        LoggingMiddleware.logAction(
          'MIGRATE_TEST_STATUS',
          'Migrated test status file - added DC Type and Sub Type columns',
          req
        );

        res.json({
          success: true,
          message: 'Test status file migrated successfully - DC Type and Sub Type columns added'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to migrate test status file'
        });
      }
    } catch (error) {
      console.error('Error migrating test status file:', error);
      res.status(500).json({
        success: false,
        message: 'Error migrating test status file',
        error: error.message
      });
    }
  }
}

module.exports = new CellTypesController(); 