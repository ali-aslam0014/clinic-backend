const { SMSTemplate, SMSLog } = require('../models/smsModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const twilioClient = require('../config/twilio');

// @desc    Send SMS
// @route   POST /api/v1/admin/communications/sms/send
// @access  Private/Admin
exports.sendSMS = asyncHandler(async (req, res, next) => {
  const { recipient, phone, message, templateId, patientId } = req.body;

  try {
    // Send SMS using Twilio
    const twilioMessage = await twilioClient.messages.create({
      body: message,
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    // Create SMS log
    const smsLog = await SMSLog.create({
      recipient,
      phone,
      message,
      template: templateId,
      patient: patientId,
      sentBy: req.user._id,
      status: 'delivered',
      deliveredAt: Date.now(),
      provider: 'twilio',
      messageId: twilioMessage.sid,
      cost: twilioMessage.price
    });

    res.status(200).json({
      success: true,
      data: smsLog
    });
  } catch (error) {
    // Create failed SMS log
    await SMSLog.create({
      recipient,
      phone,
      message,
      template: templateId,
      patient: patientId,
      sentBy: req.user._id,
      status: 'failed',
      error: error.message
    });

    return next(new ErrorResponse('Failed to send SMS', 500));
  }
});

// @desc    Get all SMS logs
// @route   GET /api/v1/admin/communications/sms
// @access  Private/Admin
exports.getSMSLogs = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, status } = req.query;
  
  let query = {};

  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  if (status) {
    query.status = status;
  }

  const logs = await SMSLog.find(query)
    .populate('patient', 'name')
    .populate('template', 'name')
    .populate('sentBy', 'name')
    .sort('-createdAt');

  // Calculate statistics
  const statistics = {
    totalSent: logs.length,
    delivered: logs.filter(log => log.status === 'delivered').length,
    failed: logs.filter(log => log.status === 'failed').length
  };

  res.status(200).json({
    success: true,
    data: logs,
    statistics
  });
});

// @desc    Create SMS template
// @route   POST /api/v1/admin/communications/sms/templates
// @access  Private/Admin
exports.createTemplate = asyncHandler(async (req, res, next) => {
  req.body.createdBy = req.user._id;
  
  const template = await SMSTemplate.create(req.body);

  res.status(201).json({
    success: true,
    data: template
  });
});

// @desc    Get all SMS templates
// @route   GET /api/v1/admin/communications/sms/templates
// @access  Private/Admin
exports.getTemplates = asyncHandler(async (req, res, next) => {
  const templates = await SMSTemplate.find()
    .populate('createdBy', 'name')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    data: templates
  });
});

// @desc    Update SMS template
// @route   PUT /api/v1/admin/communications/sms/templates/:id
// @access  Private/Admin
exports.updateTemplate = asyncHandler(async (req, res, next) => {
  let template = await SMSTemplate.findById(req.params.id);

  if (!template) {
    return next(new ErrorResponse('Template not found', 404));
  }

  template = await SMSTemplate.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: template
  });
});

// @desc    Delete SMS template
// @route   DELETE /api/v1/admin/communications/sms/templates/:id
// @access  Private/Admin
exports.deleteTemplate = asyncHandler(async (req, res, next) => {
  const template = await SMSTemplate.findById(req.params.id);

  if (!template) {
    return next(new ErrorResponse('Template not found', 404));
  }

  await template.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});