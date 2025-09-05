import React, { useState, useEffect } from 'react';
import { testCasesAPI, cellTypesAPI, setupAPI } from '../services/api';

const TestCases = ({ currentUser = 'Unknown' }) => {
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState(null);
  const [availableCellTypes, setAvailableCellTypes] = useState([]);
  const [availableDCTypes, setAvailableDCTypes] = useState([]);
  const [availableSubTypes, setAvailableSubTypes] = useState([]);
  const [availableScopes, setAvailableScopes] = useState([]);
  const [availablePhases, setAvailablePhases] = useState([]);
  const [availableDrivewayTypes, setAvailableDrivewayTypes] = useState([]);

  const [selectedCellTypeConfig, setSelectedCellTypeConfig] = useState(null);
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);
  const [isPhaseDropdownOpen, setIsPhaseDropdownOpen] = useState(false);
  const [scopeSearchTerm, setScopeSearchTerm] = useState('');
  const [phaseSearchTerm, setPhaseSearchTerm] = useState('');
  const [selectedScopeIndex, setSelectedScopeIndex] = useState(-1);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(-1);
  const [siteInfoData, setSiteInfoData] = useState([]);
  const [formData, setFormData] = useState({
    dcType: '',
    subType: '',
    cellType: '',
    testCase: '',
    testId: '',
    scope: '',
    phase: '',
    steps: '',
    expectedOutput: '',
    drivewayType: '',
    combinedTest: false,
    // New fields for the additional columns
    cells: '',
    image: '',
    requirements: ''
  });

  useEffect(() => {
    loadTestCases();
    loadCellTypes();
    loadDCTypes();
    loadSubTypes();
  }, []);

  const loadTestCases = async () => {
    try {
      setLoading(true);
      const response = await testCasesAPI.getAll();
      if (response.data.success) {
        setTestCases(response.data.data);
      } else {
        setMessage('Error loading test cases');
      }
    } catch (error) {
      console.error('Error loading test cases:', error);
      setMessage('Error loading test cases');
    } finally {
      setLoading(false);
    }
  };

  const loadCellTypes = async () => {
    try {
      const response = await cellTypesAPI.getAll();
      if (response.data.success) {
        setAvailableCellTypes(response.data.data);
      } else {
        setMessage('Error loading cell types');
      }
    } catch (error) {
      console.error('Error loading cell types:', error);
      setMessage('Error loading cell types');
    }
  };

  const loadDCTypes = async () => {
    try {
      const response = await cellTypesAPI.getUniqueDCTypes();
      if (response.data.success) {
        setAvailableDCTypes(response.data.data);
      } else {
        setMessage('Error loading DC types');
      }
    } catch (error) {
      console.error('Error loading DC types:', error);
      setMessage('Error loading DC types');
    }
  };

  const loadSubTypes = async () => {
    try {
      const response = await setupAPI.getSiteInfo();
      
      if (response.data.success) {
        setSiteInfoData(response.data.data); // Store full site info data
        const subTypes = [...new Set(response.data.data.map(site => site.subType).filter(Boolean))];
        setAvailableSubTypes(subTypes.sort());
        
        console.log('Site info loaded successfully:');
        console.log('Full site info data:', response.data.data);
        console.log('Available sub types:', subTypes.sort());
      } else {
        console.warn('Failed to load sub types:', response.data.message);
        setMessage('Error loading sub types');
        setAvailableSubTypes([]);
      }
    } catch (error) {
      console.error('Error loading sub types:', error);
      setMessage('Error loading sub types');
      setAvailableSubTypes([]);
    }
  };

  // Get filtered sub types based on selected DC Type
  const getFilteredSubTypes = (dcType) => {
    if (!dcType) return [];
    
    try {
      // Filter sub types based on the selected DC Type from the loaded site info data
      const filteredSubTypes = siteInfoData
        .filter(site => site.dcType === dcType)
        .map(site => site.subType)
        .filter(Boolean)
        .sort();
      
      // Add "All" as the first option
      const subTypesWithAll = ['All', ...filteredSubTypes];
      
      console.log(`Filtering sub types for DC Type "${dcType}":`);
      console.log('Site info data:', siteInfoData);
      console.log('Filtered sub types:', subTypesWithAll);
      
      return subTypesWithAll;
    } catch (error) {
      console.error('Error filtering sub types:', error);
      return ['All', ...availableSubTypes]; // Fallback to original with "All" if filtering fails
    }
  };

  // Extract unique scopes and phases when test cases load
  useEffect(() => {
    if (testCases.length > 0) {
      const uniqueScopes = [...new Set(testCases.map(tc => tc.scope).filter(Boolean))];
      const uniquePhases = [...new Set(testCases.map(tc => tc.phase).filter(Boolean))];
      setAvailableScopes(uniqueScopes);
      setAvailablePhases(uniquePhases);
    }
  }, [testCases]);





  // Extract driveway types from cell types when they load
  useEffect(() => {
    if (availableCellTypes.length > 0) {
      const drivewayTypes = ['N/A']; // Always include N/A as an option
      
      // Extract unique driveway types from cell types
      availableCellTypes.forEach(cellType => {
        if (cellType.drivewayTypes && Array.isArray(cellType.drivewayTypes)) {
          cellType.drivewayTypes.forEach(type => {
            if (type && !drivewayTypes.includes(type)) {
              drivewayTypes.push(type);
            }
          });
        }
      });
      
      setAvailableDrivewayTypes(drivewayTypes);
    }
  }, [availableCellTypes]);

  // Get driveway types for selected cell type
  const getDrivewayTypesForCellType = (cellType) => {
    if (!cellType || !availableCellTypes.length) {
      return [];
    }
    
    // Always include "All" as the first option
    const drivewayTypes = ['All'];
    
    // Get the selected cell type configuration
    const cellTypeConfig = availableCellTypes.find(ct => ct.cellType === cellType);
    
    if (cellTypeConfig && cellTypeConfig.drivewayTypes && Array.isArray(cellTypeConfig.drivewayTypes)) {
      // Add driveway types specific to the selected cell type
      cellTypeConfig.drivewayTypes.forEach(type => {
        if (type && type.trim() !== '' && type !== 'NA' && !drivewayTypes.includes(type)) {
          drivewayTypes.push(type);
        }
      });
    }
    
    return drivewayTypes;
  };

  // Handle clicking outside dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isScopeDropdownOpen && !event.target.closest('.scope-dropdown')) {
        setIsScopeDropdownOpen(false);
        setScopeSearchTerm('');
        setSelectedScopeIndex(-1);
      }
      if (isPhaseDropdownOpen && !event.target.closest('.phase-dropdown')) {
        setIsPhaseDropdownOpen(false);
        setPhaseSearchTerm('');
        setSelectedPhaseIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isScopeDropdownOpen, isPhaseDropdownOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let processedValue = type === 'checkbox' ? checked : value;
    
    // Special handling for image field - convert full URLs to relative URLs for storage
            if (name === 'image' && value.startsWith('http://localhost:3005/api/images/')) {
          processedValue = value.replace('http://localhost:3005', '');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Update selected cell type config when cell type changes
    if (name === 'cellType') {
      const cellTypeConfig = availableCellTypes.find(ct => ct.cellType === value);
      setSelectedCellTypeConfig(cellTypeConfig);
      
      // Reset driveway type and combined test when cell type changes
      // If switching to single driveway, clear the driveway type
      if (cellTypeConfig && !cellTypeConfig.hasMultipleDriveways) {
        setFormData(prev => ({
          ...prev,
          drivewayType: '',
          combinedTest: false
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          combinedTest: false
        }));
      }
    }
    
    // Reset dependent fields when DC Type changes
    if (name === 'dcType') {
      setFormData(prev => ({
        ...prev,
        subType: '',
        cellType: '',
        drivewayType: '',
        combinedTest: false
      }));
      setSelectedCellTypeConfig(null);
    }
    
    // Reset dependent fields when Sub Type changes
    if (name === 'subType') {
      setFormData(prev => ({
        ...prev,
        cellType: '',
        drivewayType: '',
        combinedTest: false
      }));
      setSelectedCellTypeConfig(null);
    }
  };

  // Image handling functions
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        console.log('Uploading file:', file.name, 'Size:', file.size);
        
        // Check if backend is running first
        try {
          const healthCheck = await fetch('http://localhost:3005/api/health', { 
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });
          
          if (!healthCheck.ok) {
            throw new Error('Backend server is not responding properly');
          }
        } catch (healthError) {
          throw new Error('Backend server is not running. Please start the backend server first.');
        }
        
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('http://localhost:3005/api/images/upload', {
          method: 'POST',
          body: formData
        });
        
        console.log('Upload response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.success) {
            setFormData(prev => ({
              ...prev,
              image: result.data.url
            }));
            console.log('Image uploaded successfully:', result.data.url);
          } else {
            console.error('Upload failed:', result.message);
            alert('Error uploading image: ' + result.message);
          }
        } else {
          console.error('Upload request failed:', response.status, response.statusText);
          let errorMessage = `Error uploading image: ${response.status} ${response.statusText}`;
          
          try {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            
            // Try to parse as JSON for better error messages
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.message) {
                errorMessage = `Error uploading image: ${errorJson.message}`;
              }
            } catch (parseError) {
              // If not JSON, use the raw text
              if (errorText && errorText.trim()) {
                errorMessage = `Error uploading image: ${errorText}`;
              }
            }
          } catch (textError) {
            console.error('Error reading response text:', textError);
          }
          
          alert(errorMessage);
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        let errorMessage = 'Error uploading image';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = 'Network error: Unable to connect to the server. Please make sure the backend is running.';
        } else if (error.message) {
          errorMessage += ': ' + error.message;
        }
        
        alert(errorMessage);
      }
    }
  };

  // Delete current image
  const handleDeleteImage = async () => {
    if (!formData.image) return;
    
    try {
      // Extract image ID from URL (e.g., /api/images/abc123 -> abc123)
      let imageId = formData.image.split('/').pop();
      
      // Handle different URL formats
      if (imageId.includes('?')) {
        imageId = imageId.split('?')[0]; // Remove query parameters
      }
      if (imageId.includes('#')) {
        imageId = imageId.split('#')[0]; // Remove hash fragments
      }
      
      // Handle both full URLs and relative URLs
      if (formData.image.startsWith('http')) {
        // Full URL - extract the image ID from the end
        imageId = formData.image.split('/').pop();
      } else {
        // Relative URL - already extracted above
      }
      
      if (!imageId || imageId === '') {
        alert('Invalid image URL format');
        return;
      }
      
      const response = await fetch(`http://localhost:3005/api/images/${imageId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          // Clear the image from form data
          setFormData(prev => ({
            ...prev,
            image: ''
          }));
        } else {
          alert('Error deleting image: ' + result.message);
        }
      } else {
        alert(`Error deleting image: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      alert('Error deleting image: ' + error.message);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setFormData(prev => ({
          ...prev,
          image: `Dropped: ${file.name}`
        }));
      } else {
        alert('Please drop an image file');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      dcType: '',
      subType: '',
      cellType: '',
      testCase: '',
      testId: '',
      scope: '',
      phase: '',
      steps: '',
      expectedOutput: '',
      drivewayType: '',
      combinedTest: false,
      // New fields
      cells: '',
      image: '',
      requirements: ''
    });
    setEditingTestCase(null);
    setSelectedCellTypeConfig(null);
    setShowForm(false);
  };

  const handleScopeSelect = (scope) => {
    setFormData(prev => ({ ...prev, scope }));
    setIsScopeDropdownOpen(false);
    setScopeSearchTerm('');
    setSelectedScopeIndex(-1);
  };

  const handlePhaseSelect = (phase) => {
    setFormData(prev => ({ ...prev, phase }));
    setIsPhaseDropdownOpen(false);
    setPhaseSearchTerm('');
    setSelectedPhaseIndex(-1);
  };

  const toggleScopeDropdown = () => {
    setIsScopeDropdownOpen(!isScopeDropdownOpen);
    if (!isScopeDropdownOpen) {
      setScopeSearchTerm('');
      setSelectedScopeIndex(-1);
    }
  };

  const togglePhaseDropdown = () => {
    setIsPhaseDropdownOpen(!isPhaseDropdownOpen);
    if (!isPhaseDropdownOpen) {
      setPhaseSearchTerm('');
      setSelectedPhaseIndex(-1);
    }
  };

  const handleScopeKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsScopeDropdownOpen(false);
      setScopeSearchTerm('');
      setSelectedScopeIndex(-1);
    } else if (e.key === 'Enter' && isScopeDropdownOpen) {
      e.preventDefault();
      const filteredScopes = availableScopes.filter(scope => 
        scope.toLowerCase().includes(scopeSearchTerm.toLowerCase())
      );
      if (selectedScopeIndex >= 0 && selectedScopeIndex < filteredScopes.length) {
        handleScopeSelect(filteredScopes[selectedScopeIndex]);
      } else if (filteredScopes.length === 1) {
        handleScopeSelect(filteredScopes[0]);
      } else if (scopeSearchTerm.trim()) {
        handleScopeSelect(scopeSearchTerm.trim());
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const filteredScopes = availableScopes.filter(scope => 
        scope.toLowerCase().includes(scopeSearchTerm.toLowerCase())
      );
      setSelectedScopeIndex(prev => 
        prev < filteredScopes.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedScopeIndex(prev => prev > 0 ? prev - 1 : -1);
    }
  };

  const handlePhaseKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsPhaseDropdownOpen(false);
      setPhaseSearchTerm('');
      setSelectedPhaseIndex(-1);
    } else if (e.key === 'Enter' && isPhaseDropdownOpen) {
      e.preventDefault();
      const filteredPhases = availablePhases.filter(phase => 
        phase.toLowerCase().includes(phaseSearchTerm.toLowerCase())
      );
      if (selectedPhaseIndex >= 0 && selectedPhaseIndex < filteredPhases.length) {
        handlePhaseSelect(filteredPhases[selectedPhaseIndex]);
      } else if (filteredPhases.length === 1) {
        handlePhaseSelect(filteredPhases[0]);
      } else if (phaseSearchTerm.trim()) {
        handlePhaseSelect(phaseSearchTerm.trim());
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const filteredPhases = availablePhases.filter(phase => 
        phase.toLowerCase().includes(phaseSearchTerm.toLowerCase())
      );
      setSelectedPhaseIndex(prev => 
        prev < filteredPhases.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedPhaseIndex(prev => prev > 0 ? prev - 1 : -1);
    }
  };

  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? <mark key={index} className="bg-yellow-200">{part}</mark> : part
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check all required fields
    if (!formData.dcType || !formData.subType || !formData.cellType || !formData.testCase || !formData.testId || !formData.scope || 
        !formData.phase || !formData.steps || !formData.expectedOutput || !formData.cells) {
      setMessage('Please fill in all required fields');
      return;
    }

    // Check driveway type for multi driveway cell types
    if (selectedCellTypeConfig && selectedCellTypeConfig.hasMultipleDriveways) {
      if (!formData.drivewayType || formData.drivewayType.trim() === '') {
        setMessage('Driveway Type is required for multi driveway cell types');
        return;
      }
    }

    try {
      setLoading(true);
      console.log('=== FORM SUBMISSION DEBUG ===');
      console.log('Form data being submitted:', formData);
      console.log('Selected cell type config:', selectedCellTypeConfig);
      console.log('Loading state:', loading);
      
      // Add current user to form data
      const formDataWithUser = {
        ...formData,
        modifiedUser: currentUser
      };
      
      let response;
      
      if (editingTestCase !== null) {
        console.log('Updating test case with ID:', editingTestCase);
        response = await testCasesAPI.update(editingTestCase, formDataWithUser);
      } else {
        console.log('Creating new test case');
        response = await testCasesAPI.create(formDataWithUser);
      }

      console.log('=== API RESPONSE ===');
      console.log('Full response:', response);
      console.log('Response success:', response.data.success);
      console.log('Response message:', response.data.message);
      
      if (response.data.success) {
        setMessage(response.data.message);
        resetForm();
        loadTestCases();
      } else {
        console.error('API returned error:', response.data);
        setMessage(response.data.message || 'Error saving test case');
      }
    } catch (error) {
      console.error('=== ERROR DETAILS ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      setMessage(error.response?.data?.message || 'Error saving test case');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (testCase, index) => {
    setFormData({
      dcType: testCase.dcType || '',
      subType: testCase.subType || '',
      cellType: testCase.cellType,
      testCase: testCase.testCase,
      testId: testCase.testId,
      scope: testCase.scope,
      phase: testCase.phase || '',
      steps: testCase.steps || '',
      expectedOutput: testCase.expectedOutput || '',
      drivewayType: testCase.drivewayType || '',
      combinedTest: testCase.combinedTest || false,
      // New fields
      cells: testCase.cells || '',
      image: testCase.image || '',
      requirements: testCase.requirements || ''
    });
    setEditingTestCase(index);
    setShowForm(true);
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Are you sure you want to delete this test case?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await testCasesAPI.delete(index);
      
      if (response.data.success) {
        setMessage(response.data.message);
        loadTestCases();
      } else {
        setMessage(response.data.message || 'Error deleting test case');
      }
    } catch (error) {
      console.error('Error deleting test case:', error);
      setMessage(error.response?.data?.message || 'Error deleting test case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingTestCase !== null ? 'Edit Test Case' : 'Create New Test Case'}
          </h3>
          

          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DC Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DC Type *
                </label>
                <select
                  name="dcType"
                  value={formData.dcType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                  required
                >
                  <option value="">Select DC Type</option>
                  {availableDCTypes.map(dcType => (
                    <option key={dcType} value={dcType}>
                      {dcType}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub Type *
                </label>
                <select
                  name="subType"
                  value={formData.subType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                  required
                  disabled={!formData.dcType}
                >
                  <option value="">Select Sub Type</option>
                  {formData.dcType && availableSubTypes.length > 0 ? (
                    getFilteredSubTypes(formData.dcType).map(subType => (
                      <option key={subType} value={subType}>
                        {subType}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      {availableSubTypes.length === 0 ? 'No sub types available' : 'Select DC Type first'}
                    </option>
                  )}
                </select>

              </div>

              {/* Cell Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cell Type *
                </label>
                <select
                  name="cellType"
                  value={formData.cellType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                  required
                  disabled={!formData.dcType || !formData.subType}
                >
                  <option value="">Select Cell Type</option>
                  {/* General option for non-cell specific tests */}
                  <option value="General">General</option>
                  {/* Dynamic cell types based on DC Type */}
                  {formData.dcType && formData.subType && availableCellTypes
                    .filter(cellType => cellType.dcType === formData.dcType)
                    .map(cellType => (
                      <option key={cellType.cellType} value={cellType.cellType}>
                        {cellType.cellType}
                      </option>
                    ))
                  }
                </select>
                {formData.dcType && formData.subType && availableCellTypes.filter(ct => ct.dcType === formData.dcType).length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No cell types found for the selected DC Type. Please check cell type configuration.
                  </p>
                )}
              </div>

              {/* Test Case */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Case *
                </label>
                <input
                  type="text"
                  name="testCase"
                  value={formData.testCase}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Power On, Motors, etc."
                  required
                />
              </div>

              {/* Test ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test ID *
                </label>
                <input
                  type="text"
                  name="testId"
                  value={formData.testId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., A1001, B1001, etc."
                  required
                />
              </div>

              {/* Scope */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scope *
                </label>
                <div className="relative scope-dropdown">
                  <button
                    type="button"
                    onClick={toggleScopeDropdown}
                    onKeyDown={handleScopeKeyDown}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10 bg-white text-left flex items-center justify-between"
                  >
                    <span className={formData.scope ? 'text-gray-900' : 'text-gray-500'}>
                      {formData.scope || 'Select or enter scope...'}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isScopeDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isScopeDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          placeholder="Search or enter scope..."
                          value={scopeSearchTerm}
                          onChange={(e) => setScopeSearchTerm(e.target.value)}
                          onKeyDown={handleScopeKeyDown}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-auto">
                        {availableScopes
                          .filter(scope => 
                            scope.toLowerCase().includes(scopeSearchTerm.toLowerCase())
                          )
                          .map((scope, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleScopeSelect(scope)}
                              onKeyDown={handleScopeKeyDown}
                              className={`w-full px-3 py-2 text-left focus:outline-none text-sm ${
                                index === selectedScopeIndex 
                                  ? 'bg-blue-100 text-blue-900' 
                                  : 'hover:bg-gray-100'
                              }`}
                            >
                              {highlightSearchTerm(scope, scopeSearchTerm)}
                            </button>
                          ))
                        }
                        {availableScopes.filter(scope => 
                          scope.toLowerCase().includes(scopeSearchTerm.toLowerCase())
                        ).length === 0 && scopeSearchTerm && (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            Press Enter to add "{scopeSearchTerm}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Phase */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phase *
                </label>
                <div className="relative phase-dropdown">
                  <button
                    type="button"
                    onClick={togglePhaseDropdown}
                    onKeyDown={handlePhaseKeyDown}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10 bg-white text-left flex items-center justify-between"
                  >
                    <span className={formData.phase ? 'text-gray-900' : 'text-gray-500'}>
                      {formData.phase || 'Select or enter phase...'}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isPhaseDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isPhaseDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          placeholder="Search or enter phase..."
                          value={phaseSearchTerm}
                          onChange={(e) => setPhaseSearchTerm(e.target.value)}
                          onKeyDown={handlePhaseKeyDown}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-auto">
                        {availablePhases
                          .filter(phase => 
                            phase.toLowerCase().includes(phaseSearchTerm.toLowerCase())
                          )
                          .map((phase, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handlePhaseSelect(phase)}
                              onKeyDown={handlePhaseKeyDown}
                              className={`w-full px-3 py-2 text-left focus:outline-none text-sm ${
                                index === selectedPhaseIndex 
                                  ? 'bg-blue-100 text-blue-900' 
                                  : 'hover:bg-gray-100'
                              }`}
                            >
                              {highlightSearchTerm(phase, phaseSearchTerm)}
                            </button>
                          ))
                        }
                        {availablePhases.filter(phase => 
                          phase.toLowerCase().includes(phaseSearchTerm.toLowerCase())
                        ).length === 0 && phaseSearchTerm && (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            Press Enter to add "{phaseSearchTerm}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Driveway Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driveway Type {selectedCellTypeConfig && selectedCellTypeConfig.hasMultipleDriveways && '*'}
                </label>
                <select
                  name="drivewayType"
                  value={formData.drivewayType}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10 ${
                    !formData.cellType || (selectedCellTypeConfig && !selectedCellTypeConfig.hasMultipleDriveways)
                      ? 'bg-gray-100 cursor-not-allowed border-gray-300' 
                      : 'border-gray-300'
                  }`}
                  disabled={!formData.cellType || (selectedCellTypeConfig && !selectedCellTypeConfig.hasMultipleDriveways)}
                  required={selectedCellTypeConfig && selectedCellTypeConfig.hasMultipleDriveways}
                >
                  <option value="">Select Driveway Type</option>
                  {getDrivewayTypesForCellType(formData.cellType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cells and Image Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cells */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cells *
                </label>
                <select
                  name="cells"
                  value={formData.cells}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                  required
                >
                  <option value="">Select Cells</option>
                  <option value="All">All</option>
                  <option value="First">First</option>
                  <option value="System">System</option>
                </select>
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image
                </label>
                <div className="space-y-3">
                  {/* URL Input */}
                  <input
                    type="url"
                    name="image"
                    value={formData.image.startsWith('http') ? formData.image : `http://localhost:3005${formData.image}`}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter image URL..."
                  />
                  
                  {/* File Upload */}
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center hover:border-blue-400 transition-colors"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e)}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-blue-600 hover:text-blue-500">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                    </label>
                  </div>
                  
                  {/* Image Management - Only show when image exists */}
                  {formData.image && (
                    <div className="space-y-2">
                      {/* Current Image Indicator */}
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                        <div className="flex items-center justify-between">
                          <span>📷 Image uploaded</span>
                          <span className="text-gray-500 text-xs truncate max-w-32">
                            {formData.image.split('/').pop()}
                          </span>
                        </div>
                        {/* Show full URL for debugging */}
                        <div className="mt-1 text-xs text-gray-400 break-all">
                          Full URL: {formData.image.startsWith('http') ? formData.image : `http://localhost:3005${formData.image}`}
                        </div>
                      </div>
                      
                      {/* Delete Button */}
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={handleDeleteImage}
                          className="inline-flex items-center px-2 py-1 border border-red-300 rounded text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                  

                </div>
              </div>
            </div>

            {/* Steps */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Steps *
              </label>
              <textarea
                name="steps"
                value={formData.steps}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter test steps..."
                required
              />
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Requirements *
              </label>
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter requirements..."
                required
              />
            </div>

            {/* Expected Output */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Output *
              </label>
              <textarea
                name="expectedOutput"
                value={formData.expectedOutput}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter expected output..."
                required
              />
            </div>

            {/* Checkboxes */}
            <div className="flex space-x-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="combinedTest"
                  checked={formData.combinedTest}
                  onChange={handleInputChange}
                  className={`h-4 w-4 focus:ring-blue-500 border-gray-300 rounded ${
                    selectedCellTypeConfig && selectedCellTypeConfig.hasMultipleDriveways
                      ? 'text-blue-600'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!selectedCellTypeConfig || !selectedCellTypeConfig.hasMultipleDriveways}
                />
                <label className={`ml-2 text-sm ${
                  selectedCellTypeConfig && selectedCellTypeConfig.hasMultipleDriveways
                    ? 'text-gray-700'
                    : 'text-gray-500'
                }`}>
                  Combined Test
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? 'Saving...' : (editingTestCase !== null ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
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

      {/* Add New Test Case Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + Test Case
        </button>
      </div>

      {/* Test Cases Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Existing Test Cases</h3>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="text-gray-500">Loading test cases...</div>
          </div>
        ) : testCases.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-500">No test cases found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cell Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Case
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scope
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phase
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {testCases.map((testCase, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {testCase.cellType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {testCase.testCase}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {testCase.testId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {testCase.scope}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {testCase.phase || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(testCase, index)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
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

export default TestCases;
