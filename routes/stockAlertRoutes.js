const express = require('express');
const router = express.Router();
const {
  getStockAlerts,
  updateMinStockLevel,
  getStockAlertHistory,
  createStockAlertNotification
} = require('../controllers/stockAlertController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/medicines/stock-alerts')
  .get(getStockAlerts);

router.route('/medicines/:id/min-stock')
  .put(updateMinStockLevel);

router.route('/stock-alerts/history')
  .get(getStockAlertHistory);

router.route('/stock-alerts/notify')
  .post(createStockAlertNotification);

module.exports = router;