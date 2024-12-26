const { EmailTemplate, EmailReminder } = require('../models/emailReminderModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const sendEmail = require('../utils/sendEmail');
const moment = require('moment');

// @desc    Create email reminder
// @route   POST /api/v1/admin/communications/email-reminders
// @access  Private/Admin
exports.createReminder = asyncHandler(async (req, res, next) => {
  req.body.createdBy = req.user._id;
  
  const reminder = await EmailReminder.create(req.body);

  res.status(201).json({
    success: true,
    data: reminder
  });
});

// @desc    Get all email reminders
// @route   GET /api/v1/admin/communications/email-reminders
// @access  Private/Admin
exports.getReminders = asyncHandler(async (req, res, next) => {
  const { status, startDate, endDate } = req.query;
  
  let query = {};

  if (status) {
    query.status = status;
  }

  if (startDate && endDate) {
    query.scheduledFor = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const reminders = await EmailReminder.find(query)
    .populate('patient', 'name email')
    .populate('template', 'name')
    .populate('createdBy', 'name')
    .sort('scheduledFor');

  // Calculate statistics
  const statistics = {
    scheduled: reminders.filter(r => r.status === 'scheduled').length,
    sent: reminders.filter(r => r.status === 'sent').length,
    failed: reminders.filter(r => r.status === 'failed').length
  };

  res.status(200).json({
    success: true,
    data: reminders,
    statistics
  });
});

// @desc    Update email reminder
// @route   PUT /api/v1/admin/communications/email-reminders/:id
// @access  Private/Admin
exports.updateReminder = asyncHandler(async (req, res, next) => {
  let reminder = await EmailReminder.findById(req.params.id);

  if (!reminder) {
    return next(new ErrorResponse('Reminder not found', 404));
  }

  // Don't allow updating if already sent
  if (reminder.status === 'sent') {
    return next(new ErrorResponse('Cannot update sent reminder', 400));
  }

  reminder = await EmailReminder.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: reminder
  });
});

// @desc    Delete email reminder
// @route   DELETE /api/v1/admin/communications/email-reminders/:id
// @access  Private/Admin
exports.deleteReminder = asyncHandler(async (req, res, next) => {
  const reminder = await EmailReminder.findById(req.params.id);

  if (!reminder) {
    return next(new ErrorResponse('Reminder not found', 404));
  }

  // Don't allow deleting if already sent
  if (reminder.status === 'sent') {
    return next(new ErrorResponse('Cannot delete sent reminder', 400));
  }

  await reminder.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Send email reminder
// @route   POST /api/v1/admin/communications/email-reminders/:id/send
// @access  Private/Admin
exports.sendReminder = asyncHandler(async (req, res, next) => {
  const reminder = await EmailReminder.findById(req.params.id)
    .populate('patient', 'name email');

  if (!reminder) {
    return next(new ErrorResponse('Reminder not found', 404));
  }

  try {
    await sendEmail({
      email: reminder.email,
      subject: reminder.subject,
      message: reminder.content
    });

    reminder.status = 'sent';
    reminder.sentAt = Date.now();
    await reminder.save();

    res.status(200).json({
      success: true,
      data: reminder
    });
  } catch (error) {
    reminder.status = 'failed';
    reminder.error = error.message;
    await reminder.save();

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Get email templates
// @route   GET /api/v1/admin/communications/email/templates
// @access  Private/Admin
exports.getTemplates = asyncHandler(async (req, res, next) => {
  const templates = await EmailTemplate.find()
    .populate('createdBy', 'name')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    data: templates
  });
});

// @desc    Create email template
// @route   POST /api/v1/admin/communications/email/templates
// @access  Private/Admin
exports.createTemplate = asyncHandler(async (req, res, next) => {
  req.body.createdBy = req.user._id;
  
  const template = await EmailTemplate.create(req.body);

  res.status(201).json({
    success: true,
    data: template
  });
});