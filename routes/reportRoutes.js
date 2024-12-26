const express = require('express');
const router = express.Router();
const {
  generateReport,
  exportReport,
  getAppointmentStats,
  exportAppointmentStats,
  getRevenueStats,
  exportRevenueStats,
  getQueueAnalytics,
  exportQueueAnalytics,
  getDoctorStats,
  exportDoctorStats,
  getDoctorsList,
  generateInventoryReport,
  generateStockValuation,
  generateCustomReport
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/generate', generateReport);
router.get('/export', exportReport);

// Appointment Statistics routes
router.get(
  '/appointment-stats',
  protect,
  authorize('admin', 'receptionist'),
  getAppointmentStats
);

router.get(
  '/appointment-stats/export',
  protect,
  authorize('admin', 'receptionist'),
  exportAppointmentStats
);

// Revenue Statistics routes
router.get(
  '/revenue-stats',
  protect,
  authorize('admin', 'receptionist'),
  getRevenueStats
);

router.get(
  '/revenue-stats/export',
  protect,
  authorize('admin', 'receptionist'),
  exportRevenueStats
);

// Queue Analytics routes
router.get(
  '/queue-analytics',
  protect,
  authorize('admin', 'receptionist'),
  getQueueAnalytics
);

router.get(
  '/queue-analytics/export',
  protect,
  authorize('admin', 'receptionist'),
  exportQueueAnalytics
);

// Doctor Statistics routes
router.get(
  '/doctor-stats',
  protect,
  authorize('admin', 'receptionist'),
  getDoctorStats
);

router.get(
  '/doctor-stats/export',
  protect,
  authorize('admin', 'receptionist'),
  exportDoctorStats
);

router.get(
  '/doctors',
  protect,
  authorize('admin', 'receptionist'),
  getDoctorsList
);

// New inventory report routes
router.get(
  '/inventory',
  authorize('admin', 'pharmacist'),
  generateInventoryReport
);

router.get(
  '/stock-valuation',
  authorize('admin', 'pharmacist'),
  generateStockValuation
);

router.get(
  '/inventory/export',
  authorize('admin', 'pharmacist'),
  generateInventoryReport
);

router.post(
  '/custom',
  authorize('admin'),
  generateCustomReport
);

module.exports = router;