# Test Management System - Installation Guide

## 🚀 Quick Installation

### For macOS/Linux Users:
```bash
# Clone the repository
git clone <repository-url>
cd test-management-system

# Run the automated setup script
chmod +x setup.sh
./setup.sh

# Start the system
./start-system.sh
```

### For Windows Users:
```cmd
# Clone the repository
git clone <repository-url>
cd test-management-system

# Run the automated setup script
setup.bat

# Start the system
start-system.bat
```

## 📋 System Requirements

### Minimum Requirements:
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: For version control
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)

### Recommended Requirements:
- **RAM**: 8GB or more
- **Storage**: 2GB free space
- **Network**: Internet connection for initial setup

## 🔧 Manual Installation

If the automated setup doesn't work, follow these manual steps:

### 1. Install Node.js
- **Windows**: Download from [nodejs.org](https://nodejs.org/)
- **macOS**: Use Homebrew: `brew install node`
- **Linux**: Use package manager:
  ```bash
  # Ubuntu/Debian
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs
  
  # CentOS/RHEL
  curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
  sudo yum install -y nodejs
  ```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Create Data Directory
```bash
# Create data directory
mkdir -p backend/data

# The setup script will create placeholder Excel files if they don't exist
```

### 4. Start the System
```bash
# Start both servers
npm run start:system

# Or start individually
npm run start:backend  # Terminal 1
npm run start:frontend # Terminal 2
```

## 🌐 Access the Application

After successful installation:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3005

## 📁 Project Structure

```
test-management-system/
├── backend/                 # Node.js backend
│   ├── src/                # Source code
│   ├── data/               # Excel data files
│   └── package.json        # Backend dependencies
├── frontend/               # React frontend
│   ├── src/                # Source code
│   └── package.json        # Frontend dependencies
├── setup.sh               # macOS/Linux setup script
├── setup.bat              # Windows setup script
├── start-system.sh        # Start both servers (macOS/Linux)
├── start-system.bat       # Start both servers (Windows)
├── stop-system.sh         # Stop all servers (macOS/Linux)
├── stop-system.bat        # Stop all servers (Windows)
└── package.json           # Root package configuration
```

## 🛠️ Available Scripts

### Setup Scripts:
- `npm run setup` - Run automated setup (macOS/Linux)
- `npm run setup:win` - Run automated setup (Windows)

### Start Scripts:
- `npm run start:system` - Start both servers (macOS/Linux)
- `npm run start:system:win` - Start both servers (Windows)
- `npm run start:backend` - Start backend only
- `npm run start:frontend` - Start frontend only

### Utility Scripts:
- `npm run install-all` - Install all dependencies
- `npm run clean` - Clean node_modules (macOS/Linux)
- `npm run clean:win` - Clean node_modules (Windows)
- `npm run reset` - Clean and reinstall everything (macOS/Linux)
- `npm run reset:win` - Clean and reinstall everything (Windows)
- `npm run backup` - Create data backup
- `npm run check-ports` - Check if ports are available
- `npm run kill-ports` - Kill processes on ports 3000 and 3005

## 🔍 Troubleshooting

### Common Issues:

#### 1. Port Already in Use
```bash
# Check what's using the ports
npm run check-ports

# Kill processes on the ports
npm run kill-ports

# Or manually:
# macOS/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:3005 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
netstat -ano | findstr :3005
taskkill /PID <PID> /F
```

#### 2. Permission Issues (macOS/Linux)
```bash
# Make scripts executable
chmod +x *.sh

# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

#### 3. Node.js Version Issues
```bash
# Check Node.js version
node --version

# Install correct version using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### 4. Dependencies Installation Fails
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
npm run clean
npm run install-all

# On Windows
npm run clean:win
npm run install-all
```

#### 5. Excel Files Missing or Corrupted
The setup script automatically creates placeholder Excel files. If you need to recreate them:
```bash
# Run setup again
npm run setup

# Or manually create them using the backend
cd backend
node -e "require('./src/services/excelService').createPlaceholderFiles()"
```

### Getting Help:

1. **Check the logs**: Look at the terminal output for error messages
2. **Verify requirements**: Ensure Node.js, npm, and Git are installed
3. **Check ports**: Make sure ports 3000 and 3005 are available
4. **Restart**: Try stopping all processes and starting fresh
5. **Reset**: Use `npm run reset` to clean everything and start over

## 📞 Support

If you encounter issues not covered in this guide:

1. Check the console logs for specific error messages
2. Ensure all system requirements are met
3. Try the reset command: `npm run reset`
4. Create an issue in the repository with:
   - Operating system and version
   - Node.js and npm versions
   - Complete error messages
   - Steps to reproduce the issue

## 🎯 Next Steps

After successful installation:

1. **Access the application**: Open http://localhost:3000
2. **Configure sites**: Go to the Setup section to add your sites
3. **Create test cases**: Add your test cases in the Test Cases section
4. **Start testing**: Use the Testing section to execute tests
5. **Monitor progress**: Check the Dashboard for test statistics

## 📚 Additional Resources

- [User Manual](SETUP_README.md) - Detailed usage instructions
- [API Documentation](backend/README.md) - Backend API reference
- [Development Guide](DEVELOPMENT.md) - For contributors and developers
