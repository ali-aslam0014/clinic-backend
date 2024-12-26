const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getLowStockMedicines,
  getExpiringMedicines,
  updateStock,
  getStockHistory,
  getMedicineStatistics,
  updateMedicineStock,
  getMedicineStockHistory
} = require('../controllers/medicineController');
const { protect, authorize } = require('../middleware/auth');


router.use(protect);
router.use(authorize('admin', 'pharmacist'));

router.get('/statistics', getMedicineStatistics);
router.get('/low-stock', getLowStockMedicines);
router.get('/expiring', getExpiringMedicines);

router.patch('/:id/stock', updateStock);
router.get('/:id/stock-history', getStockHistory);

router.route('/')
  .get(getMedicines)
  .post(authorize('admin'), createMedicine);

router.route('/:id')
  .get(getMedicine)
  .put(authorize('admin'), updateMedicine)
  .delete(authorize('admin'), deleteMedicine);

router.put('/:id/stock', protect, authorize('pharmacist'), updateMedicineStock);
router.get('/:id/stock-history', protect, authorize('pharmacist'), getMedicineStockHistory);

module.exports = router;