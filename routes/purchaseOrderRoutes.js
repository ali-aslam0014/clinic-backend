const express = require('express');
const router = express.Router();
const {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder
} = require('../controllers/purchaseOrderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getPurchaseOrders)
  .post(createPurchaseOrder);

router.route('/:id')
  .get(getPurchaseOrder)
  .put(updatePurchaseOrder);

router.route('/:id/receive')
  .put(receivePurchaseOrder);

router.route('/:id/cancel')
  .put(cancelPurchaseOrder);

module.exports = router;