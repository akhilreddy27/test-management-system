import React, { useState, useEffect } from 'react';
import { testStatusAPI } from '../services/api';

const Dashboard = () => {
  const [statistics, setStatistics] = useState({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    notRunTests: 0,
    testCasesByCellType: {}
  });

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const response = await testStatusAPI.getStatistics();
      if (response.data.success) {
        const { overall, grouped } = response.data.data;
        setStatistics({
          totalTests: overall.totalTests || 0,
          passedTests: overall.passCount || 0,
          failedTests: overall.failCount || 0,
          notRunTests: overall.notRunCount || 0,
          testCasesByCellType: grouped?.byCellType || {}
        });
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const getPassRate = () => {
    if (statistics.totalTests === 0) return 0;
    return Math.round((statistics.passedTests / statistics.totalTests) * 100);
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
              Overview of your testing progress and statistics
            </p>
          </div>
          <button
            onClick={loadStatistics}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tests</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalTests}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
              <span className="text-blue-600 text-sm">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Passed</p>
              <p className="text-2xl font-bold text-green-600">{statistics.passedTests}</p>
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
              <p className="text-2xl font-bold text-red-600">{statistics.failedTests}</p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
              <span className="text-red-600 text-sm">❌</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Not Run</p>
              <p className="text-2xl font-bold text-gray-600">{statistics.notRunTests}</p>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
              <span className="text-gray-600 text-sm">⏸️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Progress</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Pass Rate</span>
              <span>{getPassRate()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getPassRate()}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Cases by Cell Type */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Cases by Cell Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(statistics.testCasesByCellType || {}).map(([cellType, stats]) => (
            <div key={cellType} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{cellType}</p>
                  <p className="text-sm text-gray-600">{stats.total} test cases</p>
                  <div className="flex space-x-2 mt-1">
                    <span className="text-xs text-green-600">{stats.passed} ✅</span>
                    <span className="text-xs text-red-600">{stats.failed} ❌</span>
                    <span className="text-xs text-gray-600">{stats.notRun} ⏸️</span>
                  </div>
                </div>
                <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">{cellType}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {(!statistics.testCasesByCellType || Object.keys(statistics.testCasesByCellType || {}).length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <p>No test cases configured yet.</p>
            <p className="text-sm">Use the Setup tab to configure your testing environment.</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => window.location.href = '#testing'}
            className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white text-sm">✅</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Start Testing</p>
                <p className="text-sm text-gray-600">Execute functional tests</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => window.location.href = '#setup'}
            className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-600 rounded-md flex items-center justify-center">
                <span className="text-white text-sm">⚙️</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Setup Configuration</p>
                <p className="text-sm text-gray-600">Configure sites and cells</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;