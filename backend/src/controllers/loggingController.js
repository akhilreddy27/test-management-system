const excelService = require('../services/excelService');
const path = require('path');
const XLSX = require('xlsx');

class LoggingController {
  // Get all UI change logs with optional filters
  async getUIChangeLogs(req, res) {
    try {
      const filters = {
        user: req.query.user,
        action: req.query.action,
        module: req.query.module,
        site: req.query.site,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const logs = excelService.readUIChangeLogs(filters);
      
      res.json({
        success: true,
        data: logs,
        count: logs.length,
        filters: filters
      });
    } catch (error) {
      console.error('Error getting UI change logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving UI change logs',
        error: error.message
      });
    }
  }

  // Get logs for a specific user
  async getUserLogs(req, res) {
    try {
      const { user } = req.params;
      const logs = excelService.readUIChangeLogs({ user });
      
      res.json({
        success: true,
        data: logs,
        count: logs.length,
        user: user
      });
    } catch (error) {
      console.error('Error getting user logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving user logs',
        error: error.message
      });
    }
  }

  // Get logs for a specific site
  async getSiteLogs(req, res) {
    try {
      const { site } = req.params;
      const logs = excelService.readUIChangeLogs({ site });
      
      res.json({
        success: true,
        data: logs,
        count: logs.length,
        site: site
      });
    } catch (error) {
      console.error('Error getting site logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving site logs',
        error: error.message
      });
    }
  }

  // Get logs for a specific date range
  async getDateRangeLogs(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const logs = excelService.readUIChangeLogs({ startDate, endDate });
      
      res.json({
        success: true,
        data: logs,
        count: logs.length,
        dateRange: { startDate, endDate }
      });
    } catch (error) {
      console.error('Error getting date range logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving date range logs',
        error: error.message
      });
    }
  }

  // Export logs to Excel
  async exportLogs(req, res) {
    try {
      const filters = {
        user: req.query.user,
        action: req.query.action,
        module: req.query.module,
        site: req.query.site,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const logs = excelService.readUIChangeLogs(filters);
      
      // Create Excel file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `ui_changes_log_export_${timestamp}.xlsx`;
      const filePath = path.join(__dirname, '../../data', fileName);
      
      const worksheet = XLSX.utils.json_to_sheet(logs);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'UI Changes Log');
      
      XLSX.writeFile(workbook, filePath);
      
      res.json({
        success: true,
        message: 'Logs exported successfully',
        fileName: fileName,
        count: logs.length
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting logs',
        error: error.message
      });
    }
  }

  // Handle frontend activity logging
  async logFrontendActivity(req, res) {
    try {
      const activityData = req.body;
      
      // Add timestamp if not provided
      if (!activityData.timestamp) {
        activityData.timestamp = new Date().toISOString();
      }
      
      // Log the frontend activity
      const success = excelService.logUIChange(activityData);
      
      if (success) {
        res.json({
          success: true,
          message: 'Activity logged successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to log activity'
        });
      }
    } catch (error) {
      console.error('Error logging frontend activity:', error);
      res.status(500).json({
        success: false,
        message: 'Error logging frontend activity',
        error: error.message
      });
    }
  }
}

module.exports = new LoggingController(); 