const excelService = require('../services/excelService');

// Move generateCellIds outside the class to avoid scope issues
function generateCellIds(cellType, quantity) {
  const baseNumbers = {
    'A': 100, 'B': 200, 'C': 300, 'D': 400, 'MCP': 500
  };
  
  const baseNumber = baseNumbers[cellType] || (cellType.charCodeAt(0) * 100);
  return Array.from({ length: quantity }, (_, i) => `${cellType}${baseNumber + i + 1}`);
}

class SetupController {
  async createSiteConfiguration(req, res) {
    console.log('=== SETUP REQUEST RECEIVED ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { siteNumber, phase, machines, user } = req.body;
      
      console.log('Extracted data:', { siteNumber, phase, machines, user });
      
      // Get test cases for validation
      console.log('Reading test cases...');
      const allTestCases = excelService.readTestCases();
      console.log('Test cases loaded:', allTestCases.length);
      
      // Generate test status entries
      const newStatusEntries = [];
      
      machines.forEach(machine => {
        const { type, quantity } = machine;
        console.log(`Processing machine: ${type} x ${quantity}`);
        
        const cellIds = generateCellIds(type, quantity); // Use the standalone function
        console.log('Generated cell IDs:', cellIds);
        
        const relevantTestCases = allTestCases.filter(tc => tc.cellType === type);
        console.log(`Found ${relevantTestCases.length} test cases for type ${type}`);
        
        cellIds.forEach(cellId => {
          relevantTestCases.forEach(testCase => {
            newStatusEntries.push({
              site: siteNumber,
              phase: phase,
              cellType: type,
              cell: cellId,
              testCase: testCase.testCase,
              caseId: testCase.caseId,
              status: 'NOT RUN',
              lastModified: new Date().toISOString(),
              modifiedUser: user
            });
          });
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
        message: `Site ${siteNumber} - ${phase} configured successfully`,
        data: {
          entriesCreated: newStatusEntries.length,
          machines: machines.map(m => ({
            type: m.type,
            quantity: m.quantity,
            cells: generateCellIds(m.type, m.quantity), // Use standalone function here too
            testCases: allTestCases.filter(tc => tc.cellType === m.type).length
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