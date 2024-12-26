const User = require('../models/userModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const sendEmail = require('../utils/sendEmail');

// @desc    Get all users
// @route   GET /api/v1/admin/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find()
    .select('-password')
    .populate('createdBy', 'name');

  res.status(200).json({
    success: true,
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/v1/admin/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('createdBy', 'name');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create user
// @route   POST /api/v1/admin/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  req.body.createdBy = req.user._id;
  
  const user = await User.create(req.body);

  // Send welcome email
  try {
    await sendEmail({
      email: user.email,
      subject: 'Welcome to Our System',
      message: `Welcome ${user.name},\n\nYour account has been created successfully.\nEmail: ${user.email}\nPassword: ${req.body.password}\n\nPlease change your password after first login.`
    });
  } catch (err) {
    console.log('Email could not be sent');
  }

  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/v1/admin/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Remove password from update
  if (req.body.password) {
    delete req.body.password;
  }

  user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/v1/admin/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Prevent deleting self
  if (user._id.toString() === req.user._id.toString()) {
    return next(new ErrorResponse('Cannot delete yourself', 400));
  }

  await user.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update user status
// @route   PUT /api/v1/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return next(new ErrorResponse('Invalid status', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status },
    {
      new: true,
      runValidators: true
    }
  );

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});