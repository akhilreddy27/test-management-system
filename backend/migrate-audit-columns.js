const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function migrateAuditColumns() {
  try {
    console.log('🔄 Starting migration to populate audit columns...');
    const dataPath = path.join(__dirname, 'data');
    const testCasesPath = path.join(dataPath, 'test_cases.xlsx');
    
    if (!fs.existsSync(testCasesPath)) {
      console.log('❌ test_cases.xlsx not found. Please ensure the file exists.');
      return;
    }
    
    console.log('📖 Reading existing test_cases.xlsx...');
    const workbook = XLSX.readFile(testCasesPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const existingData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`📊 Found ${existingData.length} existing test cases`);
    
    // Check if audit columns already exist
    const firstRow = existingData[0];
    const hasLastModified = firstRow && firstRow['Last Modified'] !== undefined;
    const hasModifiedUser = firstRow && firstRow['Modified User'] !== undefined;
    
    if (hasLastModified && hasModifiedUser) {
      console.log('✅ Audit columns already exist in the file');
      
      // Check if they have data
      const hasData = existingData.some(row => 
        row['Last Modified'] && row['Modified User']
      );
      
      if (hasData) {
        console.log('✅ Audit columns already have data');
        return;
      } else {
        console.log('⚠️ Audit columns exist but are empty, populating with default values...');
      }
    } else {
      console.log('📝 Adding audit columns to the file...');
    }
    
    const updatedData = existingData.map(row => ({
      ...row,
      'Last Modified': row['Last Modified'] || new Date().toISOString(),
      'Modified User': row['Modified User'] || 'System Migration'
    }));
    
    const newWorkbook = XLSX.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Test Cases');
    
    // Create backup before making changes
    const backupPath = path.join(dataPath, 'test_cases_backup.xlsx');
    fs.copyFileSync(testCasesPath, backupPath);
    console.log(`💾 Backup created: test_cases_backup.xlsx`);
    
    // Write updated data
    XLSX.writeFile(newWorkbook, testCasesPath);
    console.log('✅ Successfully migrated test_cases.xlsx with audit columns');
    console.log('📋 New columns added/updated:');
    console.log('   - Last Modified');
    console.log('   - Modified User');
    
    if (updatedData.length > 0) {
      console.log('\n📊 Sample updated data:');
      const sample = updatedData[0];
      console.log(`   Test Case: ${sample['Test Case']}`);
      console.log(`   Last Modified: ${sample['Last Modified']}`);
      console.log(`   Modified User: ${sample['Modified User']}`);
    }
    
    console.log('\n🔄 Now restart your backend server to see the changes');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateAuditColumns();
