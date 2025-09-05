/**
 * Dynamic Logging Configuration
 * This file contains all configurable settings for the logging system.
 * Modify these values to adjust logging behavior without changing code.
 */

const loggingConfig = {
  // ============================================================================
  // BASIC CONFIGURATION
  // ============================================================================
  
  // Enable/disable logging system
  enabled: process.env.LOGGING_ENABLED !== 'false', // Default: true
  
  // Log file settings
  file: {
    // Maximum number of log entries per file
    maxEntries: parseInt(process.env.MAX_LOG_ENTRIES) || 10000,
    
    // Log file name (without extension)
    name: process.env.LOG_FILE_NAME || 'ui_changes_log',
    
    // Log file directory (relative to backend/data)
    directory: process.env.LOG_DIRECTORY || 'data',
    
    // Auto-rotate logs when max entries reached
    autoRotate: process.env.AUTO_ROTATE_LOGS !== 'false', // Default: true
    
    // Keep backup files when rotating
    keepBackups: parseInt(process.env.KEEP_BACKUP_FILES) || 5
  },

  // ============================================================================
  // DATA VOLUME CONTROLS
  // ============================================================================
  
  // Request filtering - skip logging for these patterns
  skipPatterns: [
    '/api/logging/ui-changes',    // Skip logging the logging endpoint itself
    '/api/health',                // Skip health checks
    '/favicon.ico',              // Skip favicon requests
    '/api/logging/activity',     // Skip logging the logging activity endpoint
    '/api/logging/export',       // Skip export requests
    '/api/logging/user',         // Skip user log requests
    '/api/logging/site',         // Skip site log requests
    '/api/logging/date-range'    // Skip date range requests
  ],

  // Skip static assets
  skipStaticAssets: [
    '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
    '.woff', '.woff2', '.ttf', '.eot', '.map'
  ],

  // Data size limits
  limits: {
    // Maximum length for query parameters
    queryLength: parseInt(process.env.MAX_QUERY_LENGTH) || 200,
    
    // Maximum length for request body
    bodyLength: parseInt(process.env.MAX_BODY_LENGTH) || 500,
    
    // Maximum length for details field
    detailsLength: parseInt(process.env.MAX_DETAILS_LENGTH) || 1000
  },

  // ============================================================================
  // LOGGING LEVELS AND FILTERS
  // ============================================================================
  
  // Log levels (in order of importance)
  levels: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  },

  // Current log level
  level: process.env.LOG_LEVEL || 'INFO',

  // Actions to always log (regardless of other filters)
  alwaysLog: [
    'ERROR',
    'CREATE_SITE_CONFIGURATION',
    'UPDATE_TEST_STATUS',
    'DELETE_DATA'
  ],

  // Actions to never log
  neverLog: [
    'HEALTH_CHECK',
    'STATIC_ASSET_REQUEST'
  ],

  // ============================================================================
  // USER AND SESSION TRACKING
  // ============================================================================
  
  // Track user sessions
  trackSessions: process.env.TRACK_SESSIONS !== 'false', // Default: true
  
  // Track IP addresses
  trackIP: process.env.TRACK_IP !== 'false', // Default: true
  
  // Track user agents
  trackUserAgent: process.env.TRACK_USER_AGENT !== 'false', // Default: true
  
  // Anonymize sensitive data
  anonymize: {
    enabled: process.env.ANONYMIZE_LOGS === 'true', // Default: false
    fields: ['ipAddress', 'userAgent', 'user'] // Fields to anonymize
  },

  // ============================================================================
  // PERFORMANCE SETTINGS
  // ============================================================================
  
  // Batch logging (group multiple logs before writing)
  batch: {
    enabled: process.env.BATCH_LOGGING === 'true', // Default: false
    size: parseInt(process.env.BATCH_SIZE) || 100,
    timeout: parseInt(process.env.BATCH_TIMEOUT) || 5000 // 5 seconds
  },

  // Async logging (don't block main thread)
  async: process.env.ASYNC_LOGGING !== 'false', // Default: true

  // ============================================================================
  // EXPORT AND BACKUP SETTINGS
  // ============================================================================
  
  // Auto-export settings
  export: {
    // Auto-export logs daily
    autoExport: process.env.AUTO_EXPORT === 'true', // Default: false
    
    // Export format (xlsx, csv, json)
    format: process.env.EXPORT_FORMAT || 'xlsx',
    
    // Export directory
    directory: process.env.EXPORT_DIRECTORY || 'exports',
    
    // Keep exports for how many days
    retentionDays: parseInt(process.env.EXPORT_RETENTION_DAYS) || 30
  },

  // ============================================================================
  // MONITORING AND ALERTS
  // ============================================================================
  
  // Monitoring settings
  monitoring: {
    // Enable performance monitoring
    enabled: process.env.MONITORING_ENABLED !== 'false', // Default: true
    
    // Alert when log file size exceeds (MB)
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB) || 100,
    
    // Alert when log entries exceed
    maxEntriesAlert: parseInt(process.env.MAX_ENTRIES_ALERT) || 8000,
    
    // Alert when error rate exceeds (percentage)
    maxErrorRate: parseInt(process.env.MAX_ERROR_RATE) || 5
  },

  // ============================================================================
  // ENVIRONMENT-SPECIFIC SETTINGS
  // ============================================================================
  
  // Environment-specific configurations
  environments: {
    development: {
      level: 'DEBUG',
      maxEntries: 1000,
      trackSessions: true,
      async: false
    },
    staging: {
      level: 'INFO',
      maxEntries: 5000,
      trackSessions: true,
      async: true
    },
    production: {
      level: 'INFO',
      maxEntries: 10000,
      trackSessions: true,
      async: true,
      anonymize: {
        enabled: true
      }
    }
  },

  // ============================================================================
  // CUSTOMIZATION HOOKS
  // ============================================================================
  
  // Custom log formatters
  formatters: {
    // Custom timestamp format - FIXED: Ensure date is a Date object
    timestamp: (date) => {
      if (date instanceof Date) {
        return date.toISOString();
      } else if (typeof date === 'string') {
        return new Date(date).toISOString();
      } else {
        return new Date().toISOString();
      }
    },
    
    // Custom user identifier
    user: (req) => req.user || req.body.user || req.query.user || 'Unknown',
    
    // Custom action formatter
    action: (req) => `${req.method} ${req.path}`,
    
    // Custom details formatter
    details: (req) => {
      const details = [];
      details.push(`${req.method} ${req.path}`);
      
      if (Object.keys(req.query).length > 0) {
        const queryStr = JSON.stringify(req.query);
        const maxLength = loggingConfig.limits.queryLength;
        details.push(`Query: ${queryStr.length > maxLength ? queryStr.substring(0, maxLength) + '...' : queryStr}`);
      }
      
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyStr = JSON.stringify(req.body);
        const maxLength = loggingConfig.limits.bodyLength;
        details.push(`Body: ${bodyStr.length > maxLength ? bodyStr.substring(0, maxLength) + '...' : bodyStr}`);
      }
      
      return details.join(' | ');
    }
  },

  // ============================================================================
  // VALIDATION RULES
  // ============================================================================
  
  // Validation rules for log entries
  validation: {
    // Required fields
    required: ['timestamp', 'user', 'action', 'module'],
    
    // Field types
    types: {
      timestamp: 'string',
      user: 'string',
      action: 'string',
      module: 'string',
      site: 'string',
      phase: 'string',
      cellType: 'string',
      cell: 'string',
      testCase: 'string',
      testId: 'string',
      oldValue: 'string',
      newValue: 'string',
      details: 'string',
      ipAddress: 'string',
      userAgent: 'string'
    },
    
    // Field length limits
    maxLengths: {
      user: 100,
      action: 200,
      module: 100,
      site: 100,
      phase: 100,
      cellType: 100,
      cell: 100,
      testCase: 200,
      testId: 200,
      oldValue: 1000,
      newValue: 1000,
      details: 2000,
      ipAddress: 45,
      userAgent: 500
    }
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current environment
 */
loggingConfig.getEnvironment = () => {
  return process.env.NODE_ENV || 'development';
};

/**
 * Get environment-specific config
 */
loggingConfig.getEnvConfig = () => {
  const env = loggingConfig.getEnvironment();
  return loggingConfig.environments[env] || loggingConfig.environments.development;
};

/**
 * Check if logging is enabled
 */
loggingConfig.isEnabled = () => {
  return loggingConfig.enabled && loggingConfig.getEnvConfig().enabled !== false;
};

/**
 * Check if action should be logged
 */
loggingConfig.shouldLogAction = (action) => {
  // Always log critical actions
  if (loggingConfig.alwaysLog.includes(action)) {
    return true;
  }
  
  // Never log excluded actions
  if (loggingConfig.neverLog.includes(action)) {
    return false;
  }
  
  return true;
};

/**
 * Check if request should be skipped
 */
loggingConfig.shouldSkipRequest = (req) => {
  const path = req.path;
  
  // Check skip patterns
  for (const pattern of loggingConfig.skipPatterns) {
    if (path.includes(pattern)) {
      return true;
    }
  }
  
  // Check static assets
  if (req.method === 'GET') {
    for (const asset of loggingConfig.skipStaticAssets) {
      if (path.includes(asset)) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Validate log entry
 */
loggingConfig.validateLogEntry = (entry) => {
  const errors = [];
  
  // Check required fields
  for (const field of loggingConfig.validation.required) {
    if (!entry[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Check field types
  for (const [field, expectedType] of Object.entries(loggingConfig.validation.types)) {
    if (entry[field] && typeof entry[field] !== expectedType) {
      errors.push(`Invalid type for ${field}: expected ${expectedType}, got ${typeof entry[field]}`);
    }
  }
  
  // Check field lengths
  for (const [field, maxLength] of Object.entries(loggingConfig.validation.maxLengths)) {
    if (entry[field] && entry[field].length > maxLength) {
      errors.push(`Field ${field} exceeds maximum length of ${maxLength}`);
    }
  }
  
  return errors;
};

/**
 * Format log entry
 */
loggingConfig.formatLogEntry = (entry) => {
  const formatted = {};
  
  // Apply formatters
  for (const [field, formatter] of Object.entries(loggingConfig.formatters)) {
    if (typeof formatter === 'function' && entry[field] !== undefined) {
      formatted[field] = formatter(entry[field]);
    } else {
      formatted[field] = entry[field];
    }
  }
  
  return formatted;
};

module.exports = loggingConfig; 