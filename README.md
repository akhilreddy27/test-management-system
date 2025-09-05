# Test Management System

A comprehensive test management system for managing test cases, cell types, and site configurations with dynamic driveway management.

## Features

- **Test Case Management**: Create, update, and delete test cases with dynamic cell type support
- **Site Configuration**: Configure sites with multiple cell types and phases
- **Dynamic Driveway Management**: Support for multi-driveway cell types with configurable driveway counts
- **Real-time Status Tracking**: Track test execution status across different sites and phases
- **Searchable Dropdowns**: Enhanced UI with searchable site and cell type selectors
- **Excel Integration**: Direct integration with Excel files for data persistence

## Project Structure

```
test-management-system/
├── backend/                 # Node.js/Express backend
│   ├── data/               # Excel data files
│   ├── src/
│   │   ├── controllers/    # API controllers
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic services
│   │   └── middleware/     # Express middleware
│   └── server.js           # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API service layer
│   │   └── App.js          # Main app component
│   └── public/             # Static assets
└── README.md               # This file
```

## Quick Start

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

   **Alternative**: Use the provided startup scripts:
   - **macOS/Linux**: `./start-backend.sh`
   - **Windows**: `start-backend.bat`

The backend will run on `http://localhost:3005`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will run on `http://localhost:3000`

## Troubleshooting

### Image Upload Issues

If you encounter "Error uploading image: Load failed" or similar errors:

1. **Ensure Backend is Running**: The backend server must be running for image uploads to work
   ```bash
   # Check if backend is running
   curl http://localhost:3005/api/health
   ```

2. **Start Backend Server**: If the backend is not running, start it:
   ```bash
   # Option 1: Manual start
   cd backend && npm start
   
   # Option 2: Use startup script
   ./start-backend.sh  # macOS/Linux
   start-backend.bat   # Windows
   ```

3. **Check Network**: Ensure the frontend can reach `http://localhost:3005`

4. **File Permissions**: Ensure the `backend/data/images` and `backend/data/temp` directories exist and are writable

### Common Issues

- **"Backend server is not running"**: Start the backend server first
- **"Network error"**: Check if the backend is accessible at `http://localhost:3005`
- **"File size too large"**: Images are limited to 10MB
- **"Invalid file type"**: Only image files (PNG, JPG, GIF) are supported

## API Endpoints

### Test Cases
- `GET /api/test-cases` - Get all test cases
- `GET /api/test-cases/site/:site` - Get test cases for a specific site
- `POST /api/test-cases` - Create a new test case
- `PUT /api/test-cases/:id` - Update a test case
- `DELETE /api/test-cases/:id` - Delete a test case

### Site Configuration
- `GET /api/setup/site-options` - Get available site options
- `POST /api/setup/site` - Create site configuration
- `GET /api/setup/sites` - Get all configured sites

### Test Status
- `GET /api/test-status` - Get test status data
- `PUT /api/test-status` - Update test status

### Cell Types
- `GET /api/cell-types` - Get all cell types
- `POST /api/cell-types` - Create a new cell type
- `PUT /api/cell-types/:cellType` - Update a cell type
- `DELETE /api/cell-types/:cellType` - Delete a cell type

## Key Features

### Dynamic Driveway Management
- Support for multi-driveway cell types (e.g., FLIB with 2 driveways, gah with 4 driveways)
- Automatic driveway configuration based on cell type settings
- Dynamic UI that adapts to the number of driveways

### Test Case Creation
- Automatic creation of test status entries for all sites when a new test case is created
- Support for different scopes (Cell, System, Safety, Hardening, Rate)
- Integration with cell type configurations

### Site Management
- Searchable site dropdown with keyboard navigation
- Support for multiple phases per site
- Automatic test case generation for configured cell types

## Data Files

The system uses Excel files for data persistence:

- `cell_types.xlsx` - Cell type configurations and driveway settings
- `site_info.xlsx` - Site information (City, State, DC Number)
- `test_cases.xlsx` - Test case definitions
- `test_status.xlsx` - Test execution status and results

## Development

### Code Structure
- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and data access
- **Routes**: API endpoint definitions
- **Components**: React UI components

### Adding New Features
1. Create/update the appropriate controller method
2. Add the route in the routes file
3. Update the frontend API service if needed
4. Create/update React components for the UI

## Troubleshooting

### Common Issues

1. **"Error loading site options"**: 
   - Ensure the backend server is running on port 3005
   - Check that `site_info.xlsx` exists and has data
   - Clear browser cache and refresh

2. **Test cases not appearing**:
   - Verify that test cases exist in `test_cases.xlsx`
   - Check that corresponding entries exist in `test_status.xlsx`
   - Ensure the site is properly configured

3. **Driveway configuration issues**:
   - Verify cell type settings in `cell_types.xlsx`
   - Check that `hasMultipleDriveways` and `numberOfDriveways` are set correctly

## Contributing

1. Follow the existing code structure
2. Add appropriate error handling
3. Update documentation for new features
4. Test thoroughly before submitting changes

## License

This project is proprietary and confidential. 