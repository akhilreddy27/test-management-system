import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Test Cases API
export const testCasesAPI = {
  getAll: () => api.get('/test-cases'),
  getCellTypes: () => api.get('/test-cases/cell-types'),
};

// Test Status API (placeholder for now)
export const testStatusAPI = {
  getAll: () => api.get('/test-status'),
  update: (statusData) => api.put('/test-status', statusData),
};

// Setup API (placeholder for now)
export const setupAPI = {
  createSite: (siteData) => api.post('/setup/site', siteData),
  getSites: () => api.get('/setup/sites'),
};

export default api;