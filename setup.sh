#!/bin/bash

# Test Management System Setup Script
# This script sets up the entire test management system on any computer
# Author: Test Management System Team
# Version: 1.0

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        print_warning "Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 2
    fi
}

echo "=================================================="
echo "    Test Management System Setup Script"
echo "=================================================="
echo ""

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
else
    print_error "Unsupported operating system: $OSTYPE"
    print_error "This script supports macOS and Linux only."
    exit 1
fi

print_status "Detected operating system: $OS"

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root is not recommended. Consider using a regular user account."
fi

# Check system requirements
print_status "Checking system requirements..."

# Check Node.js
if ! command_exists node; then
    print_error "Node.js is not installed!"
    print_status "Installing Node.js..."
    
    if [[ "$OS" == "macOS" ]]; then
        if command_exists brew; then
            brew install node
        else
            print_error "Homebrew is not installed. Please install Node.js manually from https://nodejs.org/"
            print_status "Installing Homebrew first..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            brew install node
        fi
    elif [[ "$OS" == "Linux" ]]; then
        # Try different package managers
        if command_exists apt-get; then
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command_exists yum; then
            curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
            sudo yum install -y nodejs
        elif command_exists dnf; then
            curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
            sudo dnf install -y nodejs
        else
            print_error "No supported package manager found. Please install Node.js manually."
            exit 1
        fi
    fi
else
    NODE_VERSION=$(node --version)
    print_success "Node.js is installed: $NODE_VERSION"
fi

# Check npm
if ! command_exists npm; then
    print_error "npm is not installed!"
    exit 1
else
    NPM_VERSION=$(npm --version)
    print_success "npm is installed: $NPM_VERSION"
fi

# Check Python (for node-gyp dependencies)
if ! command_exists python3; then
    print_warning "Python3 is not installed. Some npm packages may fail to build."
    if [[ "$OS" == "macOS" ]]; then
        if command_exists brew; then
            brew install python3
        fi
    elif [[ "$OS" == "Linux" ]]; then
        if command_exists apt-get; then
            sudo apt-get install -y python3 python3-pip
        elif command_exists yum; then
            sudo yum install -y python3 python3-pip
        elif command_exists dnf; then
            sudo dnf install -y python3 python3-pip
        fi
    fi
else
    PYTHON_VERSION=$(python3 --version)
    print_success "Python3 is installed: $PYTHON_VERSION"
fi

# Check git
if ! command_exists git; then
    print_error "Git is not installed!"
    if [[ "$OS" == "macOS" ]]; then
        if command_exists brew; then
            brew install git
        else
            print_error "Please install Git manually from https://git-scm.com/"
            exit 1
        fi
    elif [[ "$OS" == "Linux" ]]; then
        if command_exists apt-get; then
            sudo apt-get install -y git
        elif command_exists yum; then
            sudo yum install -y git
        elif command_exists dnf; then
            sudo dnf install -y git
        fi
    fi
else
    GIT_VERSION=$(git --version)
    print_success "Git is installed: $GIT_VERSION"
fi

# Check curl
if ! command_exists curl; then
    print_error "curl is not installed!"
    if [[ "$OS" == "macOS" ]]; then
        if command_exists brew; then
            brew install curl
        fi
    elif [[ "$OS" == "Linux" ]]; then
        if command_exists apt-get; then
            sudo apt-get install -y curl
        elif command_exists yum; then
            sudo yum install -y curl
        elif command_exists dnf; then
            sudo dnf install -y curl
        fi
    fi
else
    print_success "curl is installed"
fi

# Check if ports are available
print_status "Checking if required ports are available..."

BACKEND_PORT=3005
FRONTEND_PORT=3000

if ! check_port $BACKEND_PORT; then
    print_warning "Port $BACKEND_PORT is in use. Attempting to free it..."
    kill_port $BACKEND_PORT
    if ! check_port $BACKEND_PORT; then
        print_error "Could not free port $BACKEND_PORT. Please stop the service using this port manually."
        exit 1
    fi
fi

if ! check_port $FRONTEND_PORT; then
    print_warning "Port $FRONTEND_PORT is in use. Attempting to free it..."
    kill_port $FRONTEND_PORT
    if ! check_port $FRONTEND_PORT; then
        print_error "Could not free port $FRONTEND_PORT. Please stop the service using this port manually."
        exit 1
    fi
fi

print_success "All required ports are available"

