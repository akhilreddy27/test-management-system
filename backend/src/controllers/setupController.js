const excelService = require('../services/excelService');

class SetupController {
  async createSiteConfiguration(req, res) {
    console.log('=== SETUP REQUEST RECEIVED ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { siteName, phase, cellTypes, user } = req.body;
      
      console.log('Extracted data:', { siteName, phase, cellTypes, user });
      
      // Get test cases for validation
      console.log('Reading test cases...');
      const allTestCases = excelService.readTestCases();
      console.log('Test cases loaded:', allTestCases.length);
      
      // Generate test status entries
      const newStatusEntries = [];
      
      cellTypes.forEach(cellType => {
        const { cellType: type, quantity, cellNames } = cellType;
        console.log(`Processing cell type: ${type} x ${quantity}`);
        console.log('Custom cell names:', cellNames);
        
        // Use custom cell names if provided, otherwise generate default ones
        const quantityNum = parseInt(quantity);
        const cellIds = cellNames && cellNames.length === quantityNum ? 
          cellNames : 
          Array.from({ length: quantityNum }, (_, i) => `${type}${i + 1}`);
        
        console.log('Using cell IDs:', cellIds);
        
        // Include all non-System scope test cases for individual cells (Cell, Safety, and any new scopes)
        const relevantTestCases = allTestCases.filter(tc => 
          tc.cellType === type && tc.scope !== 'System'
        );
        console.log(`Found ${relevantTestCases.length} non-System test cases for type ${type}`);
        
        cellIds.forEach(cellId => {
          relevantTestCases.forEach(testCase => {
            // Generate unique ID: {site}_{phase}_{cellName}_{testId}
            const uniqueTestId = `${siteName}_${phase}_${cellId}_${testCase.testId}`.replace(/\s+/g, '_');
            
            newStatusEntries.push({
              site: siteName,
              phase: phase,
              cellType: type,
              cell: cellId,
              testCase: testCase.testCase,
              testId: testCase.testId, // Keep original test ID
              uniqueTestId: uniqueTestId, // Add unique test ID
              scope: testCase.scope,
              status: 'NOT RUN',
              lastModified: new Date().toISOString(),
              modifiedUser: user,
              chVolume: '',
              chDate: '',
              vtVolume: '',
              vtStartDateTime: '',
              vtEndDateTime: '',
              vtAvailability: ''
            });
          });
        });
      });

      // Also create System scope test cases for configured cell types
      const configuredCellTypes = cellTypes.map(ct => ct.cellType);
      const systemTestCases = allTestCases.filter(tc => 
        tc.scope === 'System' && configuredCellTypes.includes(tc.cellType)
      );
      console.log(`Found ${systemTestCases.length} system test cases for configured cell types`);
      
      systemTestCases.forEach(testCase => {
        // Generate unique ID for system test cases: {site}_{phase}_SYSTEM_{testId}
        const uniqueTestId = `${siteName}_${phase}_SYSTEM_${testCase.testId}`.replace(/\s+/g, '_');
        
        newStatusEntries.push({
          site: siteName,
          phase: phase,
          cellType: testCase.cellType,
          cell: 'SYSTEM',
          testCase: testCase.testCase,
          testId: testCase.testId, // Keep original test ID
          uniqueTestId: uniqueTestId, // Add unique test ID
          scope: testCase.scope,
          status: 'NOT RUN',
          lastModified: new Date().toISOString(),
          modifiedUser: user,
          chVolume: '',
          chDate: '',
          vtVolume: '',
          vtStartDateTime: '',
          vtEndDateTime: '',
          vtAvailability: ''
        });
      });

      console.log(`Created ${newStatusEntries.length} new status entries`);

      // Read existing status and merge
      console.log('Reading existing test status...');
      const existingStatus = excelService.readTestStatus();
      console.log('Existing status entries:', existingStatus.length);
      
      const updatedStatus = [...existingStatus, ...newStatusEntries];
      console.log('Total entries to write:', updatedStatus.length);
      
      // Write back to Excel
      console.log('Writing to Excel file...');
      excelService.writeTestStatus(updatedStatus);
      console.log('Excel file updated successfully!');

      res.json({
        success: true,
        message: `Site ${siteName} - ${phase} configured successfully`,
        data: {
          entriesCreated: newStatusEntries.length,
          cellTypes: cellTypes.map(ct => ({
            type: ct.cellType,
            quantity: ct.quantity,
            cells: ct.cellNames || Array.from({ length: ct.quantity }, (_, i) => `${ct.cellType}${i + 1}`),
            testCases: allTestCases.filter(tc => tc.cellType === ct.cellType).length
          }))
        }
      });
    } catch (error) {
      console.error('=== SETUP ERROR ===');
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      
      res.status(500).json({
        success: false,
        message: 'Error creating site configuration',
        error: error.message
      });
    }
  }

  async getSites(req, res) {
    try {
      const testStatus = excelService.readTestStatus();
      
      // Group by site and phase
      const sites = {};
      testStatus.forEach(entry => {
        if (!sites[entry.site]) {
          sites[entry.site] = {};
        }
        if (!sites[entry.site][entry.phase]) {
          sites[entry.site][entry.phase] = {
            machines: []
          };
        }
      });

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
}

module.exports = new SetupController();