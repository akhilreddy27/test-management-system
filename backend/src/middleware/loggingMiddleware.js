const excelService = require('../services/excelService');
const loggingConfig = require('../config/loggingConfig');

class LoggingMiddleware {
  static logUIChange(req, res, next) {
    // Store original send method
    const originalSend = res.send;
    
    // Override send method to intercept response
    res.send = function(data) {
      try {
        // Only log if logging is enabled
        if (!loggingConfig.isEnabled()) {
          return originalSend.call(this, data);
        }

        // Get basic request info
        const action = req.body?.action || req.query?.action || 'UNKNOWN_ACTION';
        const user = req.body?.user || req.query?.user || 'Unknown';
        const module = req.path.split('/')[2] || 'unknown';
        
        // Create log entry with proper date handling
        const logEntry = {
          timestamp: new Date().toISOString(),
          user: user,
          action: action,
          module: module,
          site: req.body?.site || req.query?.site || '',
          phase: req.body?.phase || req.query?.phase || '',
          cellType: req.body?.cellType || req.query?.cellType || '',
          cell: req.body?.cell || req.query?.cell || '',
          testCase: req.body?.testCase || req.query?.testCase || '',
          testId: req.body?.testId || req.query?.testId || '',
          oldValue: req.body?.oldValue || '',
          newValue: req.body?.newValue || '',
          details: LoggingMiddleware.getActivityDetails(req),
          ipAddress: req.ip || req.connection.remoteAddress || '',
          userAgent: req.get('User-Agent') || ''
        };

        // Log the entry asynchronously to avoid blocking
        setImmediate(() => {
          try {
            excelService.logUIChange(logEntry);
          } catch (logError) {
            console.error('Error writing to log:', logError.message);
          }
        });

      } catch (error) {
        console.error('Error in logging middleware:', error.message);
        // Don't fail the request if logging fails
      }
      
      // Call original send method
      return originalSend.call(this, data);
    };
    
    next();
  }

  // Simplified helper method to get activity details
  static getActivityDetails(req) {
    const details = [];
    
    // Add method and path info
    details.push(`${req.method} ${req.path}`);
    
    // Add query parameters (limit size)
    if (Object.keys(req.query).length > 0) {
      const queryStr = JSON.stringify(req.query);
      const maxLength = 200;
      if (queryStr.length > maxLength) {
        details.push(`Query: ${queryStr.substring(0, maxLength)}...`);
      } else {
        details.push(`Query: ${queryStr}`);
      }
    }
    
    // Add body data for POST/PUT requests (limit size)
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyStr = JSON.stringify(req.body);
      const maxLength = 500;
      if (bodyStr.length > maxLength) {
        details.push(`Body: ${bodyStr.substring(0, maxLength)}...`);
      } else {
        details.push(`Body: ${bodyStr}`);
      }
    }
    
    // Add specific activity descriptions
    if (req.method === 'GET') {
      if (req.path.includes('/test-cases')) {
        details.push('Viewed test cases');
      } else if (req.path.includes('/test-status')) {
        details.push('Viewed test status');
      } else if (req.path.includes('/setup')) {
        details.push('Viewed setup');
      } else if (req.path.includes('/cell-hardening')) {
        details.push('Viewed cell hardening');
      } else if (req.path.includes('/logging')) {
        details.push('Viewed logs');
      }
    } else if (req.method === 'POST') {
      details.push('Created new data');
    } else if (req.method === 'PUT') {
      details.push('Updated existing data');
    } else if (req.method === 'DELETE') {
      details.push('Deleted data');
    }
    
    return details.join(' | ');
  }

  // Simplified logging method
  static logAction(action, details, req) {
    try {
      if (!loggingConfig.isEnabled()) {
        return;
      }

      const logEntry = {
        timestamp: new Date().toISOString(),
        user: req?.body?.user || req?.query?.user || 'Unknown',
        action: action,
        module: 'manual',
        details: details || '',
        ipAddress: req?.ip || req?.connection?.remoteAddress || '',
        userAgent: req?.get('User-Agent') || ''
      };

      // Log asynchronously
      setImmediate(() => {
        try {
          excelService.logUIChange(logEntry);
        } catch (error) {
          console.error('Error logging action:', error.message);
        }
      });

    } catch (error) {
      console.error('Error in logAction:', error.message);
    }
  }

  // Get logging statistics
  static getLoggingStats() {
    try {
      const logs = excelService.readUIChangesLog();
      const totalLogs = logs.length;
      
      const userStats = {};
      const actionStats = {};
      const moduleStats = {};
      
      logs.forEach(log => {
        // Count by user
        userStats[log.user] = (userStats[log.user] || 0) + 1;
        
        // Count by action
        actionStats[log.action] = (actionStats[log.action] || 0) + 1;
        
        // Count by module
        moduleStats[log.module] = (moduleStats[log.module] || 0) + 1;
      });
      
      return {
        totalLogs,
        userStats,
        actionStats,
        moduleStats,
        lastLog: logs.length > 0 ? logs[logs.length - 1] : null
      };
    } catch (error) {
      console.error('Error getting logging stats:', error.message);
      return {
        totalLogs: 0,
        userStats: {},
        actionStats: {},
        moduleStats: {},
        lastLog: null,
        error: error.message
      };
    }
  }
}

module.exports = LoggingMiddleware; 