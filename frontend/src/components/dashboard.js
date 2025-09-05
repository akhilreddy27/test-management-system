import React, { useState, useEffect } from 'react';
import { testStatusAPI, setupAPI } from '../services/api';

const Dashboard = () => {
  const [selectedSite, setSelectedSite] = useState('');
  const [availableSites, setAvailableSites] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    cells: [],
    statistics: {
      total: 0,
      notRun: 0,
      pass: 0,
      fail: 0,
      blocked: 0
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    if (selectedSite) {
      loadDashboardData(selectedSite);
    }
  }, [selectedSite]);

  const loadSites = async () => {
    try {
      const response = await setupAPI.getSites();
      const sitesData = response.data.data;
      const sitePhaseCombinations = [];
      
      Object.keys(sitesData).forEach(siteName => {
        Object.keys(sitesData[siteName]).forEach(phaseName => {
          sitePhaseCombinations.push(`${siteName} - ${phaseName}`);
        });
      });
      
      setAvailableSites(sitePhaseCombinations);
      if (sitePhaseCombinations.length > 0) {
        setSelectedSite(sitePhaseCombinations[0]);
      }
    } catch (error) {
      console.error('Error loading sites:', error);
      setError('Failed to load available sites');
    }
  };

  const loadDashboardData = async (sitePhaseCombination) => {
    try {
      setLoading(true);
      setError(null);

      const [site, phase] = sitePhaseCombination.split(' - ');
      
      // Get test status data for the selected site
      const testStatusResponse = await testStatusAPI.getAll();
      const allTestStatus = testStatusResponse.data.data;
      
      // Filter by site and phase
      const siteTestStatus = allTestStatus.filter(ts => 
        ts.site === site && ts.phase === phase
      );

      // Get unique cells for this site
      const uniqueCells = [...new Set(siteTestStatus.map(ts => ts.cell))].filter(Boolean).sort();
      
      // Calculate statistics for each cell
      const cellStatistics = uniqueCells.map(cell => {
        const cellTests = siteTestStatus.filter(ts => ts.cell === cell);
        
        const stats = {
          cell,
          total: cellTests.length,
          notRun: cellTests.filter(ts => ts.status === 'NOT RUN').length,
          pass: cellTests.filter(ts => ts.status === 'PASS').length,
          fail: cellTests.filter(ts => ts.status === 'FAIL').length,
          blocked: cellTests.filter(ts => ts.status === 'BLOCKED').length
        };
        
        return stats;
      });

      // Calculate overall statistics
      const overallStats = {
        total: siteTestStatus.length,
        notRun: siteTestStatus.filter(ts => ts.status === 'NOT RUN').length,
        pass: siteTestStatus.filter(ts => ts.status === 'PASS').length,
        fail: siteTestStatus.filter(ts => ts.status === 'FAIL').length,
        blocked: siteTestStatus.filter(ts => ts.status === 'BLOCKED').length
      };

      setDashboardData({
        cells: cellStatistics,
        statistics: overallStats
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status, count) => {
    if (count === 0) return 'text-gray-400';
    
    switch (status) {
      case 'pass': return 'text-green-600';
      case 'fail': return 'text-red-600';
      case 'blocked': return 'text-yellow-600';
      case 'notRun': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status, count) => {
    if (count === 0) return 'bg-gray-50';
    
    switch (status) {
      case 'pass': return 'bg-green-50';
      case 'fail': return 'bg-red-50';
      case 'blocked': return 'bg-yellow-50';
      case 'notRun': return 'bg-gray-50';
      default: return 'bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Testing Dashboard
            </h1>
            <p className="text-gray-600">
              Overview of test statistics by cell and site
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Site Selector */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Site
              </label>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {availableSites.map((site) => (
                  <option key={site} value={site}>
                    {site}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => loadDashboardData(selectedSite)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Overall Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tests</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.statistics.total}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
              <span className="text-blue-600 text-sm">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Not Run</p>
              <p className="text-2xl font-bold text-gray-600">{dashboardData.statistics.notRun}</p>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
              <span className="text-gray-600 text-sm">⏸️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Passed</p>
              <p className="text-2xl font-bold text-green-600">{dashboardData.statistics.pass}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
              <span className="text-green-600 text-sm">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{dashboardData.statistics.fail}</p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
              <span className="text-red-600 text-sm">❌</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Blocked</p>
              <p className="text-2xl font-bold text-yellow-600">{dashboardData.statistics.blocked}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
              <span className="text-yellow-600 text-sm">🚫</span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Statistics Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Test Statistics by Cell
          </h3>
        </div>
        
        {loading && (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading dashboard data...</p>
          </div>
        )}

        {error && (
          <div className="p-6 text-center">
            <div className="text-red-600 bg-red-50 p-4 rounded-md">
              {error}
            </div>
          </div>
        )}

        {!loading && !error && dashboardData.cells.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-gray-500">No test data available for the selected site.</p>
          </div>
        )}

        {!loading && !error && dashboardData.cells.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cell Name
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Not Run
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pass
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fail
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Blocked
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.cells.map((cell) => (
                  <tr key={cell.cell} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {cell.cell}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {cell.total}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBgColor('notRun', cell.notRun)} ${getStatusColor('notRun', cell.notRun)}`}>
                        {cell.notRun}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBgColor('pass', cell.pass)} ${getStatusColor('pass', cell.pass)}`}>
                        {cell.pass}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBgColor('fail', cell.fail)} ${getStatusColor('fail', cell.fail)}`}>
                        {cell.fail}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBgColor('blocked', cell.blocked)} ${getStatusColor('blocked', cell.blocked)}`}>
                        {cell.blocked}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;