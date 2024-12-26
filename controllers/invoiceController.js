const Invoice = require('../models/invoiceModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const moment = require('moment');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const sendEmail = require('../utils/sendEmail');

// @desc    Create new invoice
// @route   POST /api/v1/admin/invoices
// @access  Private/Admin
exports.createInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.create(req.body);
  
  res.status(201).json({
    success: true,
    data: await invoice.populate([
      { path: 'patientId', select: 'name email phone' },
      { path: 'items.service', select: 'name description' }
    ])
  });
});

// @desc    Get all invoices
// @route   GET /api/v1/admin/invoices
// @access  Private/Admin
exports.getInvoices = asyncHandler(async (req, res, next) => {
  const invoices = await Invoice.find()
    .populate('patientId', 'name email phone')
    .populate('items.service', 'name description')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: invoices.length,
    data: invoices
  });
});

// @desc    Get single invoice
// @route   GET /api/v1/admin/invoices/:id
// @access  Private/Admin
exports.getInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('patientId', 'name email phone')
    .populate('items.service', 'name description');

  if (!invoice) {
    return next(new ErrorResponse(`Invoice not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: invoice
  });
});

// @desc    Update invoice
// @route   PUT /api/v1/admin/invoices/:id
// @access  Private/Admin
exports.updateInvoice = asyncHandler(async (req, res, next) => {
  let invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(new ErrorResponse(`Invoice not found with id of ${req.params.id}`, 404));
  }

  // Don't allow updating if invoice is paid
  if (invoice.status === 'paid') {
    return next(new ErrorResponse('Cannot update paid invoice', 400));
  }

  invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate([
    { path: 'patientId', select: 'name email phone' },
    { path: 'items.service', select: 'name description' }
  ]);

  res.status(200).json({
    success: true,
    data: invoice
  });
});

// @desc    Delete invoice
// @route   DELETE /api/v1/admin/invoices/:id
// @access  Private/Admin
exports.deleteInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(new ErrorResponse(`Invoice not found with id of ${req.params.id}`, 404));
  }

  // Don't allow deleting if invoice is paid
  if (invoice.status === 'paid') {
    return next(new ErrorResponse('Cannot delete paid invoice', 400));
  }

  await invoice.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Add payment to invoice
// @route   POST /api/v1/admin/invoices/:id/payments
// @access  Private/Admin
exports.addPayment = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(new ErrorResponse(`Invoice not found with id of ${req.params.id}`, 404));
  }

  // Validate payment amount
  const { amount } = req.body;
  const remainingAmount = invoice.totalAmount - invoice.paidAmount;

  if (amount > remainingAmount) {
    return next(new ErrorResponse(`Payment amount cannot exceed remaining amount of ${remainingAmount}`, 400));
  }

  // Add payment to history
  invoice.paymentHistory.push({
    ...req.body,
    paymentDate: moment().toDate()
  });

  // Update paid amount
  invoice.paidAmount += amount;

  await invoice.save();

  res.status(200).json({
    success: true,
    data: await invoice.populate([
      { path: 'patientId', select: 'name email phone' },
      { path: 'items.service', select: 'name description' }
    ])
  });
});

// @desc    Get overdue invoices
// @route   GET /api/v1/admin/invoices/overdue
// @access  Private/Admin
exports.getOverdueInvoices = asyncHandler(async (req, res, next) => {
  const overdueInvoices = await Invoice.find({
    status: { $in: ['pending', 'partial'] },
    dueDate: { $lt: moment().toDate() }
  }).populate('patientId', 'name email phone')
    .populate('items.service', 'name description')
    .sort('dueDate');

  res.status(200).json({
    success: true,
    count: overdueInvoices.length,
    data: overdueInvoices
  });
});

// @desc    Get all due invoices
// @route   GET /api/v1/admin/invoices/due
// @access  Private/Admin
exports.getDueInvoices = asyncHandler(async (req, res, next) => {
  const dueInvoices = await Invoice.find({
    status: { $in: ['pending', 'partial'] },
    paidAmount: { $lt: '$totalAmount' }
  })
  .populate('patientId', 'name email phone')
  .sort('dueDate');

  // Calculate additional statistics
  const statistics = {
    totalDue: dueInvoices.reduce((sum, invoice) => 
      sum + (invoice.totalAmount - invoice.paidAmount), 0),
    overdueCount: dueInvoices.filter(invoice => 
      moment(invoice.dueDate).isBefore(moment())).length,
    upcomingCount: dueInvoices.filter(invoice => 
      moment(invoice.dueDate).isAfter(moment())).length
  };

  res.status(200).json({
    success: true,
    statistics,
    count: dueInvoices.length,
    data: dueInvoices
  });
});

// @desc    Send payment reminder
// @route   POST /api/v1/admin/invoices/:id/reminder
// @access  Private/Admin
exports.sendPaymentReminder = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('patientId', 'name email phone');

  if (!invoice) {
    return next(new ErrorResponse(`Invoice not found with id of ${req.params.id}`, 404));
  }

  // Check if invoice has pending amount
  if (invoice.paidAmount >= invoice.totalAmount) {
    return next(new ErrorResponse('Invoice is already paid in full', 400));
  }

  // Calculate due amount
  const dueAmount = invoice.totalAmount - invoice.paidAmount;

  // Send email reminder
  try {
    await sendEmail({
      email: invoice.patientId.email,
      subject: 'Payment Reminder - Invoice #' + invoice.invoiceNumber,
      template: 'paymentReminder',
      data: {
        patientName: invoice.patientId.name,
        invoiceNumber: invoice.invoiceNumber,
        dueAmount: dueAmount.toFixed(2),
        dueDate: moment(invoice.dueDate).format('DD/MM/YYYY'),
        paymentLink: `${process.env.FRONTEND_URL}/patient/invoices/${invoice._id}`
      }
    });

    // Log reminder in invoice
    invoice.reminders = invoice.reminders || [];
    invoice.reminders.push({
      sentAt: Date.now(),
      sentBy: req.user._id
    });
    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Payment reminder sent successfully'
    });
  } catch (error) {
    return next(new ErrorResponse('Error sending payment reminder', 500));
  }
});

// @desc    Get invoice payment history
// @route   GET /api/v1/admin/invoices/:id/payments
// @access  Private/Admin
exports.getInvoicePayments = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('paymentHistory.receivedBy', 'name');

  if (!invoice) {
    return next(new ErrorResponse(`Invoice not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: invoice.paymentHistory
  });
});

