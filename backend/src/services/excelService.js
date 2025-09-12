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
        'Module': changeData.module || 'Unknown',
        'Site': changeData.site || '',
        'Phase': changeData.phase || '',
        'Cell Type': changeData.cellType || '',
        'Cell': changeData.cell || '',
        'Test Case': changeData.testCase || '',
        'Test ID': changeData.testId || '',
        'Old Value': changeData.oldValue || '',
        'New Value': changeData.newValue || '',
        'Details': changeData.details || '',
        'IP Address': changeData.ipAddress || '',
        'User Agent': changeData.userAgent || ''
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
        dcType: row['DC Type'] || '',
        subType: row['Sub Type'] || '',
        cellType: row['Cell Type'],
        testCase: row['Test Case'],
        testId: row['Test ID'],
        scope: row['Scope'],
        phase: row['Phase'],
        steps: row['Steps'] || '',
        description: row['Description'] || '',
        multiDriveway: row['Multi Driveway'] === 'true' || row['Multi Driveway'] === true || row['Multi Driveway'] === 'TRUE' || row['Multi Driveway'] === 1,
        drivewayType: row['Driveway Type'] || 'N/A',
        combinedTest: row['Combined Test'] === 'true' || row['Combined Test'] === true || row['Combined Test'] === 'TRUE' || row['Combined Test'] === 1,
        // New columns you added
        cells: row['Cells'] || '',
        image: row['Image'] || '',
        requirements: row['Requirements'] || '',
        // Audit columns
        lastModified: row['Last Modified'] || null,
        modifiedUser: row['Modified User'] || null
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
        'DC Type': testCase.dcType || '',
        'Sub Type': testCase.subType || '',
        'Cell Type': testCase.cellType,
        'Test Case': testCase.testCase,
        'Test ID': testCase.testId,
        'Scope': testCase.scope,
        'Phase': testCase.phase,
        'Cells': testCase.cells || '',
        'Description': testCase.expectedOutput || '',
        'Requirements': testCase.requirements || '',
        'Steps': testCase.steps || '',
        'Multi Driveway': testCase.multiDriveway ? 'true' : 'false',
        'Driveway Type': testCase.drivewayType || 'N/A',
        'Combined Test': testCase.combinedTest ? 'true' : 'false',
        'Image': testCase.image || '',
        'Last Modified': testCase.lastModified || '',
        'Modified User': testCase.modifiedUser || ''
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
          dcType: row['dcType'] || '',
          subType: row['subType'] || '',
          site: row['site'],
          phase: row['phase'],
          cellType: row['cellType'],
          cell: row['cell'] || '',
          testCase: row['testCase'],
          testId: row['testId'],
          uniqueTestId: row['uniqueTestId'] || '',
          scope: row['scope'],
          cells: row['cells'] || 'All', // Add cells column
          status: row['status'] || 'NOT RUN',
          lastModified: row['lastModified'],
          modifiedUser: row['modifiedUser'],
          drivewayConfig: row['drivewayConfig'] || '',
          multiDriveway: row['multiDriveway'] === 'true' || row['multiDriveway'] === true || row['multiDriveway'] === 'TRUE' || row['multiDriveway'] === 1,
          vtVolume: row['vtVolume'] || '',
          vtDate: row['vtDate'] || '',
          vtStartTime: row['vtStartTime'] || '',
          vtEndTime: row['vtEndTime'] || '',
          vtAvailability: row['vtAvailability'] || '',
          chVolume: row['chVolume'] || '',
          chDate: row['chDate'] || '',
          liveDate: row['liveDate'] || '',
          notes: row['notes'] || ''
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
          'dcType': entry.dcType || '',
          'subType': entry.subType || '',
          'site': entry.site,
          'phase': entry.phase,
          'cellType': entry.cellType,
          'cell': entry.cell || '',
          'testCase': entry.testCase,
          'testId': entry.testId || '',
          'uniqueTestId': entry.uniqueTestId || '',
          'scope': entry.scope || '',
          'cells': entry.cells || 'All', // Add cells column
          'status': entry.status,
          'lastModified': entry.lastModified ? new Date(entry.lastModified).toLocaleString() : '',
          'modifiedUser': entry.modifiedUser || '',
          'drivewayConfig': entry.drivewayConfig || '',
          'multiDriveway': entry.multiDriveway ? 'true' : 'false',
          'chVolume': entry.chVolume || '',
          'chDate': entry.chDate || '',
          'vtVolume': entry.vtVolume || '',
          'vtDate': entry.vtDate || '',
          'vtStartTime': entry.vtStartTime || '',
          'vtEndTime': entry.vtEndTime || '',
          'vtAvailability': entry.vtAvailability || '',
          'liveDate': entry.liveDate || '',
          'notes': entry.notes || ''
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
          'Submission ID': resultsData.submissionId,
          'Site': resultsData.site,
          'Submitted By': resultsData.submittedBy,
          'Submitted At': new Date(resultsData.submittedAt).toLocaleString(),
          'Total Tests': resultsData.totalTests,
          'Passed Tests': resultsData.passedTests,
          'Pass Rate': `${Math.round((resultsData.passedTests / resultsData.totalTests) * 100)}%`
        },
        {},
        {
          'Cell Type': 'Cell Type',
          'Cell': 'Cell',
          'Test Case': 'Test Case',
          'Case ID': 'Case ID',
          'Status': 'Status',
          'Phase': 'Phase',
          'Last Modified': 'Last Modified',
          'Modified User': 'Modified User'
        },
        ...resultsData.results.map(result => ({
          'Cell Type': result.cellType,
          'Cell': result.cell,
          'Test Case': result.testCase,
          'Case ID': result.caseId,
          'Status': result.status,
          'Phase': result.phase,
          'Last Modified': result.lastModified ? new Date(result.lastModified).toLocaleString() : '',
          'Modified User': result.modifiedUser || ''
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
        const typesString = row['Types'] || '';
        const drivewayTypes = typesString !== 'NA' ? typesString.split(',').map(t => t.trim()).filter(t => t && t !== '') : [];
        
        const drivewayCount = row['Driveway Count'] === 'NA' ? 1 : parseInt(row['Driveway Count']) || 1;
        
        return {
          cellType: row['Cell Type'] || '',
          dcType: row['DC Type'] || '',

          hasMultipleDriveways: row['Multiple Driveways'] === true || row['Multiple Driveways'] === 'true' || row['Multiple Driveways'] === 'TRUE',
          numberOfDriveways: drivewayCount,
          drivewayTypes: drivewayTypes,
          driveway1Type: drivewayTypes[0] || '',
          driveway2Type: drivewayTypes[1] || '',
          driveway3Type: drivewayTypes[2] || '',
          driveway4Type: drivewayTypes[3] || '',
          description: row['Description'] || '',

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
        'Cell Type': cellType['Cell Type'] || cellType.cellType,
        'DC Type': cellType['DC Type'] || cellType.dcType || '',

        'Multiple Driveways': cellType['Multiple Driveways'] || cellType.hasMultipleDriveways,
        'Driveway Count': cellType['Driveway Count'] || cellType.numberOfDriveways,
        'Types': cellType['Types'] || (cellType.drivewayTypes ? cellType.drivewayTypes.join(', ') : 'NA'),
        'Description': cellType['Description'] || cellType.description || '',

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
        Network: row['Network'] || '',
        'DC Type': row['DC Type'] || '',
        'Sub Type': row['Sub Type'] || '',
        'DC Number': row['DC Number'] || '',
        City: row['City'] || '',
        State: row['State'] || ''
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
}

module.exports = new ExcelService();