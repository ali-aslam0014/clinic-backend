const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Protect routes
const protect = asyncHandler(async (req, res, next) => {
  let token;

  console.log('Headers:', req.headers);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
    console.log('Token extracted:', token);
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    const user = await User.findById(decoded.id);
    console.log('Database query ID:', decoded.id);
    console.log('Found user:', user);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

// Authorize roles
const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('Current user role:', req.user.role);
    console.log('Required roles:', roles);
    
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

module.exports = { protect, authorize };