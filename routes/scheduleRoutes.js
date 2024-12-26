const express = require('express');
const router = express.Router();
const {
  getAllSchedules,
  getDoctorSchedule,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  getAvailableSlots
} = require('../controllers/scheduleController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Schedule routes
router.route('/')
  .get(authorize('admin', 'doctor', 'receptionist'), getAllSchedules)
  .post(authorize('admin', 'doctor'), addSchedule);

router.route('/:id')
  .put(authorize('admin', 'doctor'), updateSchedule)
  .delete(authorize('admin', 'doctor'), deleteSchedule);

// Doctor specific routes
router.get('/doctor/:doctorId', getDoctorSchedule);

// Available slots route
router.get('/available-slots', getAvailableSlots);

module.exports = router;