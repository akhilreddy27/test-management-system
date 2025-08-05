const excelService = require('../services/excelService');

class TestCasesController {
  async getAllTestCases(req, res) {
    try {
      const { site } = req.query;
      let testCases = excelService.readTestCases();
      
      // If site is provided, filter test cases for that site
      if (site) {
        // Get test status for the site to see which test cases are available
        const testStatus = excelService.readTestStatus();
        const siteTestCases = testStatus.filter(ts => ts.site === site);
        
        // Map test cases to include status information
        testCases = testCases.map(tc => {
          const matchingStatus = siteTestCases.find(ts => 
            ts.cellType === tc.cellType && 
            ts.testCase === tc.testCase && 
            ts.caseId === tc.caseId
          );
          
          return {
            ...tc,
            status: matchingStatus ? matchingStatus.status : 'NOT RUN',
            cell: matchingStatus ? matchingStatus.cell : null,
            phase: matchingStatus ? matchingStatus.phase : null,
            lastModified: matchingStatus ? matchingStatus.lastModified : null,
            modifiedUser: matchingStatus ? matchingStatus.modifiedUser : null
          };
        });
      }
      
      res.json({
        success: true,
        data: testCases,
        count: testCases.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error reading test cases',
        error: error.message
      });
    }
  }

  async getTestCasesBySite(req, res) {
    try {
      const { site } = req.params;
      
      if (!site) {
        return res.status(400).json({
          success: false,
          message: 'Site parameter is required'
        });
      }
      
      // Get test status for the specific site
      const testStatus = excelService.readTestStatus();
      const siteTestCases = testStatus.filter(ts => ts.site === site);
      
      // Get all test cases
      const allTestCases = excelService.readTestCases();
      
      // Get the configured cells for this site from the test status data
      const configuredCells = [...new Set(siteTestCases.map(ts => ts.cell))];
      
      // Only process test cases for cell types that have configured cells
      const configuredCellTypes = [...new Set(siteTestCases.map(ts => ts.cellType))];
      
      // Filter test cases to only include those for configured cell types
      const relevantTestCases = allTestCases.filter(tc => 
        configuredCellTypes.includes(tc.cellType) || tc.scope === 'System'
      );
      
      // Group test cases by scope and cell type (dynamic)
      const groupedData = {};
      
      // Initialize groupedData dynamically based on available scopes
      const availableScopes = [...new Set(relevantTestCases.map(tc => tc.scope || 'Cell'))];
      availableScopes.forEach(scope => {
        groupedData[scope.toLowerCase()] = {};
      });
      
      // Process each relevant test case based on its scope
      relevantTestCases.forEach(tc => {
        const scope = tc.scope || 'Cell';
        const cellType = tc.cellType;
        const phase = tc.phase || 'All';
        
        if (scope === 'System') {
          // System scope: one block per cell type per site-phase combination
          const key = `${cellType}_${phase}`;
          if (!groupedData.system[key]) {
            groupedData.system[key] = {
              cellType,
              phase,
              testCases: [],
              scope: 'System'
            };
          }
          groupedData.system[key].testCases.push(tc);
        } else {
          // For any other scope (Cell, Safety, or new scopes), only include if this cell type has configured cells
          if (configuredCellTypes.includes(cellType)) {
            const key = `${cellType}_${phase}`;
            if (!groupedData[scope.toLowerCase()][key]) {
              groupedData[scope.toLowerCase()][key] = {
                cellType,
                phase,
                testCases: [],
                scope
              };
            }
            groupedData[scope.toLowerCase()][key].testCases.push(tc);
          }
        }
      });
      
      // Create mapped test cases - ONLY from existing entries
      const mappedTestCases = [];
      
      // Process System scope test cases
      Object.values(groupedData.system).forEach(group => {
        group.testCases.forEach(tc => {
          const testId = `${site}_${tc.cellType}_${tc.testId}_${tc.testCase}`.replace(/\s+/g, '_');
          
          // Find existing status entry
          const existingEntry = siteTestCases.find(ts => 
            ts.cellType === tc.cellType && 
            ts.testCase === tc.testCase && 
            ts.scope === 'System'
          );
          
          // Only include if entry exists
          if (existingEntry) {
            mappedTestCases.push({
              ...tc,
              testId: existingEntry.testId, // Original test ID
              uniqueTestId: existingEntry.uniqueTestId, // Unique test ID for matching
              status: existingEntry.status,
              cell: 'SYSTEM',
              phase: tc.phase,
              lastModified: existingEntry.lastModified,
              modifiedUser: existingEntry.modifiedUser,
              scope: 'System',
              // Add CH/VT data
              chVolume: existingEntry.chVolume || '',
              chDate: existingEntry.chDate || '',
              vtVolume: existingEntry.vtVolume || '',
              vtStartDateTime: existingEntry.vtStartDateTime || '',
              vtEndDateTime: existingEntry.vtEndDateTime || ''
            });
          }
        });
      });
      
      // Process all non-System scope test cases dynamically
      const nonSystemScopes = Object.keys(groupedData).filter(scope => scope !== 'system');
      
      for (const scopeType of nonSystemScopes) {
        for (const group of Object.values(groupedData[scopeType])) {
          // Get the configured cells for this cell type
          const cellTypeCells = configuredCells.filter(cell => 
            siteTestCases.some(ts => ts.cellType === group.cellType && ts.cell === cell)
          );
          
          // Only process existing entries
          for (const cellName of cellTypeCells) {
            for (const tc of group.testCases) {
              const testId = `${site}_${tc.cellType}_${tc.testId}_${tc.testCase}`.replace(/\s+/g, '_');
              
              // Find existing status entry
              const existingEntry = siteTestCases.find(ts => 
                ts.cellType === tc.cellType && 
                ts.testCase === tc.testCase && 
                ts.cell === cellName
              );
              
              // Only include if entry exists
              if (existingEntry) {
                mappedTestCases.push({
                  ...tc,
                  status: existingEntry.status,
                  cell: cellName,
                  phase: tc.phase,
                  lastModified: existingEntry.lastModified,
                  modifiedUser: existingEntry.modifiedUser,
                  testId: existingEntry.testId, // Original test ID
                  uniqueTestId: existingEntry.uniqueTestId, // Unique test ID for matching
                  scope: tc.scope,
                  // Add CH/VT data
                  chVolume: existingEntry.chVolume || '',
                  chDate: existingEntry.chDate || '',
                  vtVolume: existingEntry.vtVolume || '',
                  vtStartDateTime: existingEntry.vtStartDateTime || '',
                  vtEndDateTime: existingEntry.vtEndDateTime || ''
                });
              }
            }
          }
        }
      }
      
      res.json({
        success: true,
        data: mappedTestCases,
        count: mappedTestCases.length,
        site: site,
        groupedData: groupedData
      });
      
    } catch (error) {
      console.error('Error getting test cases by site:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting test cases for site',
        error: error.message
      });
    }
  }

  async getCellTypes(req, res) {
    try {
      const testCases = excelService.readTestCases();
      const cellTypes = [...new Set(testCases.map(tc => tc.cellType))];
      res.json({
        success: true,
        data: cellTypes
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting cell types',
        error: error.message
      });
    }
  }

  async getSites(req, res) {
    try {
      const testStatus = excelService.readTestStatus();
      const sites = [...new Set(testStatus.map(ts => ts.site))];
      res.json({
        success: true,
        data: sites
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting sites',
        error: error.message
      });
    }
  }

  async getTestCaseConfigurations(req, res) {
    try {
      const testCases = await excelService.readTestCases();
      
      // Create dynamic configurations based on test case patterns
      const configurations = {};
      
      testCases.forEach(testCase => {
        const testCaseName = testCase.testCase;
        
        // Skip if already configured
        if (configurations[testCaseName]) return;
        
        const config = {
          hasDataEntry: false,
          fields: [],
          statusRequired: true,
          fieldMappings: {}
        };
        
        // Dynamic detection based on test case name patterns
        if (testCaseName.includes('Cell Hardening')) {
          config.hasDataEntry = true;
          config.fields = [
            { name: 'volume', label: 'CH Volume', type: 'number', placeholder: 'CH Volume' },
            { name: 'date', label: 'Date', type: 'date' }
          ];
          config.statusRequired = false;
          config.fieldMappings = {
            volume: 'productionNumber', // Maps to CH Volume in backend
            date: 'date' // Maps to CH Date in backend
          };
        } else if (testCaseName.includes('Volume Test')) {
          config.hasDataEntry = true;
          config.fields = [
            { name: 'volume', label: 'VT Volume', type: 'number', placeholder: 'VT Volume' },
            { name: 'startDateTime', label: 'Start', type: 'datetime-local' },
            { name: 'endDateTime', label: 'End', type: 'datetime-local' }
          ];
          config.statusRequired = true;
          config.fieldMappings = {
            volume: 'volume', // Maps to VT Volume in backend
            startDateTime: 'startDateTime', // Maps to VT Start DateTime in backend
            endDateTime: 'endDateTime' // Maps to VT End DateTime in backend
          };
        }
        
        configurations[testCaseName] = config;
      });
      
      res.json({
        success: true,
        data: configurations
      });
    } catch (error) {
      console.error('Error getting test case configurations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get test case configurations',
        error: error.message
      });
    }
  }

}

module.exports = new TestCasesController();