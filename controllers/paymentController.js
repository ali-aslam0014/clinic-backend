const asyncHandler = require('express-async-handler');
const moment = require('moment');
const Payment = require('../models/paymentModel');
const Invoice = require('../models/invoiceModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const moment = require('moment');
const excel = require('exceljs');
const Bill = require('../models/billModel');
const PDFGenerator = require('../utils/pdfGenerator');
const Refund = require('../models/refundModel');

// Helper functions (define these only once at the top)
const getPaymentStatusColor = (status) => {
    const colors = {
        'completed': '#52c41a',    // success green
        'pending': '#faad14',      // warning yellow
        'failed': '#ff4d4f',       // error red
        'refunded': '#1890ff',     // info blue
        'refund_pending': '#722ed1' // purple
    };
    return colors[status] || '#000000';
};

const isPaymentRefundable = (payment) => {
    const isWithin24Hours = moment().diff(moment(payment.paymentDate), 'hours') <= 24;
    return payment.status === 'completed' && isWithin24Hours;
};

const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'PKR'
    }).format(amount);
};

// @desc    Get payment history
// @route   GET /api/v1/admin/payments/history
// @access  Private/Admin
exports.getPaymentHistory = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, paymentMethod, search } = req.query;

  // Build query
  let query = {};

  // Date range filter
  if (startDate && endDate) {
    query.paymentDate = {
      $gte: moment(startDate).startOf('day').toDate(),
      $lte: moment(endDate).endOf('day').toDate()
    };
  }

  // Payment method filter
  if (paymentMethod && paymentMethod !== 'all') {
    query.paymentMethod = paymentMethod;
  }

  // Search filter
  if (search) {
    query.$or = [
      { transactionId: { $regex: search, $options: 'i' } },
      { 'invoice.invoiceNumber': { $regex: search, $options: 'i' } }
    ];
  }

  const payments = await Payment.find(query)
    .populate({
      path: 'invoice',
      select: 'invoiceNumber patientId totalAmount',
      populate: {
        path: 'patientId',
        select: 'name email phone'
      }
    })
    .populate('receivedBy', 'name')
    .sort('-paymentDate');

  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments
  });
});

// @desc    Add new payment
// @route   POST /api/v1/admin/payments
// @access  Private/Admin
exports.addPayment = asyncHandler(async (req, res, next) => {
  const { invoiceId, amount, paymentMethod } = req.body;

  // Check if invoice exists
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    return next(new ErrorResponse(`Invoice not found with id of ${invoiceId}`, 404));
  }

  // Validate payment amount
  const remainingAmount = invoice.totalAmount - invoice.paidAmount;
  if (amount > remainingAmount) {
    return next(new ErrorResponse(`Payment amount cannot exceed remaining amount of ${remainingAmount}`, 400));
  }

  // Create payment
  const payment = await Payment.create({
    ...req.body,
    receivedBy: req.user.id
  });

  // Update invoice paid amount
  invoice.paidAmount += amount;
  await invoice.save();

  // Populate payment details
  await payment.populate([
    {
      path: 'invoice',
      select: 'invoiceNumber patientId totalAmount',
      populate: {
        path: 'patientId',
        select: 'name email phone'
      }
    },
    {
      path: 'receivedBy',
      select: 'name'
    }
  ]);

  res.status(201).json({
    success: true,
    data: payment
  });
});

