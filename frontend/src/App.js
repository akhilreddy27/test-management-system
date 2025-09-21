import React, { useState, useEffect } from 'react';
import { testCasesAPI } from './services/api';
import LoggingService from './services/loggingService';
import Dashboard from './components/dashboard';
import Setup from './components/setup';
import Testing from './components/testing';
import Tickets from './components/tickets';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('testing');
  const [testCases, setTestCases] = useState([]);
  const [availableCellTypes, setAvailableCellTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState('Automation Engineer');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      LoggingService.logPageView(currentView, currentUser);
    }
  }, [currentView, loading]);

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
      LoggingService.logError(error, 'app', currentUser);
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (newView) => {
    const oldView = currentView;
    setCurrentView(newView);
    LoggingService.logNavigation(oldView, newView, currentUser);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', color: 'from-blue-500 to-blue-600', disabled: true },
    { id: 'testing', label: 'Testing', color: 'from-green-500 to-green-600', disabled: false },
    { id: 'setup', label: 'Setup', color: 'from-yellow-500 to-yellow-600', disabled: false },
    { id: 'tickets', label: 'Tickets', color: 'from-purple-500 to-purple-600', disabled: false }
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
      <div className="w-40 min-w-40 flex-shrink-0 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0053E2] via-[#0040B0] to-[#002855] rounded-2xl flex items-center justify-center shadow-xl">
              <span className="text-white text-xl font-bold tracking-wider">FT</span>
            </div>
            <div className="text-center">
              <h1 className="text-base font-semibold text-gray-800 mb-1">Functional Testing</h1>
              <div className="w-8 h-0.5 bg-gradient-to-r from-[#0053E2] to-[#0040B0] mx-auto rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => !item.disabled && handleViewChange(item.id)}
                disabled={item.disabled}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-300 font-medium text-left ${
                  item.disabled
                    ? 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-50'
                    : currentView === item.id
                    ? `bg-gradient-to-r ${item.color} text-white shadow-md`
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-sm">{item.label}</span>
                {item.disabled && (
                  <span className="text-xs text-gray-400">(Work in Progress)</span>
                )}
                {currentView === item.id && !item.disabled && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
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
              {/* User display - will be automatically populated later */}
              <div className="flex items-center space-x-3">
                <span className="text-gray-600 text-sm">User: {currentUser}</span>
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
            {currentView === 'tickets' && (
              <Tickets currentUser={currentUser} />
            )}

          </div>
        </main>


      </div>
    </div>
  );
}

export default App;