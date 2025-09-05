import React, { useState, useEffect } from 'react';
import { cellTypesAPI } from '../services/api';
import LoggingService from '../services/loggingService';
import { showSuccessToast, showErrorToast } from '../services/toastService';

const CellTypes = ({ currentUser = 'Unknown', onCellTypeChange }) => {
  const [cellTypes, setCellTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCellType, setEditingCellType] = useState(null);

  const [availableDCTypes, setAvailableDCTypes] = useState([]);
  
  const [formData, setFormData] = useState({
    cellType: '',
    dcType: '',
    hasMultipleDriveways: false,
    numberOfDriveways: 1,
    drivewayTypes: [],
    description: ''
  });

  useEffect(() => {
    loadCellTypes();
    loadAvailableDCTypes();
    LoggingService.logPageView('cellTypes', currentUser);
  }, [currentUser]);



  const loadAvailableDCTypes = async () => {
    try {
      console.log('Attempting to load DC types...');
      const response = await cellTypesAPI.getUniqueDCTypes();
      console.log('DC types API response:', response);
      
      if (response.data.success) {
        setAvailableDCTypes(response.data.data);
        console.log('Successfully loaded DC types:', response.data.data);
      } else {
        console.warn('Failed to load DC types:', response.data.message);
        setAvailableDCTypes([]); // Set empty array on failure
      }
    } catch (error) {
      console.error('Error loading available DC types:', error);
      console.error('Error details:', error.response?.data || error.message);
      setAvailableDCTypes([]); // Set empty array on error
    }
  };

  const loadCellTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await cellTypesAPI.getAll();
      
      if (response.data.success) {
        setCellTypes(response.data.data);
      } else {
        setError(response.data.message || 'Failed to load cell types');
      }
    } catch (error) {
      console.error('Error loading cell types:', error);
      setError('Failed to load cell types');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      cellType: '',
      dcType: '',
      hasMultipleDriveways: false,
      numberOfDriveways: 1,
      drivewayTypes: [],
      description: ''
    });
    setEditingCellType(null);
  };

  const resetForm = () => {
    clearForm();
    setShowAddForm(false);
  };

  const handleAddCellType = () => {
    clearForm();
    setShowAddForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'dcType') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (name === 'hasMultipleDriveways') {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        numberOfDriveways: checked ? prev.numberOfDriveways : 1
      }));
    } else if (name === 'numberOfDriveways') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 1
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Removed individual driveway type management functions since we now use a single comma-separated input

  const handleEdit = (cellType) => {
    const cellTypeData = cellTypes.find(ct => ct.cellType === cellType);
    if (cellTypeData) {
      setFormData({
        cellType: cellTypeData.cellType,
        dcType: cellTypeData.dcType || '',
        hasMultipleDriveways: cellTypeData.hasMultipleDriveways || false,
        numberOfDriveways: cellTypeData.numberOfDriveways || 1,
        drivewayTypes: cellTypeData.drivewayTypes || [],
        description: cellTypeData.description || ''
      });
      setEditingCellType(cellType);
      setShowAddForm(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cellType || !formData.dcType) {
      setError('Cell Type and DC Type are required');
      return;
    }

    // Validate number of driveways
    if (formData.hasMultipleDriveways && (formData.numberOfDriveways < 1 || formData.numberOfDriveways > 4)) {
      setError('Number of driveways must be between 1 and 4');
      return;
    }

    try {
      setError(null);
      
      if (editingCellType) {
        const response = await cellTypesAPI.update(editingCellType, formData);
        if (response.data.success) {
          await loadCellTypes();
          resetForm();
          if (onCellTypeChange) onCellTypeChange();
        } else {
          setError(response.data.message || 'Failed to update cell type');
        }
      } else {
        const response = await cellTypesAPI.create(formData);
        if (response.data.success) {
          await loadCellTypes();
          resetForm();
          if (onCellTypeChange) onCellTypeChange();
        } else {
          setError(response.data.message || 'Failed to create cell type');
        }
      }
    } catch (error) {
      console.error('Error saving cell type:', error);
      setError('Failed to save cell type');
    }
  };

  const handleDelete = async (cellType) => {
    if (window.confirm(`Are you sure you want to delete the cell type "${cellType}"?`)) {
      try {
        setError(null);
        const response = await cellTypesAPI.delete(cellType);
        if (response.data.success) {
          await loadCellTypes();
          if (onCellTypeChange) onCellTypeChange();
        } else {
          setError(response.data.message || 'Failed to delete cell type');
        }
      } catch (error) {
        console.error('Error deleting cell type:', error);
        setError('Failed to delete cell type');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingCellType ? 'Edit Cell Type' : 'Add New Cell Type'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DC Type *
                </label>
                <select
                  name="dcType"
                  value={formData.dcType}
                  onChange={handleInputChange}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select DC Type</option>
                  {availableDCTypes.length > 0 ? (
                    availableDCTypes.map(dcType => (
                      <option key={dcType} value={dcType}>{dcType}</option>
                    ))
                  ) : (
                    <option value="" disabled>Loading DC Types...</option>
                  )}
                </select>
              </div>
              


              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cell Type *
                </label>
                <input
                  type="text"
                  name="cellType"
                  value={formData.cellType}
                  onChange={handleInputChange}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={cellTypes.length > 0 ? 
                    `e.g., ${cellTypes.slice(0, 2).map(ct => ct.cellType).join(', ')}` : 
                    'e.g., FLIB, MCPIB'
                  }
                  required
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={cellTypes.length > 0 ? 
                    `e.g., ${cellTypes[0]?.description || 'Multi-driveway cell type'}` : 
                    'e.g., Multi-driveway cell type'
                  }
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasMultipleDriveways"
                name="hasMultipleDriveways"
                checked={formData.hasMultipleDriveways}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="hasMultipleDriveways" className="text-sm font-medium text-gray-700">
                Has Multiple Driveways
              </label>
            </div>

            {formData.hasMultipleDriveways && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Driveways
                  </label>
                  <select
                    name="numberOfDriveways"
                    value={formData.numberOfDriveways}
                    onChange={handleInputChange}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Driveway Types
                  </label>
                  <input
                    type="text"
                    value={formData.drivewayTypes.join(', ')}
                    onChange={(e) => {
                      // Store the raw input value without processing
                      const inputValue = e.target.value;
                      // Split by comma and clean up, but allow empty values during typing
                      const types = inputValue.split(',').map(type => type.trim());
                      setFormData(prev => ({
                        ...prev,
                        drivewayTypes: types
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., FLIB, MCPIB, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the types separated by commas. This will apply to all {formData.numberOfDriveways} driveway(s).
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingCellType ? 'Update Cell Type' : 'Create Cell Type'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cell Types Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Cell Types
          </h2>
          <button
            onClick={handleAddCellType}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + Add Cell Type
          </button>
        </div>
        
        {loading && (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading cell types...</p>
          </div>
        )}

        {error && (
          <div className="p-6 text-center">
            <div className="text-red-600 bg-red-50 p-4 rounded-md">
              {error}
            </div>
          </div>
        )}

        {!loading && !error && cellTypes.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-gray-500">No cell types found. Add your first cell type to get started.</p>
          </div>
        )}

        {!loading && !error && cellTypes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cell Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DC Type
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driveways
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cellTypes.map((cellType) => (
                  <tr key={cellType.cellType} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cellType.cellType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cellType.dcType || '-'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cellType.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cellType.hasMultipleDriveways ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {cellType.numberOfDriveways} driveway(s)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Single
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(cellType.cellType)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cellType.cellType)}
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

export default CellTypes; 