import axios from 'axios';

const API_BASE_URL = 'http://localhost:3005/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const testCasesAPI = {
  getAll: () => api.get('/test-cases'),
  getBySite: (site, phase, drivewayConfig) => {
    const params = phase ? { phase } : {};
    if (drivewayConfig) {
      params.drivewayConfig = JSON.stringify(drivewayConfig);
    }
    return api.get(`/test-cases/site/${site}`, { params });
  },
  getCellTypes: () => api.get('/test-cases/cell-types'),
  getSites: () => api.get('/test-cases/sites'),
  getConfigurations: () => api.get('/test-cases/configurations'),
  create: (testCaseData) => api.post('/test-cases', testCaseData),
  update: (id, testCaseData) => api.put(`/test-cases/${id}`, testCaseData),
  delete: (id) => api.delete(`/test-cases/${id}`)
};

export const testStatusAPI = {
  getAll: () => api.get('/test-status'),
  update: (statusData) => api.put('/test-status', statusData),
  updateStatus: (testId, status) => api.put('/test-status/status', { testId, status }),
  updateNote: (testId, note) => api.put('/test-status/note', { testId, note }),
  getByTestId: (testId) => api.get(`/test-status/test/${testId}`),
  submitResults: (resultsData) => api.post('/test-status/submit', resultsData),
  getStatistics: () => api.get('/test-status/statistics'),
};

export const setupAPI = {
  createSite: (siteData) => api.post('/setup/site', siteData),
  getSites: () => api.get('/setup/sites'),
  getSiteOptions: () => api.get('/setup/site-options'),

  getSiteInfo: () => api.get('/site-info'),
  createSiteInfo: (siteInfoData) => api.post('/site-info', siteInfoData),
  updateSiteInfo: (id, siteInfoData) => api.put(`/site-info/${id}`, siteInfoData),
  deleteSiteInfo: (id) => api.delete(`/site-info/${id}`),
};

export const cellTypesAPI = {
  getAll: () => api.get('/cell-types'),
  getById: (cellType) => api.get(`/cell-types/${cellType}`),

  getUniqueDCTypes: () => api.get('/cell-types/available-dc-types'),

  create: (cellTypeData) => api.post('/cell-types', cellTypeData),
  update: (cellType, cellTypeData) => api.put(`/cell-types/${cellType}`, cellTypeData),
  delete: (cellType) => api.delete(`/cell-types/${cellType}`),
};

export default api;