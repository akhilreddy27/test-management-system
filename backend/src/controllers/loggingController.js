const excelService = require('../services/excelService');

class LoggingController {
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