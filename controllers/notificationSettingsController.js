const asyncHandler = require('express-async-handler');
const NotificationSettings = require('../models/NotificationSettings');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get notification settings
// @route   GET /api/doctors/settings/notifications
// @access  Private (Doctor only)
const getNotificationSettings = asyncHandler(async (req, res) => {
  let settings = await NotificationSettings.findOne({ userId: req.user.id });

  // If settings don't exist, create default settings
  if (!settings) {
    settings = await NotificationSettings.create({
      userId: req.user.id
    });
  }

  res.json({
    success: true,
    data: settings
  });
});

// @desc    Update notification settings
// @route   PUT /api/doctors/settings/notifications
// @access  Private (Doctor only)
const updateNotificationSettings = asyncHandler(async (req, res) => {
  const {
    emailNotifications,
    smsNotifications,
    appointmentReminders,
    reminderTime,
    dailySchedule,
    scheduleTime,
    newPatientAlerts,
    cancelationAlerts,
    emergencyAlerts,
    marketingEmails
  } = req.body;

  let settings = await NotificationSettings.findOne({ userId: req.user.id });

  if (!settings) {
    settings = new NotificationSettings({ userId: req.user.id });
  }

  // Update fields if they are provided
  if (emailNotifications !== undefined) settings.emailNotifications = emailNotifications;
  if (smsNotifications !== undefined) settings.smsNotifications = smsNotifications;
  if (appointmentReminders !== undefined) settings.appointmentReminders = appointmentReminders;
  if (reminderTime !== undefined) settings.reminderTime = reminderTime;
  if (dailySchedule !== undefined) settings.dailySchedule = dailySchedule;
  if (scheduleTime !== undefined) settings.scheduleTime = scheduleTime;
  if (newPatientAlerts !== undefined) settings.newPatientAlerts = newPatientAlerts;
  if (cancelationAlerts !== undefined) settings.cancelationAlerts = cancelationAlerts;
  if (emergencyAlerts !== undefined) settings.emergencyAlerts = emergencyAlerts;
  if (marketingEmails !== undefined) settings.marketingEmails = marketingEmails;

  await settings.save();

  res.json({
    success: true,
    data: settings
  });
});

// @desc    Reset notification settings to default
// @route   POST /api/doctors/settings/notifications/reset
// @access  Private (Doctor only)
const resetNotificationSettings = asyncHandler(async (req, res) => {
  await NotificationSettings.findOneAndDelete({ userId: req.user.id });

  const defaultSettings = await NotificationSettings.create({
    userId: req.user.id
  });

  res.json({
    success: true,
    data: defaultSettings
  });
});

module.exports = {
  getNotificationSettings,
  updateNotificationSettings,
  resetNotificationSettings
};