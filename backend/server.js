const express = require('express');
const cors = require('cors');
const testCasesRoutes = require('./src/routes/testCases');
const setupRoutes = require('./src/routes/setup');
const testStatusRoutes = require('./src/routes/testStatus');
const cellHardeningRoutes = require('./src/routes/cellHardening');
const loggingRoutes = require('./src/routes/logging');
const cellTypesRoutes = require('./src/routes/cellTypes');
const siteInfoRoutes = require('./src/routes/siteInfo');
const imageRoutes = require('./src/routes/images');

console.log('Starting server...');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

console.log('Middleware configured...');

// Routes
app.use('/api/test-cases', testCasesRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/test-status', testStatusRoutes);
app.use('/api/cell-hardening', cellHardeningRoutes);
app.use('/api/logging', loggingRoutes);
app.use('/api/cell-types', cellTypesRoutes);
app.use('/api/site-info', siteInfoRoutes);
app.use('/api/images', imageRoutes);

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
  console.log('- PUT /api/test-status/status');
  console.log('- PUT /api/test-status/note');
  console.log('- GET /api/test-status/statistics');
  console.log('- GET /api/cell-hardening');
  console.log('- GET /api/cell-hardening/summary');
  console.log('- POST /api/cell-hardening');
  console.log('- PUT /api/cell-hardening/:site/:cellType/:cell/:day');
  console.log('- DELETE /api/cell-hardening/:site/:cellType/:cell/:day');
  console.log('- POST /api/logging/activity');
  console.log('- GET /api/cell-types');
  console.log('- POST /api/cell-types');
  console.log('- PUT /api/cell-types/:cellType');
  console.log('- DELETE /api/cell-types/:cellType');
  console.log('- GET /api/site-info');
  console.log('- POST /api/site-info');
  console.log('- PUT /api/site-info/:id');
  console.log('- DELETE /api/site-info/:id');
});