# Test Management System

A comprehensive test management system for cell testing with Excel integration, built with React frontend and Node.js backend.

## 🚀 Quick Start

### One-Command Setup

**For macOS/Linux:**
```bash
git clone <repository-url>
cd test-management-system
./setup.sh
./start-system.sh
```

**For Windows:**
```cmd
git clone <repository-url>
cd test-management-system
setup.bat
start-system.bat
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3005

## ✨ Features

- **Test Case Management**: Create, edit, and manage test cases
- **Site Configuration**: Configure sites, phases, and cell types
- **Test Execution**: Execute tests and track status
- **Ticket Management**: Create and manage tickets with cell information
- **Dashboard**: View test statistics and progress
- **Excel Integration**: Full Excel file integration for data persistence
- **Real-time Updates**: Live status updates and notifications

## 🛠️ System Requirements

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: For version control
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)

## 📁 Project Structure

```
test-management-system/
├── backend/                 # Node.js backend
│   ├── src/                # Source code
│   │   ├── controllers/    # API controllers
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes
│   │   └── middleware/     # Express middleware
│   ├── data/               # Excel data files
│   └── package.json        # Backend dependencies
├── frontend/               # React frontend
│   ├── src/                # Source code
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   └── hooks/          # Custom React hooks
│   └── package.json        # Frontend dependencies
├── setup.sh               # macOS/Linux setup script
├── setup.bat              # Windows setup script
├── start-system.sh        # Start both servers (macOS/Linux)
├── start-system.bat       # Start both servers (Windows)
└── package.json           # Root package configuration
```

## 🎯 Available Scripts

### Setup & Installation
- `./setup.sh` / `setup.bat` - Automated system setup
- `npm run install-all` - Install all dependencies
- `npm run setup` - Run setup script (macOS/Linux)
- `npm run setup:win` - Run setup script (Windows)

### Start/Stop System
- `./start-system.sh` / `start-system.bat` - Start both servers
- `./stop-system.sh` / `stop-system.bat` - Stop all servers
- `npm run start:backend` - Start backend only
- `npm run start:frontend` - Start frontend only

### Development
- `npm run dev` - Start in development mode with hot reload
- `npm run backend` - Start backend in development mode
- `npm run frontend` - Start frontend in development mode

### Utilities
- `npm run clean` - Clean node_modules (macOS/Linux)
- `npm run clean:win` - Clean node_modules (Windows)
- `npm run reset` - Clean and reinstall everything
- `npm run backup` - Create data backup
- `npm run check-ports` - Check if ports are available
- `npm run kill-ports` - Kill processes on ports 3000 and 3005

## 🔧 Configuration

### Excel Files
The system uses Excel files for data persistence:
- `test_cases.xlsx` - Test case definitions
- `cell_types.xlsx` - Cell type configurations
- `site_info.xlsx` - Site information
- `test_status.xlsx` - Test execution status
- `tickets.xlsx` - Ticket management
- `ui_changes_log.xlsx` - UI change logging

### API Endpoints
- `GET /api/test-cases` - Get all test cases
- `GET /api/test-status` - Get test status
- `GET /api/site-info` - Get site information
- `GET /api/tickets` - Get tickets
- `POST /api/setup/site` - Create site configuration

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check ports
npm run check-ports

# Kill processes
npm run kill-ports
```

#### Permission Issues (macOS/Linux)
```bash
chmod +x *.sh
```

#### Dependencies Issues
```bash
npm run reset
```

#### Excel Files Missing
```bash
# Run setup again
./setup.sh
```

### Getting Help
1. Check console logs for error messages
2. Verify system requirements are met
3. Try `npm run reset` to clean and reinstall
4. Create an issue with:
   - OS and version
   - Node.js and npm versions
   - Complete error messages

## 📚 Documentation

- [Installation Guide](INSTALLATION_GUIDE.md) - Detailed installation instructions
- [User Manual](SETUP_README.md) - Complete usage guide
- [API Documentation](backend/README.md) - Backend API reference

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
1. Check the troubleshooting section
2. Review the documentation
3. Create an issue in the repository
4. Contact the development team

---

**Made with ❤️ for efficient test management**