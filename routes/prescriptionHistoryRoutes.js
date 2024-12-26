const express = require('express');
const router = express.Router();
const {
  getPrescriptionHistory,
  getVersionHistory,
  getPrescriptionStats
} = require('../controllers/prescriptionHistoryController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Get prescription history with filters
router.get('/', authorize('doctor', 'admin'), getPrescriptionHistory);

// Get version history of a prescription
router.get('/:id/history', authorize('doctor', 'admin'), getVersionHistory);

// Get prescription statistics
router.get('/stats', authorize('doctor', 'admin'), getPrescriptionStats);

module.exports = router;