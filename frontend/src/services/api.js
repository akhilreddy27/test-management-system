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
  updateStatus: (testId, statusOrFields) => {
    // If statusOrFields is a simple string (like 'PASS', 'FAIL'), wrap it in status
    // If it's an object with hardening fields (like { chVolume: '123' }), merge directly
    if (typeof statusOrFields === 'string') {
      return api.put('/test-status/status', { testId, status: statusOrFields });
    } else {
      // For hardening/rate fields, merge directly into the request body
      return api.put('/test-status/status', { testId, ...statusOrFields });
    }
  },
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

export const ticketsAPI = {
  getAll: () => api.get('/tickets'),
  getById: (id) => api.get(`/tickets/${id}`),
  create: (ticketData) => api.post('/tickets', ticketData),
  update: (id, ticketData) => api.put(`/tickets/${id}`, ticketData),
  delete: (id) => api.delete(`/tickets/${id}`),
  getByStatus: (status) => api.get(`/tickets/status/${status}`),
  getByPriority: (priority) => api.get(`/tickets/priority/${priority}`),
  getByAssignee: (assignee) => api.get(`/tickets/assignee/${assignee}`)
};

export default api;