const express = require('express');
const router = express.Router();
const {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  addPayment,
  getOverdueInvoices,
  getDueInvoices,
  getInvoicePayments,
  addInvoicePayment,
  sendPaymentReminder,
  generatePDF,
  emailInvoice
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getInvoices)
  .post(createInvoice);

router.route('/overdue')
  .get(getOverdueInvoices);

router.route('/:id')
  .get(getInvoice)
  .put(updateInvoice)
  .delete(deleteInvoice);

router.route('/:id/payments')
  .post(addPayment)
  .get(getInvoicePayments);

router.get('/due', getDueInvoices);

router.post('/:id/reminder', sendPaymentReminder);

router.get('/:id/pdf', generatePDF);
router.post('/:id/email', emailInvoice);

module.exports = router;