// @desc    Add payment to invoice
// @route   POST /api/v1/admin/invoices/:id/payments
// @access  Private/Admin
exports.addInvoicePayment = asyncHandler(async (req, res, next) => {
  const { amount, paymentMethod, notes } = req.body;
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(new ErrorResponse(`Invoice not found with id of ${req.params.id}`, 404));
  }

  // Validate payment amount
  const remainingAmount = invoice.totalAmount - invoice.paidAmount;
  if (amount > remainingAmount) {
    return next(new ErrorResponse(`Payment amount cannot exceed remaining amount of ${remainingAmount}`, 400));
  }

  // Create payment record
  const payment = {
    amount,
    paymentMethod,
    notes,
    receivedBy: req.user._id,
    paymentDate: Date.now()
  };

  // Add payment to history and update paid amount
  invoice.paymentHistory.push(payment);
  invoice.paidAmount += amount;

  // Update status based on payment
  if (invoice.paidAmount >= invoice.totalAmount) {
    invoice.status = 'paid';
  } else if (invoice.paidAmount > 0) {
    invoice.status = 'partial';
  }

  await invoice.save();

  // Create transaction record
  await Transaction.create({
    invoice: invoice._id,
    amount,
    paymentMethod,
    notes,
    receivedBy: req.user._id,
    type: 'payment'
  });

  res.status(200).json({
    success: true,
    data: invoice
  });
});

