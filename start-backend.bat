@echo off
echo Starting Test Management System Backend...
echo ==========================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Navigate to backend directory
cd backend

REM Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Start the server
echo 🚀 Starting backend server on http://localhost:3005...
echo Press Ctrl+C to stop the server
echo.

npm start

pause
