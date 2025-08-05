import React, { useState, useEffect } from 'react';
import { setupAPI, testCasesAPI } from '../services/api';

const Setup = () => {
  const [formData, setFormData] = useState({
    siteName: '',
    phase: '',
    cellTypes: [
      { cellType: '', quantity: '', cellNames: [''] }
    ]
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [availableCellTypes, setAvailableCellTypes] = useState([]);

  useEffect(() => {
    loadCellTypes();
  }, []);

  const loadCellTypes = async () => {
    try {
      const response = await testCasesAPI.getCellTypes();
      setAvailableCellTypes(response.data.data);
    } catch (error) {
      console.error('Error loading cell types:', error);
      setMessage('Error loading available cell types');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCellTypeChange = (index, field, value) => {
    setFormData(prev => {
      const updatedCellTypes = [...prev.cellTypes];
      updatedCellTypes[index] = {
        ...updatedCellTypes[index],
        [field]: field === 'quantity' ? value : value
      };
      
      // If quantity changed, update cell names immediately
      if (field === 'quantity') {
        const newQuantity = parseInt(value) || 0;
        const currentCellNames = updatedCellTypes[index].cellNames || [];
        const updatedCellNames = [];
        for (let i = 0; i < newQuantity; i++) {
          updatedCellNames[i] = currentCellNames[i] || '';
        }
        updatedCellTypes[index].cellNames = updatedCellNames;
      }
      
      return {
        ...prev,
        cellTypes: updatedCellTypes
      };
    });
  };

  const handleCellNameChange = (cellTypeIndex, cellIndex, value) => {
    const updatedCellTypes = [...formData.cellTypes];
    updatedCellTypes[cellTypeIndex].cellNames[cellIndex] = value;
    setFormData(prev => ({
      ...prev,
      cellTypes: updatedCellTypes
    }));
  };

  const addCellType = () => {
    setFormData(prev => ({
      ...prev,
      cellTypes: [
        ...prev.cellTypes,
        { cellType: '', quantity: '', cellNames: [''] }
      ]
    }));
  };

  const removeCellType = (index) => {
    if (formData.cellTypes.length > 1) {
      setFormData(prev => ({
        ...prev,
        cellTypes: prev.cellTypes.filter((_, i) => i !== index)
      }));
    }
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

      const validCellTypes = formData.cellTypes.filter(ct => 
        ct.cellType.trim() && ct.quantity && parseInt(ct.quantity) > 0
      );

      if (validCellTypes.length === 0) {
        throw new Error('At least one cell type is required');
      }

      // Validate cell names
      for (let i = 0; i < validCellTypes.length; i++) {
        const ct = validCellTypes[i];
        const quantity = parseInt(ct.quantity);
        if (ct.cellNames.length !== quantity) {
          throw new Error(`Cell names count must match quantity for ${ct.cellType}`);
        }
        for (let j = 0; j < ct.cellNames.length; j++) {
          if (!ct.cellNames[j].trim()) {
            throw new Error(`Cell name ${j + 1} for ${ct.cellType} is required`);
          }
        }
      }

      await setupAPI.createSite({
        siteName: formData.siteName,
        phase: formData.phase,
        cellTypes: validCellTypes
      });

      setMessage('Site configuration created successfully!');
      setFormData({
        siteName: '',
          phase: '',
        cellTypes: [{ cellType: '', quantity: '', cellNames: [''] }]
        });
    } catch (error) {
      setMessage(error.message || 'Error creating site configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Site Configuration
            </h1>
            <p className="text-gray-600">
              Set up new testing sites with custom cell configurations
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-md">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-700">Configuration</span>
          </div>
        </div>
      </div>

      {/* Setup Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Site</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site Name *
              </label>
              <input
                type="text"
                name="siteName"
                value={formData.siteName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                placeholder="Enter site name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phase *
              </label>
              <select
                name="phase"
                value={formData.phase}
                onChange={handleInputChange}
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

          {/* Cell Types */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold text-gray-900">Cell Types</h3>
              <button
                type="button"
                onClick={addCellType}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Add Cell Type
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.cellTypes.map((cellType, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Cell Type {index + 1}</h4>
                    {formData.cellTypes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCellType(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cell Type *
                      </label>
                      <select
                        value={cellType.cellType}
                        onChange={(e) => handleCellTypeChange(index, 'cellType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                        required
                      >
                        <option value="">Select a cell type...</option>
                        {availableCellTypes.map((type, i) => (
                          <option key={i} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={cellType.quantity}
                        onChange={(e) => handleCellTypeChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Cell Names */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cell Names *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {cellType.cellNames.map((cellName, cellIndex) => (
                        <input
                          key={cellIndex}
                          type="text"
                          value={cellName}
                          onChange={(e) => handleCellNameChange(index, cellIndex, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10"
                          placeholder={`Cell ${cellIndex + 1}`}
                          required
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
              disabled={loading}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Creating...' : 'Create Site Configuration'}
          </button>
        </div>
        </form>
      </div>


    </div>
  );
};

export default Setup;