// @desc    Generate PDF invoice
// @route   GET /api/v1/admin/invoices/:id/pdf
// @access  Private/Admin
exports.generatePDF = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('patientId', 'name email phone address')
    .populate('items.service', 'name description');

  if (!invoice) {
    return next(new ErrorResponse(`Invoice not found with id of ${req.params.id}`, 404));
  }

  // Create PDF document
  const doc = new PDFDocument({ margin: 50 });

  // Pipe PDF to response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice_${invoice.invoiceNumber}.pdf`);
  doc.pipe(res);

  // Add company logo
  const logoPath = path.join(__dirname, '../public/logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 45, { width: 150 });
  }

  // Add company info
  doc.fontSize(20)
     .text('Your Company Name', 50, 200)
     .fontSize(10)
     .text('123 Business Street', 50, 220)
     .text('City, State, ZIP', 50, 235)
     .text('Phone: (123) 456-7890', 50, 250);

  // Add invoice details
  doc.fontSize(20)
     .text('INVOICE', 400, 50)
     .fontSize(10)
     .text(`Invoice Number: ${invoice.invoiceNumber}`, 400, 80)
     .text(`Date: ${moment(invoice.invoiceDate).format('DD/MM/YYYY')}`, 400, 95)
     .text(`Due Date: ${moment(invoice.dueDate).format('DD/MM/YYYY')}`, 400, 110)
     .text(`Status: ${invoice.status.toUpperCase()}`, 400, 125);

  // Add patient details
  doc.fontSize(14)
     .text('Bill To:', 50, 300)
     .fontSize(10)
     .text(invoice.patientId.name, 50, 320)
     .text(invoice.patientId.email, 50, 335)
     .text(invoice.patientId.phone, 50, 350)
     .text(invoice.patientId.address || '', 50, 365);

  // Add items table
  let yPos = 420;
  
  // Table headers
  doc.fontSize(10)
     .text('Service', 50, yPos)
     .text('Description', 200, yPos)
     .text('Quantity', 300, yPos)
     .text('Price', 400, yPos)
     .text('Amount', 480, yPos);

  // Draw header line
  doc.moveTo(50, yPos + 15)
     .lineTo(550, yPos + 15)
     .stroke();

  yPos += 30;

  // Table rows
  invoice.items.forEach(item => {
    doc.text(item.service.name, 50, yPos)
       .text(item.service.description, 200, yPos)
       .text(item.quantity.toString(), 300, yPos)
       .text(`$${item.price.toFixed(2)}`, 400, yPos)
       .text(`$${item.amount.toFixed(2)}`, 480, yPos);

    yPos += 20;

    // Add new page if needed
    if (yPos > 700) {
      doc.addPage();
      yPos = 50;
    }
  });

  // Add totals
  yPos += 20;
  doc.fontSize(10)
     .text('Subtotal:', 400, yPos)
     .text(`$${invoice.totalAmount.toFixed(2)}`, 480, yPos);

  if (invoice.tax) {
    yPos += 15;
    doc.text('Tax:', 400, yPos)
       .text(`$${invoice.tax.toFixed(2)}`, 480, yPos);
  }

  yPos += 15;
  doc.fontSize(12)
     .text('Total:', 400, yPos)
     .text(`$${invoice.totalAmount.toFixed(2)}`, 480, yPos);

  yPos += 15;
  doc.fontSize(10)
     .text('Paid:', 400, yPos)
     .text(`$${invoice.paidAmount.toFixed(2)}`, 480, yPos);

  if (invoice.totalAmount - invoice.paidAmount > 0) {
    yPos += 15;
    doc.text('Balance Due:', 400, yPos)
       .text(`$${(invoice.totalAmount - invoice.paidAmount).toFixed(2)}`, 480, yPos);
  }

  // Add notes if any
  if (invoice.notes) {
    yPos += 40;
    doc.fontSize(12)
       .text('Notes:', 50, yPos)
       .fontSize(10)
       .text(invoice.notes, 50, yPos + 15);
  }

  // Add footer
  doc.fontSize(10)
     .text('Thank you for your business!', 50, 700, { align: 'center' })
     .text('Please include the invoice number with your payment.', 50, 715, { align: 'center' });

  // Finalize PDF
  doc.end();
});

// @desc    Email invoice to patient
// @route   POST /api/v1/admin/invoices/:id/email
// @access  Private/Admin
exports.emailInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('patientId', 'name email')
    .populate('items.service', 'name description');

  if (!invoice) {
    return next(new ErrorResponse(`Invoice not found with id of ${req.params.id}`, 404));
  }

  // Generate PDF
  const pdfPath = path.join(__dirname, `../temp/invoice_${invoice.invoiceNumber}.pdf`);
  const pdfDoc = new PDFDocument({ margin: 50 });
  const pdfStream = fs.createWriteStream(pdfPath);

  // Generate PDF content (same as above)
  // ... (copy PDF generation code here) ...

  // Wait for PDF to be created
  await new Promise((resolve, reject) => {
    pdfDoc.pipe(pdfStream);
    pdfDoc.end();
    pdfStream.on('finish', resolve);
    pdfStream.on('error', reject);
  });

  // Send email with PDF attachment
  try {
    await sendEmail({
      email: invoice.patientId.email,
      subject: `Invoice #${invoice.invoiceNumber} from Your Company`,
      template: 'invoice',
      data: {
        patientName: invoice.patientId.name,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount.toFixed(2),
        dueDate: moment(invoice.dueDate).format('DD/MM/YYYY'),
        paymentLink: `${process.env.FRONTEND_URL}/patient/invoices/${invoice._id}`
      },
      attachments: [{
        filename: `invoice_${invoice.invoiceNumber}.pdf`,
        path: pdfPath
      }]
    });

    // Delete temporary PDF file
    fs.unlinkSync(pdfPath);

    res.status(200).json({
      success: true,
      message: 'Invoice sent successfully'
    });
  } catch (error) {
    // Delete temporary PDF file if email fails
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
    return next(new ErrorResponse('Error sending invoice email', 500));
  }
});