const excelService = require('../services/excelService');

class TestCasesController {
  filterTestCasesByDriveway(testCases, drivewayConfig) {
    if (!drivewayConfig) return testCases;
    
    return testCases.filter(tc => {
      if (!tc.multiDriveway || tc.combinedTest) return true;
      
      const drivewayValues = Object.values(drivewayConfig);
      return drivewayValues.includes(tc.drivewayType);
    });
  }

  async getAllTestCases(req, res) {
    try {
      const { site } = req.query;
      let testCases = excelService.readTestCases();
      
      if (site) {
        const testStatus = excelService.readTestStatus();
        const siteTestCases = testStatus.filter(ts => ts.site === site);
        
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
      const { phase, drivewayConfig } = req.query;
      
      if (!site) {
        return res.status(400).json({
          success: false,
          message: 'Site parameter is required'
        });
      }
      
      const testStatus = excelService.readTestStatus();
      let siteTestCases = testStatus.filter(ts => ts.site === site);
      
      if (phase) {
        siteTestCases = siteTestCases.filter(ts => ts.phase === phase);
      }
      
      const allTestCases = excelService.readTestCases();
      const configuredCells = [...new Set(siteTestCases.map(ts => ts.cell))];
      
      const configuredCellTypes = [...new Set(siteTestCases.map(ts => ts.cellType))];
      
      let relevantTestCases = allTestCases.filter(tc => {
        return configuredCellTypes.includes(tc.cellType);
      });
      
      if (drivewayConfig) {
        try {
          const drivewayConfigObj = JSON.parse(drivewayConfig);
          relevantTestCases = this.filterTestCasesByDriveway(relevantTestCases, drivewayConfigObj);
        } catch (error) {
          console.error('Error parsing driveway config:', error);
        }
      }
      
      const groupedData = {};
      
      const availableScopes = [...new Set(relevantTestCases.map(tc => tc.scope || 'Cell'))];
      availableScopes.forEach(scope => {
        if (scope) {
          groupedData[scope.toLowerCase()] = {};
        }
      });
      
      relevantTestCases.forEach(tc => {
        if (!tc) return;
        
        const scope = tc.scope || 'Cell';
        const cellType = tc.cellType;
        const phase = tc.phase || 'All';
        
        // Handle test cases based on "Cells" column logic
        const cellsCoverage = tc.cells || 'All';
        const phaseFilter = tc.phase || 'All';
        
        if (cellsCoverage === 'System') {
          // System-level tests - run once per phase
          const key = `${cellType}_${phaseFilter}`;
          if (!groupedData.system) {
            groupedData.system = {};
          }
          if (!groupedData.system[key]) {
            groupedData.system[key] = {
              cellType,
              phase: phaseFilter,
              testCases: [],
              cells: 'System'
            };
          }
          groupedData.system[key].testCases.push(tc);
        } else if (cellsCoverage === 'First') {
          // First cell tests - run once per cell type
          const key = `${cellType}_${phaseFilter}`;
          if (!groupedData.first) {
            groupedData.first = {};
          }
          if (!groupedData.first[key]) {
            groupedData.first[key] = {
              cellType,
              phase: phaseFilter,
              testCases: [],
              cells: 'First'
            };
          }
          groupedData.first[key].testCases.push(tc);
        } else {
          // All cells tests (default)
          const scopeKey = scope.toLowerCase();
          if (!groupedData[scopeKey]) {
            groupedData[scopeKey] = {};
          }
          const key = `${cellType}_${phaseFilter}`;
          if (!groupedData[scopeKey][key]) {
            groupedData[scopeKey][key] = {
              cellType,
              phase: phaseFilter,
              testCases: [],
              scope,
              cells: 'All'
            };
          }
          groupedData[scopeKey][key].testCases.push(tc);
        }
      });
      
      const mappedTestCases = [];
      
      // Handle System-level tests (run once per phase)
      if (groupedData.system) {
        Object.values(groupedData.system).forEach(group => {
          if (!group || !group.testCases) return;
          
          group.testCases.forEach(tc => {
            const testId = `${site}_${tc.cellType}_${tc.testId}_${tc.testCase}`.replace(/\s+/g, '_');
            
            // Find existing entry for system test of this cell type
            const existingEntry = siteTestCases.find(ts => 
              ts.cellType === tc.cellType && 
              ts.testCase === tc.testCase && 
              ts.cells === 'System'
            );
            
            if (existingEntry) {
              mappedTestCases.push({
                ...tc,
                testId: existingEntry.testId,
                uniqueTestId: existingEntry.uniqueTestId,
                status: existingEntry.status,
                cell: 'SYSTEM',
                phase: tc.phase,
                lastModified: existingEntry.lastModified,
                modifiedUser: existingEntry.modifiedUser,
                scope: tc.scope,
                cells: 'System',
                phaseFilter: tc.phase || 'All',
                chVolume: existingEntry.chVolume || '',
                chDate: existingEntry.chDate || '',
                vtVolume: existingEntry.vtVolume || '',
                vtStartDateTime: existingEntry.vtStartDateTime || '',
                vtEndDateTime: existingEntry.vtEndDateTime || '',
                vtAvailability: existingEntry.vtAvailability || ''
              });
            }
          });
        });
      }
      
      // Handle "First" cell tests (run only for the first cell of each cell type)
      if (groupedData.first) {
        Object.values(groupedData.first).forEach(group => {
          if (!group || !group.testCases) return;
          
          group.testCases.forEach(tc => {
            const testId = `${site}_${tc.cellType}_${tc.testId}_${tc.testCase}`.replace(/\s+/g, '_');
            
            // Find existing entry for first cell of this cell type
            const existingEntry = siteTestCases.find(ts => 
              ts.cellType === tc.cellType && 
              ts.testCase === tc.testCase && 
              ts.cells === 'First'
            );
            
            if (existingEntry) {
              mappedTestCases.push({
                ...tc,
                testId: existingEntry.testId,
                uniqueTestId: existingEntry.uniqueTestId,
                status: existingEntry.status,
                cell: existingEntry.cell, // Use actual cell name instead of 'SYSTEM'
                phase: tc.phase,
                lastModified: existingEntry.lastModified,
                modifiedUser: existingEntry.modifiedUser,
                scope: tc.scope, // Keep original scope
                cells: 'First', // Add cells field
                chVolume: existingEntry.chVolume || '',
                chDate: existingEntry.chDate || '',
                vtVolume: existingEntry.vtVolume || '',
                vtStartDateTime: existingEntry.vtStartDateTime || '',
                vtEndDateTime: existingEntry.vtEndDateTime || '',
                vtAvailability: existingEntry.vtAvailability || ''
              });
            }
          });
        });
      }
      
      // Handle System scope test cases with cells: "All" (run for each cell)
      if (groupedData.system) {
        Object.values(groupedData.system).forEach(group => {
          if (!group || !group.testCases) return;
          
          // Only process System test cases that have cells: "All"
          const systemAllTestCases = group.testCases.filter(tc => (tc.cells || 'All') === 'All');
          
          if (systemAllTestCases.length > 0) {
            const cellTypeCells = configuredCells.filter(cell => 
              siteTestCases.some(ts => ts.cellType === group.cellType && ts.cell === cell)
            );
            
            for (const cellName of cellTypeCells) {
              for (const tc of systemAllTestCases) {
                const existingEntry = siteTestCases.find(ts => 
                  ts.cellType === tc.cellType && 
                  ts.testCase === tc.testCase && 
                  ts.cell === cellName
                );
                
                if (existingEntry) {
                  mappedTestCases.push({
                    ...tc,
                    status: existingEntry.status,
                    cell: cellName,
                    phase: tc.phase,
                    lastModified: existingEntry.lastModified,
                    modifiedUser: existingEntry.modifiedUser,
                    testId: existingEntry.testId,
                    uniqueTestId: existingEntry.uniqueTestId,
                    scope: tc.scope,
                    cells: existingEntry.cells || 'All',
                    driveway1: existingEntry.driveway1 || '',
                    driveway2: existingEntry.driveway2 || '',
                    driveway1Status: existingEntry.driveway1Status || 'NOT RUN',
                    driveway2Status: existingEntry.driveway2Status || 'NOT RUN',
                    chVolume: existingEntry.chVolume || '',
                    chDate: existingEntry.chDate || '',
                    vtVolume: existingEntry.vtVolume || '',
                    vtStartDateTime: existingEntry.vtStartDateTime || '',
                    vtEndDateTime: existingEntry.vtEndDateTime || '',
                    vtAvailability: existingEntry.vtAvailability || ''
                  });
                }
              }
            }
          }
        });
      }
      
      const nonFirstScopes = Object.keys(groupedData).filter(scope => scope !== 'first' && scope !== 'system');
      
      for (const scopeType of nonFirstScopes) {
        if (!groupedData[scopeType]) continue;
        
        for (const group of Object.values(groupedData[scopeType])) {
          if (!group || !group.testCases) continue;
          
          const cellTypeCells = configuredCells.filter(cell => 
            siteTestCases.some(ts => ts.cellType === group.cellType && ts.cell === cell)
          );
          
          for (const cellName of cellTypeCells) {
            for (const tc of group.testCases) {
              const testId = `${site}_${tc.cellType}_${tc.testId}_${tc.testCase}`.replace(/\s+/g, '_');
              
              const existingEntry = siteTestCases.find(ts => 
                ts.cellType === tc.cellType && 
                ts.testCase === tc.testCase && 
                ts.cell === cellName
              );
              
              if (existingEntry) {
                mappedTestCases.push({
                  ...tc,
                  status: existingEntry.status,
                  cell: cellName,
                  phase: tc.phase,
                  lastModified: existingEntry.lastModified,
                  modifiedUser: existingEntry.modifiedUser,
                  testId: existingEntry.testId,
                  uniqueTestId: existingEntry.uniqueTestId,
                  scope: tc.scope,
                  cells: existingEntry.cells || 'All', // Add cells field with default 'All'
                  driveway1: existingEntry.driveway1 || '',
                  driveway2: existingEntry.driveway2 || '',
                  driveway1Status: existingEntry.driveway1Status || 'NOT RUN',
                  driveway2Status: existingEntry.driveway2Status || 'NOT RUN',
                  chVolume: existingEntry.chVolume || '',
                  chDate: existingEntry.chDate || '',
                  vtVolume: existingEntry.vtVolume || '',
                  vtStartDateTime: existingEntry.vtStartDateTime || '',
                  vtEndDateTime: existingEntry.vtEndDateTime || '',
                  vtAvailability: existingEntry.vtAvailability || ''
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
      console.error('Error stack:', error.stack);
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
      
      const configurations = {};
      
      testCases.forEach(testCase => {
        const testCaseName = testCase.testCase;
        
        if (configurations[testCaseName]) return;
        
        const config = {
          hasDataEntry: false,
          fields: [],
          statusRequired: true,
          fieldMappings: {}
        };
        
        if (testCaseName.includes('Cell Hardening')) {
          config.hasDataEntry = true;
          config.fields = [
            { name: 'volume', label: 'CH Volume', type: 'number', placeholder: 'CH Volume' },
            { name: 'date', label: 'Date', type: 'date' }
          ];
          config.statusRequired = false;
          config.fieldMappings = {
            volume: 'productionNumber',
            date: 'date'
          };
        } else if (testCaseName.includes('Volume Test')) {
          config.hasDataEntry = true;
          config.fields = [
            { name: 'volume', label: 'VT Volume', type: 'number', placeholder: 'VT Volume' },
            { name: 'date', label: 'Date', type: 'date' },
            { name: 'startTime', label: 'Start Time', type: 'time' },
            { name: 'endTime', label: 'End Time', type: 'time' },
            { name: 'availability', label: 'Availability %', type: 'number', placeholder: 'Availability %', min: 0, max: 100 }
          ];
          config.statusRequired = true;
          config.fieldMappings = {
            volume: 'vtVolume',
            date: 'vtDate',
            startTime: 'vtStartTime',
            endTime: 'vtEndTime',
            availability: 'availability'
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

  async getCellTypeConfigurations(req, res) {
    try {
      const cellTypes = excelService.readCellTypes();
      res.json({
        success: true,
        data: cellTypes
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error reading cell type configurations',
        error: error.message
      });
    }
  }

  async createTestCase(req, res) {
    try {
      const { dcType, subType, cellType, testCase, testId, scope, phase, steps, expectedOutput, drivewayType, combinedTest, cells, image, requirements } = req.body;
      
      if (!dcType || !subType || !cellType || !testCase || !testId || !scope || !phase || !steps || !expectedOutput || !cells || !requirements) {
        return res.status(400).json({
          success: false,
          message: 'DC Type, Sub Type, Cell Type, Test Case, Test ID, Scope, Phase, Steps, Expected Output, Cells, and Requirements are required'
        });
      }

      const existingTestCases = excelService.readTestCases();
      const cellTypes = excelService.readCellTypes();
      
      // Check if test case already exists
      const existingTestCase = existingTestCases.find(tc => 
        tc.dcType === dcType &&
        tc.subType === subType &&
        tc.cellType === cellType && 
        tc.testCase === testCase && 
        tc.testId === testId
      );

      if (existingTestCase) {
        return res.status(400).json({
          success: false,
          message: 'Test case already exists with the same DC Type, Sub Type, Cell Type, Test Case, and Test ID'
        });
      }

      // Determine multiDriveway from cell types configuration
      const cellTypeConfig = cellTypes.find(ct => ct.cellType === cellType);
      const multiDriveway = cellTypeConfig ? cellTypeConfig.hasMultipleDriveways || false : false;

      const newTestCase = {
        dcType,
        subType,
        cellType,
        testCase,
        testId,
        scope,
        phase: phase || '',
        steps: steps || '',
        expectedOutput: expectedOutput || '',
        multiDriveway,
        drivewayType: multiDriveway ? (drivewayType || '') : 'NA',
        combinedTest: combinedTest || false,
        // New fields
        cells: cells || '',
        image: image || '',
        requirements: requirements || '',
        // Audit fields
        lastModified: new Date().toISOString(),
        modifiedUser: req.body.modifiedUser || 'Unknown'
      };

      const updatedTestCases = [...existingTestCases, newTestCase];
      excelService.writeTestCases(updatedTestCases);

      // Create test status entries for all sites
      try {
        await this.createTestStatusEntriesForAllSites(newTestCase);
      } catch (error) {
        console.error('Error creating test status entries:', error);
        // Continue with test case creation even if status entries fail
      }

      res.json({
        success: true,
        message: 'Test case created successfully',
        data: newTestCase
      });
    } catch (error) {
      console.error('Error creating test case:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating test case',
        error: error.message
      });
    }
  }

  async updateTestCase(req, res) {
    try {
      const { id } = req.params;
      const { dcType, subType, cellType, testCase, testId, scope, phase, steps, expectedOutput, drivewayType, combinedTest, cells, image, requirements } = req.body;
      
      if (!dcType || !subType || !cellType || !testCase || !testId || !scope || !phase || !steps || !expectedOutput || !cells || !requirements) {
        return res.status(400).json({
          success: false,
          message: 'DC Type, Sub Type, Cell Type, Test Case, Test ID, Scope, Phase, Steps, Expected Output, Cells, and Requirements are required'
        });
      }

      const existingTestCases = excelService.readTestCases();
      const cellTypes = excelService.readCellTypes();
      
      // Find the test case to update (using index as ID)
      const testCaseIndex = parseInt(id);
      if (testCaseIndex < 0 || testCaseIndex >= existingTestCases.length) {
        return res.status(404).json({
          success: false,
          message: 'Test case not found'
        });
      }

      // Determine multiDriveway from cell types configuration
      const cellTypeConfig = cellTypes.find(ct => ct.cellType === cellType);
      const multiDriveway = cellTypeConfig ? cellTypeConfig.hasMultipleDriveways || false : false;

      const updatedTestCase = {
        ...existingTestCases[testCaseIndex],
        dcType,
        subType,
        cellType,
        testCase,
        testId,
        scope,
        phase: phase || '',
        steps: steps || '',
        expectedOutput: expectedOutput || '',
        multiDriveway,
        drivewayType: multiDriveway ? (drivewayType || '') : 'NA',
        combinedTest: combinedTest || false,
        // New fields
        cells: cells || '',
        image: image || '',
        requirements: requirements || '',
        // Update audit fields
        lastModified: new Date().toISOString(),
        modifiedUser: req.body.modifiedUser || 'Unknown'
      };

      existingTestCases[testCaseIndex] = updatedTestCase;
      excelService.writeTestCases(existingTestCases);

      res.json({
        success: true,
        message: 'Test case updated successfully',
        data: updatedTestCase
      });
    } catch (error) {
      console.error('Error updating test case:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating test case',
        error: error.message
      });
    }
  }

  async deleteTestCase(req, res) {
    try {
      const { id } = req.params;
      
      const existingTestCases = excelService.readTestCases();
      
      // Find the test case to delete (using index as ID)
      const testCaseIndex = parseInt(id);
      if (testCaseIndex < 0 || testCaseIndex >= existingTestCases.length) {
        return res.status(404).json({
          success: false,
          message: 'Test case not found'
        });
      }

      const deletedTestCase = existingTestCases[testCaseIndex];
      existingTestCases.splice(testCaseIndex, 1);
      
      excelService.writeTestCases(existingTestCases);

      res.json({
        success: true,
        message: 'Test case deleted successfully',
        data: deletedTestCase
      });
    } catch (error) {
      console.error('Error deleting test case:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting test case',
        error: error.message
      });
    }
  }

  async createTestStatusEntriesForAllSites(testCase) {
    try {
      const sites = excelService.readSiteInfo();
      const cellTypes = excelService.readCellTypes();
      const existingTestStatus = excelService.readTestStatus();
      
      const cellTypeConfig = cellTypes.find(ct => ct.cellType === testCase.cellType);
      const multiDriveway = cellTypeConfig ? cellTypeConfig.hasMultipleDriveways || false : false;
      const numberOfDriveways = cellTypeConfig ? cellTypeConfig.numberOfDriveways || 1 : 1;
      const drivewayTypes = cellTypeConfig ? cellTypeConfig.drivewayTypes || [] : [];
      
      const newTestStatusEntries = [];
      
      // Filter sites based on DC Type and Sub Type
      const matchingSites = sites.filter(site => 
        site['DC Type'] === testCase.dcType && 
        site['Sub Type'] === testCase.subType
      );
      
      matchingSites.forEach(site => {
        // Create entries for each phase (you might want to make this configurable)
        const phases = ['Phase 1', 'Phase 2', 'Phase 3'];
        
        phases.forEach(phase => {
          // Create entries for each cell name (you might want to make this configurable)
          const cellNames = [`${testCase.cellType} 123`, `${testCase.cellType} 456`];
          
          cellNames.forEach(cellName => {
            const uniqueTestId = `${site.City}_${phase}_${testCase.cellType}_${cellName}_${testCase.testId}`.replace(/\s+/g, '_');
            
            // Create driveway configuration
            let drivewayConfig = {};
            if (multiDriveway && drivewayTypes.length > 0) {
              for (let i = 1; i <= numberOfDriveways; i++) {
                drivewayConfig[`driveway${i}`] = drivewayTypes[i - 1] || drivewayTypes[0] || '';
              }
            }
            
            const testStatusEntry = {
              dcType: testCase.dcType,
              subType: testCase.subType,
              testId: testCase.testId,
              site: `${site.City} - ${site['DC Number']}`,
              phase: phase,
              cellType: testCase.cellType,
              cell: cellName,
              testCase: testCase.testCase,
              uniqueTestId: uniqueTestId,
              scope: testCase.scope,
              status: 'NOT RUN',
              lastModified: new Date().toLocaleString(),
              modifiedUser: '',
              driveway1: multiDriveway ? (drivewayConfig.driveway1 || '') : '',
              driveway2: multiDriveway ? (drivewayConfig.driveway2 || '') : '',
              driveway1Status: multiDriveway ? 'NOT RUN' : 'NOT RUN',
              driveway2Status: multiDriveway ? 'NOT RUN' : 'NOT RUN',
              drivewayConfig: JSON.stringify(drivewayConfig),
              multiDriveway: multiDriveway,
              vtVolume: '',
              vtDate: '',
              vtStartTime: '',
              vtEndTime: '',
              vtAvailability: '',
              chVolume: '',
              chDate: ''
            };
            
            newTestStatusEntries.push(testStatusEntry);
          });
        });
      });
      
      // Add new entries to existing test status
      const updatedTestStatus = [...existingTestStatus, ...newTestStatusEntries];
      excelService.writeTestStatus(updatedTestStatus);
      
    } catch (error) {
      console.error('Error creating test status entries:', error);
      throw error;
    }
  }

  async removeTestStatusEntriesForTestCase(testCase) {
    try {
      const existingTestStatus = excelService.readTestStatus();
      
      // Remove all test status entries that match this test case
      const updatedTestStatus = existingTestStatus.filter(ts => 
        !(ts.dcType === testCase.dcType &&
          ts.subType === testCase.subType &&
          ts.cellType === testCase.cellType && 
          ts.testCase === testCase.testCase && 
          ts.testId === testCase.testId)
      );
      
      excelService.writeTestStatus(updatedTestStatus);
      
    } catch (error) {
      console.error('Error removing test status entries:', error);
      throw error;
    }
  }

}

module.exports = new TestCasesController();