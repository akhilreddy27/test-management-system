import React, { useState, useEffect } from 'react';
import Dashboard from './components/dashboard';
import Setup from './components/setup';
import { testCasesAPI } from './services/api';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState('System User');
  
  // Dynamic data from Excel
  const [testCases, setTestCases] = useState([]);
  const [availableCellTypes, setAvailableCellTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data from backend (which reads Excel files)
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load test cases from Excel
        const testCasesResponse = await testCasesAPI.getAll();
        const testCasesData = testCasesResponse.data.data;
        setTestCases(testCasesData);
        
        // Load cell types dynamically
        const cellTypesResponse = await testCasesAPI.getCellTypes();
        const cellTypesData = cellTypesResponse.data.data;
        setAvailableCellTypes(cellTypesData);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load data from Excel files: ' + err.message);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Test Management System...</p>
          <p className="text-gray-500 text-sm">Reading Excel files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <span className="text-4xl">⚠️</span>
            <p className="text-lg font-medium mt-2">Error Loading System</p>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                📊 Test Management System
              </h1>
              <span className="ml-4 text-sm text-gray-500">
                ({testCases.length} test cases from Excel)
              </span>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-md font-medium flex items-center ${
                  currentView === 'dashboard'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                📈 Dashboard
              </button>
              <button
                onClick={() => setCurrentView('setup')}
                className={`px-4 py-2 rounded-md font-medium flex items-center ${
                  currentView === 'setup'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                ⚙️ Setup
              </button>
              <button
                onClick={() => setCurrentView('testing')}
                className={`px-4 py-2 rounded-md font-medium flex items-center ${
                  currentView === 'testing'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                🧪 Testing
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-8">
        {currentView === 'dashboard' && (
          <Dashboard 
            testCases={testCases}
            availableCellTypes={availableCellTypes}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
          />
        )}
        {currentView === 'setup' && (
          <Setup 
            testCases={testCases}
            availableCellTypes={availableCellTypes}
            currentUser={currentUser}
          />
        )}
        {currentView === 'testing' && (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🧪 Testing Coming Soon</h2>
              <p className="text-gray-600">Test execution interface will be added next!</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;