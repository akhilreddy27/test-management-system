import React, { useState, useEffect, useRef } from 'react';
import { testCasesAPI, testStatusAPI, setupAPI } from '../services/api';
import { showSuccessToast, showErrorToast } from '../services/toastService';

const Testing = ({ currentUser }) => {
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [availableSites, setAvailableSites] = useState([]);
  const [availablePhases, setAvailablePhases] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const [testCaseNotes, setTestCaseNotes] = useState({});
  const [expandedCellType, setExpandedCellType] = useState(null);
  const [expandedCell, setExpandedCell] = useState(null);
  const [expandedFirstCellTests, setExpandedFirstCellTests] = useState({});
  const [expandedScopes, setExpandedScopes] = useState({});
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
  const [selectedSiteIndex, setSelectedSiteIndex] = useState(-1);
  
  // State for Help modal
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState(null);

  useEffect(() => {
    loadTestCaseConfigurations();
    loadSites();
  }, []);

  useEffect(() => {
    if (selectedSite) {
      loadPhasesForSite(selectedSite);
    }
  }, [selectedSite]);

  useEffect(() => {
    if (selectedSite && selectedPhase) {
      loadTestCasesForSite(selectedSite, selectedPhase);
    } else {
      setTestCases([]);
    }
  }, [selectedSite, selectedPhase]);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.site-dropdown')) {
        setIsDropdownOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Keep testCasesRef updated with latest testCases state
  useEffect(() => {
    testCasesRef.current = testCases;
  }, [testCases]);

  const loadSites = async () => {
    try {
      const response = await setupAPI.getSiteOptions();
      if (response.data.success) {
        setAvailableSites(response.data.data);
      } else {
        console.error('Failed to load site options:', response.data);
        setError('Failed to load available sites');
      }
    } catch (error) {
      console.error('Error loading sites:', error);
      setError('Failed to load available sites');
    }
  };

  const loadPhasesForSite = async (siteName) => {
    try {
      if (!siteName) {
        setAvailablePhases([]);
        return;
      }
      
      // Extract phases from existing test status data instead of calling a new endpoint
      // This avoids the backend route issue and uses existing data
      const response = await testStatusAPI.getAll();
      if (response.data.success) {
        const testStatusData = response.data.data;
        
        // Filter phases for the specific site
        const sitePhases = [...new Set(
          testStatusData
            .filter(entry => entry.site === siteName)
            .map(entry => entry.phase)
            .filter(phase => phase && phase !== '')
        )];

        // Sort phases numerically if they follow a pattern like "Phase 1", "Phase 2", etc.
        const sortedPhases = sitePhases.sort((a, b) => {
          const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
          const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
          return aNum - bNum;
        });

        setAvailablePhases(sortedPhases);
      } else {
        console.error('Failed to load test status data:', response.data);
        setAvailablePhases([]);
      }
    } catch (error) {
      console.error('Error loading phases for site:', error);
      setAvailablePhases([]);
    }
  };

  const loadTestCaseConfigurations = async () => {
    try {
      const response = await testCasesAPI.getConfigurations();
      // Configuration data loaded successfully
      console.log('Test case configurations loaded');
    } catch (error) {
      console.error('Error loading test case configurations:', error);
      // Don't set error state as this is not critical for basic functionality
    }
  };

  const loadTestCasesForSite = async (site, phase) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await testCasesAPI.getBySite(site, phase);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load test cases');
      }
      
      const testCasesData = response.data.data;
      
      // The test cases API already returns status and uniqueTestId
      // We just need to load existing notes from test status
      const testCasesWithNotes = await Promise.all(
        testCasesData.map(async (testCase) => {
          try {
            // Load existing notes for this test case
            const statusResponse = await testStatusAPI.getByTestId(testCase.uniqueTestId);
            if (statusResponse.data.success && statusResponse.data.data.length > 0) {
              const statusData = statusResponse.data.data[0];
              
              // Load existing notes
              if (statusData.notes) {
                setTestCaseNotes(prev => ({
                  ...prev,
                  [testCase.testId]: statusData.notes
                }));
              }
            }
            
            return testCase; // Return the test case as-is since it already has status and uniqueTestId
          } catch (error) {
            console.error(`Error loading notes for test case ${testCase.testId}:`, error);
            return testCase;
          }
        })
      );
      
      setTestCases(testCasesWithNotes);
      
    } catch (error) {
      console.error('Error loading test cases:', error);
      setError(error.message || 'Failed to load test cases');
      setTestCases([]);
    } finally {
      setLoading(false);
    }
  };

    const handleStatusChange = async (testId, newStatus) => {
    try {
      // Find the test case to get its uniqueTestId
      const testCase = testCases.find(tc => tc.testId === testId);
      if (!testCase || !testCase.uniqueTestId) {
        throw new Error('Test case not found or missing uniqueTestId');
      }

      // Use uniqueTestId for the API call
      const response = await testStatusAPI.updateStatus(testCase.uniqueTestId, newStatus);

      if (response.data.success) {
        // Update local state
        setTestCases(prev => prev.map(tc => 
          tc.testId === testId ? { ...tc, status: newStatus } : tc
        ));
        
        showSuccessToast(`Status updated to ${newStatus}`);
      } else {
        throw new Error(response.data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showErrorToast('Failed to update status');
    }
  };

  const handleNoteChange = async (testId, note) => {
    try {
      console.log('handleNoteChange called with:', { testId, note });
      console.log('Available test cases:', testCases.map(tc => ({ testId: tc.testId, uniqueTestId: tc.uniqueTestId })));
      
      // Find the test case to get its uniqueTestId
      const testCase = testCases.find(tc => tc.testId === testId);
      console.log('Found test case:', testCase);
      
      if (!testCase || !testCase.uniqueTestId) {
        throw new Error('Test case not found or missing uniqueTestId');
      }

      console.log('Sending note update with uniqueTestId:', testCase.uniqueTestId);

      // Update local state immediately for better UX
      setTestCaseNotes(prev => ({
        ...prev,
        [testId]: note
      }));

      // Save to backend using uniqueTestId
      const response = await testStatusAPI.updateNote(testCase.uniqueTestId, note);
      console.log('Backend response:', response.data);

      if (response.data.success) {
        showSuccessToast('Note updated successfully');
      } else {
        throw new Error(response.data.message || 'Failed to update note');
      }
    } catch (error) {
      console.error('Error updating note:', error);
      showErrorToast('Failed to update note');
    }
  };

  // Debounce timer for API calls
  const debounceTimers = useRef({});
  // Store current values for debounced API calls
  const currentValues = useRef({});
  // Track ongoing API calls to prevent overlaps
  const ongoingApiCalls = useRef({});
  // Ref to access latest testCases state in debounced callbacks
  const testCasesRef = useRef(testCases);

  const handleHardeningVolumeChange = async (testId, volume) => {
    try {
      const testCase = testCases.find(tc => tc.testId === testId);
      if (!testCase) {
        throw new Error('Test case not found for volume update');
      }

      // Determine if this is CH or VT test
      const isChTest = testId.startsWith('CH-');
      const volumeField = isChTest ? 'chVolume' : 'vtVolume';
      
      // Store the current value for the debounced API call
      currentValues.current[`${testId}-volume`] = {
        testId, // Store testId instead of full testCase object
        volume,
        volumeField
      };
      
      // Update local state immediately for responsive UI
      setTestCases(prevTestCases => 
        prevTestCases.map(tc => 
          tc.testId === testId 
            ? { ...tc, [volumeField]: volume }
            : tc
        )
      );
      
      // Clear existing timer for this field
      if (debounceTimers.current[`${testId}-volume`]) {
        clearTimeout(debounceTimers.current[`${testId}-volume`]);
      }
      
      // Set new timer to make API call after user stops typing
      const apiKey = `${testId}-volume`;
      debounceTimers.current[apiKey] = setTimeout(async () => {
        try {
          // Check if API call is already in progress
          if (ongoingApiCalls.current[apiKey]) {
            console.log('API call already in progress, skipping:', apiKey);
            return;
          }
          
          const storedData = currentValues.current[apiKey];
          if (!storedData) {
            console.error('No stored data found for API call');
            return;
          }

          // Mark API call as in progress
          ongoingApiCalls.current[apiKey] = true;

          // IMPORTANT: Get the LATEST testCase from the current state via ref
          const latestTestCases = testCasesRef.current;
          const latestTestCase = latestTestCases.find(tc => tc.testId === storedData.testId);
          if (!latestTestCase) {
            console.error('Latest test case not found for API call:', storedData.testId);
            return;
          }

          const response = await testStatusAPI.updateStatus(latestTestCase.uniqueTestId, {
            [storedData.volumeField]: storedData.volume
          });

          if (response.success) {
            console.log('Volume updated successfully:', storedData.volume);
          } else {
            // Don't revert state - just log error to avoid overwriting user's current input
            console.error('API failed but keeping current UI state:', response.message || 'Failed to update volume');
            showErrorToast(`Failed to save volume: ${response.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Error updating volume:', error);
          showErrorToast(`Failed to update volume: ${error.message}`);
        } finally {
          // Mark API call as complete
          ongoingApiCalls.current[apiKey] = false;
        }
      }, 1000); // Wait 1000ms (1 second) after user stops typing
      
    } catch (error) {
      console.error('Error updating volume:', error);
      showErrorToast(`Failed to update volume: ${error.message}`);
    }
  };

  const handleVtVolumeChange = async (testId, volume) => {
    try {
      // Store the current value for the debounced API call
      currentValues.current[`${testId}-vtVolume`] = {
        testId,
        volume
      };
      
      // Update local state immediately for responsive UI
      setTestCases(prevTestCases => 
        prevTestCases.map(tc => 
          tc.testId === testId 
            ? { ...tc, vtVolume: volume }
            : tc
        )
      );
      
      // Clear existing timer for this field
      if (debounceTimers.current[`${testId}-vtVolume`]) {
        clearTimeout(debounceTimers.current[`${testId}-vtVolume`]);
      }
      
      // Set new timer to make API call after user stops typing
      const apiKey = `${testId}-vtVolume`;
      debounceTimers.current[apiKey] = setTimeout(async () => {
        try {
          // Check if API call is already in progress
          if (ongoingApiCalls.current[apiKey]) {
            console.log('API call already in progress, skipping:', apiKey);
            return;
          }
          
          const storedData = currentValues.current[apiKey];
          if (!storedData) {
            console.error('No stored data found for VT volume API call');
            return;
          }

          // Mark API call as in progress
          ongoingApiCalls.current[apiKey] = true;

          // IMPORTANT: Get the LATEST testCase from the current state via ref
          const latestTestCases = testCasesRef.current;
          const latestTestCase = latestTestCases.find(tc => tc.testId === storedData.testId);
          if (!latestTestCase) {
            console.error('Latest test case not found for VT volume API call:', storedData.testId);
            return;
          }

          const response = await testStatusAPI.updateStatus(latestTestCase.uniqueTestId, {
            vtVolume: storedData.volume
          });

          if (response.success) {
            console.log('VT Volume updated successfully:', storedData.volume);
          } else {
            console.error('API failed but keeping current UI state:', response.message || 'Failed to update VT volume');
            showErrorToast(`Failed to save VT volume: ${response.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Error updating VT volume:', error);
          showErrorToast(`Failed to update VT volume: ${error.message}`);
        } finally {
          ongoingApiCalls.current[apiKey] = false;
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error updating VT volume:', error);
      showErrorToast(`Failed to update VT volume: ${error.message}`);
    }
  };

  const handleVtDateChange = async (testId, date) => {
    try {
      // Store the current value for the debounced API call
      currentValues.current[`${testId}-vtDate`] = {
        testId,
        date
      };
      
      // Update local state immediately for responsive UI
      setTestCases(prevTestCases => 
        prevTestCases.map(tc => 
          tc.testId === testId 
            ? { ...tc, vtDate: date }
            : tc
        )
      );
      
      // Clear existing timer for this field
      if (debounceTimers.current[`${testId}-vtDate`]) {
        clearTimeout(debounceTimers.current[`${testId}-vtDate`]);
      }
      
      // Set new timer to make API call after user stops typing
      const apiKey = `${testId}-vtDate`;
      debounceTimers.current[apiKey] = setTimeout(async () => {
        try {
          // Check if API call is already in progress
          if (ongoingApiCalls.current[apiKey]) {
            console.log('API call already in progress, skipping:', apiKey);
            return;
          }
          
          const storedData = currentValues.current[apiKey];
          if (!storedData) {
            console.error('No stored data found for VT date API call');
            return;
          }

          // Mark API call as in progress
          ongoingApiCalls.current[apiKey] = true;

          // IMPORTANT: Get the LATEST testCase from the current state via ref
          const latestTestCases = testCasesRef.current;
          const latestTestCase = latestTestCases.find(tc => tc.testId === storedData.testId);
          if (!latestTestCase) {
            console.error('Latest test case not found for VT date API call:', storedData.testId);
            return;
          }

          const response = await testStatusAPI.updateStatus(latestTestCase.uniqueTestId, {
            vtDate: storedData.date
          });

          if (response.success) {
            console.log('VT Date updated successfully:', storedData.date);
          } else {
            console.error('API failed but keeping current UI state:', response.message || 'Failed to update VT date');
            showErrorToast(`Failed to save VT date: ${response.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Error updating VT date:', error);
          showErrorToast(`Failed to update VT date: ${error.message}`);
        } finally {
          ongoingApiCalls.current[apiKey] = false;
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error updating VT date:', error);
      showErrorToast(`Failed to update VT date: ${error.message}`);
    }
  };

  const handleVtStartTimeChange = async (testId, startTime) => {
    try {
      // Store the current value for the debounced API call
      currentValues.current[`${testId}-vtStartTime`] = {
        testId,
        startTime
      };
      
      // Update local state immediately for responsive UI
      setTestCases(prevTestCases => 
        prevTestCases.map(tc => 
          tc.testId === testId 
            ? { ...tc, vtStartTime: startTime }
            : tc
        )
      );
      
      // Clear existing timer for this field
      if (debounceTimers.current[`${testId}-vtStartTime`]) {
        clearTimeout(debounceTimers.current[`${testId}-vtStartTime`]);
      }
      
      // Set new timer to make API call after user stops typing
      const apiKey = `${testId}-vtStartTime`;
      debounceTimers.current[apiKey] = setTimeout(async () => {
        try {
          // Check if API call is already in progress
          if (ongoingApiCalls.current[apiKey]) {
            console.log('API call already in progress, skipping:', apiKey);
            return;
          }
          
          const storedData = currentValues.current[apiKey];
          if (!storedData) {
            console.error('No stored data found for VT start time API call');
            return;
          }

          // Mark API call as in progress
          ongoingApiCalls.current[apiKey] = true;

          // IMPORTANT: Get the LATEST testCase from the current state via ref
          const latestTestCases = testCasesRef.current;
          const latestTestCase = latestTestCases.find(tc => tc.testId === storedData.testId);
          if (!latestTestCase) {
            console.error('Latest test case not found for VT start time API call:', storedData.testId);
            return;
          }

          const response = await testStatusAPI.updateStatus(latestTestCase.uniqueTestId, {
            vtStartTime: storedData.startTime
          });

          if (response.success) {
            console.log('VT Start Time updated successfully:', storedData.startTime);
          } else {
            console.error('API failed but keeping current UI state:', response.message || 'Failed to update VT start time');
            showErrorToast(`Failed to save VT start time: ${response.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Error updating VT start time:', error);
          showErrorToast(`Failed to update VT start time: ${error.message}`);
        } finally {
          ongoingApiCalls.current[apiKey] = false;
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error updating VT start time:', error);
      showErrorToast(`Failed to update VT start time: ${error.message}`);
    }
  };

  const handleVtEndTimeChange = async (testId, endTime) => {
    try {
      // Store the current value for the debounced API call
      currentValues.current[`${testId}-vtEndTime`] = {
        testId,
        endTime
      };
      
      // Update local state immediately for responsive UI
      setTestCases(prevTestCases => 
        prevTestCases.map(tc => 
          tc.testId === testId 
            ? { ...tc, vtEndTime: endTime }
            : tc
        )
      );
      
      // Clear existing timer for this field
      if (debounceTimers.current[`${testId}-vtEndTime`]) {
        clearTimeout(debounceTimers.current[`${testId}-vtEndTime`]);
      }
      
      // Set new timer to make API call after user stops typing
      const apiKey = `${testId}-vtEndTime`;
      debounceTimers.current[apiKey] = setTimeout(async () => {
        try {
          // Check if API call is already in progress
          if (ongoingApiCalls.current[apiKey]) {
            console.log('API call already in progress, skipping:', apiKey);
            return;
          }
          
          const storedData = currentValues.current[apiKey];
          if (!storedData) {
            console.error('No stored data found for VT end time API call');
            return;
          }

          // Mark API call as in progress
          ongoingApiCalls.current[apiKey] = true;

          // IMPORTANT: Get the LATEST testCase from the current state via ref
          const latestTestCases = testCasesRef.current;
          const latestTestCase = latestTestCases.find(tc => tc.testId === storedData.testId);
          if (!latestTestCase) {
            console.error('Latest test case not found for VT end time API call:', storedData.testId);
            return;
          }

          const response = await testStatusAPI.updateStatus(latestTestCase.uniqueTestId, {
            vtEndTime: storedData.endTime
          });

          if (response.success) {
            console.log('VT End Time updated successfully:', storedData.endTime);
          } else {
            console.error('API failed but keeping current UI state:', response.message || 'Failed to update VT end time');
            showErrorToast(`Failed to save VT end time: ${response.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Error updating VT end time:', error);
          showErrorToast(`Failed to update VT end time: ${error.message}`);
        } finally {
          ongoingApiCalls.current[apiKey] = false;
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error updating VT end time:', error);
      showErrorToast(`Failed to update VT end time: ${error.message}`);
    }
  };

  const handleVtAvailabilityChange = async (testId, availability) => {
    console.log('VT Availability Change:', { testId, availability });
    try {
      // Store the current value for the debounced API call
      currentValues.current[`${testId}-vtAvailability`] = {
        testId,
        availability
      };
      
      // Update local state immediately for responsive UI
      setTestCases(prevTestCases => 
        prevTestCases.map(tc => 
          tc.testId === testId 
            ? { ...tc, vtAvailability: availability }
            : tc
        )
      );
      
      // Clear existing timer for this field
      if (debounceTimers.current[`${testId}-vtAvailability`]) {
        clearTimeout(debounceTimers.current[`${testId}-vtAvailability`]);
      }
      
      // Set new timer to make API call after user stops typing
      const apiKey = `${testId}-vtAvailability`;
      debounceTimers.current[apiKey] = setTimeout(async () => {
        try {
          // Check if API call is already in progress
          if (ongoingApiCalls.current[apiKey]) {
            console.log('API call already in progress, skipping:', apiKey);
            return;
          }
          
          const storedData = currentValues.current[apiKey];
          if (!storedData) {
            console.error('No stored data found for VT availability API call');
            return;
          }

          // Mark API call as in progress
          ongoingApiCalls.current[apiKey] = true;

          // IMPORTANT: Get the LATEST testCase from the current state via ref
          const latestTestCases = testCasesRef.current;
          const latestTestCase = latestTestCases.find(tc => tc.testId === storedData.testId);
          if (!latestTestCase) {
            console.error('Latest test case not found for VT availability API call:', storedData.testId);
            return;
          }

          console.log('Making VT Availability API call:', {
            uniqueTestId: latestTestCase.uniqueTestId,
            vtAvailability: storedData.availability
          });
          
          const response = await testStatusAPI.updateStatus(latestTestCase.uniqueTestId, {
            vtAvailability: storedData.availability
          });

          if (response.success) {
            console.log('VT Availability updated successfully:', storedData.availability);
          } else {
            console.error('API failed but keeping current UI state:', response.message || 'Failed to update VT availability');
            showErrorToast(`Failed to save VT availability: ${response.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Error updating VT availability:', error);
          showErrorToast(`Failed to update VT availability: ${error.message}`);
        } finally {
          ongoingApiCalls.current[apiKey] = false;
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error updating VT availability:', error);
      showErrorToast(`Failed to update VT availability: ${error.message}`);
    }
  };

  const handleHardeningDateChange = async (testId, date) => {
    try {
      const testCase = testCases.find(tc => tc.testId === testId);
      if (!testCase) {
        throw new Error('Test case not found for date update');
      }

      // Determine if this is CH or VT test
      const isChTest = testId.startsWith('CH-');
      const dateField = isChTest ? 'chDate' : 'vtDate';
      
      // Store the current value for the debounced API call
      currentValues.current[`${testId}-date`] = {
        testId, // Store testId instead of full testCase object
        date,
        dateField
      };
      
      // Update local state immediately for responsive UI
      setTestCases(prevTestCases => 
        prevTestCases.map(tc => 
          tc.testId === testId 
            ? { ...tc, [dateField]: date }
            : tc
        )
      );
      
      // Clear existing timer for this field
      if (debounceTimers.current[`${testId}-date`]) {
        clearTimeout(debounceTimers.current[`${testId}-date`]);
      }
      
      // Set new timer to make API call after user stops typing
      const apiKey = `${testId}-date`;
      debounceTimers.current[apiKey] = setTimeout(async () => {
        try {
          // Check if API call is already in progress
          if (ongoingApiCalls.current[apiKey]) {
            console.log('API call already in progress, skipping:', apiKey);
            return;
          }
          
          const storedData = currentValues.current[apiKey];
          if (!storedData) {
            console.error('No stored data found for date API call');
            return;
          }

          // Mark API call as in progress
          ongoingApiCalls.current[apiKey] = true;

          // IMPORTANT: Get the LATEST testCase from the current state via ref
          const latestTestCases = testCasesRef.current;
          const latestTestCase = latestTestCases.find(tc => tc.testId === storedData.testId);
          if (!latestTestCase) {
            console.error('Latest test case not found for date API call:', storedData.testId);
            return;
          }

          const response = await testStatusAPI.updateStatus(latestTestCase.uniqueTestId, {
            [storedData.dateField]: storedData.date
          });

          if (response.success) {
            console.log('Date updated successfully:', storedData.date);
          } else {
            // Don't revert state - just log error to avoid overwriting user's current input
            console.error('API failed but keeping current UI state:', response.message || 'Failed to update date');
            showErrorToast(`Failed to save date: ${response.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Error updating date:', error);
          showErrorToast(`Failed to update date: ${error.message}`);
        } finally {
          // Mark API call as complete
          ongoingApiCalls.current[apiKey] = false;
        }
      }, 1000); // Wait 1000ms (1 second) after user stops typing
      
    } catch (error) {
      console.error('Error updating date:', error);
      showErrorToast(`Failed to update date: ${error.message}`);
    }
  };

  const handleChVtDataChange = (testId, fieldName, value) => {
      setChVtData(prev => ({
      ...prev,
        [testId]: {
          ...prev[testId],
        [fieldName]: value
        }
    }));
  };

  const getScopeBadgeColor = (scope) => {
    // Dynamic color assignment based on scope value
    const colorOptions = [
      'bg-purple-100 text-purple-800',
      'bg-blue-100 text-blue-800', 
      'bg-green-100 text-green-800',
      'bg-orange-100 text-orange-800',
      'bg-red-100 text-red-800',
      'bg-indigo-100 text-indigo-800',
      'bg-pink-100 text-pink-800',
      'bg-yellow-100 text-yellow-800',
      'bg-teal-100 text-teal-800',
      'bg-cyan-100 text-cyan-800',
      'bg-emerald-100 text-emerald-800',
      'bg-violet-100 text-violet-800',
      'bg-amber-100 text-amber-800',
      'bg-lime-100 text-lime-800',
      'bg-rose-100 text-rose-800',
      'bg-slate-100 text-slate-800',
      'bg-zinc-100 text-zinc-800',
      'bg-stone-100 text-stone-800',
      'bg-neutral-100 text-neutral-800',
      'bg-sky-100 text-sky-800',
      'bg-fuchsia-100 text-fuchsia-800',
      'bg-purple-200 text-purple-900',
      'bg-blue-200 text-blue-900',
      'bg-green-200 text-green-900',
      'bg-orange-200 text-orange-900',
      'bg-red-200 text-red-900',
      'bg-indigo-200 text-indigo-900',
      'bg-pink-200 text-pink-900',
      'bg-yellow-200 text-yellow-900'
    ];
    
    // Use scope value to deterministically assign a color
    if (!scope) return 'bg-gray-100 text-gray-800';
    
    // Use a simple but effective hash function
    let hash = 0;
    for (let i = 0; i < scope.length; i++) {
      const char = scope.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Ensure positive index and use modulo
    const index = Math.abs(hash) % colorOptions.length;
    return colorOptions[index];
  };

  // Group test cases by Cell Type → Cells → Test Cases hierarchy
  const groupedByCellType = testCases.reduce((cellTypeGroups, testCase) => {
    const cellType = testCase.cellType || 'Unknown';
    const cellName = testCase.cell || 'Unknown';
    const scope = testCase.scope || 'Cell';
    const cells = testCase.cells || '';
    

    
    // Initialize cell type group if it doesn't exist
    if (!cellTypeGroups[cellType]) {
      cellTypeGroups[cellType] = {
        cellType,
        cells: {},
        firstCellTestCases: [], // Test cases that should only be tested once per cell type
        totalTestCases: 0,
        passedCount: 0,
        failedCount: 0,
        blockedCount: 0,
        notRunCount: 0,
        naCount: 0
      };
    }
    
    // Handle test cases that should be tested only once per cell type (cells: "First")
    if (cells === "First") {
      cellTypeGroups[cellType].firstCellTestCases.push(testCase);
      
      // Update cell type level counts for "First" test cases
      switch (testCase.status) {
        case 'PASS':
          cellTypeGroups[cellType].passedCount++;
          break;
        case 'FAIL':
          cellTypeGroups[cellType].failedCount++;
          break;
        case 'BLOCKED':
          cellTypeGroups[cellType].blockedCount++;
          break;
        case 'NA':
          cellTypeGroups[cellType].naCount++;
          break;
        default:
          cellTypeGroups[cellType].notRunCount++;
          break;
      }
      
      cellTypeGroups[cellType].totalTestCases++;
      return cellTypeGroups;
    }
    
    // Handle test cases that should be tested for each individual cell (cells: "All" or other values)
    // Group by cells within each cell type
    if (!cellTypeGroups[cellType].cells[cellName]) {
      cellTypeGroups[cellType].cells[cellName] = {
        cellName,
        testCases: [],
        passedCount: 0,
        failedCount: 0,
        blockedCount: 0,
        notRunCount: 0,
        naCount: 0
      };
    }
    
    // Add test case to the appropriate cell (only for "All" or other non-"First" values)
    cellTypeGroups[cellType].cells[cellName].testCases.push(testCase);
    
    // Update cell-level counts
    switch (testCase.status) {
      case 'PASS':
        cellTypeGroups[cellType].cells[cellName].passedCount++;
        cellTypeGroups[cellType].passedCount++;
        break;
      case 'FAIL':
        cellTypeGroups[cellType].cells[cellName].failedCount++;
        cellTypeGroups[cellType].failedCount++;
        break;
      case 'BLOCKED':
        cellTypeGroups[cellType].cells[cellName].blockedCount++;
        cellTypeGroups[cellType].blockedCount++;
        break;
      case 'NA':
        cellTypeGroups[cellType].cells[cellName].naCount++;
        cellTypeGroups[cellType].naCount++;
        break;
      default:
        cellTypeGroups[cellType].cells[cellName].notRunCount++;
        cellTypeGroups[cellType].notRunCount++;
        break;
    }
    
    cellTypeGroups[cellType].totalTestCases++;
    
    return cellTypeGroups;
  }, {});

  // Convert to array for easier rendering
  const cellTypeGroupsArray = Object.entries(groupedByCellType).map(([cellType, data]) => ({
    cellType,
    ...data
  }));



  const toggleCellType = (cellType) => {
    if (expandedCellType === cellType) {
      // If clicking the same cell type, collapse it
      setExpandedCellType(null);
      setExpandedCell(null); // Also collapse any expanded cell
    } else {
      // If clicking a different cell type, expand it and collapse others
      setExpandedCellType(cellType);
      setExpandedCell(null); // Collapse any previously expanded cell
    }
  };

  const toggleCell = (cellType, cellName) => {
    const key = `${cellType}-${cellName}`;
    if (expandedCell === key) {
      // If clicking the same cell, collapse it
      setExpandedCell(null);
      setExpandedScopes({}); // Also collapse any expanded scopes
    } else {
      // If clicking a different cell, expand it and collapse ALL others
      setExpandedCell(key);
      // Collapse any expanded first cell tests from ANY cell type
      setExpandedFirstCellTests({});
      // Reset ALL scope expansions when changing cells
      setExpandedScopes({});
    }
  };

  const toggleFirstCellTests = (cellType) => {
    const isCurrentlyExpanded = expandedFirstCellTests[cellType];
    
    if (isCurrentlyExpanded) {
      // If clicking the same "First cell only", collapse it
      setExpandedFirstCellTests(prev => ({
        ...prev,
        [cellType]: false
      }));
    } else {
      // If expanding "First cell only", collapse ALL other sections
      setExpandedFirstCellTests({ [cellType]: true }); // Only this one expanded
      setExpandedCell(null); // Collapse any individual cells
      setExpandedScopes({}); // Collapse any scopes
    }
  };

  const toggleScope = (cellType, cellName, scope) => {
    const key = `${cellType}-${cellName}-${scope}`;
    const isCurrentlyExpanded = expandedScopes[key];
    
    if (isCurrentlyExpanded) {
      // If clicking the same scope, collapse it
      setExpandedScopes({});
    } else {
      // If expanding a scope, collapse ALL other scopes and expand only this one
      setExpandedScopes({ [key]: true });
    }
  };

  const refreshAll = async () => {
    try {
      setLoading(true);
      // Load configurations first
      await loadTestCaseConfigurations();
      // Refresh sites
      await loadSites();
      // Refresh phases if a site is selected
      if (selectedSite) {
        await loadPhasesForSite(selectedSite);
      }
      // Then refresh test cases if both site and phase are selected
      if (selectedSite && selectedPhase) {
        await loadTestCasesForSite(selectedSite, selectedPhase);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter sites based on search term
  const filteredSites = availableSites.filter(site =>
    site.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSiteSelect = async (site) => {
    setSelectedSite(site.value);
    setSelectedPhase(''); // Clear phase selection when site changes
    setIsDropdownOpen(false);
    setSearchTerm('');
    setSelectedSiteIndex(-1);
    
    // Collapse all expanded items when site changes
    setExpandedCellType(null);
    setExpandedCell(null);
    setExpandedFirstCellTests({});
    setExpandedScopes({});
    
    // Load phases for the selected site
    await loadPhasesForSite(site.value);
  };

  const openHelpModal = (testCase) => {
    setSelectedTestCase(testCase);
    setShowHelpModal(true);
  };

  const closeHelpModal = () => {
    setShowHelpModal(false);
    setSelectedTestCase(null);
  };

  // Function to highlight search term in results
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading test cases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Testing Dashboard</h1>
            <button
              onClick={refreshAll}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Site and Phase Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Site Selection */}
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Site
            </label>
              <div className="relative site-dropdown">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsDropdownOpen(false);
                      setSearchTerm('');
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      setIsDropdownOpen(!isDropdownOpen);
                    }
                  }}
                  className="w-full h-10 px-3 sm:px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex items-center justify-between"
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
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search sites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setIsDropdownOpen(false);
                            setSearchTerm('');
                          } else if (e.key === 'Enter' && filteredSites.length > 0) {
                            if (selectedSiteIndex >= 0 && selectedSiteIndex < filteredSites.length) {
                              handleSiteSelect(filteredSites[selectedSiteIndex]);
                            } else if (filteredSites.length === 1) {
                              handleSiteSelect(filteredSites[0]);
                            }
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setSelectedSiteIndex(prev => 
                              prev < filteredSites.length - 1 ? prev + 1 : 0
                            );
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setSelectedSiteIndex(prev => 
                              prev > 0 ? prev - 1 : filteredSites.length - 1
                            );
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-auto">
                  {filteredSites.map((site, index) => (
                    <button
                      key={index}
                          type="button"
                      onClick={() => handleSiteSelect(site)}
                          className={`w-full px-3 py-2 text-left focus:outline-none text-sm ${
                            index === selectedSiteIndex 
                              ? 'bg-blue-100 text-blue-900' 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {highlightSearchTerm(site.label, searchTerm)}
                    </button>
                  ))}
                      {filteredSites.length === 0 && (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          No sites found
                        </div>
                      )}
                    </div>
                </div>
              )}
            </div>
          </div>

            {/* Phase Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Phase
              </label>
              <select
                value={selectedPhase}
                onChange={(e) => {
                  setSelectedPhase(e.target.value);
                  // Collapse all expanded items when phase changes
                  setExpandedCellType(null);
                  setExpandedCell(null);
                  setExpandedScopes({});
                }}
                disabled={!selectedSite}
                className={`w-full h-10 px-3 sm:px-4 border rounded-lg text-sm sm:text-base ${
                  !selectedSite 
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              >
                <option value="">
                  {!selectedSite ? 'Select a site first...' : 'Select a phase...'}
                </option>
                {availablePhases.map((phase, index) => (
                  <option key={index} value={phase}>
                    {phase}
                  </option>
                ))}
              </select>
            </div>
        </div>


        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-red-800 text-sm sm:text-base">{error}</p>
          </div>
          )}



        {/* Test Cases */}
        {testCases.length > 0 && (
          <div className="space-y-4 sm:space-y-6">
            {cellTypeGroupsArray.map((cellTypeGroup) => (
              <div key={cellTypeGroup.cellType} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Cell Type Header */}
                <button
                  onClick={() => toggleCellType(cellTypeGroup.cellType)}
                  className="w-full bg-blue-50 p-3 sm:p-4 hover:bg-blue-100 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                    <div className="text-left flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
                        {cellTypeGroup.cellType}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 leading-tight">
                        {Object.keys(cellTypeGroup.cells).length} cells • {cellTypeGroup.totalTestCases} test cases
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4 w-full sm:w-auto">
                    {/* Status Summary */}
                    <div className="flex items-center space-x-1 sm:space-x-3 text-xs sm:text-sm">
                      <span className="text-green-600 font-medium">{cellTypeGroup.passedCount}✅</span>
                      <span className="text-red-600 font-medium">{cellTypeGroup.failedCount}❌</span>
                      <span className="text-orange-600 font-medium">{cellTypeGroup.blockedCount}🚫</span>
                      <span className="text-gray-600 font-medium">{cellTypeGroup.notRunCount}⏸️</span>
                      <span className="text-slate-600 font-medium">{cellTypeGroup.naCount}N/A</span>
                    </div>
                    
                  </div>
                </button>

                {/* Cell Type Content */}
                {expandedCellType === cellTypeGroup.cellType && (
                  <div className="border-t border-gray-200">
                    {/* First Cell Test Cases Expansion (for cells: "First") */}
                    {(() => {
                      // Get test cases that should be tested only once per cell type, sorted by test case name
                      const firstCellTestCases = (cellTypeGroup.firstCellTestCases || [])
                        .sort((a, b) => (a.testCase || '').localeCompare(b.testCase || ''));
                      
                      if (firstCellTestCases.length > 0) {
                        const isExpanded = expandedFirstCellTests[cellTypeGroup.cellType];
                        
                        return (
                          <div className="border-b border-gray-100">
                            {/* First Cell Test Cases Header - Clickable */}
                            <button
                              onClick={() => toggleFirstCellTests(cellTypeGroup.cellType)}
                              className="w-full text-left hover:bg-gray-50 transition-colors p-3 sm:p-4 border border-gray-300 rounded-md"
                            >
                              <div className="flex items-center justify-between space-x-2 sm:space-x-4">
                                <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                                <div className="text-left flex-1 min-w-0">
                                  <h5 className="font-medium text-gray-900 text-sm leading-tight">
                                      First cell only
                                  </h5>
                                  <p className="text-xs text-gray-600 leading-tight">
                                    {firstCellTestCases.length} test cases (test only on first cell)
                                  </p>
                                </div>
                              </div>
                                
                                <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4 w-full sm:w-auto">
                                  {/* Status Summary for First Cell Test Cases */}
                                  <div className="flex items-center space-x-1 sm:space-x-3 text-xs sm:text-sm">
                                    {(() => {
                                      const statusCounts = firstCellTestCases.reduce((counts, testCase) => {
                                        switch (testCase.status) {
                                          case 'PASS': counts.passed++; break;
                                          case 'FAIL': counts.failed++; break;
                                          case 'BLOCKED': counts.blocked++; break;
                                          case 'NA': counts.na++; break;
                                          default: counts.notRun++; break;
                                        }
                                        return counts;
                                      }, { passed: 0, failed: 0, blocked: 0, notRun: 0, na: 0 });
                                      
                                      return (
                                        <>
                                          <span className="text-green-600 font-medium">{statusCounts.passed}✅</span>
                                          <span className="text-red-600 font-medium">{statusCounts.failed}❌</span>
                                          <span className="text-orange-600 font-medium">{statusCounts.blocked}🚫</span>
                                          <span className="text-gray-600 font-medium">{statusCounts.notRun}⏸️</span>
                                          <span className="text-slate-600 font-medium">{statusCounts.na}N/A</span>
                                        </>
                                      );
                                    })()}
                            </div>
                            

                                </div>
                              </div>
                            </button>
                            
                            {/* First Cell Test Cases Table - Expandable */}
                            {isExpanded && (
                              <div className="border-t border-gray-200 bg-white">
                              {/* Mobile: Card Layout */}
                              <div className="block sm:hidden">
                                <div className="divide-y divide-gray-200">
                                  {firstCellTestCases.map((testCase, index) => (
                                    <div key={testCase.testId} className="p-3 space-y-3">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-gray-900 text-sm">
                                            <div className="truncate">{testCase.testCase}</div>
                                            <button
                                              onClick={() => openHelpModal(testCase)}
                                              className="text-blue-500 hover:text-blue-700 transition-colors text-xs underline mt-1"
                                              title="View test case details"
                                            >
                                              Help
                                            </button>
                                          </div>
                                          {/* Scope Badge */}
                                          <div className="mt-1">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScopeBadgeColor(testCase.scope)}`}>
                                              {testCase.scope}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div>
                                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-mono">
                                          {testCase.testId}
                                        </span>
                                      </div>
                                      {/* Status, Hardening, or VT Inputs */}
                                      {(() => {
                                        // Debug logging
                                        if (testCase.testId === 'VT-0001') {
                                          console.log('VT-0001 Debug:', {
                                            testId: testCase.testId,
                                            scope: testCase.scope,
                                            startsWithVT: testCase.testId.startsWith('VT-'),
                                            testCase: testCase
                                          });
                                        }
                                        return null;
                                      })()}
                                      {testCase.testId && testCase.testId.startsWith('CH-') && testCase.scope === 'Hardening' ? (
                                        // Hardening test case - show volume and date inputs
                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              Volume
                                            </label>
                                            <input
                                              type="text"
                                              value={testCase.chVolume || ''}
                                              onChange={(e) => handleHardeningVolumeChange(testCase.testId, e.target.value)}
                                              placeholder="Enter volume"
                                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              Date
                                            </label>
                                            <input
                                              type="date"
                                              value={testCase.chDate || ''}
                                              onChange={(e) => handleHardeningDateChange(testCase.testId, e.target.value)}
                                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                          </div>
                                        </div>
                                      ) : testCase.testId && testCase.testId.startsWith('VT-') ? (
                                        // VT test case - show volume, date, start time, end time, availability inputs + status
                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              Volume
                                            </label>
                                            <input
                                              type="text"
                                              value={testCase.vtVolume || ''}
                                              onChange={(e) => handleVtVolumeChange(testCase.testId, e.target.value)}
                                              placeholder="Enter volume"
                                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              Date
                                            </label>
                                            <input
                                              type="date"
                                              value={testCase.vtDate || ''}
                                              onChange={(e) => handleVtDateChange(testCase.testId, e.target.value)}
                                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              Start Time
                                            </label>
                                            <input
                                              type="time"
                                              value={testCase.vtStartTime || ''}
                                              onChange={(e) => handleVtStartTimeChange(testCase.testId, e.target.value)}
                                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              End Time
                                            </label>
                                            <input
                                              type="time"
                                              value={testCase.vtEndTime || ''}
                                              onChange={(e) => handleVtEndTimeChange(testCase.testId, e.target.value)}
                                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              Availability (%)
                                            </label>
                                            <input
                                              type="text"
                                              value={testCase.vtAvailability || ''}
                                              onChange={(e) => handleVtAvailabilityChange(testCase.testId, e.target.value)}
                                              placeholder="Enter percentage"
                                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              Status
                                            </label>
                                            <select
                                              value={testCase.status}
                                              onChange={(e) => handleStatusChange(testCase.testId, e.target.value)}
                                              className={`w-full px-2 py-2 rounded text-sm font-medium border focus:ring-1 focus:ring-blue-500 ${
                                                testCase.status === 'PASS' ? 'bg-green-100 text-green-800 border-green-300' :
                                                testCase.status === 'FAIL' ? 'bg-red-100 text-red-800 border-red-300' :
                                                testCase.status === 'BLOCKED' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                                testCase.status === 'NA' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                                                'bg-gray-100 text-gray-800 border-gray-300'
                                              }`}
                                            >
                                              <option value="NOT RUN">⏸️ NOT RUN</option>
                                              <option value="PASS">✅ PASS</option>
                                              <option value="FAIL">❌ FAIL</option>
                                              <option value="BLOCKED">🚫 BLOCKED</option>
                                              <option value="NA">N/A</option>
                                            </select>
                                          </div>
                                        </div>
                                      ) : (
                                        // Regular test case - show status dropdown
                                      <div>
                                        <select
                                          value={testCase.status}
                                          onChange={(e) => handleStatusChange(testCase.testId, e.target.value)}
                                          className={`w-full px-2 py-2 rounded text-sm font-medium border focus:ring-1 focus:ring-blue-500 ${
                                            testCase.status === 'PASS' ? 'bg-green-100 text-green-800 border-green-300' :
                                            testCase.status === 'FAIL' ? 'bg-red-100 text-red-800 border-red-300' :
                                            testCase.status === 'BLOCKED' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                            testCase.status === 'NA' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                                            'bg-gray-100 text-gray-800 border-gray-300'
                                          }`}
                                        >
                                          <option value="NOT RUN">⏸️ NOT RUN</option>
                                          <option value="PASS">✅ PASS</option>
                                          <option value="FAIL">❌ FAIL</option>
                                          <option value="BLOCKED">🚫 BLOCKED</option>
                                          <option value="NA">N/A</option>
                                        </select>
                                      </div>
                                      )}
                                      <div>
                                        <input
                                          type="text"
                                          value={testCaseNotes[testCase.testId] || ''}
                                          onChange={(e) => handleNoteChange(testCase.testId, e.target.value)}
                                          placeholder="Add notes..."
                                          className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Desktop Table Layout */}
                              <div className="hidden sm:block">
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                                          Test Case
                                        </th>
                                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                                          Test ID
                                        </th>
                                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                                          {firstCellTestCases.some(tc => tc.testId && tc.testId.startsWith('CH-') && tc.scope === 'Hardening') ? 'Data' : 
                                           firstCellTestCases.some(tc => tc.testId && tc.testId.startsWith('VT-')) ? 'VT Data' : 'Status'}
                                        </th>
                                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                                          Notes
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {firstCellTestCases.map((testCase, index) => (
                                        <tr key={testCase.testId} className="hover:bg-gray-50">
                                          <td className="px-2 py-2 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                              <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900">
                                                  <div>{testCase.testCase}</div>
                                                  <button
                                                    onClick={() => openHelpModal(testCase)}
                                                    className="text-blue-500 hover:text-blue-700 transition-colors text-xs underline mt-1 block"
                                                    title="View test case details"
                                                  >
                                                    Help
                                                  </button>
                                                </div>
                                                {/* Scope Badge */}
                                                <div className="mt-1">
                                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScopeBadgeColor(testCase.scope)}`}>
                                                    {testCase.scope}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-2 py-2 whitespace-nowrap">
                                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-mono">
                                              {testCase.testId}
                                            </span>
                                          </td>
                                          <td className="px-2 py-2">
                                            {testCase.testId && testCase.testId.startsWith('CH-') && testCase.scope === 'Hardening' ? (
                                              // Hardening test case - show volume and date inputs with labels
                                              <div className="space-y-3">
                                                <div>
                                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Volume
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={testCase.chVolume || ''}
                                                    onChange={(e) => handleHardeningVolumeChange(testCase.testId, e.target.value)}
                                                    placeholder="Enter volume"
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Date
                                                  </label>
                                                  <input
                                                    type="date"
                                                    value={testCase.chDate || ''}
                                                    onChange={(e) => handleHardeningDateChange(testCase.testId, e.target.value)}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                  />
                                                </div>
                                              </div>
                                            ) : testCase.testId && testCase.testId.startsWith('VT-') ? (
                                              // VT test case - show volume, date, start time, end time, availability inputs + status with labels
                                              <div className="space-y-3">
                                                <div>
                                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Volume
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={testCase.vtVolume || ''}
                                                    onChange={(e) => handleVtVolumeChange(testCase.testId, e.target.value)}
                                                    placeholder="Enter volume"
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Date
                                                  </label>
                                                  <input
                                                    type="date"
                                                    value={testCase.vtDate || ''}
                                                    onChange={(e) => handleVtDateChange(testCase.testId, e.target.value)}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Start Time
                                                  </label>
                                                  <input
                                                    type="time"
                                                    value={testCase.vtStartTime || ''}
                                                    onChange={(e) => handleVtStartTimeChange(testCase.testId, e.target.value)}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    End Time
                                                  </label>
                                                  <input
                                                    type="time"
                                                    value={testCase.vtEndTime || ''}
                                                    onChange={(e) => handleVtEndTimeChange(testCase.testId, e.target.value)}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Availability (%)
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={testCase.vtAvailability || ''}
                                                    onChange={(e) => handleVtAvailabilityChange(testCase.testId, e.target.value)}
                                                    placeholder="Enter percentage"
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Status
                                                  </label>
                                                  <select
                                                    value={testCase.status}
                                                    onChange={(e) => handleStatusChange(testCase.testId, e.target.value)}
                                                    className={`w-full px-2 py-1 rounded text-sm font-medium border focus:ring-1 focus:ring-blue-500 ${
                                                      testCase.status === 'PASS' ? 'bg-green-100 text-green-800 border-green-300' :
                                                      testCase.status === 'FAIL' ? 'bg-red-100 text-red-800 border-red-300' :
                                                      testCase.status === 'BLOCKED' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                                      testCase.status === 'NA' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                                                      'bg-gray-100 text-gray-800 border-gray-300'
                                                    }`}
                                                  >
                                                    <option value="NOT RUN">⏸️ NOT RUN</option>
                                                    <option value="PASS">✅ PASS</option>
                                                    <option value="FAIL">❌ FAIL</option>
                                                    <option value="BLOCKED">🚫 BLOCKED</option>
                                                    <option value="NA">N/A</option>
                                                  </select>
                                                </div>
                                              </div>
                                            ) : (
                                              // Regular test case - show status dropdown
                                            <select
                                              value={testCase.status}
                                              onChange={(e) => handleStatusChange(testCase.testId, e.target.value)}
                                              className={`px-2 py-1 rounded text-sm font-medium border focus:ring-1 focus:ring-blue-500 ${
                                                testCase.status === 'PASS' ? 'bg-green-100 text-green-800 border-green-300' :
                                                testCase.status === 'FAIL' ? 'bg-red-100 text-red-800 border-red-300' :
                                                testCase.status === 'BLOCKED' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                                testCase.status === 'NA' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                                                'bg-gray-100 text-gray-800 border-gray-300'
                                              }`}
                                            >
                                              <option value="NOT RUN">⏸️ NOT RUN</option>
                                              <option value="PASS">✅ PASS</option>
                                              <option value="FAIL">❌ FAIL</option>
                                              <option value="BLOCKED">🚫 BLOCKED</option>
                                              <option value="NA">N/A</option>
                                            </select>
                                            )}
                                          </td>
                                          <td className="px-2 py-2">
                                            <input
                                              type="text"
                                              value={testCaseNotes[testCase.testId] || ''}
                                              onChange={(e) => handleNoteChange(testCase.testId, e.target.value)}
                                              placeholder="Add notes..."
                                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Individual Cells */}
                    {Object.entries(cellTypeGroup.cells).map(([cellName, cellData]) => (
                      <div key={`${cellTypeGroup.cellType}-${cellName}`} className="border-b border-gray-100 last:border-b-0">
                        {/* Cell Header */}
                        <button
                          onClick={() => toggleCell(cellTypeGroup.cellType, cellName)}
                          className="w-full bg-gray-50 p-3 sm:p-4 hover:bg-gray-100 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 border border-gray-300 rounded-md"
                        >
                          <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                            <div className="text-left flex-1 min-w-0">
                              <h5 className="font-medium text-gray-900 text-sm leading-tight">
                                {cellName}
                              </h5>
                              <p className="text-xs text-gray-600 leading-tight">
                                {cellData.testCases.length} test cases
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4 w-full sm:w-auto">
                            {/* Cell Status Summary */}
                            <div className="flex items-center space-x-1 sm:space-x-3 text-xs sm:text-sm">
                              <span className="text-green-600 font-medium">{cellData.passedCount}✅</span>
                              <span className="text-red-600 font-medium">{cellData.failedCount}❌</span>
                              <span className="text-orange-600 font-medium">{cellData.blockedCount}🚫</span>
                              <span className="text-gray-600 font-medium">{cellData.notRunCount}⏸️</span>
                              <span className="text-slate-600 font-medium">{cellData.naCount}N/A</span>
                            </div>
                            

                          </div>
                        </button>

                        {/* Cell Content - Test Cases */}
                        {expandedCell === `${cellTypeGroup.cellType}-${cellName}` && (
                          <div className="border-t border-gray-200 bg-white">
                            {(() => {
                              // Group test cases by scope
                              const testCasesByScope = cellData.testCases.reduce((acc, testCase) => {
                                const scope = testCase.scope || 'Unknown';
                                if (!acc[scope]) {
                                  acc[scope] = [];
                                }
                                acc[scope].push(testCase);
                                return acc;
                              }, {});

                              return Object.entries(testCasesByScope)
                                .sort(([scopeA], [scopeB]) => scopeA.localeCompare(scopeB)) // Sort scopes alphabetically
                                .map(([scope, scopeTestCases]) => {
                                const scopeKey = `${cellTypeGroup.cellType}-${cellName}-${scope}`;
                                const isScopeExpanded = expandedScopes[scopeKey];
                                
                                // Calculate scope statistics
                                const scopeStats = scopeTestCases.reduce((stats, testCase) => {
                                  switch (testCase.status) {
                                    case 'PASS': stats.passed++; break;
                                    case 'FAIL': stats.failed++; break;
                                    case 'BLOCKED': stats.blocked++; break;
                                    case 'NA': stats.na++; break;
                                    default: stats.notRun++; break;
                                  }
                                  return stats;
                                }, { passed: 0, failed: 0, blocked: 0, notRun: 0, na: 0 });

                                return (
                                  <div key={scopeKey} className="border-b border-gray-100 last:border-b-0 ml-4 sm:ml-6">
                                    {/* Scope Header */}
                                    <button
                                      onClick={() => toggleScope(cellTypeGroup.cellType, cellName, scope)}
                                      className="w-full text-left bg-blue-50 hover:bg-blue-100 transition-colors p-2 sm:p-3 border-l-4 border-blue-400 pl-3 sm:pl-4 rounded-r-md shadow-sm"
                                    >
                                      <div className="flex items-center justify-between space-x-2 sm:space-x-4">
                                        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                                          <div className="w-4 h-4 rounded-sm bg-blue-500 flex items-center justify-center flex-shrink-0">
                                            <span className="text-white text-xs">📋</span>
                                          </div>
                                          <div className="text-left flex-1 min-w-0">
                                            <h6 className="font-medium text-gray-800 text-sm leading-tight">
                                              {scope}
                                            </h6>
                                            <p className="text-xs text-gray-500 leading-tight">
                                              {scopeTestCases.length} test cases
                                            </p>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4 w-full sm:w-auto">
                                          {/* Scope Status Summary */}
                                          <div className="flex items-center space-x-1 sm:space-x-3 text-xs sm:text-sm">
                                            <span className="text-green-600 font-medium">{scopeStats.passed}✅</span>
                                            <span className="text-red-600 font-medium">{scopeStats.failed}❌</span>
                                            <span className="text-orange-600 font-medium">{scopeStats.blocked}🚫</span>
                                            <span className="text-gray-600 font-medium">{scopeStats.notRun}⏸️</span>
                                            <span className="text-slate-600 font-medium">{scopeStats.na}N/A</span>
                                          </div>
                                          
                                          {/* Expand/Collapse Indicator */}
                                          <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs transform transition-transform duration-200">
                                              {isScopeExpanded ? '−' : '+'}
                              </span>
                                          </div>
                            </div>
                          </div>
                        </button>

                                    {/* Scope Content - Test Cases */}
                                    {isScopeExpanded && (
                                      <div className="border-t border-blue-200 bg-gradient-to-r from-blue-50 to-white ml-4 sm:ml-6 mr-2 rounded-b-md">
                    {/* Mobile: Card Layout, Desktop: Table Layout */}
                    <div className="block sm:hidden">
                      {/* Mobile Card Layout */}
                                          <div className="divide-y divide-gray-200 p-2">
                                            {scopeTestCases.map((testCase, index) => (
                          <div key={testCase.testId} className="p-3 space-y-3 bg-white rounded border border-gray-100 shadow-sm mx-2 my-2">
                                                        {/* Test Case Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm">
                                  <div className="truncate">{testCase.testCase}</div>
                                  <button
                                    onClick={() => openHelpModal(testCase)}
                                    className="text-blue-500 hover:text-blue-700 transition-colors text-xs underline mt-1"
                                    title="View test case details"
                                  >
                                    Help
                                  </button>
                                </div>
                                {/* Scope Badge */}
                                <div className="mt-1">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScopeBadgeColor(testCase.scope)}`}>
                                    {testCase.scope}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Test ID */}
                            <div>
                              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-mono">
                                {testCase.testId}
                              </span>
                            </div>
                            
                            {/* Status, Hardening, or VT Inputs */}
                            {testCase.testId && testCase.testId.startsWith('CH-') && testCase.scope === 'Hardening' ? (
                              // Hardening test case - show volume and date inputs
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Volume
                                  </label>
                                  <input
                                    type="text"
                                    value={testCase.chVolume || ''}
                                    onChange={(e) => handleHardeningVolumeChange(testCase.testId, e.target.value)}
                                    placeholder="Enter volume"
                                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Date
                                  </label>
                                  <input
                                    type="date"
                                    value={testCase.chDate || ''}
                                    onChange={(e) => handleHardeningDateChange(testCase.testId, e.target.value)}
                                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              </div>
                            ) : testCase.testId && testCase.testId.startsWith('VT-') ? (
                              // VT test case - show volume, date, start time, end time, availability inputs + status in two columns
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Volume
                                  </label>
                                  <input
                                    type="text"
                                    value={testCase.vtVolume || ''}
                                    onChange={(e) => handleVtVolumeChange(testCase.testId, e.target.value)}
                                    placeholder="Enter volume"
                                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Date
                                  </label>
                                  <input
                                    type="date"
                                    value={testCase.vtDate || ''}
                                    onChange={(e) => handleVtDateChange(testCase.testId, e.target.value)}
                                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Start Time
                                  </label>
                                  <input
                                    type="time"
                                    value={testCase.vtStartTime || ''}
                                    onChange={(e) => handleVtStartTimeChange(testCase.testId, e.target.value)}
                                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    End Time
                                  </label>
                                  <input
                                    type="time"
                                    value={testCase.vtEndTime || ''}
                                    onChange={(e) => handleVtEndTimeChange(testCase.testId, e.target.value)}
                                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Availability (%)
                                  </label>
                                  <input
                                    type="text"
                                    value={testCase.vtAvailability || ''}
                                    onChange={(e) => handleVtAvailabilityChange(testCase.testId, e.target.value)}
                                    placeholder="Enter percentage"
                                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Status
                                  </label>
                                  <select
                                    value={testCase.status}
                                    onChange={(e) => handleStatusChange(testCase.testId, e.target.value)}
                                    className={`w-full px-2 py-2 rounded text-sm font-medium border focus:ring-1 focus:ring-blue-500 ${
                                      testCase.status === 'PASS' ? 'bg-green-100 text-green-800 border-green-300' :
                                      testCase.status === 'FAIL' ? 'bg-red-100 text-red-800 border-red-300' :
                                      testCase.status === 'BLOCKED' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                      testCase.status === 'NA' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                                      'bg-gray-100 text-gray-800 border-gray-300'
                                    }`}
                                  >
                                    <option value="NOT RUN">⏸️ NOT RUN</option>
                                    <option value="PASS">✅ PASS</option>
                                    <option value="FAIL">❌ FAIL</option>
                                    <option value="BLOCKED">🚫 BLOCKED</option>
                                    <option value="NA">N/A</option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              // Regular test case - show status dropdown
                            <div>
                              <select
                                value={testCase.status}
                                onChange={(e) => handleStatusChange(testCase.testId, e.target.value)}
                                className={`w-full px-2 py-2 rounded text-sm font-medium border focus:ring-1 focus:ring-blue-500 ${
                                  testCase.status === 'PASS' ? 'bg-green-100 text-green-800 border-green-300' :
                                  testCase.status === 'FAIL' ? 'bg-red-100 text-red-800 border-red-300' :
                                  testCase.status === 'BLOCKED' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                  testCase.status === 'NA' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                                  'bg-gray-100 text-gray-800 border-gray-300'
                                }`}
                              >
                                <option value="NOT RUN">⏸️ NOT RUN</option>
                                <option value="PASS">✅ PASS</option>
                                <option value="FAIL">❌ FAIL</option>
                                <option value="BLOCKED">🚫 BLOCKED</option>
                                <option value="NA">N/A</option>
                              </select>
                            </div>
                            )}
                            
                            {/* Notes */}
                            <div>
                                    <input
                                type="text"
                                value={testCaseNotes[testCase.testId] || ''}
                                onChange={(e) => handleNoteChange(testCase.testId, e.target.value)}
                                placeholder="Add notes..."
                                className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                            {/* Desktop Table Layout */}
                            <div className="hidden sm:block">
                              <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                                                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                              Test Case
                            </th>
                                                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                                        Test ID
                            </th>
                                                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                              {scopeTestCases.some(tc => tc.testId && tc.testId.startsWith('CH-') && tc.scope === 'Hardening') ? 'Data' : 
                               scopeTestCases.some(tc => tc.testId && tc.testId.startsWith('VT-')) ? 'VT Data' : 'Status'}
                            </th>
                                                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                                        Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                                                {scopeTestCases.map((testCase, index) => (
                                      <tr key={testCase.testId} className="hover:bg-gray-50">
                                        <td className="px-2 py-2 whitespace-nowrap">
                                          <div className="flex items-center space-x-2">
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm font-medium text-gray-900">
                                                <div>{testCase.testCase}</div>
                                            <button
                                              onClick={() => openHelpModal(testCase)}
                                                  className="text-blue-500 hover:text-blue-700 transition-colors text-xs underline mt-1 block"
                                              title="View test case details"
                                            >
                                                  Help
                                            </button>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap">
                                          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-mono">
                                  {testCase.testId}
                                </span>
                              </td>
                                        <td className="px-2 py-2">
                                          {testCase.testId && testCase.testId.startsWith('CH-') && testCase.scope === 'Hardening' ? (
                                            // Hardening test case - show volume and date inputs with labels
                                            <div className="space-y-3">
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                  Volume
                                                </label>
                                                <input
                                                  type="text"
                                                  value={testCase.chVolume || ''}
                                                  onChange={(e) => handleHardeningVolumeChange(testCase.testId, e.target.value)}
                                                  placeholder="Enter volume"
                                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                  Date
                                                </label>
                                                <input
                                                  type="date"
                                                  value={testCase.chDate || ''}
                                                  onChange={(e) => handleHardeningDateChange(testCase.testId, e.target.value)}
                                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                              </div>
                                            </div>
                                          ) : testCase.testId && testCase.testId.startsWith('VT-') ? (
                                            // VT test case - show volume, date, start time, end time, availability inputs + status with labels in two columns
                                            <div className="grid grid-cols-2 gap-3">
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                  Volume
                                                </label>
                                                <input
                                                  type="text"
                                                  value={testCase.vtVolume || ''}
                                                  onChange={(e) => handleVtVolumeChange(testCase.testId, e.target.value)}
                                                  placeholder="Enter volume"
                                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                  Date
                                                </label>
                                                <input
                                                  type="date"
                                                  value={testCase.vtDate || ''}
                                                  onChange={(e) => handleVtDateChange(testCase.testId, e.target.value)}
                                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                  Start Time
                                                </label>
                                                <input
                                                  type="time"
                                                  value={testCase.vtStartTime || ''}
                                                  onChange={(e) => handleVtStartTimeChange(testCase.testId, e.target.value)}
                                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                  End Time
                                                </label>
                                                <input
                                                  type="time"
                                                  value={testCase.vtEndTime || ''}
                                                  onChange={(e) => handleVtEndTimeChange(testCase.testId, e.target.value)}
                                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                  Availability (%)
                                                </label>
                                                <input
                                                  type="text"
                                                  value={testCase.vtAvailability || ''}
                                                  onChange={(e) => handleVtAvailabilityChange(testCase.testId, e.target.value)}
                                                  placeholder="Enter percentage"
                                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                  Status
                                                </label>
                                                <select
                                                  value={testCase.status}
                                                  onChange={(e) => handleStatusChange(testCase.testId, e.target.value)}
                                                  className={`w-full px-2 py-1 rounded text-sm font-medium border focus:ring-1 focus:ring-blue-500 ${
                                                    testCase.status === 'PASS' ? 'bg-green-100 text-green-800 border-green-300' :
                                                    testCase.status === 'FAIL' ? 'bg-red-100 text-red-800 border-red-300' :
                                                    testCase.status === 'BLOCKED' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                                    testCase.status === 'NA' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                                                    'bg-gray-100 text-gray-800 border-gray-300'
                                                  }`}
                                                >
                                                  <option value="NOT RUN">⏸️ NOT RUN</option>
                                                  <option value="PASS">✅ PASS</option>
                                                  <option value="FAIL">❌ FAIL</option>
                                                  <option value="BLOCKED">🚫 BLOCKED</option>
                                                  <option value="NA">N/A</option>
                                                </select>
                                              </div>
                                            </div>
                                          ) : (
                                            // Regular test case - show status dropdown
                                <select
                                  value={testCase.status}
                                  onChange={(e) => handleStatusChange(testCase.testId, e.target.value)}
                                            className={`px-2 py-1 rounded text-sm font-medium border focus:ring-1 focus:ring-blue-500 ${
                                    testCase.status === 'PASS' ? 'bg-green-100 text-green-800 border-green-300' :
                                    testCase.status === 'FAIL' ? 'bg-red-100 text-red-800 border-red-300' :
                                    testCase.status === 'BLOCKED' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                    testCase.status === 'NA' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                                    'bg-gray-100 text-gray-800 border-gray-300'
                                  }`}
                                >
                                  <option value="NOT RUN">⏸️ NOT RUN</option>
                                  <option value="PASS">✅ PASS</option>
                                  <option value="FAIL">❌ FAIL</option>
                                  <option value="BLOCKED">🚫 BLOCKED</option>
                                  <option value="NA">N/A</option>
                                </select>
                                          )}
                              </td>
                                                    <td className="px-2 py-2">
                                          <input
                                            type="text"
                                            value={testCaseNotes[testCase.testId] || ''}
                                            onChange={(e) => handleNoteChange(testCase.testId, e.target.value)}
                                            placeholder="Add notes..."
                                            className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                          />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                              </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No Test Cases Message */}
        {!loading && testCases.length === 0 && selectedSite && selectedPhase && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
              </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No test cases found</h3>
            <p className="text-gray-500">No test cases are available for the selected site and phase combination.</p>
                </div>
        )}

        {/* Help Modal */}
        {showHelpModal && selectedTestCase && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Test Case Details</h3>
                <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Description:</label>
                    <p className="text-sm text-gray-900">{selectedTestCase.description || 'No description available'}</p>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">Requirements:</label>
                    <p className="text-sm text-gray-900">{selectedTestCase.requirements || 'No requirements available'}</p>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">Steps:</label>
                    <p className="text-sm text-gray-900">{selectedTestCase.steps || 'No steps available'}</p>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">Image:</label>
                    {selectedTestCase.image ? (
                      <img 
                        src={selectedTestCase.image} 
                        alt="Test case image" 
                        className="mt-2 max-w-full h-auto rounded border"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <p className="text-sm text-gray-500" style={{display: selectedTestCase.image ? 'none' : 'block'}}>
                      No image available
                    </p>
                </div>
                  </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={closeHelpModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Close
                  </button>
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Testing; 



