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
}

module.exports = new ExcelService();