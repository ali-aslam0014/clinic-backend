const User = require('../models/userModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// @desc    Get current user profile
// @route   GET /api/v1/admin/profile
// @access  Private
exports.getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password');

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user profile
// @route   PUT /api/v1/admin/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone
  };

  // Check if email is being changed and if it's already in use
  if (req.body.email !== req.user.email) {
    const emailExists = await User.findOne({ email: req.body.email });
    if (emailExists) {
      return next(new ErrorResponse('Email already in use', 400));
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true
    }
  ).select('-password');

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update password
// @route   PUT /api/v1/admin/profile/password
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  const isMatch = await user.matchPassword(req.body.currentPassword);
  if (!isMatch) {
    return next(new ErrorResponse('Current password is incorrect', 401));
  }

  // Update password
  user.password = req.body.newPassword;
  user.lastPasswordChange = Date.now();
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
});

// @desc    Upload avatar
// @route   PUT /api/v1/admin/profile/avatar
// @access  Private
exports.uploadAvatar = asyncHandler(async (req, res, next) => {
  if (!req.files || !req.files.avatar) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  const file = req.files.avatar;

  // Validate file type
  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse('Please upload an image file', 400));
  }

  // Check file size
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(new ErrorResponse(`Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`, 400));
  }

  // Create custom filename
  const fileName = `avatar_${req.user._id}${path.parse(file.name).ext}`;

  // Delete old avatar if exists
  if (req.user.avatar && req.user.avatar !== 'default-avatar.png') {
    const oldAvatarPath = path.join(__dirname, `../public/uploads/avatars/${req.user.avatar}`);
    if (fs.existsSync(oldAvatarPath)) {
      fs.unlinkSync(oldAvatarPath);
    }
  }

  // Move file to upload path
  file.mv(`${process.env.FILE_UPLOAD_PATH}/avatars/${fileName}`, async err => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse('Problem with file upload', 500));
    }

    await User.findByIdAndUpdate(req.user.id, { avatar: fileName });

    res.status(200).json({
      success: true,
      data: {
        url: `/uploads/avatars/${fileName}`
      }
    });
  });
});

// @desc    Update user preferences
// @route   PUT /api/v1/admin/profile/preferences
// @access  Private
exports.updatePreferences = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      preferences: req.body
    },
    {
      new: true,
      runValidators: true
    }
  ).select('-password');

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Get login history
// @route   GET /api/v1/admin/profile/login-history
// @access  Private
exports.getLoginHistory = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('loginHistory');

  res.status(200).json({
    success: true,
    data: user.loginHistory
  });
});