const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/auth');
const {
    getDashboardData,
    getDashboardStats,
    getDoctorProfile,
    getRecentAppointments,
    getUpcomingAppointments,
    getMonthlyStats
} = require('../../controllers/doctor/dashboardController');

// Protect all routes & authorize only doctors
router.use(protect);
router.use(authorize('doctor'));

// Main dashboard route
router.get('/', getDashboardData);

// Doctor profile
router.get('/profile', getDoctorProfile);

// Appointment routes
router.get('/appointments/recent', getRecentAppointments);
router.get('/appointments/upcoming', getUpcomingAppointments);

// Statistics routes
router.get('/stats', getDashboardStats);
router.get('/stats/monthly', getMonthlyStats);

module.exports = router;