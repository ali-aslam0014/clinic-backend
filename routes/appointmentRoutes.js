const express = require('express');
const router = express.Router();
const { 
  getAllAppointments,
  getAppointmentsByStatus,
  getAppointmentsByDoctor,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAppointmentById,
  checkSlotAvailability,
  getDoctorSchedule,
  getAppointmentsByDateRange,
  checkInAppointment,
  cancelAppointment,
  completeAppointment,
  rescheduleAppointment,
  getAppointmentStats,
  getMyAppointments,
  bookAppointment,
  getAvailableSlots,
  getUpcomingAppointments,
  getPatientAppointmentStats,
  searchAppointments,
  getQueueByDate,
  getQueueStats,
  callNextPatient,
  createEmergencyAppointment,
  getEmergencyQueue,
  getEmergencyStats,
  getTodayAppointments,
  updateTodayAppointmentStatus,
  getTodayAppointmentStats,
  scheduleAppointment
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');

// Base route: /api/appointments
router.use(protect);

// Enhanced routes with query parameters
router.get('/', authorize('admin', 'doctor', 'receptionist'), getAllAppointments);
router.get('/stats', authorize('admin', 'doctor'), getAppointmentStats);
router.get('/status/:status', authorize('admin', 'doctor'), getAppointmentsByStatus);
router.get('/doctor/:doctorId', authorize('admin', 'doctor'), getAppointmentsByDoctor);

// Calendar and scheduling routes
router.get('/schedule/:doctorId', getDoctorSchedule);
router.get('/date-range', getAppointmentsByDateRange);
router.post('/check-slot', checkSlotAvailability);

// Appointment management routes
router.route('/:id')
  .get(getAppointmentById)
  .put(authorize('admin', 'doctor', 'receptionist'), updateAppointment)
  .delete(authorize('admin', 'doctor'), deleteAppointment);

router.post('/', authorize('admin', 'doctor', 'receptionist'), createAppointment);
router.put('/:id/check-in', authorize('admin', 'receptionist'), checkInAppointment);
router.put('/:id/cancel', cancelAppointment);
router.put('/:id/complete', authorize('admin', 'doctor'), completeAppointment);
router.put('/:id/reschedule', authorize('admin', 'doctor', 'receptionist'), rescheduleAppointment);

// Patient specific routes
router.get('/my-appointments', protect, authorize('patient'), getMyAppointments);
router.post('/book', authorize('patient'), bookAppointment);
router.get('/available-slots', protect, authorize('patient', 'receptionist', 'admin'), getAvailableSlots);

// Patient dashboard routes
router.get(
  '/upcoming',
  protect,
  authorize('patient'),
  getUpcomingAppointments
);

router.get(
  '/patient-stats',
  protect,
  authorize('patient'),
  getPatientAppointmentStats
);

// Check-in routes
router.put(
  '/:id/check-in',
  protect,
  authorize('admin', 'receptionist'),
  checkInAppointment
);

// Search route
router.get(
  '/search',
  protect,
  authorize('admin', 'receptionist'),
  searchAppointments
);

// Date range route
router.get(
  '/date-range',
  protect,
  authorize('admin', 'receptionist'),
  getAppointmentsByDateRange
);

// Queue Management Routes
router.get(
  '/queue',
  protect,
  authorize('admin', 'receptionist', 'doctor'),
  getQueueByDate
);

router.get(
  '/queue/stats',
  protect,
  authorize('admin', 'receptionist', 'doctor'),
  getQueueStats
);

router.put(
  '/:id/call-next',
  protect,
  authorize('admin', 'receptionist', 'doctor'),
  callNextPatient
);

router.put(
  '/:id/complete',
  protect,
  authorize('admin', 'doctor'),
  completeAppointment
);

// Emergency Routes
router.post(
  '/emergency',
  protect,
  authorize('admin', 'receptionist'),
  createEmergencyAppointment
);

router.get(
  '/emergency/queue',
  protect,
  authorize('admin', 'receptionist', 'doctor'),
  getEmergencyQueue
);

router.get(
  '/emergency/stats',
  protect,
  authorize('admin', 'receptionist', 'doctor'),
  getEmergencyStats
);

// Add these routes after existing routes
router.get(
  '/today',
  protect,
  authorize('receptionist', 'doctor', 'admin'),
  getTodayAppointments
);

router.put(
  '/today/:id/status',
  protect,
  authorize('receptionist'),
  updateTodayAppointmentStatus
);

router.get(
  '/today/stats',
  protect,
  authorize('receptionist', 'admin'),
  getTodayAppointmentStats
);

// Add these routes
router.post(
  '/schedule',
  protect,
  authorize('receptionist'),
  scheduleAppointment
);

router.get(
  '/available-slots',
  protect,
  authorize('patient', 'receptionist', 'admin'),
  getAvailableSlots
);

router.post(
  '/check-slot',
  protect,
  authorize('receptionist'),
  checkSlotAvailability
);

// Add these routes
router.put(
  '/:id/reschedule',
  protect,
  authorize('receptionist'),
  rescheduleAppointment
);

router.put(
  '/:id/cancel',
  protect,
  authorize('receptionist'),
  cancelAppointment
);

router.get(
  '/upcoming',
  protect,
  authorize('receptionist'),
  getUpcomingAppointments
);

module.exports = router;