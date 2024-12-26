const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllSpecializations,
  addSpecialization,
  updateSpecialization,
  deleteSpecialization
} = require('../controllers/specializationController');

// Public routes
router.get('/', getAllSpecializations);

// Admin routes
router.post('/', protect, authorize('admin'), addSpecialization);
router.put('/:id', protect, authorize('admin'), updateSpecialization);
router.delete('/:id', protect, authorize('admin'), deleteSpecialization);

module.exports = router;