# Install dependencies
print_status "Installing dependencies..."

# Root dependencies
if [ -f "package.json" ]; then
    print_status "Installing root dependencies..."
    npm install
    print_success "Root dependencies installed"
fi

# Backend dependencies
if [ -d "backend" ]; then
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
fi

# Frontend dependencies
if [ -d "frontend" ]; then
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    print_success "Frontend dependencies installed"
fi

# Check if data directory exists and has required files
print_status "Checking data directory..."

if [ ! -d "backend/data" ]; then
    print_warning "Data directory not found. Creating it..."
    mkdir -p backend/data
fi

# Check for required Excel files
REQUIRED_FILES=(
    "backend/data/test_cases.xlsx"
    "backend/data/cell_types.xlsx"
    "backend/data/site_info.xlsx"
    "backend/data/test_status.xlsx"
    "backend/data/tickets.xlsx"
    "backend/data/ui_changes_log.xlsx"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    print_warning "Some required Excel files are missing:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    print_status "Creating placeholder files..."
    
    # Create placeholder Excel files if they don't exist
    cd backend/data
    
    # Create a simple Excel file with basic structure
    node -e "
    const XLSX = require('xlsx');
    
    const createPlaceholderFile = (filename, headers, sampleData) => {
        const worksheet = XLSX.utils.json_to_sheet([sampleData]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, filename);
        console.log('Created:', filename);
    };
    
    // Create placeholder files
    createPlaceholderFile('test_cases.xlsx', [], {
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
    
    createPlaceholderFile('cell_types.xlsx', [], {
        'CELL_TYPE': 'AIB',
        'DC_TYPE': 'RDC',
        'MULTIPLE_DRIVEWAYS': false,
        'DRIVEWAY_COUNT': 1,
        'TYPES': '',
        'DESCRIPTION': 'Automated InBound'
    });
    
    createPlaceholderFile('site_info.xlsx', [], {
        'NETWORK': 'Ambient',
        'DC_TYPE': 'RDC',
        'SUB_TYPE': 'Batch',
        'DC_NUMBER': '1111',
        'CITY': 'Sample City',
        'STATE': 'Sample State'
    });
    
    createPlaceholderFile('test_status.xlsx', [], {
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
    
    createPlaceholderFile('tickets.xlsx', [], {
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
    
    createPlaceholderFile('ui_changes_log.xlsx', [], {
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
    
    cd ../..
    print_success "Placeholder Excel files created"
fi

# Create startup scripts
print_status "Creating startup scripts..."

# Create start-backend.sh
cat > start-backend.sh << 'EOF'
#!/bin/bash

# Start Backend Server
echo "Starting Test Management System Backend..."

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "Error: backend directory not found!"
    exit 1
fi

# Navigate to backend directory
cd backend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found in backend directory!"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Start the backend server
echo "Starting backend server on port 3005..."
npm start
EOF

# Create start-frontend.sh
cat > start-frontend.sh << 'EOF'
#!/bin/bash

# Start Frontend Server
echo "Starting Test Management System Frontend..."

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "Error: frontend directory not found!"
    exit 1
fi

# Navigate to frontend directory
cd frontend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found in frontend directory!"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start the frontend server
echo "Starting frontend server on port 3000..."
npm start
EOF

# Create start-system.sh
cat > start-system.sh << 'EOF'
#!/bin/bash

# Start Complete Test Management System
echo "=================================================="
echo "    Starting Test Management System"
echo "=================================================="

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend in background
echo "Starting backend server..."
./start-backend.sh &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 5

# Start frontend in background
echo "Starting frontend server..."
./start-frontend.sh &
FRONTEND_PID=$!

# Wait for both servers to start
sleep 10

echo ""
echo "=================================================="
echo "    System Started Successfully!"
echo "=================================================="
echo "Backend Server:  http://localhost:3005"
echo "Frontend Server: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "=================================================="

# Wait for user to stop the servers
wait
EOF

# Create stop-system.sh
cat > stop-system.sh << 'EOF'
#!/bin/bash

# Stop Test Management System
echo "Stopping Test Management System..."

# Kill processes on ports 3000 and 3005
for port in 3000 3005; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "Stopping process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
    fi
done

echo "All servers stopped."
EOF

# Make scripts executable
chmod +x start-backend.sh start-frontend.sh start-system.sh stop-system.sh

print_success "Startup scripts created"

# Create a comprehensive README
print_status "Creating comprehensive README..."

cat > SETUP_README.md << 'EOF'
# Test Management System - Setup Guide

## Quick Start

### Option 1: Automated Setup (Recommended)
```bash
# Run the setup script
./setup.sh

# Start the system
./start-system.sh
```

### Option 2: Manual Setup
```bash
# Install dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start backend
./start-backend.sh

# Start frontend (in another terminal)
./start-frontend.sh
```

## System Requirements

- **Node.js**: Version 14 or higher
- **npm**: Version 6 or higher
- **Python3**: For native module compilation
- **Git**: For version control
- **Operating System**: macOS or Linux

## Ports Used

- **Backend**: Port 3005 (API server)
- **Frontend**: Port 3000 (React development server)

## Directory Structure

```
test-management-system/
├── backend/                 # Backend Node.js application
│   ├── src/                # Source code
│   ├── data/               # Excel data files
│   └── package.json        # Backend dependencies
├── frontend/               # Frontend React application
│   ├── src/                # Source code
│   └── package.json        # Frontend dependencies
├── setup.sh               # Automated setup script
├── start-system.sh        # Start both servers
├── start-backend.sh       # Start backend only
├── start-frontend.sh      # Start frontend only
└── stop-system.sh         # Stop all servers
```

## Available Scripts

### Setup Scripts
- `./setup.sh` - Complete system setup and dependency installation
- `./start-system.sh` - Start both backend and frontend servers
- `./stop-system.sh` - Stop all running servers

### Individual Server Scripts
- `./start-backend.sh` - Start backend server only
- `./start-frontend.sh` - Start frontend server only

## Troubleshooting

### Port Already in Use
If you get a "port already in use" error:
```bash
# Stop all servers
./stop-system.sh

# Or manually kill processes
lsof -ti:3000 | xargs kill -9
lsof -ti:3005 | xargs kill -9
```

### Permission Issues
```bash
# Make scripts executable
chmod +x *.sh
```

### Dependencies Issues
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Excel File Issues
If Excel files are missing or corrupted:
```bash
# The setup script will create placeholder files automatically
./setup.sh
```

## Features

- **Test Case Management**: Create, edit, and manage test cases
- **Site Configuration**: Configure sites, phases, and cell types
- **Test Execution**: Execute tests and track status
- **Ticket Management**: Create and manage tickets with cell information
- **Dashboard**: View test statistics and progress
- **Data Export**: Export test results to Excel

## API Endpoints

### Backend API (Port 3005)
- `GET /api/test-cases` - Get all test cases
- `GET /api/test-status` - Get test status
- `GET /api/site-info` - Get site information
- `GET /api/tickets` - Get tickets
- `POST /api/setup/site` - Create site configuration

### Frontend (Port 3000)
- Main application interface
- Dashboard for test management
- Forms for data entry

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Ensure all dependencies are installed correctly
3. Verify ports 3000 and 3005 are available
4. Check the console logs for error messages

## Development

To run in development mode:
```bash
# Backend development
cd backend && npm run dev

# Frontend development
cd frontend && npm start
```
EOF

print_success "Comprehensive README created"

# Final checks
print_status "Running final checks..."

# Check if all required files exist
REQUIRED_SCRIPTS=("start-backend.sh" "start-frontend.sh" "start-system.sh" "stop-system.sh")
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        print_success "✓ $script created"
    else
        print_error "✗ $script not found"
    fi
done

# Test if backend can start
print_status "Testing backend startup..."
cd backend
timeout 10s npm start > /dev/null 2>&1 &
BACKEND_TEST_PID=$!
sleep 3

if kill -0 $BACKEND_TEST_PID 2>/dev/null; then
    print_success "✓ Backend can start successfully"
    kill $BACKEND_TEST_PID 2>/dev/null || true
else
    print_warning "⚠ Backend startup test failed"
fi
cd ..

echo ""
echo "=================================================="
echo "    Setup Completed Successfully!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Start the system: ./start-system.sh"
echo "2. Open your browser: http://localhost:3000"
echo "3. Backend API: http://localhost:3005"
echo ""
echo "Available commands:"
echo "  ./start-system.sh  - Start both servers"
echo "  ./start-backend.sh - Start backend only"
echo "  ./start-frontend.sh - Start frontend only"
echo "  ./stop-system.sh   - Stop all servers"
echo ""
echo "For detailed information, see SETUP_README.md"
echo "=================================================="

print_success "Setup script completed successfully!"
