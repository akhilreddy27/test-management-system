#!/bin/bash

BASE_URL="http://localhost:3005/api"

echo "🚀 Starting Excel file migration..."
echo ""

# Step 1: Migrate test cases file
echo "📋 Migrating test_cases.xlsx..."
TEST_CASES_RESPONSE=$(curl -s -X POST "${BASE_URL}/cell-types/migrate-test-cases")
echo "Response: $TEST_CASES_RESPONSE"
echo ""

# Step 2: Migrate test status file
echo "📊 Migrating test_status.xlsx..."
TEST_STATUS_RESPONSE=$(curl -s -X POST "${BASE_URL}/cell-types/migrate-test-status")
echo "Response: $TEST_STATUS_RESPONSE"
echo ""

echo "🎉 Migration completed!"
echo ""
echo "📝 Next steps:"
echo "1. Restart your backend server"
echo "2. The test case form will now save DC Type and Sub Type"
echo "3. Test cases will be filtered by DC Type and Sub Type"
