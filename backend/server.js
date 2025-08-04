const express = require('express');
const cors = require('cors');
const testCasesRoutes = require('./src/routes/testCases');

console.log('Starting server...');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

console.log('Middleware configured...');

// Routes
app.use('/api/test-cases', testCasesRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'OK', message: 'Backend is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Try visiting: http://localhost:3001/api/health');
});