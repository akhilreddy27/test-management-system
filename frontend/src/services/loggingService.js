import axios from 'axios';

const API_BASE_URL = 'http://localhost:3005/api';

class LoggingService {
  // Log frontend user activities
  static async logActivity(activityData) {
    try {
      const logData = {
        user: activityData.user || 'Unknown',
        action: activityData.action || 'Unknown',
        module: activityData.module || 'Unknown',
        site: activityData.site || '',
        phase: activityData.phase || '',
        cellType: activityData.cellType || '',
        cell: activityData.cell || '',
        testCase: activityData.testCase || '',
        testId: activityData.testId || '',
        oldValue: activityData.oldValue || '',
        newValue: activityData.newValue || '',
        details: activityData.details || '',
        ipAddress: activityData.ipAddress || '',
        userAgent: navigator.userAgent || '',
        timestamp: new Date().toISOString()
      };

      // Send to backend logging endpoint
      await axios.post(`${API_BASE_URL}/logging/activity`, logData);
    } catch (error) {
      console.error('Error logging frontend activity:', error);
    }
  }

  // Log page views
  static async logPageView(page, user = 'Unknown') {
    await this.logActivity({
      user,
      action: 'PAGE_VIEW',
      module: 'navigation',
      details: `Viewed page: ${page}`,
      timestamp: new Date().toISOString()
    });
  }

  // Log button clicks
  static async logButtonClick(buttonName, module, user = 'Unknown') {
    await this.logActivity({
      user,
      action: 'BUTTON_CLICK',
      module,
      details: `Clicked button: ${buttonName}`,
      timestamp: new Date().toISOString()
    });
  }

  // Log form submissions
  static async logFormSubmission(formName, module, data, user = 'Unknown') {
    await this.logActivity({
      user,
      action: 'FORM_SUBMISSION',
      module,
      details: `Submitted form: ${formName}`,
      newValue: JSON.stringify(data),
      timestamp: new Date().toISOString()
    });
  }

  // Log data changes
  static async logDataChange(module, field, oldValue, newValue, user = 'Unknown') {
    await this.logActivity({
      user,
      action: 'DATA_CHANGE',
      module,
      details: `Changed ${field}`,
      oldValue: oldValue?.toString() || '',
      newValue: newValue?.toString() || '',
      timestamp: new Date().toISOString()
    });
  }

  // Log searches and filters
  static async logSearch(searchTerm, module, user = 'Unknown') {
    await this.logActivity({
      user,
      action: 'SEARCH',
      module,
      details: `Searched for: ${searchTerm}`,
      timestamp: new Date().toISOString()
    });
  }

  // Log filter applications
  static async logFilter(filterType, filterValue, module, user = 'Unknown') {
    await this.logActivity({
      user,
      action: 'FILTER',
      module,
      details: `Applied filter: ${filterType} = ${filterValue}`,
      timestamp: new Date().toISOString()
    });
  }

  // Log navigation
  static async logNavigation(fromPage, toPage, user = 'Unknown') {
    await this.logActivity({
      user,
      action: 'NAVIGATION',
      module: 'navigation',
      details: `Navigated from ${fromPage} to ${toPage}`,
      timestamp: new Date().toISOString()
    });
  }

  // Log errors
  static async logError(error, module, user = 'Unknown') {
    await this.logActivity({
      user,
      action: 'ERROR',
      module,
      details: `Error: ${error.message || error}`,
      timestamp: new Date().toISOString()
    });
  }
}

export default LoggingService; 