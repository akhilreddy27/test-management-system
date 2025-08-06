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
  
  // State for searchable dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for cell type searchable dropdown
  const [isCellTypeDropdownOpen, setIsCellTypeDropdownOpen] = useState(false);
  const [cellTypeSearchTerm, setCellTypeSearchTerm] = useState('');

  useEffect(() => {
    loadTestCaseConfigurations();
    loadSites();
  }, []);

  useEffect(() => {
    if (selectedSite) {
      loadTestCasesForSite(selectedSite);
    } else {
      setTestCases([]);
    }
  }, [selectedSite]);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.relative')) {
        setIsDropdownOpen(false);
        setSearchTerm('');
      }
      if (isCellTypeDropdownOpen && !event.target.closest('.cell-type-dropdown')) {
        setIsCellTypeDropdownOpen(false);
        setCellTypeSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isCellTypeDropdownOpen]);

  const loadSites = async () => {
    try {
      const response = await setupAPI.getSites();
      // Convert the nested structure to site-phase combinations
      const sitesData = response.data.data;
      const sitePhaseCombinations = [];
      
      Object.keys(sitesData).forEach(siteName => {
        Object.keys(sitesData[siteName]).forEach(phaseName => {
          sitePhaseCombinations.push(`${siteName} - ${phaseName}`);
        });
      });
      
      setAvailableSites(sitePhaseCombinations);
    } catch (error) {
      console.error('Error loading sites:', error);
      setError('Failed to load available sites');
    }
  };

  const loadTestCaseConfigurations = async () => {
    try {
      const response = await testCasesAPI.getConfigurations();
      setTestCaseConfigs(response.data.data);
    } catch (error) {
      console.error('Error loading test case configurations:', error);
      // Don't set error state as this is not critical for basic functionality
    }
  };

  const loadTestCasesForSite = async (sitePhaseCombination) => {
    try {
      setLoading(true);
      setError(null);
      
      // Extract site name and phase from site-phase combination
      // Handle site names that contain dashes by splitting on the last occurrence of " - "
      const lastDashIndex = sitePhaseCombination.lastIndexOf(' - ');
      const siteName = sitePhaseCombination.substring(0, lastDashIndex);
      const phase = sitePhaseCombination.substring(lastDashIndex + 3);
      
      console.log('Loading test cases for:', { siteName, phase, sitePhaseCombination });
      
      // Call API with both site and phase parameters
      const response = await testCasesAPI.getBySite(siteName, phase);
      
      console.log('API Response:', response.data);
      
      setTestCases(response.data.data);
      
      // Load current data from the backend dynamically
      const chVtDataFromBackend = {};
      response.data.data.forEach(testCase => {
        const config = getTestCaseConfig(testCase);
        if (config.hasDataEntry) {
          const key = testCase.uniqueTestId || testCase.testId;
          const data = {};
          
          // Map backend fields to frontend fields based on configuration
          config.fields.forEach(fieldConfig => {
            const backendField = getFieldMapping(testCase, fieldConfig.name);
            if (backendField && testCase[backendField] !== undefined) {
              data[fieldConfig.name] = testCase[backendField] || '';
            }
          });
          
          chVtDataFromBackend[key] = data;
        }
      });
      setChVtData(chVtDataFromBackend);
      
      // Check if there are test cases - use both count and data length for safety
      if (!response.data.data || response.data.data.length === 0 || response.data.count === 0) {
        setError(`No test cases found for site: ${sitePhaseCombination}`);
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
      const testCase = testCases.find(tc => tc.uniqueTestId === testId || tc.testId === testId);
      if (!testCase) {
        console.error('Test case not found for testId:', testId);
        return;
      }
      
      // Debug: Check if cell property exists
      if (!testCase.cell) {
        console.error('Cell property not found in test case:', testCase);
        return;
      }

      // Extract site name from site-phase combination
      const lastDashIndex = selectedSite.lastIndexOf(' - ');
      const siteName = selectedSite.substring(0, lastDashIndex);

      const response = await testStatusAPI.update({
        testId: testCase.uniqueTestId || testId, // Use unique test ID if available
        cell: testCase.cell, // Add cell information for uniqueness
        cellType: testCase.cellType, // Add cell type for uniqueness
        site: siteName, // Add site for uniqueness
        status,
        lastModified: new Date().toISOString(),
        modifiedUser: currentUser
      });

      if (response.data.success) {
        setTestCases(prev => prev.map(tc => 
          (tc.uniqueTestId === testId || tc.testId === testId)
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

  // Dynamic test case configuration from backend
  const [testCaseConfigs, setTestCaseConfigs] = useState({});

  const getTestCaseConfig = (testCase) => {
    return testCaseConfigs[testCase.testCase] || {
      hasDataEntry: false,
      fields: [],
      statusRequired: true,
      fieldMappings: {}
    };
  };

  const hasDataEntryFields = (testCase) => {
    return getTestCaseConfig(testCase).hasDataEntry;
  };

  const getDataEntryFields = (testCase) => {
    return getTestCaseConfig(testCase).fields;
  };

  const getFieldMapping = (testCase, fieldName) => {
    const config = getTestCaseConfig(testCase);
    return config.fieldMappings?.[fieldName] || fieldName;
  };

  const handleChVtDataChange = async (testId, field, value) => {
    console.log('handleChVtDataChange called:', { testId, field, value });
    
    // Find the test case to determine its type and get unique test ID
    const testCase = testCases.find(tc => tc.uniqueTestId === testId || tc.testId === testId);
    if (!testCase) {
      console.error('Test case not found for testId:', testId);
      return;
    }
    
    // Debug: Check if cell property exists
    if (!testCase.cell) {
      console.error('Cell property not found in test case:', testCase);
      return;
    }

    // Use unique test ID as the key for chVtData
    const uniqueKey = testCase.uniqueTestId || testId;
    
    // Update local state using unique key
    setChVtData(prev => ({
      ...prev,
      [uniqueKey]: {
        ...prev[uniqueKey],
        [field]: value
      }
    }));

    // Also update the backend
    try {
      // Get current data for this test case using unique key
      const currentData = chVtData[uniqueKey] || {};
      const updatedData = { ...currentData, [field]: value };

      // Dynamic data validation based on test case type
      const config = getTestCaseConfig(testCase);
      let hasData = false;
      
      if (config.hasDataEntry) {
        hasData = config.fields.some(fieldConfig => {
          const fieldValue = updatedData[fieldConfig.name];
          return fieldValue && fieldValue.toString().trim() !== '';
        });
      }

      const updateData = {
        testId: testCase.uniqueTestId || testId, // Use unique test ID if available
        cell: testCase.cell, // Add cell information for uniqueness
        cellType: testCase.cellType, // Add cell type for uniqueness
        site: selectedSite, // Add site for uniqueness
        lastModified: new Date().toISOString(),
        modifiedUser: currentUser
      };

      // Only update status automatically for Cell Hardening (which doesn't have status dropdown)
      // For Volume Test, preserve the current status from the dropdown
      if (testCase.testCase.includes('Cell Hardening')) {
        updateData.status = hasData ? 'DATA_ENTRY' : 'NOT RUN';
      } else if (testCase.testCase.includes('Volume Test')) {
        // For Volume Test, preserve the current status from the dropdown
        updateData.status = testCase.status || 'NOT RUN';
      }

      // Dynamic field mapping based on configuration
      const testConfig = getTestCaseConfig(testCase);
      const backendField = getFieldMapping(testCase, field);
      if (backendField) {
        updateData[backendField] = value;
      }

      console.log('Sending update data:', updateData);
      const response = await testStatusAPI.update(updateData);
      console.log('Update response:', response.data);
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

  // Function to get test case type color based on test case name
  // Automatic scope color assignment system
  const [dynamicScopeColors, setDynamicScopeColors] = useState({});
  
  // Predefined color palette for automatic assignment
  const colorPalette = [
    { bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800' },
    { bg: 'bg-green-50', badge: 'bg-green-100 text-green-800' },
    { bg: 'bg-red-50', badge: 'bg-red-100 text-red-800' },
    { bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-800' },
    { bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-800' },
    { bg: 'bg-indigo-50', badge: 'bg-indigo-100 text-indigo-800' },
    { bg: 'bg-pink-50', badge: 'bg-pink-100 text-pink-800' },
    { bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-800' },
    { bg: 'bg-teal-50', badge: 'bg-teal-100 text-teal-800' },
    { bg: 'bg-cyan-50', badge: 'bg-cyan-100 text-cyan-800' },
    { bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800' },
    { bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800' },
    { bg: 'bg-lime-50', badge: 'bg-lime-100 text-lime-800' },
    { bg: 'bg-rose-50', badge: 'bg-rose-100 text-rose-800' },
    { bg: 'bg-violet-50', badge: 'bg-violet-100 text-violet-800' },
    { bg: 'bg-sky-50', badge: 'bg-sky-100 text-sky-800' },
    { bg: 'bg-slate-50', badge: 'bg-slate-100 text-slate-800' },
    { bg: 'bg-zinc-50', badge: 'bg-zinc-100 text-zinc-800' },
    { bg: 'bg-neutral-50', badge: 'bg-neutral-100 text-neutral-800' },
    { bg: 'bg-stone-50', badge: 'bg-stone-100 text-stone-800' }
  ];

  // Function to automatically assign colors to new scopes
  const assignScopeColor = (scope) => {
    if (!scope) return { bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-800' };
    
    // If scope already has a color assigned, return it
    if (dynamicScopeColors[scope]) {
      return dynamicScopeColors[scope];
    }
    
    // Get all unique scopes from current test cases
    const allScopes = [...new Set(testCases.map(tc => tc.scope).filter(Boolean))];
    
    // Find the index of this scope in the unique scopes list
    const scopeIndex = allScopes.indexOf(scope);
    
    // Assign color from palette based on scope index
    const colorIndex = scopeIndex % colorPalette.length;
    const assignedColor = colorPalette[colorIndex];
    
    // Store the assigned color
    setDynamicScopeColors(prev => ({
      ...prev,
      [scope]: assignedColor
    }));
    
    console.log(`🎨 Automatically assigned color to new scope: "${scope}" - ${assignedColor.bg}`);
    
    return assignedColor;
  };

  const getScopeBackgroundColor = (scope) => {
    const color = assignScopeColor(scope);
    return color.bg;
  };

  const getScopeBadgeColor = (scope) => {
    const color = assignScopeColor(scope);
    return color.badge;
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

  const refreshAll = async () => {
    try {
      setLoading(true);
      // Load configurations first
      await loadTestCaseConfigurations();
      // Refresh sites
      await loadSites();
      // Then refresh test cases if a site is selected
      if (selectedSite) {
        await loadTestCasesForSite(selectedSite);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter sites based on search term
  const filteredSites = availableSites.filter(site =>
    site.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter cell types based on search term
  const filteredCellTypes = cellTypes.filter(type =>
    type.toLowerCase().includes(cellTypeSearchTerm.toLowerCase())
  );

  // Handle site selection
  const handleSiteSelect = (site) => {
    setSelectedSite(site);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  // Handle cell type selection
  const handleCellTypeSelect = (cellType) => {
    setSelectedCellType(cellType);
    setIsCellTypeDropdownOpen(false);
    setCellTypeSearchTerm('');
  };

  // Handle dropdown toggle
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (!isDropdownOpen) {
      setSearchTerm('');
    }
  };

  // Handle cell type dropdown toggle
  const toggleCellTypeDropdown = () => {
    setIsCellTypeDropdownOpen(!isCellTypeDropdownOpen);
    if (!isCellTypeDropdownOpen) {
      setCellTypeSearchTerm('');
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setSearchTerm('');
      setIsCellTypeDropdownOpen(false);
      setCellTypeSearchTerm('');
    }
  };

  // Helper function to highlight search term
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm) return text;
    const lowerText = text.toLowerCase();
    const lowerSearch = searchTerm.toLowerCase();
    const index = lowerText.indexOf(lowerSearch);
    
    if (index === -1) return text;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + searchTerm.length);
    const after = text.substring(index + searchTerm.length);
    
    return (
      <>
        {before}
        <span className="bg-yellow-200 font-semibold">{match}</span>
        {after}
      </>
    );
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
              onClick={refreshAll}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                <span>Refresh</span>
              )}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sites</label>
            <div className="relative">
              <button
                type="button"
                onClick={toggleDropdown}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex items-center justify-between"
              >
                <span className={selectedSite ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedSite || 'Select a site...'}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="p-2 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search sites..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-auto">
                    {filteredSites.length > 0 ? (
                      filteredSites.map(site => (
                        <button
                          key={site}
                          type="button"
                          onClick={() => handleSiteSelect(site)}
                          onKeyDown={handleKeyDown}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
                        >
                          {highlightSearchTerm(site, searchTerm)}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        No sites found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Cell Type</label>
            <div className="relative cell-type-dropdown">
              <button
                type="button"
                onClick={toggleCellTypeDropdown}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex items-center justify-between"
              >
                <span className={selectedCellType !== 'all' ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedCellType === 'all' ? 'All Cell Types' : selectedCellType}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isCellTypeDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isCellTypeDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="p-2 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search cell types..."
                      value={cellTypeSearchTerm}
                      onChange={(e) => setCellTypeSearchTerm(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-auto">
                    <button
                      type="button"
                      onClick={() => handleCellTypeSelect('all')}
                      onKeyDown={handleKeyDown}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm font-medium"
                    >
                      All Cell Types
                    </button>
                    {filteredCellTypes.length > 0 ? (
                      filteredCellTypes.map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleCellTypeSelect(type)}
                          onKeyDown={handleKeyDown}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
                        >
                          {highlightSearchTerm(type, cellTypeSearchTerm)}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        No cell types found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
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
                          <tr key={testCase.testId} className="hover:bg-gray-100">
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-gray-900 flex items-center space-x-2">
                                  <span>{testCase.testCase}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScopeBadgeColor(testCase.scope)}`}>
                                    {testCase.scope}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-500">{testCase.phase}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">
                                {testCase.testId}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getTestCaseConfig(testCase).statusRequired ? (
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
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {hasDataEntryFields(testCase) ? (
                                // Dynamic data entry fields based on test case configuration
                                <div className="flex flex-col space-y-1">
                                  {/* First row: Volume and Availability fields */}
                                  <div className="flex space-x-2">
                                    {getDataEntryFields(testCase).filter(fieldConfig => 
                                      fieldConfig.type !== 'datetime-local'
                                    ).map((fieldConfig, index) => (
                                      <div key={index}>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          {fieldConfig.label}
                                        </label>
                                        <input
                                          type={fieldConfig.type}
                                          placeholder={fieldConfig.placeholder || fieldConfig.label}
                                          value={chVtData[testCase.uniqueTestId || testCase.testId]?.[fieldConfig.name] || ''}
                                          onChange={(e) => handleChVtDataChange(testCase.uniqueTestId || testCase.testId, fieldConfig.name, e.target.value)}
                                          className={`px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 ${
                                            fieldConfig.type === 'date' ? 'w-24' : 
                                            fieldConfig.type === 'number' ? 'w-20' : 'w-20'
                                          }`}
                                          min={fieldConfig.min !== undefined ? fieldConfig.min : (fieldConfig.type === 'number' ? '0' : undefined)}
                                          max={fieldConfig.max !== undefined ? fieldConfig.max : undefined}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {/* Second row: DateTime fields stacked vertically */}
                                  {getDataEntryFields(testCase).filter(fieldConfig => 
                                    fieldConfig.type === 'datetime-local'
                                  ).map((fieldConfig, index) => (
                                    <div key={`datetime-${index}`}>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        {fieldConfig.label}
                                      </label>
                                      <input
                                        type={fieldConfig.type}
                                        placeholder={fieldConfig.placeholder || fieldConfig.label}
                                        value={chVtData[testCase.uniqueTestId || testCase.testId]?.[fieldConfig.name] || ''}
                                        onChange={(e) => handleChVtDataChange(testCase.uniqueTestId || testCase.testId, fieldConfig.name, e.target.value)}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 w-44"
                                      />
                                    </div>
                                  ))}
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
                      <h5 className="font-medium text-gray-900">Cell Hardening</h5>
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