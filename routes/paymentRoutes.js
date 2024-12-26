const express = require('express');
const router = express.Router();
const {
  getPaymentHistory,
  addPayment,
  getPayment,
  exportPayments,
  getRecentPayments,
  requestRefund,
  generateBill,
  getPatientBillingHistory,
  updateBill,
  processBillPayment,
  processPayment,
  getPaymentReceipt,
  getBillPayments,
  voidPayment,
  downloadReceiptPDF,
  previewReceiptPDF,
  getPaymentStats,
  processRefund,
  getRefundHistory,
  getRefundDetails
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/history')
  .get(getPaymentHistory);

router.route('/export')
  .get(exportPayments);

router.route('/')
  .post(addPayment);

router.route('/:id')
  .get(getPayment);

router.get(
  '/recent',
  protect,
  authorize('patient'),
  getRecentPayments
);

router.post(
  '/:id/refund-request',
  protect,
  authorize('patient'),
  requestRefund
);

router.post('/billing/generate', protect, authorize('receptionist'), generateBill);
router.get('/billing/patient/:patientId', protect, authorize('receptionist', 'admin'), getPatientBillingHistory);
router.put('/billing/:id', protect, authorize('receptionist'), updateBill);
router.post('/billing/:id/payment', protect, authorize('receptionist'), processBillPayment);

router.post('/process', protect, authorize('receptionist'), processPayment);
router.get('/receipt/:id', protect, authorize('receptionist', 'admin'), getPaymentReceipt);
router.get('/bill/:billId', protect, authorize('receptionist', 'admin'), getBillPayments);
router.post('/:id/void', protect, authorize('admin'), voidPayment);

router.get(
  '/receipt/:id/pdf',
  protect,
  authorize('receptionist', 'admin'),
  downloadReceiptPDF
);

router.get(
  '/receipt/:id/preview',
  protect,
  authorize('receptionist', 'admin'),
  previewReceiptPDF
);

router.get(
  '/stats',
  protect,
  authorize('receptionist', 'admin'),
  getPaymentStats
);

router.post(
  '/:id/refund',
  protect,
  authorize('receptionist'),
  processRefund
);

router.get(
  '/refunds',
  protect,
  authorize('receptionist', 'admin'),
  getRefundHistory
);

router.get(
  '/refunds/:id',
  protect,
  authorize('receptionist', 'admin'),
  getRefundDetails
);

module.exports = router;