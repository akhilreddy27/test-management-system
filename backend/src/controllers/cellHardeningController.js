const excelService = require('../services/excelService');

class CellHardeningController {
  async getCellHardeningData(req, res) {
    try {
      const { site, cellType, cell } = req.query;
      const testStatusData = excelService.readTestStatus();
      
      // Filter and extract cell hardening data
      let filteredData = testStatusData;
      
      if (site) {
        filteredData = filteredData.filter(item => item.site === site);
      }
      
      if (cellType) {
        filteredData = filteredData.filter(item => item.cellType === cellType);
      }
      
      if (cell) {
        filteredData = filteredData.filter(item => item.cell === cell);
      }
      
      // Group by cell to get unique cell entries with hardening data
      const cellHardeningData = [];
      const cellMap = new Map();
      
      filteredData.forEach(entry => {
        const cellKey = `${entry.site}_${entry.cellType}_${entry.cell}`;
        
        if (!cellMap.has(cellKey)) {
          const cellData = {
            site: entry.site,
            cellType: entry.cellType,
            cell: entry.cell,
            hardeningStatus: entry.hardeningStatus || 'NOT STARTED',
            day1Date: entry.day1Date || '',
            day1Production: entry.day1Production || '',
            day1Notes: entry.day1Notes || '',
            day2Date: entry.day2Date || '',
            day2Production: entry.day2Production || '',
            day2Notes: entry.day2Notes || '',
            day3Date: entry.day3Date || '',
            day3Production: entry.day3Production || '',
            day3Notes: entry.day3Notes || ''
          };
          
          cellMap.set(cellKey, cellData);
          cellHardeningData.push(cellData);
        }
      });
      
      res.json({
        success: true,
        data: cellHardeningData,
        count: cellHardeningData.length
      });
    } catch (error) {
      console.error('Error getting cell hardening data:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting cell hardening data',
        error: error.message
      });
    }
  }

  async addCellHardeningEntry(req, res) {
    try {
      const { site, cellType, cell, day, date, productionNumber, notes } = req.body;
      
      if (!site || !cellType || !cell || !day || !date || !productionNumber) {
        return res.status(400).json({
          success: false,
          message: 'Site, cell type, cell, day, date, and production number are required'
        });
      }
      
      // Validate day (1, 2, or 3)
      const dayNum = Number(day);
      if (![1, 2, 3].includes(dayNum)) {
        return res.status(400).json({
          success: false,
          message: 'Day must be 1, 2, or 3'
        });
      }
      
      // Validate date format
      const inputDate = new Date(date);
      if (isNaN(inputDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
      
      // Validate production number is a positive number
      const productionNum = Number(productionNumber);
      if (isNaN(productionNum) || productionNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'Production number must be a positive number'
        });
      }
      
      const testStatusData = excelService.readTestStatus();
      
      // Find all entries for this cell
      const cellEntries = testStatusData.filter(entry => 
        entry.site === site && 
        entry.cellType === cellType && 
        entry.cell === cell
      );
      
      if (cellEntries.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No test entries found for this cell'
        });
      }
      
      // Update all entries for this cell with the hardening data
      const updatedTestStatusData = testStatusData.map(entry => {
        if (entry.site === site && entry.cellType === cellType && entry.cell === cell) {
          const updatedEntry = { ...entry };
          
          // Update the specific day's data
          if (dayNum === 1) {
            updatedEntry.day1Date = date;
            updatedEntry.day1Production = productionNum;
            updatedEntry.day1Notes = notes || '';
          } else if (dayNum === 2) {
            updatedEntry.day2Date = date;
            updatedEntry.day2Production = productionNum;
            updatedEntry.day2Notes = notes || '';
          } else if (dayNum === 3) {
            updatedEntry.day3Date = date;
            updatedEntry.day3Production = productionNum;
            updatedEntry.day3Notes = notes || '';
          }
          
          // Update hardening status based on completed days
          const completedDays = [
            updatedEntry.day1Date && updatedEntry.day1Production,
            updatedEntry.day2Date && updatedEntry.day2Production,
            updatedEntry.day3Date && updatedEntry.day3Production
          ].filter(Boolean).length;
          
          if (completedDays === 0) {
            updatedEntry.hardeningStatus = 'NOT STARTED';
          } else if (completedDays === 3) {
            updatedEntry.hardeningStatus = 'COMPLETED';
          } else {
            updatedEntry.hardeningStatus = `DAY ${completedDays} COMPLETED`;
          }
          
          return updatedEntry;
        }
        return entry;
      });
      
      // Save to Excel
      excelService.writeTestStatus(updatedTestStatusData);
      
      res.json({
        success: true,
        message: `Day ${day} hardening entry added successfully for cell ${cell}`,
        data: {
          site,
          cellType,
          cell,
          day: dayNum,
          date,
          productionNumber: productionNum,
          notes: notes || ''
        }
      });
      
    } catch (error) {
      console.error('Error adding cell hardening entry:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding cell hardening entry',
        error: error.message
      });
    }
  }

  async updateCellHardeningEntry(req, res) {
    try {
      const { site, cellType, cell, day } = req.params;
      const { productionNumber, notes } = req.body;
      
      if (!productionNumber) {
        return res.status(400).json({
          success: false,
          message: 'Production number is required'
        });
      }
      
      // Validate day (1, 2, or 3)
      const dayNum = Number(day);
      if (![1, 2, 3].includes(dayNum)) {
        return res.status(400).json({
          success: false,
          message: 'Day must be 1, 2, or 3'
        });
      }
      
      // Validate production number is a positive number
      const productionNum = Number(productionNumber);
      if (isNaN(productionNum) || productionNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'Production number must be a positive number'
        });
      }
      
      const testStatusData = excelService.readTestStatus();
      
      // Find entries for this cell
      const cellEntries = testStatusData.filter(entry => 
        entry.site === site && 
        entry.cellType === cellType && 
        entry.cell === cell
      );
      
      if (cellEntries.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No test entries found for this cell'
        });
      }
      
      // Update all entries for this cell
      const updatedTestStatusData = testStatusData.map(entry => {
        if (entry.site === site && entry.cellType === cellType && entry.cell === cell) {
          const updatedEntry = { ...entry };
          
          // Update the specific day's data
          if (dayNum === 1) {
            updatedEntry.day1Production = productionNum;
            updatedEntry.day1Notes = notes || updatedEntry.day1Notes || '';
          } else if (dayNum === 2) {
            updatedEntry.day2Production = productionNum;
            updatedEntry.day2Notes = notes || updatedEntry.day2Notes || '';
          } else if (dayNum === 3) {
            updatedEntry.day3Production = productionNum;
            updatedEntry.day3Notes = notes || updatedEntry.day3Notes || '';
          }
          
          // Update hardening status based on completed days
          const completedDays = [
            updatedEntry.day1Date && updatedEntry.day1Production,
            updatedEntry.day2Date && updatedEntry.day2Production,
            updatedEntry.day3Date && updatedEntry.day3Production
          ].filter(Boolean).length;
          
          if (completedDays === 0) {
            updatedEntry.hardeningStatus = 'NOT STARTED';
          } else if (completedDays === 3) {
            updatedEntry.hardeningStatus = 'COMPLETED';
          } else {
            updatedEntry.hardeningStatus = `DAY ${completedDays} COMPLETED`;
          }
          
          return updatedEntry;
        }
        return entry;
      });
      
      // Save to Excel
      excelService.writeTestStatus(updatedTestStatusData);
      
      res.json({
        success: true,
        message: `Day ${day} hardening entry updated successfully for cell ${cell}`,
        data: {
          site,
          cellType,
          cell,
          day: dayNum,
          productionNumber: productionNum,
          notes: notes || ''
        }
      });
      
    } catch (error) {
      console.error('Error updating cell hardening entry:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating cell hardening entry',
        error: error.message
      });
    }
  }

  async deleteCellHardeningEntry(req, res) {
    try {
      const { site, cellType, cell, day } = req.params;
      
      // Validate day (1, 2, or 3)
      const dayNum = Number(day);
      if (![1, 2, 3].includes(dayNum)) {
        return res.status(400).json({
          success: false,
          message: 'Day must be 1, 2, or 3'
        });
      }
      
      const testStatusData = excelService.readTestStatus();
      
      // Find entries for this cell
      const cellEntries = testStatusData.filter(entry => 
        entry.site === site && 
        entry.cellType === cellType && 
        entry.cell === cell
      );
      
      if (cellEntries.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No test entries found for this cell'
        });
      }
      
      // Clear the specific day's data for all entries of this cell
      const updatedTestStatusData = testStatusData.map(entry => {
        if (entry.site === site && entry.cellType === cellType && entry.cell === cell) {
          const updatedEntry = { ...entry };
          
          // Clear the specific day's data
          if (dayNum === 1) {
            updatedEntry.day1Date = '';
            updatedEntry.day1Production = '';
            updatedEntry.day1Notes = '';
          } else if (dayNum === 2) {
            updatedEntry.day2Date = '';
            updatedEntry.day2Production = '';
            updatedEntry.day2Notes = '';
          } else if (dayNum === 3) {
            updatedEntry.day3Date = '';
            updatedEntry.day3Production = '';
            updatedEntry.day3Notes = '';
          }
          
          // Update hardening status based on completed days
          const completedDays = [
            updatedEntry.day1Date && updatedEntry.day1Production,
            updatedEntry.day2Date && updatedEntry.day2Production,
            updatedEntry.day3Date && updatedEntry.day3Production
          ].filter(Boolean).length;
          
          if (completedDays === 0) {
            updatedEntry.hardeningStatus = 'NOT STARTED';
          } else if (completedDays === 3) {
            updatedEntry.hardeningStatus = 'COMPLETED';
          } else {
            updatedEntry.hardeningStatus = `DAY ${completedDays} COMPLETED`;
          }
          
          return updatedEntry;
        }
        return entry;
      });
      
      // Save to Excel
      excelService.writeTestStatus(updatedTestStatusData);
      
      res.json({
        success: true,
        message: `Day ${day} hardening entry deleted successfully for cell ${cell}`,
        data: {
          site,
          cellType,
          cell,
          day: dayNum
        }
      });
      
    } catch (error) {
      console.error('Error deleting cell hardening entry:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting cell hardening entry',
        error: error.message
      });
    }
  }

  async getCellHardeningSummary(req, res) {
    try {
      const { site, cellType, cell } = req.query;
      const testStatusData = excelService.readTestStatus();
      
      let filteredData = testStatusData;
      
      if (site) {
        filteredData = filteredData.filter(item => item.site === site);
      }
      
      if (cellType) {
        filteredData = filteredData.filter(item => item.cellType === cellType);
      }
      
      if (cell) {
        filteredData = filteredData.filter(item => item.cell === cell);
      }
      
      // Group by cell and calculate summary
      const summary = {};
      
      filteredData.forEach(entry => {
        const key = `${entry.site}_${entry.cellType}_${entry.cell}`;
        
        if (!summary[key]) {
          summary[key] = {
            site: entry.site,
            cellType: entry.cellType,
            cell: entry.cell,
            hardeningStatus: entry.hardeningStatus || 'NOT STARTED',
            totalProduction: 0,
            dayCount: 0,
            averageProduction: 0,
            day1Data: {
              date: entry.day1Date || '',
              production: entry.day1Production || '',
              notes: entry.day1Notes || ''
            },
            day2Data: {
              date: entry.day2Date || '',
              production: entry.day2Production || '',
              notes: entry.day2Notes || ''
            },
            day3Data: {
              date: entry.day3Date || '',
              production: entry.day3Production || '',
              notes: entry.day3Notes || ''
            }
          };
        }
        
        // Calculate total production and day count
        const productions = [
          entry.day1Production,
          entry.day2Production,
          entry.day3Production
        ].filter(prod => prod && prod !== '');
        
        summary[key].totalProduction = productions.reduce((sum, prod) => sum + Number(prod), 0);
        summary[key].dayCount = productions.length;
        summary[key].averageProduction = summary[key].dayCount > 0 
          ? Math.round(summary[key].totalProduction / summary[key].dayCount) 
          : 0;
      });
      
      res.json({
        success: true,
        data: Object.values(summary),
        count: Object.keys(summary).length
      });
      
    } catch (error) {
      console.error('Error getting cell hardening summary:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting cell hardening summary',
        error: error.message
      });
    }
  }
}

module.exports = new CellHardeningController(); 