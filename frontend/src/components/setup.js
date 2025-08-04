import React, { useState } from 'react';
import { setupAPI } from '../services/api';

const Setup = ({ testCases, availableCellTypes, currentUser }) => {
  const [setupForm, setSetupForm] = useState({
    siteNumber: '',
    phase: '',
    machines: [{ type: '', quantity: 1 }]
  });

  // Generate cell IDs dynamically based on type and quantity
  const generateCellIds = (type, quantity) => {
    const baseNumbers = {
      'A': 100, 'B': 200, 'C': 300, 'D': 400, 'MCP': 500
    };
    
    const baseNumber = baseNumbers[type] || 100;
    return Array.from({ length: quantity }, (_, i) => `${type}${baseNumber + i + 1}`);
  };

  // Add machine type
  const addMachineType = () => {
    setSetupForm(prev => ({
      ...prev,
      machines: [...prev.machines, { type: '', quantity: 1 }]
    }));
  };

  // Remove machine type
  const removeMachineType = (index) => {
    setSetupForm(prev => ({
      ...prev,
      machines: prev.machines.filter((_, i) => i !== index)
    }));
  };

  // Update machine
  const updateMachine = (index, field, value) => {
    setSetupForm(prev => ({
      ...prev,
      machines: prev.machines.map((machine, i) => 
        i === index ? { ...machine, [field]: value } : machine
      )
    }));
  };

  // Handle form submission with API call
  const handleSetupSubmit = async () => {
    if (!setupForm.siteNumber || !setupForm.phase) {
      alert('Please enter both Site Number and Phase');
      return;
    }

    const validMachines = setupForm.machines.filter(m => m.type && m.quantity > 0);
    if (validMachines.length === 0) {
      alert('Please configure at least one machine type');
      return;
    }

    try {
      // Call the backend API
      const response = await setupAPI.createSite({
        siteNumber: setupForm.siteNumber,
        phase: setupForm.phase,
        machines: validMachines,
        user: currentUser
      });

      if (response.data.success) {
        // Show success message with details
        const summary = response.data.data.machines.map(m => 
          `${m.quantity}x ${m.type} cells (${m.testCases} tests each) = ${m.quantity * m.testCases} total entries`
        );

        alert(
          `${response.data.message}\n\n` +
          `Created ${response.data.data.entriesCreated} test entries:\n${summary.join('\n')}\n\n` +
          `✅ Data saved to Excel file!`
        );

        // Reset form
        setSetupForm({
          siteNumber: '',
          phase: '',
          machines: [{ type: '', quantity: 1 }]
        });
      }
    } catch (error) {
      alert('Error creating site configuration: ' + (error.response?.data?.message || error.message));
      console.error('Setup error:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          ⚙️ Site Configuration Setup
        </h2>
        
        {/* Cell Types Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="font-medium text-blue-800 mb-2">Available Cell Types from Excel</div>
          <div className="text-blue-700 text-sm">
            {availableCellTypes.map(type => {
              const count = testCases.filter(tc => tc.cellType === type).length;
              return `${type} (${count} tests)`;
            }).join(', ')}
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Site and Phase inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site Number</label>
              <input
                type="text"
                value={setupForm.siteNumber}
                onChange={(e) => setSetupForm(prev => ({ ...prev, siteNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., SITE-1002"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phase</label>
              <input
                type="text"
                value={setupForm.phase}
                onChange={(e) => setSetupForm(prev => ({ ...prev, phase: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Phase 1"
              />
            </div>
          </div>

          {/* Machine Configuration */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">Machine Configuration</label>
              <button
                onClick={addMachineType}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={availableCellTypes.length === 0}
              >
                ➕ Add Machine Type
              </button>
            </div>
            
            <div className="space-y-4">
              {setupForm.machines.map((machine, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Machine Type</label>
                    <select
                      value={machine.type}
                      onChange={(e) => updateMachine(index, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Type...</option>
                      {availableCellTypes.map(cellType => {
                        const testCount = testCases.filter(tc => tc.cellType === cellType).length;
                        return (
                          <option key={cellType} value={cellType}>
                            {cellType} ({testCount} test cases)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={machine.quantity}
                      onChange={(e) => updateMachine(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Will Create Cells</label>
                    <div className="px-3 py-2 bg-gray-100 rounded text-sm text-gray-600">
                      {machine.type && machine.quantity ? 
                        generateCellIds(machine.type, machine.quantity).join(', ') : 
                        'Select type & quantity'
                      }
                    </div>
                  </div>
                  
                  {setupForm.machines.length > 1 && (
                    <button
                      onClick={() => removeMachineType(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Setup Summary */}
          {setupForm.machines.filter(m => m.type && m.quantity > 0).length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Setup Summary</h3>
              <div className="text-blue-700 text-sm space-y-1">
                {setupForm.machines.filter(m => m.type && m.quantity > 0).map((machine, index) => {
                  const testCount = testCases.filter(tc => tc.cellType === machine.type).length;
                  const totalEntries = machine.quantity * testCount;
                  return (
                    <div key={index}>
                      • {machine.quantity} {machine.type}-cells × {testCount} tests = {totalEntries} entries
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-blue-200 font-medium">
                  Total: {setupForm.machines
                    .filter(m => m.type && m.quantity > 0)
                    .reduce((sum, machine) => {
                      const testCount = testCases.filter(tc => tc.cellType === machine.type).length;
                      return sum + (machine.quantity * testCount);
                    }, 0)} test entries will be created
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSetupSubmit}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
            disabled={
              !setupForm.siteNumber || 
              !setupForm.phase ||
              setupForm.machines.filter(m => m.type && m.quantity > 0).length === 0
            }
          >
            💾 Create Site Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default Setup;