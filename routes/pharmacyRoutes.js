const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getExpiringMedicines,
  getLowStockMedicines,
  getDashboardStats
} = require('../controllers/pharmacyController');

const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Public routes (still protected by JWT)
router.get('/medicines', getMedicines);
router.get('/medicines/:id', getMedicine);
router.get('/medicines/expiry', getExpiringMedicines);
router.get('/medicines/low-stock', getLowStockMedicines);
router.get('/dashboard/stats', protect, getDashboardStats);

// Admin/Pharmacist only routes
router.post('/medicines', authorize('admin', 'pharmacist'), createMedicine);
router.put('/medicines/:id', authorize('admin', 'pharmacist'), updateMedicine);
router.delete('/medicines/:id', authorize('admin', 'pharmacist'), deleteMedicine);

module.exports = router; 