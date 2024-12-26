const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Doctor = require('../models/Doctor');

// @desc    Register user
// @route   POST /api/v1/user/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    password,
    role,
    phone,
    address,
    gender,
    dateOfBirth,
    bloodGroup,
    specialization,
    experience,
    licenseNumber
  } = req.body;

  // Validate role-specific fields
  if (role === 'doctor' && (!specialization || !experience)) {
    return next(new ErrorResponse('Please provide specialization and experience for doctor registration', 400));
  }

  if (role === 'pharmacist' && !licenseNumber) {
    return next(new ErrorResponse('Please provide license number for pharmacist registration', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse('Email already registered', 400));
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role,
    phone,
    address,
    gender,
    dateOfBirth,
    bloodGroup,
    specialization,
    experience,
    licenseNumber
  });

  sendTokenResponse(user, 200, res);
});

// @desc    Login user
// @route   POST /api/v1/user/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password, role } = req.body;

  console.log('Login attempt:', { email, role });

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Check for user with email and role
  const query = { email };
  if (role) {
    query.role = role;
  }

  console.log('MongoDB Query:', query);

  const user = await User.findOne(query).select('+password');

  // Add explicit check for null user
  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  console.log('Login successful for:', {
    id: user._id,
    email: user.email,
    role: user.role
  });

  sendTokenResponse(user, 200, res);
});

// @desc    Admin Login
// @route   POST /api/v1/user/admin/login
// @access  Public
exports.adminLogin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  console.log('Admin login attempt:', email); // For debugging

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide email and password', 400));
  }

  // Check for admin
  const admin = await User.findOne({ email, role: 'admin' }).select('+password');

  if (!admin) {
    console.log('Admin not found'); // For debugging
    return next(new ErrorResponse('Invalid admin credentials', 401));
  }

  // Check password
  const isMatch = await admin.matchPassword(password);

  if (!isMatch) {
    console.log('Password does not match'); // For debugging
    return next(new ErrorResponse('Invalid admin credentials', 401));
  }

  // Create token
  const token = admin.getSignedJwtToken();

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      token
    }
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  try {
    // Create token
    const token = user.getSignedJwtToken();

    const options = {
      expires: new Date(
        Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
      options.secure = true;
    }

    // Check if user exists before accessing properties
    if (!user) {
      throw new Error('User not found');
    }

    res
      .status(statusCode)
      .cookie('token', token, options)
      .json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name || '',
            email: user.email || '',
            role: user.role || '',
            specialization: user.specialization || '',
            experience: user.experience || ''
          },
          token
        }
      });
  } catch (error) {
    console.error('Error in sendTokenResponse:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing login response'
    });
  }
};