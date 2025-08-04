const excelService = require('../services/excelService');

class TestCasesController {
  async getAllTestCases(req, res) {
    try {
      const testCases = excelService.readTestCases();
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
}

module.exports = new TestCasesController();