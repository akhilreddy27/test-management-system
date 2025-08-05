const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

class ExcelService {
  constructor() {
    this.dataPath = path.join(__dirname, '../../data');
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
        cellType: row['Cell Type'],
        testCase: row['Test Case'],
        testId: row['Test ID'],
        scope: row['Scope'],
        phase: row['Phase']
      }));
      
    } catch (error) {
      console.error('Error reading test cases:', error);
      throw error;
    }
  }

  readTestStatus() {
    try {
      const filePath = path.join(this.dataPath, 'test_status.xlsx');
      
      if (!fs.existsSync(filePath)) {
        // Return empty array if file doesn't exist
        return [];
      }

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      return jsonData.map(row => ({
        site: row['Site'],
        phase: row['Phase'],
        cellType: row['Cell Type'],
        cell: row['Cell'],
        testCase: row['Test Case'],
        testId: row['Test ID'],
        scope: row['Scope'],
        status: row['Status'] || 'NOT RUN',
        lastModified: row['Last modified'],
        modifiedUser: row['Modified User'],
        // Cell hardening columns (removed old 3-day columns)
        // Volume Test columns
        vtVolume: row['VT Volume'] || '',
        vtStartDateTime: row['VT Start DateTime'] || '',
        vtEndDateTime: row['VT End DateTime'] || '',
        // Cell Hardening columns
        chVolume: row['CH Volume'] || '',
        chDate: row['CH Date'] || ''
      }));
      
    } catch (error) {
      console.error('Error reading test status:', error);
      return [];
    }
  }

  writeTestStatus(statusData) {
    try {
      const filePath = path.join(this.dataPath, 'test_status.xlsx');
      
      // Convert data to Excel format with exact column names
      const excelData = statusData.map(entry => ({
        'Site': entry.site,
        'Phase': entry.phase,
        'Cell Type': entry.cellType,
        'Cell': entry.cell,
        'Test Case': entry.testCase,
        'Test ID': entry.testId || '',
        'Scope': entry.scope || '',
        'Status': entry.status,
        'Last modified': entry.lastModified ? new Date(entry.lastModified).toLocaleString() : '',
        'Modified User': entry.modifiedUser || '',
        // Cell hardening columns (removed old 3-day columns)
        // Volume Test columns
        'VT Volume': entry.vtVolume || '',
        'VT Start DateTime': entry.vtStartDateTime || '',
        'VT End DateTime': entry.vtEndDateTime || '',
        // Cell Hardening columns
        'CH Volume': entry.chVolume || '',
        'CH Date': entry.chDate || ''
      }));

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
      
      // Create Excel data with submission details
      const excelData = [
        // Header row with submission info
        {
          'Submission ID': resultsData.submissionId,
          'Site': resultsData.site,
          'Submitted By': resultsData.submittedBy,
          'Submitted At': new Date(resultsData.submittedAt).toLocaleString(),
          'Total Tests': resultsData.totalTests,
          'Passed Tests': resultsData.passedTests,
          'Pass Rate': `${Math.round((resultsData.passedTests / resultsData.totalTests) * 100)}%`
        },
        // Empty row for spacing
        {},
        // Results header
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
        // Results data
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
}

module.exports = new ExcelService();