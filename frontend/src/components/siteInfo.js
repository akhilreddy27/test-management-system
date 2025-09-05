import React, { useState, useEffect, useRef } from 'react';
import { setupAPI } from '../services/api';
import LoggingService from '../services/loggingService';
import { showSuccessToast, showErrorToast } from '../services/toastService';
import SearchableDropdown from './SearchableDropdown';

const SiteInfo = ({ currentUser = 'Unknown' }) => {
  const [formData, setFormData] = useState({
    network: '',
    dcType: '',
    subType: '',
    dcNumber: '',
    city: '',
    state: ''
  });
  const [siteInfoList, setSiteInfoList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // Options for dropdowns
  const [networkOptions, setNetworkOptions] = useState([]);
  const [dcTypeOptions, setDcTypeOptions] = useState([]);
  const [subTypeOptions, setSubTypeOptions] = useState([]);

  // Refs for form fields
  const networkRef = useRef(null);
  const dcTypeRef = useRef(null);
  const subTypeRef = useRef(null);
  const dcNumberRef = useRef(null);
  const cityRef = useRef(null);
  const stateRef = useRef(null);

  useEffect(() => {
    loadSiteInfo();
    LoggingService.logPageView('site-info', currentUser);
  }, [currentUser]);

  const loadSiteInfo = async () => {
    try {
      console.log('Loading site info...');
      const response = await setupAPI.getSiteInfo();
      console.log('Site info response:', response);
      const data = response.data.data || [];
      setSiteInfoList(data);
      
      // Extract unique options from existing data only
      const existingNetworks = [...new Set(data.map(item => item.network).filter(Boolean))];
      const existingDcTypes = [...new Set(data.map(item => item.dcType).filter(Boolean))];
      const existingSubTypes = [...new Set(data.map(item => item.subType).filter(Boolean))];
      
      setNetworkOptions(existingNetworks);
      setDcTypeOptions(existingDcTypes);
      setSubTypeOptions(existingSubTypes);
      
      LoggingService.logActivity({
        user: currentUser,
        action: 'LOAD_SITE_INFO',
        module: 'site-info',
        details: 'Loaded site information list'
      });
    } catch (error) {
      console.error('Error loading site info:', error);
      setMessage('Error loading site information');
      LoggingService.logError(error, 'site-info', currentUser);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const oldValue = formData[name];
    
    let processedValue = value;
    
    // For DC Number field, only allow numbers
    if (name === 'dcNumber') {
      // Remove any non-numeric characters
      processedValue = value.replace(/[^0-9]/g, '');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    LoggingService.logDataChange('site-info', name, oldValue, processedValue, currentUser);
  };

  const handleDropdownChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddNewOption = (field, newValue) => {
    switch (field) {
      case 'network':
        setNetworkOptions(prev => [...new Set([...prev, newValue])]);
        break;
      case 'dcType':
        setDcTypeOptions(prev => [...new Set([...prev, newValue])]);
        break;
      case 'subType':
        setSubTypeOptions(prev => [...new Set([...prev, newValue])]);
        break;
      default:
        break;
    }
    
    LoggingService.logActivity({
      user: currentUser,
      action: 'ADD_NEW_OPTION',
      module: 'site-info',
      details: `Added new ${field}: ${newValue}`
    });
  };



  const moveToNextField = (currentField) => {
    const fieldOrder = ['network', 'dcType', 'subType', 'dcNumber', 'city', 'state'];
    const currentIndex = fieldOrder.indexOf(currentField);
    
    if (currentIndex < fieldOrder.length - 1) {
      const nextField = fieldOrder[currentIndex + 1];
      const nextRef = getFieldRef(nextField);
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      }
    } else {
      // All fields are complete, submit the form
      handleSubmit(new Event('submit'));
    }
  };

  const getFieldRef = (fieldName) => {
    switch (fieldName) {
      case 'network': return networkRef;
      case 'dcType': return dcTypeRef;
      case 'subType': return subTypeRef;
      case 'dcNumber': return dcNumberRef;
      case 'city': return cityRef;
      case 'state': return stateRef;
      default: return null;
    }
  };

  const handleFieldKeyDown = (e, fieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      moveToNextField(fieldName);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validate form data
      if (!formData.network.trim()) {
        throw new Error('Network is required');
      }
      if (!formData.dcType.trim()) {
        throw new Error('DC Type is required');
      }
      if (!formData.subType.trim()) {
        throw new Error('Sub Type is required');
      }
      if (!formData.dcNumber.trim()) {
        throw new Error('DC Number is required');
      }
      if (!formData.city.trim()) {
        throw new Error('City is required');
      }
      if (!formData.state.trim()) {
        throw new Error('State is required');
      }

      if (editingId) {
        // Update existing site info
        await setupAPI.updateSiteInfo(editingId, formData);
        showSuccessToast('Site information updated successfully!', setMessage);
        LoggingService.logActivity({
          user: currentUser,
          action: 'UPDATE_SITE_INFO',
          module: 'site-info',
          details: `Updated site info: ${formData.network}, ${formData.city}, ${formData.state}`
        });
      } else {
        // Create new site info
        console.log('Creating site info with data:', formData);
        const createResponse = await setupAPI.createSiteInfo(formData);
        console.log('Create response:', createResponse);
        showSuccessToast('Site information created successfully!', setMessage);
        LoggingService.logActivity({
          user: currentUser,
          action: 'CREATE_SITE_INFO',
          module: 'site-info',
          details: `Created site info: ${formData.network}, ${formData.city}, ${formData.state}`
        });
      }

      // Reset form
      setFormData({
        network: '',
        dcType: '',
        subType: '',
        dcNumber: '',
        city: '',
        state: ''
      });
      setEditingId(null);
      
      // Focus back to first field
      if (networkRef.current) {
        networkRef.current.focus();
      }
      
      // Reload data
      await loadSiteInfo();
    } catch (error) {
      showErrorToast(error.message || 'Error saving site information', setMessage);
      LoggingService.logError(error, 'site-info', currentUser);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (siteInfo) => {
    setFormData({
      network: siteInfo.network || '',
      dcType: siteInfo.dcType || '',
      subType: siteInfo.subType || '',
      dcNumber: siteInfo.dcNumber || '',
      city: siteInfo.city || '',
      state: siteInfo.state || ''
    });
    setEditingId(siteInfo.id);
    setMessage('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this site information?')) {
      return;
    }

    try {
      await setupAPI.deleteSiteInfo(id);
      showSuccessToast('Site information deleted successfully!', setMessage);
      LoggingService.logActivity({
        user: currentUser,
        action: 'DELETE_SITE_INFO',
        module: 'site-info',
        details: `Deleted site info with ID: ${id}`
      });
      await loadSiteInfo();
    } catch (error) {
      showErrorToast('Error deleting site information', setMessage);
      LoggingService.logError(error, 'site-info', currentUser);
    }
  };

  const handleCancel = () => {
    setFormData({
      network: '',
      dcType: '',
      subType: '',
      dcNumber: '',
      city: '',
      state: ''
    });
    setEditingId(null);
    setMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Site Info Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {editingId ? 'Edit Site Information' : 'Add Site Information'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Network *
              </label>
              <SearchableDropdown
                ref={networkRef}
                value={formData.network}
                onChange={(value) => handleDropdownChange('network', value)}
                options={networkOptions}
                placeholder="Select or type to add new network"
                onAddNew={(newValue) => handleAddNewOption('network', newValue)}
                allowAddNew={true}
                onKeyDown={(e) => handleFieldKeyDown(e, 'network')}
                onEnterComplete={() => moveToNextField('network')}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DC Type *
              </label>
              <SearchableDropdown
                ref={dcTypeRef}
                value={formData.dcType}
                onChange={(value) => handleDropdownChange('dcType', value)}
                options={dcTypeOptions}
                placeholder="Select or type to add new DC type"
                onAddNew={(newValue) => handleAddNewOption('dcType', newValue)}
                allowAddNew={true}
                onKeyDown={(e) => handleFieldKeyDown(e, 'dcType')}
                onEnterComplete={() => moveToNextField('dcType')}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sub Type *
              </label>
              <SearchableDropdown
                ref={subTypeRef}
                value={formData.subType}
                onChange={(value) => handleDropdownChange('subType', value)}
                options={subTypeOptions}
                placeholder="Select or type to add new sub type"
                onAddNew={(newValue) => handleAddNewOption('subType', newValue)}
                allowAddNew={true}
                onKeyDown={(e) => handleFieldKeyDown(e, 'subType')}
                onEnterComplete={() => moveToNextField('subType')}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DC Number *
              </label>
              <input
                ref={dcNumberRef}
                type="text"
                name="dcNumber"
                value={formData.dcNumber}
                onChange={handleInputChange}
                onKeyDown={(e) => handleFieldKeyDown(e, 'dcNumber')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter numbers only (e.g., 123)"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                ref={cityRef}
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                onKeyDown={(e) => handleFieldKeyDown(e, 'city')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter city name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State *
              </label>
              <SearchableDropdown
                ref={stateRef}
                value={formData.state}
                onChange={(value) => handleDropdownChange('state', value)}
                options={[
                  'AL - Alabama', 'AK - Alaska', 'AZ - Arizona', 'AR - Arkansas',
                  'CA - California', 'CO - Colorado', 'CT - Connecticut', 'DE - Delaware',
                  'FL - Florida', 'GA - Georgia', 'HI - Hawaii', 'ID - Idaho',
                  'IL - Illinois', 'IN - Indiana', 'IA - Iowa', 'KS - Kansas',
                  'KY - Kentucky', 'LA - Louisiana', 'ME - Maine', 'MD - Maryland',
                  'MA - Massachusetts', 'MI - Michigan', 'MN - Minnesota', 'MS - Mississippi',
                  'MO - Missouri', 'MT - Montana', 'NE - Nebraska', 'NV - Nevada',
                  'NH - New Hampshire', 'NJ - New Jersey', 'NM - New Mexico', 'NY - New York',
                  'NC - North Carolina', 'ND - North Dakota', 'OH - Ohio', 'OK - Oklahoma',
                  'OR - Oregon', 'PA - Pennsylvania', 'RI - Rhode Island', 'SC - South Carolina',
                  'SD - South Dakota', 'TN - Tennessee', 'TX - Texas', 'UT - Utah',
                  'VT - Vermont', 'VA - Virginia', 'WA - Washington', 'WV - West Virginia',
                  'WI - Wisconsin', 'WY - Wyoming'
                ]}
                placeholder="Select or search for a state"
                onAddNew={(newValue) => handleAddNewOption('state', newValue)}
                allowAddNew={false}
                onKeyDown={(e) => handleFieldKeyDown(e, 'state')}
              />
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

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Saving...' : editingId ? 'Update Site Info' : 'Add Site Info'}
            </button>
          </div>
        </form>
      </div>

      {/* Site Info List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Site Information</h3>
        
        {siteInfoList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DC Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sub Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DC Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {siteInfoList.map((siteInfo, index) => (
                  <tr key={siteInfo.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {siteInfo.network || <span className="text-gray-400 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {siteInfo.dcType || <span className="text-gray-400 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {siteInfo.subType || <span className="text-gray-400 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {siteInfo.dcNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {siteInfo.city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {siteInfo.state}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(siteInfo)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(siteInfo.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No site information</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first site information.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteInfo;
