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
        cellType: row['Each Cell Type'] || row['Cell Type'],
        testCase: row['Test Case'],
        caseId: row['Case ID'],
        scope: row['Scope']
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
        caseId: row['Case ID'],
        status: row['Status'] || 'NOT RUN',
        lastModified: row['Last modified'],
        modifiedUser: row['Modified User']
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
        'Case ID': entry.caseId,
        'Status': entry.status,
        'Last modified': entry.lastModified ? new Date(entry.lastModified).toLocaleString() : '',
        'Modified User': entry.modifiedUser || ''
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
}

module.exports = new ExcelService();