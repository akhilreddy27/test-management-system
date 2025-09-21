import React, { useState, useEffect } from 'react';
import { ticketsAPI, setupAPI } from '../services/api';
import LoggingService from '../services/loggingService';
import { showSuccessToast, showErrorToast } from '../services/toastService';

const Tickets = ({ currentUser = 'Unknown' }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    site: '',
    ticketId: '',
    title: '',
    description: '',
    status: 'Open',
    priority: 'Medium',
    assignee: '',
    reporter: currentUser,
    date: new Date().toISOString().split('T')[0],
    tags: ''
  });
  
  const [editingTicket, setEditingTicket] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [availableSites, setAvailableSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const [siteSearchTerm, setSiteSearchTerm] = useState('');
  const [selectedSiteIndex, setSelectedSiteIndex] = useState(-1);

  // Status options
  const statusOptions = ['Open', 'In Progress', 'Resolved', 'Closed', 'Cancelled'];
  const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];

  useEffect(() => {
    loadTickets();
    loadSites();
    LoggingService.logPageView('tickets', currentUser);
  }, [currentUser]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSiteDropdownOpen && !event.target.closest('.site-dropdown-container')) {
        setIsSiteDropdownOpen(false);
        setSelectedSiteIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSiteDropdownOpen]);

  const loadSites = async () => {
    try {
      const response = await setupAPI.getSites();
      const sites = response.data.data || [];
      
      // Handle site info objects - create searchable site objects
      const siteObjects = sites.map(site => {
        if (typeof site === 'string') {
          return {
            label: site,
            value: site,
            network: site,
            dcNumber: '',
            city: '',
            state: ''
          };
        } else if (typeof site === 'object' && site !== null) {
          // For site info objects, create searchable object
          const network = site.Network || '';
          const dcNumber = site['DC Number'] || '';
          const city = site.City || '';
          const state = site.State || '';
          
          let label;
          if (city && dcNumber) {
            // Format: "Brookhaven - 1111" (City - DC Number)
            label = `${city} - ${dcNumber}`;
          } else if (network && dcNumber) {
            // Fallback if city missing
            label = `${network} - ${dcNumber}`;
          } else if (city) {
            label = city;
          } else if (network) {
            label = network;
          } else {
            label = JSON.stringify(site);
          }
          
          return {
            label: label,
            value: label,
            network: network,
            dcNumber: dcNumber,
            city: city,
            state: state,
            raw: site
          };
        }
        return {
          label: String(site),
          value: String(site),
          network: String(site),
          dcNumber: '',
          city: '',
          state: ''
        };
      });
      
      setAvailableSites(siteObjects);
    } catch (error) {
      console.error('Error loading sites:', error);
      setError('Failed to load sites');
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await ticketsAPI.getAll();
      setTickets(response.data.data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      setError('Failed to load tickets');
      showErrorToast('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.site) {
      showErrorToast('Please select a site');
      return;
    }
    
    if (!formData.ticketId || !formData.title) {
      showErrorToast('Ticket ID and Title are required');
      return;
    }
    
    try {
      setLoading(true);
      
      // Debug: Log the form data being submitted
      console.log('Submitting ticket data:', formData);
      
      if (editingTicket) {
        // Update existing ticket
        const response = await ticketsAPI.update(editingTicket.id, formData);
        console.log('Update response:', response);
        showSuccessToast('Ticket updated successfully');
        LoggingService.logDataChange('tickets', 'ticket_update', editingTicket.id, formData.ticketId, currentUser);
      } else {
        // Create new ticket
        const response = await ticketsAPI.create(formData);
        console.log('Create response:', response);
        showSuccessToast('Ticket created successfully');
        LoggingService.logDataChange('tickets', 'ticket_create', null, formData.ticketId, currentUser);
      }
      
      // Reset form and reload tickets
      setFormData({
        site: '',
        ticketId: '',
        title: '',
        description: '',
        status: 'Open',
        priority: 'Medium',
        assignee: '',
        reporter: currentUser,
        date: new Date().toISOString().split('T')[0],
        tags: ''
      });
      setEditingTicket(null);
      setShowForm(false);
      setSelectedSite('');
      await loadTickets();
      
    } catch (error) {
      console.error('Error saving ticket:', error);
      
      // Show more detailed error message
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save ticket';
      showErrorToast(`Failed to save ticket: ${errorMessage}`);
      setMessage(`Failed to save ticket: ${errorMessage}`);
      
      // Log the full error for debugging
      console.error('Full error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ticket) => {
    setEditingTicket(ticket);
      setFormData({
        site: ticket.site || '',
        ticketId: ticket.ticketId || '',
        title: ticket.title || '',
        description: ticket.description || '',
        status: ticket.status || 'Open',
        priority: ticket.priority || 'Medium',
        assignee: ticket.assignee || '',
        reporter: ticket.reporter || currentUser,
        date: ticket.date || new Date().toISOString().split('T')[0],
        tags: ticket.tags || ''
      });
      setSelectedSite(ticket.site || '');
      setSiteSearchTerm('');
      setIsSiteDropdownOpen(false);
    setShowForm(true);
  };

  const handleDelete = async (ticketId) => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
      try {
        setLoading(true);
        await ticketsAPI.delete(ticketId);
        showSuccessToast('Ticket deleted successfully');
        LoggingService.logDataChange('tickets', 'ticket_delete', ticketId, null, currentUser);
        await loadTickets();
      } catch (error) {
        console.error('Error deleting ticket:', error);
        showErrorToast('Failed to delete ticket');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      site: '',
      ticketId: '',
      title: '',
      description: '',
      status: 'Open',
      priority: 'Medium',
      assignee: '',
      reporter: currentUser,
      date: new Date().toISOString().split('T')[0],
      tags: ''
    });
    setEditingTicket(null);
    setShowForm(false);
    setSelectedSite('');
    setSiteSearchTerm('');
    setIsSiteDropdownOpen(false);
    setSelectedSiteIndex(-1);
  };

  // Filter sites based on search term
  const filteredSites = availableSites.filter(site => {
    if (!siteSearchTerm) return true;
    const searchLower = siteSearchTerm.toLowerCase();
    return (
      site.network.toLowerCase().includes(searchLower) ||
      site.dcNumber.toLowerCase().includes(searchLower) ||
      site.city.toLowerCase().includes(searchLower) ||
      site.state.toLowerCase().includes(searchLower) ||
      site.label.toLowerCase().includes(searchLower)
    );
  });

  // Filter tickets based on selected site
  const filteredTickets = filterSite 
    ? tickets.filter(ticket => ticket.site === filterSite)
    : tickets;

  // Helper function to get site label
  const getSiteLabel = (site) => {
    if (typeof site === 'string') return site;
    return site?.label || site?.value || String(site);
  };

  // Helper function to get site value
  const getSiteValue = (site) => {
    if (typeof site === 'string') return site;
    return site?.value || site?.label || String(site);
  };

  // Handle site selection
  const handleSiteSelect = (site) => {
    const siteValue = getSiteValue(site);
    setFormData(prev => ({ ...prev, site: siteValue }));
    setSelectedSite(siteValue);
    setIsSiteDropdownOpen(false);
    setSiteSearchTerm('');
    setSelectedSiteIndex(-1);
  };

  // Handle keyboard navigation in site dropdown
  const handleSiteKeyDown = (e) => {
    if (!isSiteDropdownOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsSiteDropdownOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSiteIndex(prev => 
          prev < filteredSites.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSiteIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSiteIndex >= 0 && filteredSites[selectedSiteIndex]) {
          handleSiteSelect(filteredSites[selectedSiteIndex]);
        }
        break;
      case 'Escape':
        setIsSiteDropdownOpen(false);
        setSelectedSiteIndex(-1);
        break;
    }
  };

  // Highlight search term in text
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Ticket Management
            </h1>
            <p className="text-gray-600">
              Create and manage tickets for issues, features, and tasks
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Create New Ticket
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('success') 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* Ticket Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingTicket ? 'Edit Ticket' : 'Create New Ticket'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Site Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site *
              </label>
              <div className="relative site-dropdown-container">
                <input
                  type="text"
                  name="site"
                  value={siteSearchTerm || formData.site}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSiteSearchTerm(value);
                    // Only update formData.site if it's a valid selection (not just typing)
                    // The actual site value will be set when user selects from dropdown
                    setIsSiteDropdownOpen(true);
                    setSelectedSiteIndex(-1);
                  }}
                  onFocus={() => setIsSiteDropdownOpen(true)}
                  onKeyDown={handleSiteKeyDown}
                  placeholder="Search by site name or DC number..."
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                {/* Dropdown arrow */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className={`h-5 w-5 text-gray-400 transform transition-transform ${
                      isSiteDropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Dropdown menu */}
                {isSiteDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredSites.length > 0 ? (
                      filteredSites.map((site, index) => (
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
                          <div className="flex flex-col">
                            <div className="font-medium">
                              {highlightSearchTerm(site.label, siteSearchTerm)}
                            </div>
                            {(site.network || site.state) && (
                              <div className="text-xs text-gray-500 mt-1">
                                {site.network && (
                                  <span className="inline-block bg-gray-100 px-2 py-1 rounded mr-2">
                                    {highlightSearchTerm(site.network, siteSearchTerm)}
                                  </span>
                                )}
                                {site.state && (
                                  <span className="text-gray-400">
                                    {highlightSearchTerm(site.state, siteSearchTerm)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        No sites found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ticket ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ticket ID *
                </label>
                <input
                  type="text"
                  name="ticketId"
                  value={formData.ticketId}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., TICKET-001"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of the ticket"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {priorityOptions.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignee
                </label>
                <input
                  type="text"
                  name="assignee"
                  value={formData.assignee}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Assigned to"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Detailed description of the ticket"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Comma-separated tags (e.g., bug, feature, urgent)"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : (editingTicket ? 'Update Ticket' : 'Create Ticket')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              All Tickets ({filteredTickets.length}{filterSite ? ` of ${tickets.length}` : ''})
            </h2>
            
            {/* Site Filter */}
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">
                Filter by Site:
              </label>
              <select
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Sites</option>
                {availableSites.map((site, index) => (
                  <option key={index} value={getSiteValue(site)}>
                    {getSiteLabel(site)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading && !tickets.length ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">
              {filterSite ? `No tickets found for site: ${filterSite}` : 'No tickets found. Create your first ticket above.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket, index) => (
                  <tr key={ticket.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.site || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ticket.ticketId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={ticket.title}>
                      {ticket.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.assignee || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(ticket)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(ticket.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
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

export default Tickets;
