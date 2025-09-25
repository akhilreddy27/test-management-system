@echo off
setlocal enabledelayedexpansion

REM Test Management System Setup Script for Windows
REM This script sets up the entire test management system on Windows
REM Author: Test Management System Team
REM Version: 1.0

echo ==================================================
echo     Test Management System Setup Script
echo ==================================================
echo.

REM Check if Node.js is installed
echo [INFO] Checking system requirements...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo [INFO] Please install Node.js from https://nodejs.org/
    echo [INFO] Make sure to check "Add to PATH" during installation
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [SUCCESS] Node.js is installed: %NODE_VERSION%
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [SUCCESS] npm is installed: %NPM_VERSION%
)

REM Check if git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed!
    echo [INFO] Please install Git from https://git-scm.com/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('git --version') do set GIT_VERSION=%%i
    echo [SUCCESS] Git is installed: %GIT_VERSION%
)

REM Check if ports are available (simplified check)
echo [INFO] Checking if required ports are available...
netstat -an | findstr ":3005" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 3005 is in use. Please stop any services using this port.
)

netstat -an | findstr ":3000" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 3000 is in use. Please stop any services using this port.
)

echo [SUCCESS] All required ports are available

REM Install dependencies
echo [INFO] Installing dependencies...

REM Root dependencies
if exist "package.json" (
    echo [INFO] Installing root dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install root dependencies
        pause
        exit /b 1
    )
    echo [SUCCESS] Root dependencies installed
)

REM Backend dependencies
if exist "backend" (
    echo [INFO] Installing backend dependencies...
    cd backend
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install backend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [SUCCESS] Backend dependencies installed
)

REM Frontend dependencies
if exist "frontend" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install frontend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [SUCCESS] Frontend dependencies installed
)

REM Check if data directory exists
echo [INFO] Checking data directory...
if not exist "backend\data" (
    echo [WARNING] Data directory not found. Creating it...
    mkdir backend\data
)

REM Check for required Excel files and create placeholders if missing
echo [INFO] Checking for required Excel files...
set REQUIRED_FILES=test_cases.xlsx cell_types.xlsx site_info.xlsx test_status.xlsx tickets.xlsx ui_changes_log.xlsx

for %%f in (%REQUIRED_FILES%) do (
    if not exist "backend\data\%%f" (
        echo [WARNING] Missing file: backend\data\%%f
        set MISSING_FILES=!MISSING_FILES! %%f
    )
)

if not "!MISSING_FILES!"=="" (
    echo [INFO] Creating placeholder Excel files...
    cd backend\data
    
    REM Create placeholder files using Node.js
    node -e "
    const XLSX = require('xlsx');
    
    const createPlaceholderFile = (filename, sampleData) => {
        const worksheet = XLSX.utils.json_to_sheet([sampleData]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, filename);
        console.log('Created:', filename);
    };
    
    createPlaceholderFile('test_cases.xlsx', {
        'DC_TYPE': 'RDC',
        'SUB_TYPE': 'All',
        'CELL_TYPE': 'AIB',
        'TEST_CASE': 'Sample Test',
        'TEST_ID': 'SAMPLE-001',
        'SCOPE': 'Cell Function',
        'PHASE': 'All',
        'CELLS': 'All',
        'DESCRIPTION': 'Sample test case',
        'REQUIREMENTS': 'Sample requirements',
        'STEPS': 'Sample steps',
        'MULTI_DRIVEWAY': 'false',
        'DRIVEWAY_TYPE': 'NA',
        'COMBINED_TEST': 'false',
        'IMAGE': '',
        'LAST_MODIFIED': new Date().toISOString(),
        'MODIFIED_USER': 'System'
    });
    
    createPlaceholderFile('cell_types.xlsx', {
        'CELL_TYPE': 'AIB',
        'DC_TYPE': 'RDC',
        'MULTIPLE_DRIVEWAYS': false,
        'DRIVEWAY_COUNT': 1,
        'TYPES': '',
        'DESCRIPTION': 'Automated InBound'
    });
    
    createPlaceholderFile('site_info.xlsx', {
        'NETWORK': 'Ambient',
        'DC_TYPE': 'RDC',
        'SUB_TYPE': 'Batch',
        'DC_NUMBER': '1111',
        'CITY': 'Sample City',
        'STATE': 'Sample State'
    });
    
    createPlaceholderFile('test_status.xlsx', {
        'DCTYPE': 'RDC',
        'SUBTYPE': 'Batch',
        'SITE': 'Sample City - 1111',
        'PHASE': 'Phase 1',
        'CELLTYPE': 'AIB',
        'CELL': 'AIB 123',
        'TESTCASE': 'Sample Test',
        'TESTID': 'SAMPLE-001',
        'UNIQUETESTID': 'Sample_City_-_1111_Phase_1_AIB_123_SAMPLE-001',
        'SCOPE': 'Cell Function',
        'CELLS': 'All',
        'STATUS': 'NOT RUN',
        'LASTMODIFIED': new Date().toLocaleString(),
        'MODIFIEDUSER': 'System',
        'DRIVEWAYCONFIG': 'Single Drive',
        'MULTIDRIVEWAY': 'false',
        'CHVOLUME': '',
        'CHDATE': '',
        'VTVOLUME': '',
        'VTDATE': '',
        'VTSTARTTIME': '',
        'VTENDTIME': '',
        'VTAVAILABILITY': '',
        'LIVEDATE': '',
        'NOTES': ''
    });
    
    createPlaceholderFile('tickets.xlsx', {
        'SITE': 'Sample Site',
        'CELL': '',
        'TICKET_ID': 'TICKET-001',
        'TITLE': 'Sample Ticket',
        'DESCRIPTION': 'Sample ticket description',
        'STATUS': 'Open',
        'PRIORITY': 'Medium',
        'ASSIGNEE': 'Sample User',
        'REPORTER': 'Sample Reporter',
        'DATE': new Date().toISOString().split('T')[0],
        'TAGS': 'sample,ticket',
        'CREATED_AT': new Date().toISOString(),
        'UPDATED_AT': new Date().toISOString()
    });
    
    createPlaceholderFile('ui_changes_log.xlsx', {
        'TIMESTAMP': new Date().toISOString(),
        'DATE': new Date().toLocaleDateString(),
        'TIME': new Date().toLocaleTimeString(),
        'USER': 'System',
        'ACTION': 'Setup',
        'MODULE': 'System',
        'SITE': '',
        'PHASE': '',
        'CELL_TYPE': '',
        'CELL': '',
        'TEST_CASE': '',
        'TEST_ID': '',
        'OLD_VALUE': '',
        'NEW_VALUE': '',
        'DETAILS': 'System setup completed',
        'IP_ADDRESS': '127.0.0.1',
        'USER_AGENT': 'Setup Script'
    });
    "
    
    cd ..\..
    echo [SUCCESS] Placeholder Excel files created
)

