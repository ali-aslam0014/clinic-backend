const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Settings = require('../models/Settings');
const User = require('../models/User');

// @desc    Get pharmacy settings
// @route   GET /api/pharmacy/settings
// @access  Private (Pharmacist)
exports.getSettings = asyncHandler(async (req, res, next) => {
  let settings = await Settings.findOne({ user: req.user.id });

  if (!settings) {
    // Create default settings if none exist
    settings = await Settings.create({
      user: req.user.id,
      pharmacyName: 'My Pharmacy',
      operatingHours: {
        openTime: '09:00',
        closeTime: '17:00'
      },
      currency: 'PKR',
      language: 'en',
      timeZone: 'PKT',
      notifications: {
        lowStock: true,
        expiry: true,
        email: true,
        stockThreshold: 10,
        expiryDays: 30
      },
      security: {
        twoFactor: false,
        sessionTimeout: 30,
        passwordExpiry: 90
      }
    });
  }

  res.status(200).json({
    success: true,
    data: settings
  });
});

// @desc    Update general settings
// @route   PUT /api/pharmacy/settings/general
// @access  Private (Pharmacist)
exports.updateGeneralSettings = asyncHandler(async (req, res, next) => {
  const {
    pharmacyName,
    openTime,
    closeTime,
    currency,
    language,
    timeZone
  } = req.body;

  const settings = await Settings.findOneAndUpdate(
    { user: req.user.id },
    {
      pharmacyName,
      operatingHours: {
        openTime,
        closeTime
      },
      currency,
      language,
      timeZone
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: settings
  });
});

// @desc    Update notification settings
// @route   PUT /api/pharmacy/settings/notifications
// @access  Private (Pharmacist)
exports.updateNotificationSettings = asyncHandler(async (req, res, next) => {
  const {
    lowStockAlert,
    expiryAlert,
    emailNotifications,
    stockAlertThreshold,
    expiryAlertDays
  } = req.body;

  const settings = await Settings.findOneAndUpdate(
    { user: req.user.id },
    {
      notifications: {
        lowStock: lowStockAlert,
        expiry: expiryAlert,
        email: emailNotifications,
        stockThreshold: stockAlertThreshold,
        expiryDays: expiryAlertDays
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: settings
  });
});

// @desc    Update security settings
// @route   PUT /api/pharmacy/settings/security
// @access  Private (Pharmacist)
exports.updateSecuritySettings = asyncHandler(async (req, res, next) => {
  const {
    twoFactorAuth,
    sessionTimeout,
    passwordExpiry
  } = req.body;

  const settings = await Settings.findOneAndUpdate(
    { user: req.user.id },
    {
      security: {
        twoFactor: twoFactorAuth,
        sessionTimeout,
        passwordExpiry
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  // Update user's password expiry if changed
  if (passwordExpiry) {
    await User.findByIdAndUpdate(req.user.id, {
      passwordExpiryDays: passwordExpiry
    });
  }

  res.status(200).json({
    success: true,
    data: settings
  });
});

// @desc    Reset settings to default
// @route   POST /api/pharmacy/settings/reset
// @access  Private (Pharmacist)
exports.resetSettings = asyncHandler(async (req, res, next) => {
  await Settings.findOneAndDelete({ user: req.user.id });

  // Create new settings with defaults
  const settings = await Settings.create({
    user: req.user.id,
    pharmacyName: 'My Pharmacy',
    operatingHours: {
      openTime: '09:00',
      closeTime: '17:00'
    },
    currency: 'PKR',
    language: 'en',
    timeZone: 'PKT',
    notifications: {
      lowStock: true,
      expiry: true,
      email: true,
      stockThreshold: 10,
      expiryDays: 30
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30,
      passwordExpiry: 90
    }
  });

  res.status(200).json({
    success: true,
    data: settings
  });
}); 