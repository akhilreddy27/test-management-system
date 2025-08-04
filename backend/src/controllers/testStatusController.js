const excelService = require('../services/excelService');

class TestStatusController {
  async getAllTestStatus(req, res) {
    console.log('=== GET ALL TEST STATUS ===');
    try {
      const testStatus = excelService.readTestStatus();
      
      // Add unique IDs for frontend tracking
      const testStatusWithIds = testStatus.map((entry, index) => ({
        id: `${entry.site}_${entry.phase}_${entry.cell}_${entry.testCase}`.replace(/\s+/g, '_'),
        ...entry
      }));
      
      console.log(`Returning ${testStatusWithIds.length} test status entries`);
      
      res.json({
        success: true,
        data: testStatusWithIds,
        count: testStatusWithIds.length
      });
    } catch (error) {
      console.error('Error reading test status:', error);
      res.status(500).json({
        success: false,
        message: 'Error reading test status',
        error: error.message
      });
    }
  }

  async updateTestStatus(req, res) {
    console.log('=== UPDATE TEST STATUS ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { testId, status, lastModified, modifiedUser } = req.body;
      
      if (!testId) {
        return res.status(400).json({
          success: false,
          message: 'Test ID is required'
        });
      }
      
      // Read current status data
      console.log('Reading current test status...');
      const currentStatus = excelService.readTestStatus();
      console.log(`Found ${currentStatus.length} existing entries`);
      
      // Find and update the specific test
      let updated = false;
      const updatedStatus = currentStatus.map(entry => {
        const entryId = `${entry.site}_${entry.phase}_${entry.cell}_${entry.testCase}`.replace(/\s+/g, '_');
        
        if (entryId === testId) {
          console.log(`Updating entry: ${entryId}`);
          console.log(`Status: ${entry.status} → ${status}`);
          updated = true;
          return {
            ...entry,
            status: status,
            lastModified: lastModified,
            modifiedUser: modifiedUser
          };
        }
        return entry;
      });
      
      if (!updated) {
        console.log(`Test ID not found: ${testId}`);
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }
      
      // Write back to Excel
      console.log('Writing updated status to Excel...');
      excelService.writeTestStatus(updatedStatus);
      console.log('Excel file updated successfully!');
      
      res.json({
        success: true,
        message: 'Test status updated successfully',
        data: {
          testId,
          status,
          lastModified,
          modifiedUser
        }
      });
      
    } catch (error) {
      console.error('Error updating test status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating test status',
        error: error.message
      });
    }
  }

  async getTestStatistics(req, res) {
    console.log('=== GET TEST STATISTICS ===');
    
    try {
      const testStatus = excelService.readTestStatus();
      
      const stats = {
        totalTests: testStatus.length,
        passCount: testStatus.filter(t => t.status === 'PASS').length,
        failCount: testStatus.filter(t => t.status === 'FAIL').length,
        notRunCount: testStatus.filter(t => t.status === 'NOT RUN' || !t.status).length,
        completionRate: 0,
        passRate: 0
      };
      
      const completedTests = stats.passCount + stats.failCount;
      if (stats.totalTests > 0) {
        stats.completionRate = Math.round((completedTests / stats.totalTests) * 100);
      }
      if (completedTests > 0) {
        stats.passRate = Math.round((stats.passCount / completedTests) * 100);
      }
      
      // Group statistics by site, phase, and cell type
      const groupedStats = {
        bySite: {},
        byPhase: {},
        byCellType: {}
      };
      
      testStatus.forEach(entry => {
        // By site
        if (!groupedStats.bySite[entry.site]) {
          groupedStats.bySite[entry.site] = { total: 0, passed: 0, failed: 0, notRun: 0 };
        }
        groupedStats.bySite[entry.site].total++;
        if (entry.status === 'PASS') groupedStats.bySite[entry.site].passed++;
        else if (entry.status === 'FAIL') groupedStats.bySite[entry.site].failed++;
        else groupedStats.bySite[entry.site].notRun++;
        
        // By phase
        if (!groupedStats.byPhase[entry.phase]) {
          groupedStats.byPhase[entry.phase] = { total: 0, passed: 0, failed: 0, notRun: 0 };
        }
        groupedStats.byPhase[entry.phase].total++;
        if (entry.status === 'PASS') groupedStats.byPhase[entry.phase].passed++;
        else if (entry.status === 'FAIL') groupedStats.byPhase[entry.phase].failed++;
        else groupedStats.byPhase[entry.phase].notRun++;
        
        // By cell type
        if (!groupedStats.byCellType[entry.cellType]) {
          groupedStats.byCellType[entry.cellType] = { total: 0, passed: 0, failed: 0, notRun: 0 };
        }
        groupedStats.byCellType[entry.cellType].total++;
        if (entry.status === 'PASS') groupedStats.byCellType[entry.cellType].passed++;
        else if (entry.status === 'FAIL') groupedStats.byCellType[entry.cellType].failed++;
        else groupedStats.byCellType[entry.cellType].notRun++;
      });
      
      console.log('Statistics calculated:', stats);
      
      res.json({
        success: true,
        data: {
          overall: stats,
          grouped: groupedStats
        }
      });
      
    } catch (error) {
      console.error('Error calculating statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating statistics',
        error: error.message
      });
    }
  }
}

module.exports = new TestStatusController();