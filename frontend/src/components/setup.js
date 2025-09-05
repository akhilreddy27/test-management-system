import React, { useState, useEffect } from 'react';
import { setupAPI, testCasesAPI, cellTypesAPI } from '../services/api';
import LoggingService from '../services/loggingService';
import { showSuccessToast, showErrorToast } from '../services/toastService';
import SiteInfo from './siteInfo';
import CellTypes from './cellTypes';
import TestCases from './testCases';

const Setup = ({ currentUser = 'Unknown' }) => {
  const [activeTab, setActiveTab] = useState('site-config');
  const [formData, setFormData] = useState({
    siteName: '',
    phase: '',
    cellTypes: []
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [availableCellTypes, setAvailableCellTypes] = useState([]);
  const [filteredCellTypes, setFilteredCellTypes] = useState([]); // New state for filtered cell types
  const [expandedCellTypes, setExpandedCellTypes] = useState({});
  const [siteOptions, setSiteOptions] = useState([]);
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const [siteSearchTerm, setSiteSearchTerm] = useState('');
  const [selectedSiteIndex, setSelectedSiteIndex] = useState(-1);
  const [phaseSelectRef, setPhaseSelectRef] = useState(null);
  const [selectedSiteDcType, setSelectedSiteDcType] = useState(''); // New state for selected site's DC type

  // Safe helpers for dropdown options that may be strings or objects
  const getOptionLabel = (option) => {
    if (option == null) return '';
    const labelCandidate = typeof option === 'object' ? (option.label ?? option.value) : option;
    return String(labelCandidate ?? '');
  };

  const getOptionValue = (option) => {
    if (option == null) return '';
    const valueCandidate = typeof option === 'object' ? (option.value ?? option.label) : option;
    return String(valueCandidate ?? '');
  };

  useEffect(() => {
    loadCellTypes();
    loadSiteOptions();
    LoggingService.logPageView('setup', currentUser);
  }, [currentUser]);

  // Refresh cell types when switching to site-config tab
  useEffect(() => {
    if (activeTab === 'site-config') {
      loadCellTypes();
    }
  }, [activeTab]);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSiteDropdownOpen && !event.target.closest('.site-dropdown')) {
        setIsSiteDropdownOpen(false);
        setSiteSearchTerm('');
        setSelectedSiteIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSiteDropdownOpen]);

  const loadCellTypes = async () => {
    try {
      const response = await cellTypesAPI.getAll();
      if (response.data.success) {
        console.log('Loaded cell types:', response.data.data);
        setAvailableCellTypes(response.data.data);
        LoggingService.logActivity({
          user: currentUser,
          action: 'LOAD_CELL_TYPES',
          module: 'setup',
          details: 'Loaded available cell types'
        });
      } else {
        showErrorToast('Error loading available cell types', setMessage);
      }
    } catch (error) {
      console.error('Error loading cell types:', error);
      showErrorToast('Error loading available cell types', setMessage);
      LoggingService.logError(error, 'setup', currentUser);
    }
  };

  // Function to filter cell types based on selected site's DC type
  const filterCellTypesByDcType = (dcType) => {
    if (!dcType) {
      setFilteredCellTypes([]);
      return;
    }
    
    console.log('Available cell types:', availableCellTypes);
    console.log('Filtering for DC Type:', dcType);
    
    const filtered = availableCellTypes.filter(cellType => {
      // Handle both string and object formats
      let cellTypeDcType;
      if (typeof cellType === 'string') {
        const foundCellType = availableCellTypes.find(ct => ct.cellType === cellType);
        cellTypeDcType = foundCellType?.dcType;
      } else {
        cellTypeDcType = cellType.dcType;
      }
      
      console.log(`Cell Type: ${typeof cellType === 'string' ? cellType : cellType.cellType}, DC Type: ${cellTypeDcType}`);
      return cellTypeDcType === dcType;
    });
    
    console.log(`Filtered cell types for DC Type: ${dcType}:`, filtered);
    setFilteredCellTypes(filtered);
  };

  const loadSiteOptions = async () => {
    try {
      console.log('Attempting to load site options...');
      const response = await setupAPI.getSiteOptions();
      console.log('Site options response:', response);
      if (response.data.success) {
        console.log('Loaded site options:', response.data.data);
        setSiteOptions(response.data.data);
        LoggingService.logActivity({
          user: currentUser,
          action: 'LOAD_SITE_OPTIONS',
          module: 'setup',
          details: 'Loaded site options for dropdown'
        });
      } else {
        console.error('Site options response not successful:', response.data);
        showErrorToast('Error loading site options', setMessage);
      }
    } catch (error) {
      console.error('Error loading site options:', error);
      console.error('Error details:', error.response?.data || error.message);
      showErrorToast('Error loading site options', setMessage);
      LoggingService.logError(error, 'setup', currentUser);
    }
  };

  // Load site info data to get DC Type information
  const loadSiteInfo = async () => {
    try {
      console.log('Loading site info...');
      // Use the existing API service that we know works
      const response = await fetch('http://localhost:3005/api/site-info');
      const data = await response.json();
      console.log('Site info response:', data);
      if (data.success) {
        console.log('Loaded site info:', data.data);
        // Log each site to see the structure
        data.data.forEach((site, index) => {
          console.log(`Site ${index}:`, site);
          console.log(`  - dcNumber: ${site.dcNumber}`);
          console.log(`  - dcType: ${site.dcType}`);
        });
        return data.data;
      }
    } catch (error) {
      console.error('Error loading site info:', error);
    }
    return [];
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const oldValue = formData[name];
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear cell types when site changes
    if (name === 'siteName' && !value) {
      setSelectedSiteDcType('');
      setFilteredCellTypes([]);
    }
    
    LoggingService.logDataChange('setup', name, oldValue, value, currentUser);
  };

  const handleSiteSelect = async (site) => {
    console.log('handleSiteSelect called with site:', site);
    
    setFormData(prev => ({
      ...prev,
      siteName: site
    }));
    setIsSiteDropdownOpen(false);
    setSiteSearchTerm('');
    setSelectedSiteIndex(-1);
    
    // Extract just the DC number from site value (e.g., "Brookhaven - 1111" -> "1111")
    const dcNumber = site.split(' - ')[1];
    console.log('Extracted DC Number:', dcNumber);
    
    // Load site info to get DC Type using DC Number
    const siteInfo = await loadSiteInfo();
    console.log('Site info loaded:', siteInfo);
    console.log('Looking for DC Number:', dcNumber);
    console.log('Available DC Numbers:', siteInfo.map(s => s.dcNumber));
    
    const matchingSite = siteInfo.find(site => site.dcNumber === dcNumber);
    console.log('Matching site found:', matchingSite);
    
    if (matchingSite && matchingSite.dcType) {
      setSelectedSiteDcType(matchingSite.dcType);
      filterCellTypesByDcType(matchingSite.dcType);
      console.log(`Selected site: ${site}, DC Number: ${dcNumber}, DC Type: ${matchingSite.dcType}`);
    } else {
      setSelectedSiteDcType('');
      setFilteredCellTypes([]);
      console.log(`Selected site: ${site}, DC Number: ${dcNumber}, but no DC Type found`);
      console.log('matchingSite:', matchingSite);
      console.log('Available sites:', siteInfo);
    }
    
    // Clear any previously selected cell types when site changes
    setFormData(prev => ({
      ...prev,
      cellTypes: []
    }));
    setExpandedCellTypes({});
    
    // Automatically focus on the phase dropdown after a short delay
    setTimeout(() => {
      if (phaseSelectRef) {
        phaseSelectRef.focus();
      }
    }, 100);
    
    LoggingService.logDataChange('setup', 'siteName', formData.siteName, site, currentUser);
  };

  const toggleSiteDropdown = () => {
    setIsSiteDropdownOpen(!isSiteDropdownOpen);
    if (!isSiteDropdownOpen) {
      setSiteSearchTerm('');
      setSelectedSiteIndex(-1);
    }
  };

  const handleSiteKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsSiteDropdownOpen(false);
      setSiteSearchTerm('');
      setSelectedSiteIndex(-1);
    } else if (e.key === 'Enter' && isSiteDropdownOpen) {
      e.preventDefault();
      const filteredOptions = siteOptions.filter(option => 
        getOptionLabel(option).toLowerCase().includes(siteSearchTerm.toLowerCase())
      );
      
      if (selectedSiteIndex >= 0 && selectedSiteIndex < filteredOptions.length) {
        handleSiteSelect(getOptionValue(filteredOptions[selectedSiteIndex]));
      } else if (filteredOptions.length === 1) {
        // If only one option matches, select it
        handleSiteSelect(getOptionValue(filteredOptions[0]));
      }
    } else if (e.key === 'ArrowDown' && isSiteDropdownOpen) {
      e.preventDefault();
      const filteredOptions = siteOptions.filter(option => 
        getOptionLabel(option).toLowerCase().includes(siteSearchTerm.toLowerCase())
      );
      setSelectedSiteIndex(prev => 
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp' && isSiteDropdownOpen) {
      e.preventDefault();
      const filteredOptions = siteOptions.filter(option => 
        getOptionLabel(option).toLowerCase().includes(siteSearchTerm.toLowerCase())
      );
      setSelectedSiteIndex(prev => 
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    }
  };

  const highlightSearchTerm = (text, searchTerm) => {
    if (text == null) return '';
    if (typeof text !== 'string') text = String(text);
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

  const toggleCellTypeExpansion = (cellType) => {
    setExpandedCellTypes(prev => ({
      ...prev,
      [cellType]: !prev[cellType]
    }));
  };

  const handleCellTypeQuantityChange = (cellType, quantity) => {
    const newQuantity = parseInt(quantity) || 0;
    
    setFormData(prev => {
      const existingCellType = prev.cellTypes.find(ct => ct.cellType === cellType);
      const updatedCellTypes = prev.cellTypes.filter(ct => ct.cellType !== cellType);
      
      if (newQuantity > 0) {
        const cellNames = Array(newQuantity).fill('').map((_, i) => 
          existingCellType?.cellNames?.[i] || ''
        );
        
        const newCellType = {
          cellType,
          quantity: newQuantity,
          cellNames,
          drivewayConfig: cellType === 'FLIB' ? {} : undefined
        };
        
        if (cellType === 'FLIB') {
        for (let i = 0; i < newQuantity; i++) {
            newCellType.drivewayConfig[i] = {
            driveway1: 'FLIB',
            driveway2: 'FLIB'
          };
        }
        }
        
        updatedCellTypes.push(newCellType);
      }
      
      return {
        ...prev,
        cellTypes: updatedCellTypes
      };
    });
  };

  const handleCellNameChange = (cellType, cellIndex, value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    
    setFormData(prev => {
      const updatedCellTypes = prev.cellTypes.map(ct => {
        if (ct.cellType === cellType) {
          const updatedCellNames = [...ct.cellNames];
          updatedCellNames[cellIndex] = numericValue;
          
          if (cellType === 'FLIB' && numericValue.trim() !== '') {
            if (!ct.drivewayConfig) {
              ct.drivewayConfig = {};
            }
            ct.drivewayConfig[cellIndex] = {
      driveway1: 'FLIB',
      driveway2: 'FLIB'
    };
          }
          
          return {
            ...ct,
            cellNames: updatedCellNames
          };
        }
        return ct;
      });
      
      return {
        ...prev,
        cellTypes: updatedCellTypes
      };
    });
  };

  const handleDrivewayConfig = (cellType, cellIndex, drivewayNumber, value) => {
    setFormData(prev => {
      const updatedCellTypes = prev.cellTypes.map(ct => {
        if (ct.cellType === cellType) {
          if (!ct.drivewayConfig) {
            ct.drivewayConfig = {};
          }
          if (!ct.drivewayConfig[cellIndex]) {
            ct.drivewayConfig[cellIndex] = {};
          }
          ct.drivewayConfig[cellIndex][`driveway${drivewayNumber}`] = value;
        }
        return ct;
      });
      
      return {
        ...prev,
        cellTypes: updatedCellTypes
      };
    });
  };

  const removeCellType = (cellType) => {
    setFormData(prev => ({
      ...prev,
      cellTypes: prev.cellTypes.filter(ct => ct.cellType !== cellType)
    }));
    setExpandedCellTypes(prev => ({
      ...prev,
      [cellType]: false
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validate form data
      if (!formData.siteName.trim()) {
        throw new Error('Site name is required');
      }
      if (!formData.phase.trim()) {
        throw new Error('Phase is required');
      }

      if (formData.cellTypes.length === 0) {
        throw new Error('At least one cell type is required');
      }

      // Validate cell names and driveway configuration for FLIB cells
      for (let i = 0; i < formData.cellTypes.length; i++) {
        const ct = formData.cellTypes[i];
        const quantity = parseInt(ct.quantity);
        if (ct.cellNames.length !== quantity) {
          throw new Error(`Cell numbers count must match quantity for ${ct.cellType}`);
        }
        for (let j = 0; j < ct.cellNames.length; j++) {
          if (!ct.cellNames[j].trim()) {
            throw new Error(`Cell number ${j + 1} for ${ct.cellType} is required`);
          }
          // Validate that cell name is a valid number
          const cellNumber = parseInt(ct.cellNames[j]);
          if (isNaN(cellNumber) || cellNumber < 1) {
            throw new Error(`Cell number ${j + 1} for ${ct.cellType} must be a valid positive number`);
          }
        }
        
        // Validate driveway configuration for multi-driveway cells
        const cellTypeConfig = getCellTypeConfig(ct.cellType);
        if (cellTypeConfig?.hasMultipleDriveways) {
          const configuredCells = ct.cellNames.filter(name => name.trim() !== '');
          for (let j = 0; j < configuredCells.length; j++) {
            // Check if driveway config exists, if not, use default values
            if (!ct.drivewayConfig || !ct.drivewayConfig[j]) {
              // Set default values if not already set
              if (!ct.drivewayConfig) {
                ct.drivewayConfig = {};
              }
              ct.drivewayConfig[j] = {};
              // Set default values for each driveway based on numberOfDriveways
              for (let drivewayIndex = 0; drivewayIndex < cellTypeConfig.numberOfDriveways; drivewayIndex++) {
                ct.drivewayConfig[j][`driveway${drivewayIndex + 1}`] = cellTypeConfig.drivewayTypes[drivewayIndex] || cellTypeConfig.drivewayTypes[0] || '';
              }
            }
          }
        }
      }

      await setupAPI.createSite({
        siteName: formData.siteName,
        phase: formData.phase,
        cellTypes: formData.cellTypes
      });

      showSuccessToast('Site configuration created successfully!', setMessage);
      setFormData({
        siteName: '',
        phase: '',
        cellTypes: []
      });
      setExpandedCellTypes({});
      LoggingService.logActivity({
        user: currentUser,
        action: 'CREATE_SITE',
        module: 'setup',
        details: 'Site configuration created successfully'
      });
    } catch (error) {
      showErrorToast(error.message || 'Error creating site configuration', setMessage);
      LoggingService.logError(error, 'setup', currentUser);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedCellType = (cellType) => {
    return formData.cellTypes.find(ct => ct.cellType === cellType);
  };

  const getCellTypeConfig = (cellType) => {
    return availableCellTypes.find(ct => ct.cellType === cellType);
  };

  const tabs = [
    { id: 'site-config', label: 'Site Configuration' },
    { id: 'site-info', label: 'Sites' },
    { id: 'cell-types', label: 'Cell Types' },
    { id: 'new-test-case', label: 'Test Cases' }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex justify-between px-6" aria-label="Tabs">
            {/* Site Configuration - Left Side */}
            <div className="flex">
              <button
                onClick={() => setActiveTab('site-config')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'site-config'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Site Configuration
              </button>
            </div>
            
            {/* Other Tabs - Right Side */}
            <div className="flex space-x-8">
              {tabs.filter(tab => tab.id !== 'site-config').map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'site-config' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Setup New Site</h2>
        
        {/* Progress Indicator */}
        <div className="flex items-center space-x-4 mb-6">
          <div className={`flex items-center space-x-2 ${formData.siteName ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              formData.siteName ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {formData.siteName ? '✓' : '1'}
            </div>
            <span className="text-sm font-medium">Select Site</span>
          </div>
          
          <div className={`flex items-center space-x-2 ${formData.phase ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              formData.phase ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {formData.phase ? '✓' : '2'}
            </div>
            <span className="text-sm font-medium">Select Phase</span>
          </div>
          
          <div className={`flex items-center space-x-2 ${formData.cellTypes.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              formData.cellTypes.length > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {formData.cellTypes.length > 0 ? '✓' : '3'}
            </div>
            <span className="text-sm font-medium">Configure Cell Types</span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site *
              </label>
              <div className="relative site-dropdown">
                <button
                  type="button"
                  onClick={toggleSiteDropdown}
                  onKeyDown={handleSiteKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10 bg-white text-left flex items-center justify-between"
                >
                  <span className={formData.siteName ? 'text-gray-900' : 'text-gray-500'}>
                    {formData.siteName || 'Select a site...'}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isSiteDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isSiteDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    <div className="p-2 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="Search sites..."
                        value={siteSearchTerm}
                        onChange={(e) => setSiteSearchTerm(e.target.value)}
                        onKeyDown={handleSiteKeyDown}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-auto">
                      {siteOptions
                        .filter(option => 
                          getOptionLabel(option).toLowerCase().includes(siteSearchTerm.toLowerCase())
                        )
                        .map((option, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSiteSelect(getOptionValue(option))}
                            onKeyDown={handleSiteKeyDown}
                            className={`w-full px-3 py-2 text-left focus:outline-none text-sm ${
                              index === selectedSiteIndex 
                                ? 'bg-blue-100 text-blue-900' 
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            {highlightSearchTerm(getOptionLabel(option), siteSearchTerm)}
                          </button>
                        ))
                      }
                      {siteOptions.filter(option => 
                        getOptionLabel(option).toLowerCase().includes(siteSearchTerm.toLowerCase())
                      ).length === 0 && (
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phase *
              </label>
              <select
                ref={setPhaseSelectRef}
                name="phase"
                value={formData.phase}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // Focus on the first cell type section or submit button
                    const firstCellTypeButton = document.querySelector('[data-cell-type]');
                    if (firstCellTypeButton) {
                      firstCellTypeButton.focus();
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                required
              >
                <option value="">Select a phase...</option>
                <option value="Phase 1">Phase 1</option>
                <option value="Phase 2">Phase 2</option>
                <option value="Phase 3">Phase 3</option>
              </select>
            </div>
          </div>

          {/* Cell Types Selection */}
          {formData.siteName ? (
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <h3 className="text-md font-semibold text-gray-900">Cell Types for {formData.siteName}</h3>
              </div>
              {selectedSiteDcType && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Showing cell types for DC Type: <span className="font-medium text-blue-600">{selectedSiteDcType}</span>
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                {filteredCellTypes.length > 0 ? (
                  filteredCellTypes.map((cellTypeObj) => {
                    const cellType = typeof cellTypeObj === 'string' ? cellTypeObj : cellTypeObj.cellType;
                    console.log('Processing cell type:', cellType, 'from object:', cellTypeObj);
                    const selectedCellType = getSelectedCellType(cellType);
                    const isExpanded = expandedCellTypes[cellType];
                    const isSelected = selectedCellType !== undefined;
                    
                    // Skip rendering if cellType is not a valid string
                    if (!cellType || typeof cellType !== 'string') {
                      console.warn('Invalid cell type:', cellType);
                      return null;
                    }
                    
                    return (
                    <div key={cellType} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Cell Type Header */}
                      <button
                        type="button"
                        data-cell-type={cellType}
                        onClick={() => toggleCellTypeExpansion(cellType)}
                        className={`w-full p-4 text-left transition-colors ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                              isSelected ? 'bg-blue-600' : 'bg-gray-400'
                            }`}>
                              <span className="text-white font-semibold text-sm">
                                {cellType}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{cellType}</h4>
                              <p className="text-sm text-gray-600">
                                {isSelected ? `${selectedCellType.quantity} cells configured` : 'Click to configure'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isSelected && (
                        <button
                          type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCellType(cellType);
                                }}
                                className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                              <span className="text-white text-sm transform transition-transform duration-200">
                                {isExpanded ? '−' : '+'}
                              </span>
                            </div>
                    </div>
                      </div>
                      </button>
                      
                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 p-4 bg-white">
                          <div className="space-y-4">
                            {/* Quantity Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                                value={selectedCellType?.quantity || ''}
                                onChange={(e) => handleCellTypeQuantityChange(cellType, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                                placeholder="Enter quantity"
                          required
                        />
                    </div>
                    
                    {/* Cell Names */}
                            {selectedCellType && selectedCellType.quantity > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cell Numbers (Numeric Only) *
                    </label>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {Array.from({ length: selectedCellType.quantity }, (_, index) => (
                                  <div key={index} className="space-y-2">
                          <input
                            type="number"
                            min="1"
                            value={selectedCellType.cellNames[index] || ''}
                            onChange={(e) => handleCellNameChange(cellType, index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder={`Cell ${index + 1} number`}
                            required
                          />
                                    {/* Driveway Configuration for multi-driveway cells */}
                                    {getCellTypeConfig(cellType)?.hasMultipleDriveways && selectedCellType.cellNames[index]?.trim() !== '' && (
                                      <div className="space-y-2">
                                        {Array.from({ length: getCellTypeConfig(cellType)?.numberOfDriveways || 0 }, (_, drivewayIndex) => (
                                          <div key={drivewayIndex} className="flex items-center">
                                            <label className="text-xs font-medium text-gray-700 w-20 flex-shrink-0">
                                              Driveway {drivewayIndex + 1}:
                                            </label>
                                            <select
                                              value={selectedCellType.drivewayConfig?.[index]?.[`driveway${drivewayIndex + 1}`] || getCellTypeConfig(cellType)?.drivewayTypes?.[drivewayIndex] || ''}
                                              onChange={(e) => handleDrivewayConfig(cellType, index, drivewayIndex + 1, e.target.value)}
                                              className="flex-1 max-w-xs px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 h-8 text-sm"
                                            >
                                              {getCellTypeConfig(cellType)?.drivewayTypes?.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                              ))}
                                            </select>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                        </div>
                      ))}
                    </div>
                  </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Cell Types Available</h3>
                  <p className="text-gray-600">No cell types are available for the selected site's DC Type ({selectedSiteDcType}).</p>
                </div>
              </div>
            )}
            </div>
          </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500">
                {!formData.siteName ? (
                  <>
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Site First</h3>
                    <p className="text-gray-600">Please select a site above to configure cell types and setup the site configuration.</p>
                  </>
                ) : !formData.phase ? (
                  <>
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Phase</h3>
                    <p className="text-gray-600">Please select a phase to continue with cell type configuration.</p>
                  </>
                ) : (
                  <>
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Configure Cell Types</h3>
                    <p className="text-gray-600">Now you can configure the cell types and quantities for this site.</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div className={`p-4 rounded-md ${
              message.includes('Error') || message.includes('required') 
                ? 'bg-red-50 border border-red-200 text-red-700' 
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              {message}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !formData.siteName}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                loading || !formData.siteName
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Setting up...' : !formData.siteName ? 'Select a Site First' : 'Setup Site Configuration'}
            </button>
          </div>
        </form>
        </div>
      )}

      {/* Site Info Tab */}
      {activeTab === 'site-info' && (
        <SiteInfo currentUser={currentUser} />
      )}

      {/* Cell Types Tab */}
      {activeTab === 'cell-types' && (
        <CellTypes currentUser={currentUser} onCellTypeChange={loadCellTypes} />
      )}

      {/* Test Cases Tab */}
      {activeTab === 'new-test-case' && (
        <TestCases currentUser={currentUser} />
      )}
    </div>
  );
};

export default Setup;