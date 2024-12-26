const User = require('../models/userModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get user settings
// @route   GET /api/v1/profile/settings
// @access  Private
exports.getSettings = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('preferences notifications language theme');

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user settings
// @route   PUT /api/v1/profile/settings
// @access  Private
exports.updateSettings = asyncHandler(async (req, res, next) => {
  const allowedFields = {
    'preferences.theme': req.body.theme,
    'preferences.language': req.body.language,
    'preferences.notifications.email': req.body.emailNotifications,
    'preferences.notifications.push': req.body.pushNotifications,
    'preferences.notifications.sms': req.body.smsNotifications,
    'preferences.timeZone': req.body.timeZone,
    'preferences.dateFormat': req.body.dateFormat,
    'preferences.timeFormat': req.body.timeFormat
  };

  // Remove undefined fields
  Object.keys(allowedFields).forEach(key => 
    allowedFields[key] === undefined && delete allowedFields[key]
  );

  const user = await User.findByIdAndUpdate(
    req.user.id,
    allowedFields,
    {
      new: true,
      runValidators: true
    }
  ).select('preferences notifications language theme');

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update notification settings
// @route   PUT /api/v1/profile/settings/notifications
// @access  Private
exports.updateNotificationSettings = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      'preferences.notifications': req.body
    },
    {
      new: true,
      runValidators: true
    }
  ).select('preferences.notifications');

  res.status(200).json({
    success: true,
    data: user.preferences.notifications
  });
});

// @desc    Update appearance settings
// @route   PUT /api/v1/profile/settings/appearance
// @access  Private
exports.updateAppearanceSettings = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      'preferences.theme': req.body.theme,
      'preferences.dateFormat': req.body.dateFormat,
      'preferences.timeFormat': req.body.timeFormat
    },
    {
      new: true,
      runValidators: true
    }
  ).select('preferences.theme preferences.dateFormat preferences.timeFormat');

  res.status(200).json({
    success: true,
    data: user.preferences
  });
});

// @desc    Reset all settings to default
// @route   POST /api/v1/profile/settings/reset
// @access  Private
exports.resetSettings = asyncHandler(async (req, res, next) => {
  const defaultSettings = {
    'preferences.theme': 'light',
    'preferences.language': 'en',
    'preferences.notifications.email': true,
    'preferences.notifications.push': true,
    'preferences.notifications.sms': false,
    'preferences.timeZone': 'UTC',
    'preferences.dateFormat': 'DD/MM/YYYY',
    'preferences.timeFormat': '24h'
  };

  const user = await User.findByIdAndUpdate(
    req.user.id,
    defaultSettings,
    {
      new: true,
      runValidators: true
    }
  ).select('preferences');

  res.status(200).json({
    success: true,
    data: user.preferences
  });
});