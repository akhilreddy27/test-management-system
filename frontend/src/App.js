import React, { useState, useEffect } from 'react';
import { testCasesAPI } from './services/api';
import Dashboard from './components/dashboard';
import Setup from './components/setup';
import Testing from './components/testing';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [testCases, setTestCases] = useState([]);
  const [availableCellTypes, setAvailableCellTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState('Test Engineer');
  const [userInput, setUserInput] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [testCasesResponse, cellTypesResponse] = await Promise.all([
        testCasesAPI.getAll(),
        testCasesAPI.getCellTypes()
      ]);
      
      setTestCases(testCasesResponse.data.data || []);
      setAvailableCellTypes(cellTypesResponse.data.data || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load application data');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = () => {
    if (userInput.trim()) {
      setCurrentUser(userInput.trim());
      setUserInput('');
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', color: 'from-blue-500 to-blue-600' },
    { id: 'testing', label: 'Testing', icon: '✅', color: 'from-green-500 to-green-600' },
    { id: 'setup', label: 'Setup', icon: '⚙️', color: 'from-yellow-500 to-yellow-600' }
  ];

  const getCurrentNavItem = () => navItems.find(item => item.id === currentView);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0053E2] via-[#0040B0] to-[#002855] flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-[#FFC220] rounded-full animate-pulse shadow-2xl"></div>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Loading Functional Testing App</h2>
          <p className="text-white/80 text-lg">Initializing components and data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-12 text-center max-w-2xl mx-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-red-600 text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-red-800 mb-4">Application Error</h2>
          <p className="text-red-700 mb-6">{error}</p>
          <button
            onClick={loadInitialData}
            className="px-8 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all duration-300 font-bold"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-[#0053E2] to-[#0040B0] rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white text-lg font-bold">FT</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#0053E2]">Functional Testing</h1>
              <p className="text-gray-600 text-xs">App</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 font-medium text-left ${
                  currentView === item.id
                    ? `bg-gradient-to-r ${item.color} text-white shadow-md`
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
                {currentView === item.id && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </nav>


      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white shadow-lg border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${getCurrentNavItem()?.color || 'from-gray-400 to-gray-500'}`}></div>
              <h2 className="text-3xl font-bold text-gray-800">{getCurrentNavItem()?.label}</h2>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User Input */}
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUserSubmit()}
                  placeholder="Enter your name..."
                  className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-[#0053E2] focus:ring-2 focus:ring-[#0053E2]/20 transition-all duration-300"
                />
                <button
                  onClick={handleUserSubmit}
                  className="px-4 py-2 bg-[#0053E2] text-white rounded-xl hover:bg-[#0040B0] transition-all duration-300 font-semibold"
                >
                  Set User
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {currentView === 'dashboard' && (
              <Dashboard 
                testCases={testCases} 
                availableCellTypes={availableCellTypes}
                currentUser={currentUser}
              />
            )}
            {currentView === 'testing' && (
              <Testing currentUser={currentUser} />
            )}
            {currentView === 'setup' && (
              <Setup 
                testCases={testCases} 
                availableCellTypes={availableCellTypes}
                currentUser={currentUser}
              />
            )}

          </div>
        </main>


      </div>
    </div>
  );
}

export default App;