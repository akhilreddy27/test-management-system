const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/ticketsController');

// GET /api/tickets - Get all tickets
router.get('/', async (req, res) => {
  try {
    await ticketsController.getAllTickets(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tickets/:id - Get a specific ticket by ID
router.get('/:id', async (req, res) => {
  try {
    await ticketsController.getTicketById(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tickets - Create a new ticket
router.post('/', async (req, res) => {
  try {
    await ticketsController.createTicket(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/tickets/:id - Update a ticket
router.put('/:id', async (req, res) => {
  try {
    await ticketsController.updateTicket(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/tickets/:id - Delete a ticket
router.delete('/:id', async (req, res) => {
  try {
    await ticketsController.deleteTicket(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tickets/status/:status - Get tickets by status
router.get('/status/:status', async (req, res) => {
  try {
    await ticketsController.getTicketsByStatus(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tickets/priority/:priority - Get tickets by priority
router.get('/priority/:priority', async (req, res) => {
  try {
    await ticketsController.getTicketsByPriority(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tickets/assignee/:assignee - Get tickets by assignee
router.get('/assignee/:assignee', async (req, res) => {
  try {
    await ticketsController.getTicketsByAssignee(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
