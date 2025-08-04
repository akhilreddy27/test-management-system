import React from 'react';

const Dashboard = ({ testCases, availableCellTypes, currentUser, setCurrentUser }) => {
  // Calculate statistics dynamically from real data
  const calculateStats = () => {
    // For now, return zeros since we don't have test results yet
    return {
      totalTests: 0,
      passCount: 0,
      failCount: 0,
      notRunCount: 0,
      completionRate: 0,
      passRate: 0
    };
  };

  const stats = calculateStats();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* System Status */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Current User:</span>
            <input
              type="text"
              value={currentUser}
              onChange={(e) => setCurrentUser(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            🔄 Refresh Data
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded">
            <div className="font-medium text-blue-800">Test Cases Available</div>
            <div className="text-blue-700">{testCases.length} test cases loaded from Excel</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="font-medium text-green-800">Cell Types</div>
            <div className="text-green-700">
              {availableCellTypes.length > 0 ? 
                availableCellTypes.join(', ') : 
                'Loading...'
              }
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <div className="font-medium text-purple-800">System Status</div>
            <div className="text-purple-700">Connected to Excel files</div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tests</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalTests}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pass Rate</p>
              <p className="text-3xl font-bold text-green-600">{stats.passRate}%</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion</p>
              <p className="text-3xl font-bold text-blue-600">{stats.completionRate}%</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600">📈</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed Tests</p>
              <p className="text-3xl font-bold text-red-600">{stats.failCount}</p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600">⚠️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Test Cases by Cell Type from Excel */}
      {testCases.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            📋 Test Cases from Excel File (Dynamic)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {availableCellTypes.map(cellType => {
              const typeCases = testCases.filter(tc => tc.cellType === cellType);
              return (
                <div key={cellType} className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                  <h3 className="font-semibold text-lg text-gray-800 mb-2">Cell Type {cellType}</h3>
                  <p className="text-2xl font-bold text-blue-600 mb-2">{typeCases.length}</p>
                  <p className="text-gray-600 text-sm mb-3">Test Cases</p>
                  <div className="text-xs text-gray-500 space-y-1 max-h-24 overflow-y-auto">
                    {typeCases.map(tc => (
                      <div key={tc.caseId} className="truncate p-1 bg-white rounded" title={`${tc.testCase} (${tc.scope})`}>
                        <strong>{tc.caseId}:</strong> {tc.testCase}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Getting Started Guide */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">🚀 Next Steps</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">✏️ Setup Sites</h3>
            <p className="text-blue-700 text-sm">
              Configure your sites, phases, and machines using the Setup tab to create test instances.
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2">🧪 Run Tests</h3>
            <p className="text-green-700 text-sm">
              Once configured, use the Testing tab to record PASS/FAIL results for each test case.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;