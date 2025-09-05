const excelService = require('../services/excelService');
const LoggingMiddleware = require('../middleware/loggingMiddleware');

class SetupController {
  async createSiteConfiguration(req, res) {
    try {
      const { siteName, phase, cellTypes, user } = req.body;
      
      // Validate input
      if (!siteName || !phase || !cellTypes || cellTypes.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Site name, phase, and at least one cell type are required' 
        });
      }

      // 1. Get DC type and subtype from selected site
      const siteInfo = excelService.readSiteInfo();
      const selectedSite = siteInfo.find(site => {
        const formatted = `${site.City || ''} - ${site['DC Number'] || ''}`;
        return formatted === siteName || site.siteName === siteName;
      });
      
      if (!selectedSite) {
        return res.status(400).json({
          success: false,
          message: 'Selected site not found in site information'
        });
      }

      const dcType = selectedSite['DC Type'] || '';
      const dcSubType = selectedSite['Sub Type'] || '';

      // 2. Get all test cases
      const allTestCases = excelService.readTestCases();
      const newStatusEntries = [];
      
      // 3. Process each cell type
      cellTypes.forEach(cellType => {
        const { cellType: type, quantity, cellNames, drivewayConfig } = cellType;
        const quantityNum = parseInt(quantity);
        
        // Create cell IDs from user input
        const cellIds = cellNames && cellNames.length === quantityNum 
          ? cellNames.map(name => name ? `${type} ${name}` : `${type}${quantityNum + 1}`)
          : Array.from({ length: quantityNum }, (_, i) => `${type}${i + 1}`);
        
        // Get test cases for this cell type
        const testCasesForType = allTestCases.filter(tc => tc.cellType === type);
        
        // Process each test case
        testCasesForType.forEach(testCase => {
          // Check phase compatibility
          const testCasePhase = testCase.phase || 'All';
          if (testCasePhase !== 'All' && testCasePhase !== phase) {
            return; // Skip if phase doesn't match
          }
          
          // Determine which cells this test case applies to
          const cellsCoverage = testCase.cells || 'All';
          let applicableCells = [];
          
          if (cellsCoverage === 'System') {
            // System tests run once per phase
            applicableCells = ['SYSTEM'];
          } else if (cellsCoverage === 'First') {
            // First tests run only for first cell
            applicableCells = [cellIds[0]];
          } else if (cellsCoverage === 'All') {
            // All tests run for every cell
            applicableCells = cellIds;
          }
          
          // Create status entry for each applicable cell
          applicableCells.forEach(cellId => {
            const uniqueTestId = `${siteName}_${phase}_${cellId}_${testCase.testId}`.replace(/\s+/g, '_');
            
            // Handle driveway configuration
            let drivewayConfigValue = 'Single Drive';
            let multiDriveway = false;
            
            if (type === 'FLIB' && drivewayConfig && drivewayConfig[cellIds.indexOf(cellId)]) {
              multiDriveway = true;
              const userDrivewayConfig = drivewayConfig[cellIds.indexOf(cellId)];
              drivewayConfigValue = Object.entries(userDrivewayConfig)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            }
            
            const statusEntry = {
              dcType: dcType,
              subType: dcSubType,
              site: siteName,
              phase: phase,
              cellType: type,
              cell: cellId,
              testCase: testCase.testCase,
              testId: testCase.testId,
              uniqueTestId: uniqueTestId,
              scope: testCase.scope,
              cells: testCase.cells || 'All', // Add cells property from test case
              status: 'NOT RUN',
              lastModified: new Date().toISOString(),
              modifiedUser: user,
              drivewayConfig: drivewayConfigValue,
              multiDriveway: multiDriveway,
              chVolume: '',
              chDate: '',
              vtVolume: '',
              vtDate: '',
              vtStartTime: '',
              vtEndTime: '',
              vtAvailability: '',
              liveDate: '',
              notes: ''
            };
            
            newStatusEntries.push(statusEntry);
          });
        });
      });
      
