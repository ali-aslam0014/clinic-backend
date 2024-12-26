const express = require('express');
const router = express.Router();
const {
  updateStock,
  getStockHistory,
  getStockStatistics,
  getStockAlerts,
  getStockByMedicine,
  getStockMovement,
  adjustStock,
  exportStockReport,
  updateBatchStock
} = require('../controllers/stockController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin', 'pharmacist'));

router.route('/update')
  .post(updateStock);

router.route('/history')
  .get(getStockHistory);

router.route('/statistics')
  .get(getStockStatistics);

router.route('/alerts')
  .get(getStockAlerts);

router.route('/medicine/:medicineId')
  .get(getStockByMedicine);

router.route('/movement')
  .get(getStockMovement);

router.route('/adjust')
  .post(adjustStock);

router.route('/export')
  .get(authorize('admin'), exportStockReport);

router.route('/batch-update')
  .post(authorize('admin'), updateBatchStock);

module.exports = router;