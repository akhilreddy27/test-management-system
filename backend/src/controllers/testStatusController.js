const excelService = require('../services/excelService');
const LoggingMiddleware = require('../middleware/loggingMiddleware');

class TestStatusController {
  async getAllTestStatus(req, res) {
    console.log('=== GET ALL TEST STATUS ===');
    try {
      const testStatus = excelService.readTestStatus();
      
      // Use the actual testId from the entry
      const testStatusWithIds = testStatus.map((entry, index) => ({
        testId: entry.testId,
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

  async getTestStatusByTestId(req, res) {
    console.log('=== GET TEST STATUS BY TEST ID ===');
    console.log('Test ID:', req.params.testId);
    
    try {
      const { testId } = req.params;
      const testStatus = excelService.readTestStatus();
      
      // Find test status entries that match the test ID
      const matchingEntries = testStatus.filter(entry => 
        entry.testId === testId || entry.uniqueTestId === testId
      );
      
      console.log(`Found ${matchingEntries.length} entries for test ID: ${testId}`);
      
      res.json({
        success: true,
        data: matchingEntries,
        count: matchingEntries.length
      });
    } catch (error) {
      console.error('Error getting test status by test ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting test status by test ID',
        error: error.message
      });
    }
  }

  async updateTestStatus(req, res) {
    console.log('=== UPDATE TEST STATUS ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { testId, cell, cellType, site, status, lastModified, modifiedUser, day, date, productionNumber, notes, volume, startTime, endTime, availability, vtVolume, vtDate, vtStartTime, vtEndTime, driveway1Status, driveway2Status } = req.body;
      
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
      let oldStatus = '';
      let oldVolume = '';
      let oldDate = '';
      let oldDriveway1Status = '';
      let oldDriveway2Status = '';
      
      const updatedStatus = currentStatus.map(entry => {
        // Use unique test ID for matching to ensure data isolation
        let shouldUpdate = false;
        
        // The frontend should send the unique test ID directly
        shouldUpdate = entry.uniqueTestId === testId;
        
        if (shouldUpdate) {
          console.log(`Updating entry: ${entry.testId} for cell: ${entry.cell}`);
          
          // Store old values for logging
          oldStatus = entry.status;
          oldVolume = entry.chVolume || entry.vtVolume || '';
          oldDate = entry.chDate || entry.vtDate || '';
          oldDriveway1Status = entry.driveway1Status || '';
          oldDriveway2Status = entry.driveway2Status || '';
          
          if (status) {
            console.log(`Status: ${entry.status} → ${status}`);
          }
          if (driveway1Status !== undefined) {
            console.log(`Driveway 1 Status: ${entry.driveway1Status || 'NOT RUN'} → ${driveway1Status}`);
          }
          if (driveway2Status !== undefined) {
            console.log(`Driveway 2 Status: ${entry.driveway2Status || 'NOT RUN'} → ${driveway2Status}`);
          }
          if (day && date && productionNumber) {
            console.log(`Adding Day ${day} hardening data: ${productionNumber} units on ${date}`);
          }
          
          updated = true;
          const updatedEntry = {
            ...entry,
            lastModified: lastModified || entry.lastModified,
            modifiedUser: modifiedUser || entry.modifiedUser
          };
          
          // Update status if provided
          if (status) {
            updatedEntry.status = status;
          }
          
          // Update driveway statuses if provided (for FLIB cells)
          if (driveway1Status !== undefined) {
            updatedEntry.driveway1Status = driveway1Status;
          }
          if (driveway2Status !== undefined) {
            updatedEntry.driveway2Status = driveway2Status;
          }
          
          // Update hardening data if provided (simple CH Volume/Date)
          if (productionNumber !== undefined && !volume) {
            updatedEntry.chVolume = productionNumber;
          }
          if (date !== undefined && !startDateTime) {
            updatedEntry.chDate = date;
          }
          
          // Clear CH data if status is NOT RUN
          if (status === 'NOT RUN') {
            updatedEntry.chVolume = '';
            updatedEntry.chDate = '';
          }
          
          // Update Volume Test data if provided
          if (volume !== undefined) {
            updatedEntry.vtVolume = volume;
          }
          if (vtVolume !== undefined) {
            updatedEntry.vtVolume = vtVolume;
          }
          if (vtDate !== undefined) {
            updatedEntry.vtDate = vtDate;
          }
          if (startTime !== undefined) {
            updatedEntry.vtStartTime = startTime;
          }
          if (vtStartTime !== undefined) {
            updatedEntry.vtStartTime = vtStartTime;
          }
          if (endTime !== undefined) {
            updatedEntry.vtEndTime = endTime;
          }
          if (vtEndTime !== undefined) {
            updatedEntry.vtEndTime = vtEndTime;
          }
          if (availability !== undefined) {
            updatedEntry.vtAvailability = availability;
          }
          
          return updatedEntry;
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
      
      // Log the UI change
      if (updated) {
        let logMessage = `Updated test status: ${oldStatus} → ${status || oldStatus}`;
        if (driveway1Status !== undefined) {
          logMessage += `, Driveway 1: ${oldDriveway1Status || 'NOT RUN'} → ${driveway1Status}`;
        }
        if (driveway2Status !== undefined) {
          logMessage += `, Driveway 2: ${oldDriveway2Status || 'NOT RUN'} → ${driveway2Status}`;
        }
        if (productionNumber || volume) {
          logMessage += `, Volume: ${oldVolume} → ${productionNumber || volume || oldVolume}`;
        }
        if (date || vtDate) {
          logMessage += `, Date: ${oldDate} → ${date || vtDate || oldDate}`;
        }
        
        LoggingMiddleware.logAction(
          'UPDATE_TEST_STATUS',
          logMessage,
          req
        );
      }
      
      res.json({
        success: true,
        message: 'Test status updated successfully',
        data: {
          testId,
          status,
          driveway1Status,
          driveway2Status,
          lastModified,
          modifiedUser,
          day,
          date,
          productionNumber,
          notes
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
        blockedCount: testStatus.filter(t => t.status === 'BLOCKED').length,
        notRunCount: testStatus.filter(t => t.status === 'NOT RUN' || !t.status).length,
        completionRate: 0,
        passRate: 0
      };
      
      const completedTests = stats.passCount + stats.failCount + stats.blockedCount;
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
          groupedStats.bySite[entry.site] = { total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0 };
        }
        groupedStats.bySite[entry.site].total++;
        if (entry.status === 'PASS') groupedStats.bySite[entry.site].passed++;
        else if (entry.status === 'FAIL') groupedStats.bySite[entry.site].failed++;
        else if (entry.status === 'BLOCKED') groupedStats.bySite[entry.site].blocked++;
        else groupedStats.bySite[entry.site].notRun++;
        
        // By phase
        if (!groupedStats.byPhase[entry.phase]) {
          groupedStats.byPhase[entry.phase] = { total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0 };
        }
        groupedStats.byPhase[entry.phase].total++;
        if (entry.status === 'PASS') groupedStats.byPhase[entry.phase].passed++;
        else if (entry.status === 'FAIL') groupedStats.byPhase[entry.phase].failed++;
        else if (entry.status === 'BLOCKED') groupedStats.byPhase[entry.phase].blocked++;
        else groupedStats.byPhase[entry.phase].notRun++;
        
        // By cell type
        if (!groupedStats.byCellType[entry.cellType]) {
          groupedStats.byCellType[entry.cellType] = { total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0 };
        }
        groupedStats.byCellType[entry.cellType].total++;
        if (entry.status === 'PASS') groupedStats.byCellType[entry.cellType].passed++;
        else if (entry.status === 'FAIL') groupedStats.byCellType[entry.cellType].failed++;
        else if (entry.status === 'BLOCKED') groupedStats.byCellType[entry.cellType].blocked++;
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

  async submitTestResults(req, res) {
    console.log('=== SUBMIT TEST RESULTS ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { site, submittedBy, submittedAt, totalTests, passedTests, results } = req.body;
      
      if (!site || !results || results.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Site and results are required'
        });
      }
      
      // Verify all tests are marked as PASS
      const notPassedTests = results.filter(r => r.status !== 'PASS');
      if (notPassedTests.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot submit: ${notPassedTests.length} test(s) are not marked as PASS`
        });
      }
      
      // Save results to a separate results file
      const resultsData = {
        submissionId: `submission_${Date.now()}`,
        site,
        submittedBy,
        submittedAt,
        totalTests,
        passedTests,
        results
      };
      
      // Save to Excel file
      const saved = excelService.saveTestResults(resultsData);
      
      if (saved) {
        console.log(`Test results submitted successfully for site: ${site}`);
        res.json({
          success: true,
          message: `Successfully submitted ${totalTests} test results for site: ${site}`,
          data: {
            submissionId: resultsData.submissionId,
            site,
            totalTests,
            passedTests
          }
        });
      } else {
        throw new Error('Failed to save test results');
      }
      
    } catch (error) {
      console.error('Error submitting test results:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting test results',
        error: error.message
      });
    }
  }
  async updateNote(req, res) {
    console.log('=== UPDATE TEST NOTE ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { testId, note } = req.body;
      
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
      let oldNote = '';
      
      const updatedStatus = currentStatus.map(entry => {
        // Use unique test ID for matching
        if (entry.uniqueTestId === testId || entry.testId === testId) {
          console.log(`Updating note for entry: ${entry.testId} for cell: ${entry.cell}`);
          
          // Store old note for logging
          oldNote = entry.notes || '';
          
          updated = true;
          return {
            ...entry,
            notes: note || '',
            lastModified: new Date().toISOString(),
            modifiedUser: req.body.modifiedUser || 'Unknown'
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
      console.log('Writing updated note to Excel...');
      excelService.writeTestStatus(updatedStatus);
      console.log('Excel file updated successfully!');
      
      // Log the UI change
      LoggingMiddleware.logAction(
        'UPDATE_TEST_NOTE',
        `Updated test note: "${oldNote}" → "${note}"`,
        req
      );
      
      res.json({
        success: true,
        message: 'Test note updated successfully',
        data: {
          testId,
          note,
          lastModified: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error updating test note:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating test note',
        error: error.message
      });
    }
  }
}

module.exports = new TestStatusController();