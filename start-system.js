#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Test Management System...\n');

// Check if we're in the right directory
const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

if (!fs.existsSync(backendDir) || !fs.existsSync(frontendDir)) {
  console.error('❌ Error: backend or frontend directory not found');
  console.error('Please run this script from the project root directory');
  process.exit(1);
}

// Start backend server
console.log('🔧 Starting backend server...');
const backendProcess = spawn('node', ['start.js'], {
  cwd: backendDir,
  stdio: 'inherit'
});

// Wait a bit for backend to start
setTimeout(() => {
  console.log('\n🌐 Starting frontend development server...');
  const frontendProcess = spawn('npm', ['start'], {
    cwd: frontendDir,
    stdio: 'inherit'
  });

  // Handle frontend process exit
  frontendProcess.on('exit', (code) => {
    console.log(`\n🌐 Frontend process exited with code ${code}`);
    backendProcess.kill();
    process.exit(code);
  });
}, 3000);

// Handle backend process exit
backendProcess.on('exit', (code) => {
  console.log(`\n🔧 Backend process exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  backendProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  backendProcess.kill();
  process.exit(0);
});

