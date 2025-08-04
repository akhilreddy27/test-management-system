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
}

module.exports = new TestCasesController();