      // 4. Handle General test cases (phase-based, not cell-based)
      const generalTestCases = allTestCases.filter(tc => tc.cellType === 'General');
      generalTestCases.forEach(testCase => {
        const testCasePhase = testCase.phase || 'All';
        if (testCasePhase === 'All' || testCasePhase === phase) {
          const uniqueTestId = `${siteName}_${phase}_GENERAL_${testCase.testId}`.replace(/\s+/g, '_');
          
          const statusEntry = {
            dcType: dcType,
            subType: dcSubType,
            site: siteName,
            phase: phase,
            cellType: 'General',
            cell: 'GENERAL',
            testCase: testCase.testCase,
            testId: testCase.testId,
            uniqueTestId: uniqueTestId,
            scope: testCase.scope,
            cells: testCase.cells || 'All', // Add cells property from test case
            status: 'NOT RUN',
            lastModified: new Date().toISOString(),
            modifiedUser: user,
            drivewayConfig: 'N/A',
            multiDriveway: false,
            chVolume: '',
            chDate: '',
            vtVolume: '',
            vtDate: '',
            vtStartTime: '',
            vtEndTime: '',
            vtAvailability: '',
            liveDate: '',
            notes: ''
          };
          
          newStatusEntries.push(statusEntry);
        }
      });

      // 5. Save to Excel file
      const existingStatus = excelService.readTestStatus();
      const updatedStatus = [...existingStatus, ...newStatusEntries];
      excelService.writeTestStatus(updatedStatus);

      // 6. Log the activity
      LoggingMiddleware.logAction('CREATE_SITE_CONFIGURATION', 
        `Created site configuration for ${siteName} - ${phase} with ${cellTypes.length} cell types and ${newStatusEntries.length} test cases`,
        req
      );

      res.json({
        success: true,
        message: 'Site configuration created successfully',
        data: {
          siteName,
          phase,
          dcType,
          dcSubType,
          cellTypesCount: cellTypes.length,
          testCasesCreated: newStatusEntries.length
        }
      });

    } catch (error) {
      console.error('Error creating site configuration:', error);
      LoggingMiddleware.logAction('ERROR', `Error creating site configuration: ${error.message}`, req);
      
      res.status(500).json({
        success: false,
        message: 'Error creating site configuration',
        error: error.message
      });
    }
  }

  async getSiteOptions(req, res) {
    try {
      const sites = excelService.readSiteInfo();
      const options = sites.map(site => ({
        label: `${site.City || ''} - ${site['DC Number'] || ''}`.trim(),
        value: `${site.City || ''} - ${site['DC Number'] || ''}`.trim()
      }));
      
      res.json({
        success: true,
        data: options
      });
    } catch (error) {
      console.error('Error getting site options:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting site options',
        error: error.message
      });
    }
  }

  async getSites(req, res) {
    try {
      const sites = excelService.readSiteInfo();
      res.json({
        success: true,
        data: sites
      });
    } catch (error) {
      console.error('Error getting sites:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting sites',
        error: error.message
      });
    }
  }

  async getPhasesForSite(req, res) {
    try {
      const { siteName } = req.params;
      
      if (!siteName) {
        return res.status(400).json({
          success: false,
          message: 'Site name is required'
        });
      }

      // Get test status data to find phases for this site
      const testStatusData = excelService.readTestStatus();
      
      // Filter phases for the specific site
      const sitePhases = [...new Set(
        testStatusData
          .filter(entry => entry.site === siteName)
          .map(entry => entry.phase)
          .filter(phase => phase && phase !== '')
      )];

      // Sort phases numerically if they follow a pattern like "Phase 1", "Phase 2", etc.
      const sortedPhases = sitePhases.sort((a, b) => {
        const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
        const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
        return aNum - bNum;
      });

      res.json({
        success: true,
        data: sortedPhases
      });
    } catch (error) {
      console.error('Error getting phases for site:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get phases for site'
      });
    }
  }
}

module.exports = new SetupController();