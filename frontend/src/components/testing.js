import React, { useState, useEffect } from 'react';
import { testCasesAPI, testStatusAPI, setupAPI } from '../services/api';

const Testing = ({ currentUser }) => {
  const [selectedSite, setSelectedSite] = useState('');
  const [availableSites, setAvailableSites] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCellType, setSelectedCellType] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showHardeningForm, setShowHardeningForm] = useState({});
  const [hardeningFormData, setHardeningFormData] = useState({
    day: 1,
    date: '',
    productionNumber: '',
    notes: ''
  });
  
  // State for CH/VT data entry
  const [chVtData, setChVtData] = useState({});

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    if (selectedSite) {
      loadTestCasesForSite(selectedSite);
    } else {
      setTestCases([]);
    }
  }, [selectedSite]);

  const loadSites = async () => {
    try {
      const response = await setupAPI.getSites();
      // Convert object keys to array of site names
      const sitesArray = Object.keys(response.data.data);
      setAvailableSites(sitesArray);
    } catch (error) {
      console.error('Error loading sites:', error);
      setError('Failed to load available sites');
    }
  };

  const loadTestCasesForSite = async (site) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await testCasesAPI.getBySite(site);
      setTestCases(response.data.data);
      
      // Load current CH/VT data from the backend
      const chVtDataFromBackend = {};
      response.data.data.forEach(testCase => {
        if (testCase.testCase.includes('Cell Hardening') || testCase.testCase.includes('Volume Test')) {
          chVtDataFromBackend[testCase.testId] = {
            volume: testCase.chVolume || testCase.vtVolume || '',
            date: testCase.chDate || '',
            startDateTime: testCase.vtStartDateTime || '',
            endDateTime: testCase.vtEndDateTime || ''
          };
        }
      });
      setChVtData(chVtDataFromBackend);
      
      if (response.data.count === 0) {
        setError(`No test cases found for site: ${site}`);
      }
    } catch (error) {
      console.error('Error loading test cases:', error);
      setError('Failed to load test cases for the selected site');
    } finally {
      setLoading(false);
    }
  };

  const updateTestStatus = async (testId, status) => {
    try {
      // Find the test case to get cell information
      const testCase = testCases.find(tc => tc.testId === testId);
      if (!testCase) {
        console.error('Test case not found for testId:', testId);
        return;
      }
      
      // Debug: Check if cell property exists
      if (!testCase.cell) {
        console.error('Cell property not found in test case:', testCase);
        return;
      }

      const response = await testStatusAPI.update({
        testId,
        cell: testCase.cell, // Add cell information for uniqueness
        cellType: testCase.cellType, // Add cell type for uniqueness
        site: selectedSite, // Add site for uniqueness
        status,
        lastModified: new Date().toISOString(),
        modifiedUser: currentUser
      });

      if (response.data.success) {
        setTestCases(prev => prev.map(tc => 
          tc.testId === testId 
            ? { ...tc, status, lastModified: new Date().toISOString(), modifiedUser: currentUser }
            : tc
        ));
      }
    } catch (error) {
      console.error('Error updating test status:', error);
      alert('Failed to update test status. Please try again.');
    }
  };

  const handleStatusChange = (testId, newStatus) => {
    updateTestStatus(testId, newStatus);
  };

  const handleChVtDataChange = async (testId, field, value) => {
    // Update local state
    setChVtData(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [field]: value
      }
    }));

    // Also update the backend
    try {
      // Find the test case to determine its type
      const testCase = testCases.find(tc => tc.testId === testId);
      if (!testCase) {
        console.error('Test case not found for testId:', testId);
        return;
      }
      
      // Debug: Check if cell property exists
      if (!testCase.cell) {
        console.error('Cell property not found in test case:', testCase);
        return;
      }

      // Get current data for this test case
      const currentData = chVtData[testId] || {};
      const updatedData = { ...currentData, [field]: value };

      // Determine if we have any actual data
      let hasData = false;
      if (testCase.testCase.includes('Cell Hardening')) {
        hasData = (updatedData.volume && updatedData.volume.trim() !== '') || 
                  (updatedData.date && updatedData.date.trim() !== '');
      } else if (testCase.testCase.includes('Volume Test')) {
        hasData = (updatedData.volume && updatedData.volume.trim() !== '') || 
                  (updatedData.startDateTime && updatedData.startDateTime.trim() !== '') ||
                  (updatedData.endDateTime && updatedData.endDateTime.trim() !== '');
      }

      const updateData = {
        testId: testId,
        cell: testCase.cell, // Add cell information for uniqueness
        cellType: testCase.cellType, // Add cell type for uniqueness
        site: selectedSite, // Add site for uniqueness
        status: hasData ? 'DATA_ENTRY' : 'NOT RUN', // Only set DATA_ENTRY if we have actual data
        lastModified: new Date().toISOString(),
        modifiedUser: currentUser
      };

      // Map fields based on test case type
      if (testCase.testCase.includes('Cell Hardening')) {
        if (field === 'volume') {
          updateData.productionNumber = value; // This will be saved to CH Volume
        } else if (field === 'date') {
          updateData.date = value; // This will be saved to CH Date
        }
      } else if (testCase.testCase.includes('Volume Test')) {
        if (field === 'volume') {
          updateData.volume = value; // This will be saved to VT Volume
        } else if (field === 'startDateTime') {
          updateData.startDateTime = value; // This will be saved to VT Start
        } else if (field === 'endDateTime') {
          updateData.endDateTime = value; // This will be saved to VT End
        }
      }

      await testStatusAPI.update(updateData);
    } catch (error) {
      console.error('Error updating CH/VT data:', error);
      alert('Failed to save data. Please try again.');
    }
  };

  const handleHardeningSubmit = async (cellType, cellName, e) => {
    e.preventDefault();
    
    if (!hardeningFormData.date || !hardeningFormData.productionNumber) {
      alert('Please fill in date and production number');
      return;
    }

    try {
      // Update all test cases for this cell with hardening data
      const cellTestCases = testCases.filter(tc => 
        tc.cellType === cellType && tc.cell === cellName
      );

      for (const testCase of cellTestCases) {
        const updateData = {
          testId: testCase.testId,
          status: testCase.status,
          lastModified: new Date().toISOString(),
          modifiedUser: currentUser,
          // Add hardening data
          day: hardeningFormData.day,
          date: hardeningFormData.date,
          productionNumber: hardeningFormData.productionNumber,
          notes: hardeningFormData.notes
        };

        await testStatusAPI.update(updateData);
      }

      // Reload test cases to get updated data
      await loadTestCasesForSite(selectedSite);
      
      // Reset form and hide it
      setHardeningFormData({
        day: 1,
        date: '',
        productionNumber: '',
        notes: ''
      });
      setShowHardeningForm(prev => ({ ...prev, [`${cellType}-${cellName}`]: false }));
      
      alert('Cell hardening data added successfully!');
      
    } catch (error) {
      console.error('Error adding hardening data:', error);
      alert('Failed to add hardening data. Please try again.');
    }
  };

  const toggleHardeningForm = (cellType, cellName) => {
    setShowHardeningForm(prev => ({
      ...prev,
      [`${cellType}-${cellName}`]: !prev[`${cellType}-${cellName}`]
    }));
  };

  const getHardeningStatus = (testCase) => {
    const day1 = testCase.day1Date && testCase.day1Production;
    const day2 = testCase.day2Date && testCase.day2Production;
    const day3 = testCase.day3Date && testCase.day3Production;
    
    if (day1 && day2 && day3) return 'COMPLETED';
    if (day1 && day2) return 'DAY 2 COMPLETED';
    if (day1) return 'DAY 1 COMPLETED';
    return 'NOT STARTED';
  };

  const getHardeningStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'DAY 1 COMPLETED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DAY 2 COMPLETED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'NOT STARTED': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHardeningStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED': return '✅';
      case 'DAY 1 COMPLETED': return '1️⃣';
      case 'DAY 2 COMPLETED': return '2️⃣';
      case 'NOT STARTED': return '⏸️';
      default: return '⏸️';
    }
  };



  const getStatusColor = (status) => {
    switch (status) {
      case 'PASS': return 'bg-green-100 text-green-800 border-green-200';
      case 'FAIL': return 'bg-red-100 text-red-800 border-red-200';
      case 'BLOCKED': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'NOT RUN': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'BLOCKED': return '🚫';
      case 'NOT RUN': return '⏸️';
      default: return '⏸️';
    }
  };

  // Group test cases by scope and cell type
  const groupedTestCases = testCases.reduce((groups, testCase) => {
    const scope = testCase.scope || 'Cell';
    const cellType = testCase.cellType || 'Unknown';
    const cellName = testCase.cell || 'Unknown';
    
    // Create different grouping keys based on scope
    let key;
    if (scope === 'System') {
      key = `SYSTEM-${cellType}`;
    } else {
      key = `${cellType}-${cellName}`;
    }
    
    if (!groups[key]) {
      groups[key] = {
        scope,
        cellType,
        cellName,
        testCases: [],
        passedCount: 0,
        failedCount: 0,
        blockedCount: 0,
        notRunCount: 0
      };
    }
    
    groups[key].testCases.push(testCase);
    
    switch (testCase.status) {
      case 'PASS':
        groups[key].passedCount++;
        break;
      case 'FAIL':
        groups[key].failedCount++;
        break;
      case 'BLOCKED':
        groups[key].blockedCount++;
        break;
      default:
        groups[key].notRunCount++;
        break;
    }
    
    return groups;
  }, {});

  const filteredGroups = selectedCellType === 'all' 
    ? groupedTestCases 
    : Object.fromEntries(
        Object.entries(groupedTestCases).filter(([key, group]) => group.cellType === selectedCellType)
      );

  const cellTypes = [...new Set(testCases.map(tc => tc.cellType))];

  const passedCount = testCases.filter(tc => tc.status === 'PASS').length;
  const failedCount = testCases.filter(tc => tc.status === 'FAIL').length;
  const blockedCount = testCases.filter(tc => tc.status === 'BLOCKED').length;
  const notRunCount = testCases.filter(tc => tc.status === 'NOT RUN').length;

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Site Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Functional Testing</h2>
          </div>
          <div className="flex space-x-2">
          <button
            onClick={loadSites}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Refresh Sites
          </button>
            <button
              onClick={() => selectedSite && loadTestCasesForSite(selectedSite)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Refresh Test Cases
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Available Sites</label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a site...</option>
              {availableSites.map(site => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Cell Type</label>
            <select
              value={selectedCellType}
              onChange={(e) => setSelectedCellType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Cell Types</option>
              {cellTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      {testCases.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{testCases.length}</div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{passedCount}</div>
              <div className="text-sm text-green-600">Passed</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{failedCount}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">{blockedCount}</div>
              <div className="text-sm text-orange-600">Blocked</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-600">{notRunCount}</div>
              <div className="text-sm text-gray-600">Not Run</div>
            </div>
          </div>
        </div>
      )}

      {/* Test Cases */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading test cases...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-600">⚠️</div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && Object.keys(filteredGroups).length > 0 && (
        <div className="space-y-4">
          {Object.entries(filteredGroups).map(([groupKey, group]) => (
            <div key={groupKey} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(groupKey)}
                className="w-full bg-gray-50 p-4 hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                      group.scope === 'System' ? 'bg-purple-600' : 
                      group.scope === 'Safety' ? 'bg-red-600' : 'bg-blue-600'
                    }`}>
                      <span className="text-white font-semibold text-sm">
                        {group.scope === 'System' ? 'SYS' : 
                         group.scope === 'Safety' ? 'SAF' : group.cellType}
                      </span>
                  </div>
                  <div className="text-left">
                      <h4 className="font-semibold text-gray-900">
                        {group.scope === 'System' ? `System Tests - ${group.cellType}` : 
                         `${group.cellType} - ${group.cellName}`}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {group.testCases.length} test cases • {group.scope} scope
                      </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Status Summary */}
                  <div className="flex items-center space-x-3 text-sm">
                    <span className="text-green-600 font-medium">{group.passedCount} ✅</span>
                    <span className="text-red-600 font-medium">{group.failedCount} ❌</span>
                    <span className="text-orange-600 font-medium">{group.blockedCount} 🚫</span>
                    <span className="text-gray-600 font-medium">{group.notRunCount} ⏸️</span>
                  </div>
                  
                  {/* Expand/Collapse Icon */}
                  <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm transform transition-transform duration-200">
                      {expandedGroups[groupKey] ? '−' : '+'}
                    </span>
                  </div>
                </div>
              </button>

              {/* Group Content */}
              {expandedGroups[groupKey] && (
                <div className="border-t border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Test Case
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Case ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {group.testCases.map((testCase, index) => (
                          <tr key={testCase.testId} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-gray-900">{testCase.testCase}</div>
                                <div className="text-sm text-gray-500">{testCase.scope} • {testCase.phase}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">
                                {testCase.testId}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {testCase.testCase.includes('Cell Hardening') ? (
                                <span className="text-gray-400 text-xs">—</span>
                              ) : (
                                <select
                                  value={testCase.status}
                                  onChange={(e) => handleStatusChange(testCase.testId, e.target.value)}
                                  className={`px-2 py-1 rounded text-xs font-medium border focus:ring-1 focus:ring-blue-500 ${
                                    testCase.status === 'PASS' ? 'bg-green-100 text-green-800 border-green-300' :
                                    testCase.status === 'FAIL' ? 'bg-red-100 text-red-800 border-red-300' :
                                    testCase.status === 'BLOCKED' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                    'bg-gray-100 text-gray-800 border-gray-300'
                                  }`}
                                >
                                  <option value="NOT RUN">⏸️ NOT RUN</option>
                                  <option value="PASS">✅ PASS</option>
                                  <option value="FAIL">❌ FAIL</option>
                                  <option value="BLOCKED">🚫 BLOCKED</option>
                                </select>
                              )}
                            </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {testCase.testCase.includes('Cell Hardening') ? (
                                // Data entry fields for Cell Hardening test cases
                                <div className="flex space-x-2">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      CH Volume
                                    </label>
                                    <input
                                      type="number"
                                      placeholder="CH Volume"
                                      value={chVtData[testCase.testId]?.volume || ''}
                                      onChange={(e) => handleChVtDataChange(testCase.testId, 'volume', e.target.value)}
                                      className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                                      min="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                      type="date"
                                      value={chVtData[testCase.testId]?.date || ''}
                                      onChange={(e) => handleChVtDataChange(testCase.testId, 'date', e.target.value)}
                                      className="w-28 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>
                              ) : testCase.testCase.includes('Volume Test') ? (
                                // Data entry fields for Volume Test cases
                                <div className="flex space-x-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      VT Volume
                                    </label>
                                    <input
                                      type="number"
                                      placeholder="VT Volume"
                                      value={chVtData[testCase.testId]?.volume || ''}
                                      onChange={(e) => handleChVtDataChange(testCase.testId, 'volume', e.target.value)}
                                      className="w-24 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                                      min="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Start</label>
                                    <input
                                      type="datetime-local"
                                      value={chVtData[testCase.testId]?.startDateTime || ''}
                                      onChange={(e) => handleChVtDataChange(testCase.testId, 'startDateTime', e.target.value)}
                                      className="w-40 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">End</label>
                                    <input
                                      type="datetime-local"
                                      value={chVtData[testCase.testId]?.endDateTime || ''}
                                      onChange={(e) => handleChVtDataChange(testCase.testId, 'endDateTime', e.target.value)}
                                      className="w-40 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                              </div>
                              ) : (
                                // No actions for regular test cases - status is handled by dropdown
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Cell Hardening Section - Only for CH/VT test cases */}
                  {group.scope !== 'System' && group.testCases.some(tc => 
                    tc.testCase.includes('CH') || tc.testCase.includes('VT')
                  ) && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-900">🏭 Cell Hardening</h5>
                      <button
                        onClick={() => toggleHardeningForm(group.cellType, group.cellName)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        {showHardeningForm[`${group.cellType}-${group.cellName}`] ? 'Cancel' : 'Add Hardening Data'}
                      </button>
                    </div>
                    
                    {/* Hardening Status Display */}
                    <div className="mb-3">
                      {group.testCases.map((testCase, index) => {
                        const hardeningStatus = getHardeningStatus(testCase);
                        return (
                          <div key={index} className="flex items-center space-x-2 mb-1">
                            <span className="text-xs text-gray-600">{testCase.testCase}:</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getHardeningStatusColor(hardeningStatus)}`}>
                              {getHardeningStatusIcon(hardeningStatus)} {hardeningStatus}
                            </span>
                                                 {testCase.day1Production && (
                       <span className="text-xs text-gray-500">
                         Day 1: {testCase.day1Production} {testCase.testCase.includes('CH') ? 'CH Volume' : 
                                                           testCase.testCase.includes('VT') ? 'VT Volume' : 'units'}
                       </span>
                     )}
                     {testCase.day2Production && (
                       <span className="text-xs text-gray-500">
                         Day 2: {testCase.day2Production} {testCase.testCase.includes('CH') ? 'CH Volume' : 
                                                           testCase.testCase.includes('VT') ? 'VT Volume' : 'units'}
                       </span>
                     )}
                     {testCase.day3Production && (
                       <span className="text-xs text-gray-500">
                         Day 3: {testCase.day3Production} {testCase.testCase.includes('CH') ? 'CH Volume' : 
                                                           testCase.testCase.includes('VT') ? 'VT Volume' : 'units'}
                       </span>
                     )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Hardening Form */}
                    {showHardeningForm[`${group.cellType}-${group.cellName}`] && (
                      <form onSubmit={(e) => handleHardeningSubmit(group.cellType, group.cellName, e)} className="bg-white p-3 rounded border">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Day</label>
                            <select
                              value={hardeningFormData.day}
                              onChange={(e) => setHardeningFormData({ ...hardeningFormData, day: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                              required
                            >
                              <option value={1}>Day 1</option>
                              <option value={2}>Day 2</option>
                              <option value={3}>Day 3</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                            <input
                              type="date"
                              value={hardeningFormData.date}
                              onChange={(e) => setHardeningFormData({ ...hardeningFormData, date: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                              required
                            />
                          </div>
                          
                                               <div>
                       <label className="block text-xs font-medium text-gray-700 mb-1">
                         {group.testCases.some(tc => tc.testCase.includes('CH')) ? 'CH Volume' : 
                          group.testCases.some(tc => tc.testCase.includes('VT')) ? 'VT Volume' : 'Production #'}
                       </label>
                       <input
                         type="number"
                         value={hardeningFormData.productionNumber}
                         onChange={(e) => setHardeningFormData({ ...hardeningFormData, productionNumber: e.target.value })}
                         className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                         placeholder={group.testCases.some(tc => tc.testCase.includes('CH')) ? 'CH Volume' : 
                                   group.testCases.some(tc => tc.testCase.includes('VT')) ? 'VT Volume' : 'Units'}
                         min="0"
                         required
                       />
                     </div>
                          
                          <div className="flex items-end">
                            <button
                              type="submit"
                              className="w-full px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                            >
                              Add Data
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Notes (Optional)</label>
                          <input
                            type="text"
                            value={hardeningFormData.notes}
                            onChange={(e) => setHardeningFormData({ ...hardeningFormData, notes: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                            placeholder="Optional notes..."
                          />
                        </div>
                      </form>
                    )}
                  </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}



      {/* No Test Cases Message */}
      {!loading && !error && Object.keys(filteredGroups).length === 0 && testCases.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-gray-500">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Test Cases Found</h3>
            <p className="text-gray-600">Select a site to view available test cases.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Testing; 