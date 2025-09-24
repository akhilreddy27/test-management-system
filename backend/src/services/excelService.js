const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const loggingConfig = require('../config/loggingConfig');

class ExcelService {
  constructor() {
    this.dataPath = path.join(__dirname, '../../data');
    this.logFilePath = path.join(this.dataPath, `${loggingConfig.file.name}.xlsx`);
  }

  logUIChange(changeData) {
    try {
      if (!loggingConfig.isEnabled()) {
        return true;
      }

      const timestamp = new Date().toISOString();
      const logEntry = {
        'Timestamp': timestamp,
        'Date': new Date(timestamp).toLocaleDateString(),
        'Time': new Date(timestamp).toLocaleTimeString(),
        'User': changeData.user || 'Unknown',
        'Action': changeData.action || 'Unknown',
        'MODULE': changeData.module || 'Unknown',
        'SITE': changeData.site || '',
        'PHASE': changeData.phase || '',
        'CELL_TYPE': changeData.cellType || '',
        'CELL': changeData.cell || '',
        'TEST_CASE': changeData.testCase || '',
        'TEST_ID': changeData.testId || '',
        'OLD_VALUE': changeData.oldValue || '',
        'NEW_VALUE': changeData.newValue || '',
        'DETAILS': changeData.details || '',
        'IP_ADDRESS': changeData.ipAddress || '',
        'USER_AGENT': changeData.userAgent || ''
      };

      let existingLogs = [];
      if (fs.existsSync(this.logFilePath)) {
        try {
          const workbook = XLSX.readFile(this.logFilePath);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          existingLogs = XLSX.utils.sheet_to_json(worksheet);
        } catch (error) {
          console.error('Error reading existing logs:', error);
          existingLogs = [];
        }
      }

      existingLogs.push(logEntry);

      const maxEntries = loggingConfig.file.maxEntries;
      if (existingLogs.length > maxEntries) {
        console.log(`Log file reached ${existingLogs.length} entries. Keeping only the last ${maxEntries} entries.`);
        existingLogs = existingLogs.slice(-maxEntries);
        
        if (loggingConfig.file.autoRotate) {
          this.rotateLogFile(existingLogs);
        }
      }

      const worksheet = XLSX.utils.json_to_sheet(existingLogs);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'UI Changes Log');
      
      XLSX.writeFile(workbook, this.logFilePath);
      
      if (!changeData.action || !changeData.action.includes('LOGGING')) {
        console.log(`UI change logged: ${changeData.action} by ${changeData.user} at ${timestamp}`);
      }

      this.checkMonitoringAlerts(existingLogs.length);
      
      return true;
    } catch (error) {
      console.error('Error logging UI change:', error);
      return false;
    }
  }

  rotateLogFile(currentLogs) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${loggingConfig.file.name}_backup_${timestamp}.xlsx`;
      const backupPath = path.join(this.dataPath, backupFileName);
      
      const worksheet = XLSX.utils.json_to_sheet(currentLogs);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'UI Changes Log');
      XLSX.writeFile(workbook, backupPath);
      
      console.log(`Log file rotated: ${backupFileName}`);
      
      this.cleanupOldBackups();
    } catch (error) {
      console.error('Error rotating log file:', error);
    }
  }

  cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.dataPath);
      const backupFiles = files.filter(file => 
        file.startsWith(`${loggingConfig.file.name}_backup_`) && file.endsWith('.xlsx')
      );
      
      backupFiles.sort((a, b) => {
        const statA = fs.statSync(path.join(this.dataPath, a));
        const statB = fs.statSync(path.join(this.dataPath, b));
        return statA.birthtime - statB.birthtime;
      });
      
      const keepCount = loggingConfig.file.keepBackups;
      if (backupFiles.length > keepCount) {
        const filesToDelete = backupFiles.slice(0, backupFiles.length - keepCount);
        filesToDelete.forEach(file => {
          fs.unlinkSync(path.join(this.dataPath, file));
          console.log(`Deleted old backup: ${file}`);
        });
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  checkMonitoringAlerts(logCount) {
    if (!loggingConfig.monitoring.enabled) {
      return;
    }

    try {
      if (fs.existsSync(this.logFilePath)) {
        const stats = fs.statSync(this.logFilePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        if (fileSizeMB > loggingConfig.monitoring.maxFileSizeMB) {
          console.warn(`⚠️ Log file size (${fileSizeMB.toFixed(2)}MB) exceeds limit (${loggingConfig.monitoring.maxFileSizeMB}MB)`);
        }
      }

      if (logCount > loggingConfig.monitoring.maxEntriesAlert) {
        console.warn(`⚠️ Log entries (${logCount}) approaching limit (${loggingConfig.file.maxEntries})`);
      }
    } catch (error) {
      console.error('Error checking monitoring alerts:', error);
    }
  }

  readUIChangeLogs(filters = {}) {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return [];
      }

      const workbook = XLSX.readFile(this.logFilePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      let logs = XLSX.utils.sheet_to_json(worksheet);
      
      if (filters.user) {
        logs = logs.filter(log => log['User'] === filters.user);
      }
      if (filters.action) {
        logs = logs.filter(log => log['Action'] === filters.action);
      }
      if (filters.module) {
        logs = logs.filter(log => log['Module'] === filters.module);
      }
      if (filters.site) {
        logs = logs.filter(log => log['Site'] === filters.site);
      }
      if (filters.startDate) {
        logs = logs.filter(log => new Date(log['Timestamp']) >= new Date(filters.startDate));
      }
      if (filters.endDate) {
        logs = logs.filter(log => new Date(log['Timestamp']) <= new Date(filters.endDate));
      }
      
      return logs;
    } catch (error) {
      console.error('Error reading UI change logs:', error);
      return [];
    }
  }

  readTestCases() {
    try {
      const filePath = path.join(this.dataPath, 'test_cases.xlsx');
      
      if (!fs.existsSync(filePath)) {
        throw new Error('test_cases.xlsx not found in data folder');
      }

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      return jsonData.map(row => ({
        dcType: row['DC_TYPE'] || '',
        subType: row['SUB_TYPE'] || '',
        cellType: row['CELL_TYPE'],
        testCase: row['TEST_CASE'],
        testId: row['TEST_ID'],
        scope: row['SCOPE'],
        phase: row['PHASE'],
        steps: row['STEPS'] || '',
        description: row['DESCRIPTION'] || '',
        multiDriveway: row['MULTI_DRIVEWAY'] === 'true' || row['MULTI_DRIVEWAY'] === true || row['MULTI_DRIVEWAY'] === 'TRUE' || row['MULTI_DRIVEWAY'] === 1,
        drivewayType: row['DRIVEWAY_TYPE'] || 'N/A',
        combinedTest: row['COMBINED_TEST'] === 'true' || row['COMBINED_TEST'] === true || row['COMBINED_TEST'] === 'TRUE' || row['COMBINED_TEST'] === 1,
        // New columns you added
        cells: row['CELLS'] || '',
        image: row['IMAGE'] || '',
        requirements: row['REQUIREMENTS'] || '',
        // Audit columns
        lastModified: row['LAST_MODIFIED'] || null,
        modifiedUser: row['MODIFIED_USER'] || null
      }));
      
    } catch (error) {
      console.error('Error reading test cases:', error);
      throw error;
    }
  }

  writeTestCases(testCasesData) {
    try {
      const filePath = path.join(this.dataPath, 'test_cases.xlsx');
      
      const excelData = testCasesData.map(testCase => ({
        'DC_TYPE': testCase.dcType || '',
        'SUB_TYPE': testCase.subType || '',
        'CELL_TYPE': testCase.cellType,
        'TEST_CASE': testCase.testCase,
        'TEST_ID': testCase.testId,
        'SCOPE': testCase.scope,
        'PHASE': testCase.phase,
        'CELLS': testCase.cells || '',
        'DESCRIPTION': testCase.expectedOutput || '',
        'REQUIREMENTS': testCase.requirements || '',
        'STEPS': testCase.steps || '',
        'MULTI_DRIVEWAY': testCase.multiDriveway ? 'true' : 'false',
        'DRIVEWAY_TYPE': testCase.drivewayType || 'N/A',
        'COMBINED_TEST': testCase.combinedTest ? 'true' : 'false',
        'IMAGE': testCase.image || '',
        'LAST_MODIFIED': testCase.lastModified || '',
        'MODIFIED_USER': testCase.modifiedUser || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cases');
      
      XLSX.writeFile(workbook, filePath);
      
      console.log(`Successfully wrote ${testCasesData.length} test cases to test_cases.xlsx`);
      return true;
    } catch (error) {
      console.error('Error writing test cases:', error);
      throw error;
    }
  }

  readTestStatus() {
    try {
      const filePath = path.join(this.dataPath, 'test_status.xlsx');
      
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      return jsonData.map(row => {
        return {
          // Handle both old and new header formats
          dcType: row['DCTYPE'] || row['dcType'] || '',
          subType: row['SUBTYPE'] || row['subType'] || '',
          site: row['SITE'] || row['site'],
          phase: row['PHASE'] || row['phase'],
          cellType: row['CELLTYPE'] || row['cellType'],
          cell: row['CELL'] || row['cell'] || '',
          testCase: row['TESTCASE'] || row['testCase'],
          testId: row['TESTID'] || row['testId'],
          uniqueTestId: row['UNIQUETESTID'] || row['uniqueTestId'] || '',
          scope: row['SCOPE'] || row['scope'],
          cells: row['CELLS'] || row['cells'] || 'All',
          status: row['STATUS'] || row['status'] || 'NOT RUN',
          lastModified: row['LASTMODIFIED'] || row['lastModified'],
          modifiedUser: row['MODIFIEDUSER'] || row['modifiedUser'],
          drivewayConfig: row['DRIVEWAYCONFIG'] || row['drivewayConfig'] || '',
          multiDriveway: (row['MULTIDRIVEWAY'] === 'true' || row['MULTIDRIVEWAY'] === true || row['MULTIDRIVEWAY'] === 'TRUE' || row['MULTIDRIVEWAY'] === 1) ||
                        (row['multiDriveway'] === 'true' || row['multiDriveway'] === true || row['multiDriveway'] === 'TRUE' || row['multiDriveway'] === 1),
          vtVolume: row['VTVOLUME'] || row['vtVolume'] || '',
          vtDate: row['VTDATE'] || row['vtDate'] || '',
          vtStartTime: row['VTSTARTTIME'] || row['vtStartTime'] || '',
          vtEndTime: row['VTENDTIME'] || row['vtEndTime'] || '',
          vtAvailability: row['VTAVAILABILITY'] || row['vtAvailability'] || '',
          chVolume: row['CHVOLUME'] || row['chVolume'] || '',
          chDate: row['CHDATE'] || row['chDate'] || '',
          liveDate: row['LIVEDATE'] || row['liveDate'] || '',
          notes: row['NOTES'] || row['notes'] || ''
        };
      });
      
    } catch (error) {
      console.error('Error reading test status:', error);
      return [];
    }
  }

  writeTestStatus(statusData) {
    try {
      const filePath = path.join(this.dataPath, 'test_status.xlsx');
      
      const excelData = statusData.map(entry => {
        const excelRow = {
          'DCTYPE': entry.dcType || '',
          'SUBTYPE': entry.subType || '',
          'SITE': entry.site,
          'PHASE': entry.phase,
          'CELLTYPE': entry.cellType,
          'CELL': entry.cell || '',
          'TESTCASE': entry.testCase,
          'TESTID': entry.testId || '',
          'UNIQUETESTID': entry.uniqueTestId || '',
          'SCOPE': entry.scope || '',
          'CELLS': entry.cells || 'All',
          'STATUS': entry.status,
          'LASTMODIFIED': entry.lastModified ? new Date(entry.lastModified).toLocaleString() : '',
          'MODIFIEDUSER': entry.modifiedUser || '',
          'DRIVEWAYCONFIG': entry.drivewayConfig || '',
          'MULTIDRIVEWAY': entry.multiDriveway ? 'true' : 'false',
          'CHVOLUME': entry.chVolume || '',
          'CHDATE': entry.chDate || '',
          'VTVOLUME': entry.vtVolume || '',
          'VTDATE': entry.vtDate || '',
          'VTSTARTTIME': entry.vtStartTime || '',
          'VTENDTIME': entry.vtEndTime || '',
          'VTAVAILABILITY': entry.vtAvailability || '',
          'LIVEDATE': entry.liveDate || '',
          'NOTES': entry.notes || ''
        };

        return excelRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      XLSX.writeFile(workbook, filePath);
      
      console.log(`Updated test_status.xlsx with ${statusData.length} entries`);
      return true;
    } catch (error) {
      console.error('Error writing test status:', error);
      throw error;
    }
  }

  saveTestResults(resultsData) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `test_results_${resultsData.site}_${timestamp}.xlsx`;
      const filePath = path.join(this.dataPath, fileName);
      
      const excelData = [
        {
          'SUBMISSION_ID': resultsData.submissionId,
          'SITE': resultsData.site,
          'SUBMITTED_BY': resultsData.submittedBy,
          'SUBMITTED_AT': new Date(resultsData.submittedAt).toLocaleString(),
          'TOTAL_TESTS': resultsData.totalTests,
          'PASSED_TESTS': resultsData.passedTests,
          'PASS_RATE': `${Math.round((resultsData.passedTests / resultsData.totalTests) * 100)}%`
        },
        {},
        {
          'CELL_TYPE': 'Cell Type',
          'CELL': 'Cell',
          'TEST_CASE': 'Test Case',
          'CASE_ID': 'Case ID',
          'STATUS': 'Status',
          'PHASE': 'Phase',
          'LAST_MODIFIED': 'Last Modified',
          'MODIFIED_USER': 'Modified User'
        },
        ...resultsData.results.map(result => ({
          'CELL_TYPE': result.cellType,
          'CELL': result.cell,
          'TEST_CASE': result.testCase,
          'CASE_ID': result.caseId,
          'STATUS': result.status,
          'PHASE': result.phase,
          'LAST_MODIFIED': result.lastModified ? new Date(result.lastModified).toLocaleString() : '',
          'MODIFIED_USER': result.modifiedUser || ''
        }))
      ];

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Results');
      
      XLSX.writeFile(workbook, filePath);
      
      console.log(`Test results saved to: ${fileName}`);
      return true;
    } catch (error) {
      console.error('Error saving test results:', error);
      return false;
    }
  }

  readCellTypes() {
    try {
      const filePath = path.join(this.dataPath, 'cell_types.xlsx');
      
      if (!fs.existsSync(filePath)) {
        console.warn('cell_types.xlsx file not found');
        return [];
      }
      
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      return jsonData.map(row => {
        const typesString = row['TYPES'] || '';
        const drivewayTypes = typesString !== 'NA' ? typesString.split(',').map(t => t.trim()).filter(t => t && t !== '') : [];
        
        const drivewayCount = row['DRIVEWAY_COUNT'] === 'NA' ? 1 : parseInt(row['DRIVEWAY_COUNT']) || 1;
        
        return {
          cellType: row['CELL_TYPE'] || '',
          dcType: row['DC_TYPE'] || '',

          hasMultipleDriveways: row['MULTIPLE_DRIVEWAYS'] === true || row['MULTIPLE_DRIVEWAYS'] === 'true' || row['MULTIPLE_DRIVEWAYS'] === 'TRUE',
          numberOfDriveways: drivewayCount,
          drivewayTypes: drivewayTypes,
          driveway1Type: drivewayTypes[0] || '',
          driveway2Type: drivewayTypes[1] || '',
          driveway3Type: drivewayTypes[2] || '',
          driveway4Type: drivewayTypes[3] || '',
          description: row['DESCRIPTION'] || '',

        };
      });
      
    } catch (error) {
      console.error('Error reading cell types:', error);
      return [];
    }
  }

  writeCellTypes(cellTypesData) {
    try {
      const filePath = path.join(this.dataPath, 'cell_types.xlsx');
      
      const excelData = cellTypesData.map(cellType => ({
        'CELL_TYPE': cellType['CELL_TYPE'] || cellType.cellType,
        'DC_TYPE': cellType['DC_TYPE'] || cellType.dcType || '',

        'MULTIPLE_DRIVEWAYS': cellType['MULTIPLE_DRIVEWAYS'] || cellType.hasMultipleDriveways,
        'DRIVEWAY_COUNT': cellType['DRIVEWAY_COUNT'] || cellType.numberOfDriveways,
        'TYPES': cellType['TYPES'] || (cellType.drivewayTypes ? cellType.drivewayTypes.join(', ') : 'NA'),
        'DESCRIPTION': cellType['DESCRIPTION'] || cellType.description || '',

      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      XLSX.writeFile(workbook, filePath);
      
      console.log(`Updated cell_types.xlsx with ${cellTypesData.length} entries`);
      return true;
    } catch (error) {
      console.error('Error writing cell types:', error);
      throw error;
    }
  }

  // Method to clean up existing cell_types.xlsx by removing Sub Type column
  cleanupCellTypesFile() {
    try {
      const filePath = path.join(this.dataPath, 'cell_types.xlsx');
      
      if (!fs.existsSync(filePath)) {
        console.log('cell_types.xlsx file not found, nothing to clean up');
        return true;
      }
      
      // Read existing data
      const existingData = this.readCellTypes();
      
      // Write back without Sub Type column
      this.writeCellTypes(existingData);
      
      console.log('Successfully cleaned up cell_types.xlsx file - removed Sub Type column');
      return true;
    } catch (error) {
      console.error('Error cleaning up cell types file:', error);
      return false;
    }
  }





  readSiteInfo() {
    try {
      const filePath = path.join(this.dataPath, 'site_info.xlsx');
      
      if (!fs.existsSync(filePath)) {
        console.warn('site_info.xlsx file not found');
        return [];
      }
      
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      return jsonData.map(row => ({
        NETWORK: row['NETWORK'] || '',
        DC_TYPE: row['DC_TYPE'] || '',
        SUB_TYPE: row['SUB_TYPE'] || '',
        DC_NUMBER: row['DC_NUMBER'] || '',
        CITY: row['CITY'] || '',
        STATE: row['STATE'] || ''
      }));
      
    } catch (error) {
      console.error('Error reading site info:', error);
      return [];
    }
  }

  // Generic method to read Excel files
  async readExcel(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`Excel file does not exist: ${filePath}`);
        return [];
      }

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`Read ${data.length} rows from ${filePath}`);
      return data;
    } catch (error) {
      console.error('Error reading Excel file:', error);
      throw error;
    }
  }

  // Generic method to write Excel files
  async writeExcel(filePath, data, headers) {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      
      // Set headers if provided
      if (headers && headers.length > 0) {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        worksheet['!ref'] = XLSX.utils.encode_range({
          s: { c: 0, r: 0 },
          e: { c: headers.length - 1, r: data.length }
        });
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      XLSX.writeFile(workbook, filePath);
      
      console.log(`Wrote ${data.length} rows to ${filePath}`);
      return true;
    } catch (error) {
      console.error('Error writing Excel file:', error);
      throw error;
    }
  }

  migrateTestCasesFile() {
    try {
      const filePath = path.join(this.dataPath, 'test_cases.xlsx');
      
      if (!fs.existsSync(filePath)) {
        console.log('test_cases.xlsx not found, nothing to migrate');
        return true;
      }

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Add DC Type and Sub Type columns if they don't exist
      const migratedData = jsonData.map(row => ({
        'DC Type': row['DC Type'] || '',
        'Sub Type': row['Sub Type'] || '',
        'Cell Type': row['Cell Type'] || '',
        'Test Case': row['Test Case'] || '',
        'Test ID': row['Test ID'] || '',
        'Scope': row['Scope'] || '',
        'Phase': row['Phase'] || '',
        'Steps': row['Steps'] || '',
        'Expected Output': row['Expected Output'] || '',
        'Multi Driveway': row['Multi Driveway'] || false,
        'Driveway Type': row['Driveway Type'] || 'N/A',
        'Combined Test': row['Combined Test'] || false
      }));

      const newWorksheet = XLSX.utils.json_to_sheet(migratedData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Test Cases');
      
      XLSX.writeFile(newWorkbook, filePath);
      
      console.log('Successfully migrated test_cases.xlsx - added DC Type and Sub Type columns');
      return true;
    } catch (error) {
      console.error('Error migrating test cases file:', error);
      throw error;
    }
  }

  migrateTestStatusFile() {
    try {
      const filePath = path.join(this.dataPath, 'test_status.xlsx');
      
      if (!fs.existsSync(filePath)) {
        console.log('test_status.xlsx not found, nothing to migrate');
        return true;
      }

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Add DC Type and Sub Type columns if they don't exist
      const migratedData = jsonData.map(row => ({
        'DC Type': row['DC Type'] || '',
        'Sub Type': row['Sub Type'] || '',
        'Site': row['Site'] || '',
        'Phase': row['Phase'] || '',
        'Cell Type': row['Cell Type'] || '',
        'Cell Name': row['Cell Name'] || '', // Updated to match your "Cell Name" column
        'Test Case': row['Test Case'] || '',
        'Test ID': row['Test ID'] || '',
        'Unique Test ID': row['Unique Test ID'] || '',
        'Scope': row['Scope'] || '',
        'Status': row['Status'] || 'NOT RUN',
        'Last modified': row['Last modified'] || '',
        'Modified User': row['Modified User'] || '',
        'Driveway Config': row['Driveway Config'] || '', // Simplified as per your structure
        'Multi Driveway': row['Multi Driveway'] || false,
        'VT Volume': row['VT Volume'] || '',
        'VT Date': row['VT Date'] || '',
        'VT Start Time': row['VT Start Time'] || '',
        'VT End Time': row['VT End Time'] || '',
        'VT Availability': row['VT Availability'] || '',
        'CH Volume': row['CH Volume'] || '',
        'CH Date': row['CH Date'] || '',
        'Live Date': row['Live Date'] || '', // Added your "Live Date" column
        'Notes': row['Notes'] || '' // Added your "Notes" column
      }));

      const newWorksheet = XLSX.utils.json_to_sheet(migratedData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
      
      XLSX.writeFile(newWorkbook, filePath);
      
      console.log('Successfully migrated test_status.xlsx - added DC Type and Sub Type columns');
      return true;
    } catch (error) {
      console.error('Error migrating test status file:', error);
      throw error;
    }
  }

  // Tickets methods
  readTickets() {
    try {
      const filePath = path.join(__dirname, '../../data/tickets.xlsx');
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      return data.map((row, index) => ({
        id: index + 1,
        site: row['SITE'] || '',
        ticketId: row['TICKET_ID'] || '',
        title: row['TITLE'] || '',
        description: row['DESCRIPTION'] || '',
        status: row['STATUS'] || 'Open',
        priority: row['PRIORITY'] || 'Medium',
        assignee: row['ASSIGNEE'] || '',
        reporter: row['REPORTER'] || '',
        date: row['DATE'] || '',
        tags: row['TAGS'] || '',
        cell: row['CELL'] || '',
        createdAt: row['CREATED_AT'] || '',
        updatedAt: row['UPDATED_AT'] || ''
      }));
    } catch (error) {
      console.error('Error reading tickets:', error);
      return [];
    }
  }

  createTicket(ticketData) {
    try {
      // Debug: Log the received data
      console.log('Debug - Excel service received ticket data:', JSON.stringify(ticketData, null, 2));
      console.log('Debug - Cell value in Excel service:', ticketData.cell);
      console.log('Debug - Cell type in Excel service:', typeof ticketData.cell);
      
      const filePath = path.join(__dirname, '../../data/tickets.xlsx');
      let workbook;
      let worksheet;
      
      try {
        workbook = XLSX.readFile(filePath);
        worksheet = workbook.Sheets[workbook.SheetNames[0]];
      } catch (error) {
        // File doesn't exist, create new workbook
        workbook = XLSX.utils.book_new();
        worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Tickets');
      }
      
      const existingData = XLSX.utils.sheet_to_json(worksheet);
      const newTicket = {
        'SITE': ticketData.site || '',
        'CELL': ticketData.cell || '', // Ensure cell is never undefined
        'TICKET_ID': ticketData.ticketId,
        'TITLE': ticketData.title,
        'DESCRIPTION': ticketData.description,
        'STATUS': ticketData.status,
        'PRIORITY': ticketData.priority,
        'ASSIGNEE': ticketData.assignee,
        'REPORTER': ticketData.reporter,
        'DATE': ticketData.date,
        'TAGS': ticketData.tags,
        'CREATED_AT': ticketData.createdAt,
        'UPDATED_AT': ticketData.updatedAt
      };
      
      console.log('Debug - New ticket object before saving:', JSON.stringify(newTicket, null, 2));
      
      existingData.push(newTicket);
      
      const newWorksheet = XLSX.utils.json_to_sheet(existingData);
      workbook.Sheets['Tickets'] = newWorksheet;
      
      XLSX.writeFile(workbook, filePath);
      return true;
    } catch (error) {
      console.error('Error creating ticket:', error);
      return false;
    }
  }

  updateTicket(id, updateData) {
    try {
      const filePath = path.join(__dirname, '../../data/tickets.xlsx');
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      if (id > data.length || id < 1) {
        return false;
      }
      
      const ticketIndex = id - 1;
      const existingTicket = data[ticketIndex];
      
      // Update only provided fields
      const updatedTicket = {
        ...existingTicket,
        'SITE': updateData.site !== undefined ? updateData.site : existingTicket['SITE'],
        'CELL': updateData.cell !== undefined ? (updateData.cell || '') : (existingTicket['CELL'] || ''),
        'TICKET_ID': updateData.ticketId !== undefined ? updateData.ticketId : existingTicket['TICKET_ID'],
        'TITLE': updateData.title !== undefined ? updateData.title : existingTicket['TITLE'],
        'DESCRIPTION': updateData.description !== undefined ? updateData.description : existingTicket['DESCRIPTION'],
        'STATUS': updateData.status !== undefined ? updateData.status : existingTicket['STATUS'],
        'PRIORITY': updateData.priority !== undefined ? updateData.priority : existingTicket['PRIORITY'],
        'ASSIGNEE': updateData.assignee !== undefined ? updateData.assignee : existingTicket['ASSIGNEE'],
        'REPORTER': updateData.reporter !== undefined ? updateData.reporter : existingTicket['REPORTER'],
        'DATE': updateData.date !== undefined ? updateData.date : existingTicket['DATE'],
        'TAGS': updateData.tags !== undefined ? updateData.tags : existingTicket['TAGS'],
        'UPDATED_AT': updateData.updatedAt || new Date().toISOString()
      };
      
      data[ticketIndex] = updatedTicket;
      
      const newWorksheet = XLSX.utils.json_to_sheet(data);
      workbook.Sheets['Tickets'] = newWorksheet;
      
      XLSX.writeFile(workbook, filePath);
      return true;
    } catch (error) {
      console.error('Error updating ticket:', error);
      return false;
    }
  }

  deleteTicket(id) {
    try {
      const filePath = path.join(__dirname, '../../data/tickets.xlsx');
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      if (id > data.length || id < 1) {
        return false;
      }
      
      data.splice(id - 1, 1);
      
      const newWorksheet = XLSX.utils.json_to_sheet(data);
      workbook.Sheets['Tickets'] = newWorksheet;
      
      XLSX.writeFile(workbook, filePath);
      return true;
    } catch (error) {
      console.error('Error deleting ticket:', error);
      return false;
    }
  }
}

module.exports = new ExcelService();