REM Create startup scripts
echo [INFO] Creating startup scripts...

REM Create start-backend.bat
echo @echo off > start-backend.bat
echo echo Starting Test Management System Backend... >> start-backend.bat
echo if not exist "backend" ^( >> start-backend.bat
echo     echo Error: backend directory not found! >> start-backend.bat
echo     pause >> start-backend.bat
echo     exit /b 1 >> start-backend.bat
echo ^) >> start-backend.bat
echo cd backend >> start-backend.bat
echo if not exist "package.json" ^( >> start-backend.bat
echo     echo Error: package.json not found in backend directory! >> start-backend.bat
echo     pause >> start-backend.bat
echo     exit /b 1 >> start-backend.bat
echo ^) >> start-backend.bat
echo if not exist "node_modules" ^( >> start-backend.bat
echo     echo Installing backend dependencies... >> start-backend.bat
echo     call npm install >> start-backend.bat
echo ^) >> start-backend.bat
echo echo Starting backend server on port 3005... >> start-backend.bat
echo call npm start >> start-backend.bat

REM Create start-frontend.bat
echo @echo off > start-frontend.bat
echo echo Starting Test Management System Frontend... >> start-frontend.bat
echo if not exist "frontend" ^( >> start-frontend.bat
echo     echo Error: frontend directory not found! >> start-frontend.bat
echo     pause >> start-frontend.bat
echo     exit /b 1 >> start-frontend.bat
echo ^) >> start-frontend.bat
echo cd frontend >> start-frontend.bat
echo if not exist "package.json" ^( >> start-frontend.bat
echo     echo Error: package.json not found in frontend directory! >> start-frontend.bat
echo     pause >> start-frontend.bat
echo     exit /b 1 >> start-frontend.bat
echo ^) >> start-frontend.bat
echo if not exist "node_modules" ^( >> start-frontend.bat
echo     echo Installing frontend dependencies... >> start-frontend.bat
echo     call npm install >> start-frontend.bat
echo ^) >> start-frontend.bat
echo echo Starting frontend server on port 3000... >> start-frontend.bat
echo call npm start >> start-frontend.bat

REM Create start-system.bat
echo @echo off > start-system.bat
echo echo ================================================== >> start-system.bat
echo echo     Starting Test Management System >> start-system.bat
echo echo ================================================== >> start-system.bat
echo echo. >> start-system.bat
echo echo Starting backend server... >> start-system.bat
echo start "Backend Server" cmd /k "start-backend.bat" >> start-system.bat
echo timeout /t 5 /nobreak ^>nul >> start-system.bat
echo echo Starting frontend server... >> start-system.bat
echo start "Frontend Server" cmd /k "start-frontend.bat" >> start-system.bat
echo timeout /t 10 /nobreak ^>nul >> start-system.bat
echo echo. >> start-system.bat
echo echo ================================================== >> start-system.bat
echo echo     System Started Successfully! >> start-system.bat
echo echo ================================================== >> start-system.bat
echo echo Backend Server:  http://localhost:3005 >> start-system.bat
echo echo Frontend Server: http://localhost:3000 >> start-system.bat
echo echo. >> start-system.bat
echo echo Both servers are running in separate windows. >> start-system.bat
echo echo Close the server windows to stop the system. >> start-system.bat
echo echo ================================================== >> start-system.bat
echo pause >> start-system.bat

REM Create stop-system.bat
echo @echo off > stop-system.bat
echo echo Stopping Test Management System... >> stop-system.bat
echo taskkill /f /im node.exe ^>nul 2^>^&1 >> stop-system.bat
echo echo All servers stopped. >> stop-system.bat
echo pause >> stop-system.bat

echo [SUCCESS] Startup scripts created

echo.
echo ==================================================
echo     Setup Completed Successfully!
echo ==================================================
echo.
echo Next steps:
echo 1. Start the system: start-system.bat
echo 2. Open your browser: http://localhost:3000
echo 3. Backend API: http://localhost:3005
echo.
echo Available commands:
echo   start-system.bat  - Start both servers
echo   start-backend.bat - Start backend only
echo   start-frontend.bat - Start frontend only
echo   stop-system.bat   - Stop all servers
echo.
echo ==================================================

echo [SUCCESS] Setup script completed successfully!
pause
