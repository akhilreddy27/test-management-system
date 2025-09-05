const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function migrateExcelFiles() {
  try {
    console.log('🚀 Starting Excel file migration...\n');

    // Step 1: Migrate test cases file
    console.log('📋 Migrating test_cases.xlsx...');
    const testCasesResponse = await axios.post(`${BASE_URL}/cell-types/migrate-test-cases`);
    if (testCasesResponse.data.success) {
      console.log('✅ Test cases file migrated successfully');
    } else {
      console.log('❌ Failed to migrate test cases file:', testCasesResponse.data.message);
    }

    console.log('');

    // Step 2: Migrate test status file
    console.log('📊 Migrating test_status.xlsx...');
    const testStatusResponse = await axios.post(`${BASE_URL}/cell-types/migrate-test-status`);
    if (testStatusResponse.data.success) {
      console.log('✅ Test status file migrated successfully');
    } else {
      console.log('❌ Failed to migrate test status file:', testStatusResponse.data.message);
    }

    console.log('\n🎉 Migration completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. The test case form will now save DC Type and Sub Type');
    console.log('3. Test cases will be filtered by DC Type and Sub Type');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run migration
migrateExcelFiles();