// @desc    Get payment details
// @route   GET /api/v1/admin/payments/:id
// @access  Private/Admin
exports.getPayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate({
      path: 'invoice',
      select: 'invoiceNumber patientId totalAmount',
      populate: {
        path: 'patientId',
        select: 'name email phone'
      }
    })
    .populate('receivedBy', 'name');

  if (!payment) {
    return next(new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Export payment history to Excel
// @route   GET /api/v1/admin/payments/export
// @access  Private/Admin
exports.exportPayments = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  // Fetch payments
  const payments = await Payment.find({
    paymentDate: {
      $gte: moment(startDate).startOf('day').toDate(),
      $lte: moment(endDate).endOf('day').toDate()
    }
  })
  .populate({
    path: 'invoice',
    select: 'invoiceNumber patientId totalAmount',
    populate: {
      path: 'patientId',
      select: 'name email phone'
    }
  })
  .populate('receivedBy', 'name')
  .sort('-paymentDate');

  // Create Excel workbook
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet('Payment History');

  // Add headers
  worksheet.columns = [
    { header: 'Transaction ID', key: 'transactionId', width: 20 },
    { header: 'Invoice Number', key: 'invoiceNumber', width: 15 },
    { header: 'Patient Name', key: 'patientName', width: 20 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    { header: 'Payment Date', key: 'paymentDate', width: 20 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Received By', key: 'receivedBy', width: 20 }
  ];

  // Add data
  payments.forEach(payment => {
    worksheet.addRow({
      transactionId: payment.transactionId,
      invoiceNumber: payment.invoice.invoiceNumber,
      patientName: payment.invoice.patientId.name,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: moment(payment.paymentDate).format('DD/MM/YYYY HH:mm'),
      status: payment.status,
      receivedBy: payment.receivedBy.name
    });
  });

  // Style headers
  worksheet.getRow(1).font = { bold: true };

  // Set response headers
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=payment_history_${moment().format('YYYY-MM-DD')}.xlsx`
  );

  // Send workbook
  await workbook.xlsx.write(res);
  res.end();
});

// @desc    Get recent payments for patient dashboard
// @route   GET /api/payments/recent
// @access  Private (Patient)
const getRecentPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({
    patientId: req.user._id
  })
  .populate('doctorId', 'name specialization profileImage')
  .populate('appointmentId', 'appointmentDate appointmentType')
  .sort({ paymentDate: -1 })
  .limit(5);

  // Enhance payments with additional information
  const enhancedPayments = payments.map(payment => {
    return {
      ...payment._doc,
      paymentDate: moment(payment.paymentDate).format('MMMM DD, YYYY'),
      statusColor: getPaymentStatusColor(payment.status),
      isRefundable: isPaymentRefundable(payment),
      timeAgo: moment(payment.paymentDate).fromNow(),
      formattedAmount: formatAmount(payment.amount)
    };
  });

  res.status(200).json({
    success: true,
    count: enhancedPayments.length,
    data: enhancedPayments
  });
});

// @desc    Generate new bill
// @route   POST /api/billing/generate
// @access  Private (Receptionist)
exports.generateBill = asyncHandler(async (req, res) => {
  const {
    patientId,
    items,
    paymentMethod,
    insuranceDetails,
    notes
  } = req.body;

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalDiscount = items.reduce((sum, item) => sum + (item.discount || 0), 0);
  const tax = subtotal * 0.15; // 15% tax
  const totalAmount = subtotal - totalDiscount + tax;

  // Generate invoice number (YYYYMMDD-XXX format)
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const lastBill = await Bill.findOne({}, {}, { sort: { 'invoiceNumber': -1 } });
  let sequence = '001';
  if (lastBill && lastBill.invoiceNumber) {
    const lastSequence = parseInt(lastBill.invoiceNumber.split('-')[1]);
    sequence = String(lastSequence + 1).padStart(3, '0');
  }
  const invoiceNumber = `${dateStr}-${sequence}`;

  // Set due date (15 days from bill date)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 15);

  // Create bill
  const bill = await Bill.create({
    patientId,
    invoiceNumber,
    billDate: date,
    dueDate,
    items: items.map(item => ({
      ...item,
      total: (item.unitPrice * item.quantity) - (item.discount || 0)
    })),
    subtotal,
    tax,
    discount: totalDiscount,
    totalAmount,
    paymentMethod,
    insuranceDetails,
    notes,
    generatedBy: req.user._id
  });

  await bill.populate('patientId', 'firstName lastName contactNumber email');

  res.status(201).json({
    success: true,
    data: bill
  });
});

// @desc    Get patient's billing history
// @route   GET /api/billing/patient/:patientId
// @access  Private (Receptionist)
exports.getPatientBillingHistory = asyncHandler(async (req, res) => {
  const bills = await Bill.find({ patientId: req.params.patientId })
    .populate('patientId', 'firstName lastName contactNumber')
    .populate('generatedBy', 'name')
    .sort('-billDate');

  res.status(200).json({
    success: true,
    count: bills.length,
    data: bills
  });
});

// @desc    Update bill
// @route   PUT /api/billing/:id
// @access  Private (Receptionist)
exports.updateBill = asyncHandler(async (req, res) => {
  let bill = await Bill.findById(req.params.id);

  if (!bill) {
    return next(new ErrorResponse(`Bill not found with id of ${req.params.id}`, 404));
  }

  // Don't allow updating if bill is paid
  if (bill.paymentStatus === 'paid') {
    return next(new ErrorResponse('Cannot update a paid bill', 400));
  }

  // Recalculate totals if items are updated
  if (req.body.items) {
    const subtotal = req.body.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const totalDiscount = req.body.items.reduce((sum, item) => sum + (item.discount || 0), 0);
    const tax = subtotal * 0.15;
    req.body.totalAmount = subtotal - totalDiscount + tax;
    req.body.subtotal = subtotal;
    req.body.discount = totalDiscount;
    req.body.tax = tax;
  }

  bill = await Bill.findByIdAndUpdate(
    req.params.id,
    { ...req.body, lastModifiedBy: req.user._id },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: bill
  });
});

// @desc    Process bill payment
// @route   POST /api/billing/:id/payment
// @access  Private (Receptionist)
exports.processBillPayment = asyncHandler(async (req, res) => {
  const { amount, paymentMethod } = req.body;
  const bill = await Bill.findById(req.params.id);

  if (!bill) {
    return next(new ErrorResponse(`Bill not found with id of ${req.params.id}`, 404));
  }

  // Validate payment amount
  const remainingAmount = bill.totalAmount - bill.paidAmount;
  if (amount > remainingAmount) {
    return next(new ErrorResponse(`Payment amount cannot exceed remaining amount of ${remainingAmount}`, 400));
  }

  // Update bill
  bill.paidAmount += amount;
  bill.paymentStatus = bill.paidAmount >= bill.totalAmount ? 'paid' : 'partial';
  bill.lastPaymentDate = new Date();
  await bill.save();

  // Create payment record
  const payment = await Payment.create({
    billId: bill._id,
    patientId: bill.patientId,
    amount,
    paymentMethod,
    transactionId: `PAY-${Date.now()}`,
    paymentDate: new Date(),
    receivedBy: req.user._id,
    status: 'Completed'
  });

  res.status(200).json({
    success: true,
    data: {
      bill,
      payment
    }
  });
});

// @desc    Process payment
// @route   POST /api/payments/process
// @access  Private (Receptionist)
exports.processPayment = asyncHandler(async (req, res, next) => {
  const { billId, amount, paymentMethod, cardDetails } = req.body;

  // Find bill
  const bill = await Bill.findById(billId);
  if (!bill) {
    return next(new ErrorResponse('Bill not found', 404));
  }

  // Validate payment amount
  const remainingAmount = bill.totalAmount - bill.paidAmount;
  if (amount > remainingAmount) {
    return next(new ErrorResponse(`Payment amount cannot exceed remaining amount of ${remainingAmount}`, 400));
  }

  // Create payment
  const payment = await Payment.create({
    billId,
    patientId: bill.patientId,
    amount,
    paymentMethod,
    cardDetails,
    transactionId: `TXN${Date.now()}`,
    processedBy: req.user._id,
    status: 'completed'
  });

  // Update bill
  bill.paidAmount += amount;
  bill.paymentStatus = bill.paidAmount >= bill.totalAmount ? 'paid' : 'partial';
  bill.lastPaymentDate = new Date();
  await bill.save();

  // Populate payment details
  await payment.populate([
    {
      path: 'billId',
      select: 'invoiceNumber totalAmount'
    },
    {
      path: 'patientId',
      select: 'firstName lastName contactNumber'
    },
    {
      path: 'processedBy',
      select: 'name'
    }
  ]);

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Get payment receipt
// @route   GET /api/payments/receipt/:id
// @access  Private (Receptionist)
exports.getPaymentReceipt = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate('billId', 'invoiceNumber totalAmount')
    .populate('patientId', 'firstName lastName contactNumber')
    .populate('processedBy', 'name');

  if (!payment) {
    return next(new ErrorResponse('Payment not found', 404));
  }

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Get bill payment history
// @route   GET /api/payments/bill/:billId
// @access  Private (Receptionist)
exports.getBillPayments = asyncHandler(async (req, res, next) => {
  const payments = await Payment.find({ billId: req.params.billId })
    .populate('processedBy', 'name')
    .sort('-paymentDate');

  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments
  });
});

// @desc    Void payment
// @route   POST /api/payments/:id/void
// @access  Private (Admin)
exports.voidPayment = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(new ErrorResponse('Payment not found', 404));
  }

  if (payment.status !== 'completed') {
    return next(new ErrorResponse('Can only void completed payments', 400));
  }

  // Update bill
  const bill = await Bill.findById(payment.billId);
  bill.paidAmount -= payment.amount;
  bill.paymentStatus = bill.paidAmount >= bill.totalAmount ? 'paid' : 'partial';
  await bill.save();

  // Update payment
  payment.status = 'voided';
  payment.notes = reason;
  await payment.save();

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Download receipt PDF
// @route   GET /api/payments/receipt/:id/pdf
// @access  Private (Receptionist, Admin)
exports.downloadReceiptPDF = asyncHandler(async (req, res, next) => {
  const receipt = await Payment.findById(req.params.id)
    .populate('patientId', 'firstName lastName contactNumber')
    .populate('billId')
    .populate('processedBy', 'name');

  if (!receipt) {
    return next(new ErrorResponse('Receipt not found', 404));
  }

  // Generate PDF
  const pdfGenerator = new PDFGenerator();
  const doc = await pdfGenerator.generateReceipt(receipt);

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Receipt-${receipt.receiptNumber}.pdf`);

  // Stream PDF to response
  doc.pipe(res);
  doc.end();
});

// @desc    Preview receipt PDF
// @route   GET /api/payments/receipt/:id/preview
// @access  Private (Receptionist, Admin)
exports.previewReceiptPDF = asyncHandler(async (req, res, next) => {
  const receipt = await Payment.findById(req.params.id)
    .populate('patientId', 'firstName lastName contactNumber')
    .populate('billId')
    .populate('processedBy', 'name');

  if (!receipt) {
    return next(new ErrorResponse('Receipt not found', 404));
  }

  // Generate PDF
  const pdfGenerator = new PDFGenerator();
  const doc = await pdfGenerator.generateReceipt(receipt);

  // Set response headers for inline display
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');

  // Stream PDF to response
  doc.pipe(res);
  doc.end();
});

// @desc    Get payment history with filters
// @route   GET /api/payments/history
// @access  Private (Receptionist, Admin)
exports.getPaymentHistory = asyncHandler(async (req, res) => {
  const { startDate, endDate, paymentMethod, search } = req.query;

  // Build query
  let query = {};

  // Date range filter
  if (startDate && endDate) {
    query.paymentDate = {
      $gte: moment(startDate).startOf('day').toDate(),
      $lte: moment(endDate).endOf('day').toDate()
    };
  }

  // Payment method filter
  if (paymentMethod && paymentMethod !== 'all') {
    query.paymentMethod = paymentMethod;
  }

  // Search filter
  if (search) {
    query.$or = [
      { receiptNumber: { $regex: search, $options: 'i' } },
      { 'patientId.firstName': { $regex: search, $options: 'i' } },
      { 'patientId.lastName': { $regex: search, $options: 'i' } }
    ];
  }

  // Get payments with populated data
  const payments = await Payment.find(query)
    .populate('patientId', 'firstName lastName contactNumber')
    .populate('billId', 'invoiceNumber totalAmount')
    .populate('processedBy', 'name')
    .sort('-paymentDate');

  // Calculate statistics
  const stats = {
    totalAmount: payments.reduce((sum, payment) => sum + payment.amount, 0),
    totalPayments: payments.length,
    cashPayments: payments.filter(p => p.paymentMethod === 'cash').length,
    cardPayments: payments.filter(p => p.paymentMethod === 'card').length,
    bankPayments: payments.filter(p => p.paymentMethod === 'bank').length
  };

  res.status(200).json({
    success: true,
    data: payments,
    stats
  });
});

// @desc    Export payment history to Excel
// @route   GET /api/payments/export
// @access  Private (Receptionist, Admin)
exports.exportPayments = asyncHandler(async (req, res) => {
  const { startDate, endDate, paymentMethod } = req.query;

  // Build query similar to getPaymentHistory
  let query = {};
  if (startDate && endDate) {
    query.paymentDate = {
      $gte: moment(startDate).startOf('day').toDate(),
      $lte: moment(endDate).endOf('day').toDate()
    };
  }
  if (paymentMethod && paymentMethod !== 'all') {
    query.paymentMethod = paymentMethod;
  }

  const payments = await Payment.find(query)
    .populate('patientId', 'firstName lastName contactNumber')
    .populate('billId', 'invoiceNumber totalAmount')
    .populate('processedBy', 'name')
    .sort('-paymentDate');

  // Create workbook
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet('Payment History');

  // Add headers
  worksheet.columns = [
    { header: 'Receipt Number', key: 'receiptNumber', width: 15 },
    { header: 'Patient Name', key: 'patientName', width: 20 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    { header: 'Payment Date', key: 'paymentDate', width: 20 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Bill Number', key: 'billNumber', width: 15 },
    { header: 'Processed By', key: 'processedBy', width: 20 }
  ];

  // Add data
  payments.forEach(payment => {
    worksheet.addRow({
      receiptNumber: payment.receiptNumber,
      patientName: `${payment.patientId.firstName} ${payment.patientId.lastName}`,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: moment(payment.paymentDate).format('DD/MM/YYYY HH:mm'),
      status: payment.status,
      billNumber: payment.billId.invoiceNumber,
      processedBy: payment.processedBy.name
    });
  });

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Add totals
  const totalRow = worksheet.addRow({
    receiptNumber: 'Total',
    amount: payments.reduce((sum, p) => sum + p.amount, 0)
  });
  totalRow.font = { bold: true };

  // Set response headers
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=payment_history_${moment().format('YYYY-MM-DD')}.xlsx`
  );

  // Write to response
  await workbook.xlsx.write(res);
  res.end();
});

// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Private (Receptionist, Admin)
exports.getPaymentStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Build date range query
  let dateQuery = {};
  if (startDate && endDate) {
    dateQuery = {
      paymentDate: {
        $gte: moment(startDate).startOf('day').toDate(),
        $lte: moment(endDate).endOf('day').toDate()
      }
    };
  }

  // Get statistics
  const stats = await Payment.aggregate([
    { $match: dateQuery },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalPayments: { $sum: 1 },
        cashAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$amount', 0]
          }
        },
        cardAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentMethod', 'card'] }, '$amount', 0]
          }
        },
        bankAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentMethod', 'bank'] }, '$amount', 0]
          }
        }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: stats[0] || {
      totalAmount: 0,
      totalPayments: 0,
      cashAmount: 0,
      cardAmount: 0,
      bankAmount: 0
    }
  });
});

// @desc    Process refund
// @route   POST /api/payments/:id/refund
// @access  Private (Receptionist)
exports.processRefund = asyncHandler(async (req, res) => {
  const { amount, reason, refundMethod } = req.body;
  const payment = await Payment.findById(req.params.id)
    .populate('billId')
    .populate('patientId');

  // Validate payment exists
  if (!payment) {
    throw new ErrorResponse('Payment not found', 404);
  }

  // Check if payment can be refunded
  if (payment.status !== 'completed') {
    throw new ErrorResponse('Only completed payments can be refunded', 400);
  }

  // Validate refund amount
  if (amount > payment.amount) {
    throw new ErrorResponse('Refund amount cannot exceed payment amount', 400);
  }

  // Create refund record
  const refund = await Refund.create({
    paymentId: payment._id,
    billId: payment.billId._id,
    patientId: payment.patientId._id,
    amount,
    reason,
    refundMethod: refundMethod || payment.paymentMethod,
    processedBy: req.user._id,
    status: 'completed'
  });

  // Update payment status
  payment.status = 'refunded';
  payment.refundId = refund._id;
  await payment.save();

  // Update bill if fully refunded
  if (amount === payment.amount) {
    payment.billId.paymentStatus = 'refunded';
    await payment.billId.save();
  }

  // Populate refund details
  await refund.populate([
    {
      path: 'paymentId',
      select: 'receiptNumber amount paymentMethod'
    },
    {
      path: 'patientId',
      select: 'firstName lastName contactNumber'
    },
    {
      path: 'processedBy',
      select: 'name'
    }
  ]);

  res.status(200).json({
    success: true,
    data: refund
  });
});

// @desc    Get refund details
// @route   GET /api/payments/refunds/:id
// @access  Private (Receptionist, Admin)
exports.getRefundDetails = asyncHandler(async (req, res) => {
  const refund = await Refund.findById(req.params.id)
    .populate('paymentId', 'receiptNumber amount paymentMethod')
    .populate('patientId', 'firstName lastName contactNumber')
    .populate('processedBy', 'name')
    .populate('approvedBy', 'name');

  if (!refund) {
    throw new ErrorResponse('Refund not found', 404);
  }

  res.status(200).json({
    success: true,
    data: refund
  });
});

// @desc    Get refund history
// @route   GET /api/payments/refunds
// @access  Private (Receptionist, Admin)
exports.getRefundHistory = asyncHandler(async (req, res) => {
  const { startDate, endDate, status } = req.query;

  // Build query
  let query = {};

  if (startDate && endDate) {
    query.refundDate = {
      $gte: moment(startDate).startOf('day').toDate(),
      $lte: moment(endDate).endOf('day').toDate()
    };
  }

  if (status) {
    query.status = status;
  }

  const refunds = await Refund.find(query)
    .populate('paymentId', 'receiptNumber amount paymentMethod')
    .populate('patientId', 'firstName lastName contactNumber')
    .populate('processedBy', 'name')
    .sort('-refundDate');

  res.status(200).json({
    success: true,
    count: refunds.length,
    data: refunds
  });
});

// @desc    Get my payments
// @route   GET /api/v1/payments/my-payments
// @access  Private (Patient)
exports.getMyPayments = asyncHandler(async (req, res) => {
    const payments = await Payment.find({ patientId: req.user._id })
        .populate('doctorId', 'name specialization profileImage')
        .populate('appointmentId', 'appointmentDate appointmentType')
        .sort({ paymentDate: -1 });

    // Enhance payments with additional information
    const enhancedPayments = payments.map(payment => {
        return {
            ...payment._doc,
            paymentDate: moment(payment.paymentDate).format('MMMM DD, YYYY'),
            statusColor: getPaymentStatusColor(payment.status),
            isRefundable: isPaymentRefundable(payment),
            timeAgo: moment(payment.paymentDate).fromNow(),
            formattedAmount: formatAmount(payment.amount)
        };
    });

    res.status(200).json({
        success: true,
        count: enhancedPayments.length,
        data: enhancedPayments
    });
});

// @desc    Get payment details
// @route   GET /api/v1/payments/:id
// @access  Private
exports.getPaymentDetails = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id)
        .populate('patientId', 'name email phone')
        .populate('doctorId', 'name specialization')
        .populate('appointmentId', 'appointmentDate appointmentType');

    if (!payment) {
        return next(new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: payment
    });
});

// @desc    Create payment
// @route   POST /api/v1/payments
// @access  Private
exports.createPayment = asyncHandler(async (req, res) => {
    // Add patient ID from logged in user
    req.body.patientId = req.user._id;
    
    const payment = await Payment.create(req.body);

    res.status(201).json({
        success: true,
        data: payment
    });
});

// @desc    Update payment
// @route   PUT /api/v1/payments/:id
// @access  Private (Admin)
exports.updatePayment = asyncHandler(async (req, res) => {
    let payment = await Payment.findById(req.params.id);

    if (!payment) {
        return next(new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404));
    }

    payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: payment
    });
});

// @desc    Delete payment
// @route   DELETE /api/v1/payments/:id
// @access  Private (Admin)
exports.deletePayment = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
        return next(new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404));
    }

    await payment.remove();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Request refund
// @route   POST /api/v1/payments/:id/refund
// @access  Private
exports.requestRefund = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
        return next(new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404));
    }

    // Check if payment is refundable
    if (!isPaymentRefundable(payment)) {
        return next(new ErrorResponse('This payment is not eligible for refund', 400));
    }

    // Create refund request
    const refund = await Refund.create({
        paymentId: payment._id,
        amount: payment.amount,
        reason: req.body.reason,
        requestedBy: req.user._id
    });

    // Update payment status
    payment.status = 'refund_pending';
    await payment.save();

    res.status(200).json({
        success: true,
        data: refund
    });
});

module.exports = {
    getMyPayments,
    getPaymentDetails,
    createPayment,
    updatePayment,
    deletePayment,
    requestRefund
};