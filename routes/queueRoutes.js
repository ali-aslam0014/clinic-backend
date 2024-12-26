const express = require('express');
const router = express.Router();
const {
  getDoctorQueue,
  addToQueue,
  updateQueueStatus,
  removeFromQueue,
  getQueueStats,
  getCurrentQueue,
  updateQueuePosition,
  getWaitTimeEstimation
} = require('../controllers/queueController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Queue routes
router.get('/doctor', authorize('admin', 'doctor', 'receptionist'), getDoctorQueue);
router.get('/stats', authorize('admin', 'doctor'), getQueueStats);
router.post('/', authorize('admin', 'receptionist'), addToQueue);
router.put('/:id/status', authorize('admin', 'doctor', 'receptionist'), updateQueueStatus);
router.delete('/:id', authorize('admin', 'doctor', 'receptionist'), removeFromQueue);
router.get('/current', authorize('admin', 'receptionist'), getCurrentQueue);
router.put('/:id/position', authorize('admin', 'receptionist'), updateQueuePosition);
router.get('/wait-time/:doctorId', authorize('admin', 'receptionist'), getWaitTimeEstimation);

module.exports = router;