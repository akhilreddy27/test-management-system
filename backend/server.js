const express = require('express');
const cors = require('cors');
const testCasesRoutes = require('./src/routes/testCases');
const setupRoutes = require('./src/routes/setup');
const testStatusRoutes = require('./src/routes/testStatus');

console.log('Starting server...');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

console.log('Middleware configured...');

// Routes
app.use('/api/test-cases', testCasesRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/test-status', testStatusRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'OK', message: 'Backend is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('API endpoints:');
  console.log('- GET /api/test-cases');
  console.log('- GET /api/test-cases/cell-types');
  console.log('- POST /api/setup/site');
  console.log('- GET /api/setup/sites');
  console.log('- GET /api/test-status');
  console.log('- PUT /api/test-status');
  console.log('- GET /api/test-status/statistics');
});