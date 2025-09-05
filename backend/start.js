#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Ensure we're in the right directory
const backendDir = __dirname;
const serverFile = path.join(backendDir, 'server.js');

// Check if server.js exists
if (!fs.existsSync(serverFile)) {
  console.error('❌ Error: server.js not found in backend directory');
  console.error(`Expected location: ${serverFile}`);
  process.exit(1);
}

// Change to backend directory
process.chdir(backendDir);
console.log(`📁 Working directory: ${process.cwd()}`);

// Check if package.json exists
const packageJsonPath = path.join(backendDir, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found in backend directory');
  process.exit(1);
}

// Check if node_modules exists
const nodeModulesPath = path.join(backendDir, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Start the server
console.log('🚀 Starting server...');
try {
  require('./server.js');
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}

