import axios from 'axios';

const API_BASE_URL = 'http://localhost:3002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Test Cases API
export const testCasesAPI = {
  getAll: () => api.get('/test-cases'),
  getBySite: (site, phase) => {
    const params = phase ? { phase } : {};
    return api.get(`/test-cases/site/${site}`, { params });
  },
  getCellTypes: () => api.get('/test-cases/cell-types'),
  getSites: () => api.get('/test-cases/sites'),
  getConfigurations: () => api.get(`${API_BASE_URL}/test-cases/configurations`)
};

// Test Status API
export const testStatusAPI = {
  getAll: () => api.get('/test-status'),
  update: (statusData) => api.put('/test-status', statusData),
  submitResults: (resultsData) => api.post('/test-status/submit', resultsData),
  getStatistics: () => api.get('/test-status/statistics'),
};

// Setup API
export const setupAPI = {
  createSite: (siteData) => api.post('/setup/site', siteData),
  getSites: () => api.get('/setup/sites'),
};



export default api;