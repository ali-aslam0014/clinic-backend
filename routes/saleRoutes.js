const express = require('express');
const router = express.Router();
const {
  createSale,
  getSales,
  getSale,
  getRecentSales,
  cancelSale,
  getDailySalesReport,
  returnSale
} = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin', 'pharmacist'));

router.route('/')
  .get(getSales)
  .post(createSale);

router.route('/recent')
  .get(getRecentSales);

router.route('/daily-report')
  .get(getDailySalesReport);

router.route('/:id')
  .get(getSale);

router.route('/:id/cancel')
  .put(cancelSale);

router.route('/:id/return')
  .put(returnSale);

module.exports = router;