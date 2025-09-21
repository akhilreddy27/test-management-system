const excelService = require('../services/excelService');
const LoggingMiddleware = require('../middleware/loggingMiddleware');

class TicketsController {
  // Get all tickets
  async getAllTickets(req, res) {
    try {
      const tickets = excelService.readTickets();
      
      res.json({
        success: true,
        data: tickets,
        count: tickets.length
      });
    } catch (error) {
      console.error('Error getting tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving tickets',
        error: error.message
      });
    }
  }

  // Get a specific ticket by ID
  async getTicketById(req, res) {
    try {
      const { id } = req.params;
      const tickets = excelService.readTickets();
      const ticket = tickets.find(t => t.id === parseInt(id));
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }
      
      res.json({
        success: true,
        data: ticket
      });
    } catch (error) {
      console.error('Error getting ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving ticket',
        error: error.message
      });
    }
  }

  // Create a new ticket
  async createTicket(req, res) {
    try {
      const ticketData = req.body;
      
      // Validate required fields
      if (!ticketData.ticketId || !ticketData.title) {
        return res.status(400).json({
          success: false,
          message: 'Ticket ID and Title are required'
        });
      }
      
      // Add timestamp
      ticketData.createdAt = new Date().toISOString();
      ticketData.updatedAt = new Date().toISOString();
      
      const success = excelService.createTicket(ticketData);
      
      if (success) {
        LoggingMiddleware.logAction('CREATE_TICKET', `Created ticket: ${ticketData.ticketId}`, req);
        
        res.json({
          success: true,
          message: 'Ticket created successfully',
          data: ticketData
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to create ticket'
        });
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating ticket',
        error: error.message
      });
    }
  }

  // Update a ticket
  async updateTicket(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Add updated timestamp
      updateData.updatedAt = new Date().toISOString();
      
      const success = excelService.updateTicket(parseInt(id), updateData);
      
      if (success) {
        LoggingMiddleware.logAction('UPDATE_TICKET', `Updated ticket ID: ${id}`, req);
        
        res.json({
          success: true,
          message: 'Ticket updated successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Ticket not found or failed to update'
        });
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating ticket',
        error: error.message
      });
    }
  }

  // Delete a ticket
  async deleteTicket(req, res) {
    try {
      const { id } = req.params;
      
      const success = excelService.deleteTicket(parseInt(id));
      
      if (success) {
        LoggingMiddleware.logAction('DELETE_TICKET', `Deleted ticket ID: ${id}`, req);
        
        res.json({
          success: true,
          message: 'Ticket deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Ticket not found or failed to delete'
        });
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting ticket',
        error: error.message
      });
    }
  }

  // Get tickets by status
  async getTicketsByStatus(req, res) {
    try {
      const { status } = req.params;
      const tickets = excelService.readTickets();
      const filteredTickets = tickets.filter(ticket => ticket.status === status);
      
      res.json({
        success: true,
        data: filteredTickets,
        count: filteredTickets.length,
        status: status
      });
    } catch (error) {
      console.error('Error getting tickets by status:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving tickets by status',
        error: error.message
      });
    }
  }

  // Get tickets by priority
  async getTicketsByPriority(req, res) {
    try {
      const { priority } = req.params;
      const tickets = excelService.readTickets();
      const filteredTickets = tickets.filter(ticket => ticket.priority === priority);
      
      res.json({
        success: true,
        data: filteredTickets,
        count: filteredTickets.length,
        priority: priority
      });
    } catch (error) {
      console.error('Error getting tickets by priority:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving tickets by priority',
        error: error.message
      });
    }
  }

  // Get tickets by assignee
  async getTicketsByAssignee(req, res) {
    try {
      const { assignee } = req.params;
      const tickets = excelService.readTickets();
      const filteredTickets = tickets.filter(ticket => ticket.assignee === assignee);
      
      res.json({
        success: true,
        data: filteredTickets,
        count: filteredTickets.length,
        assignee: assignee
      });
    } catch (error) {
      console.error('Error getting tickets by assignee:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving tickets by assignee',
        error: error.message
      });
    }
  }
}

module.exports = new TicketsController();
