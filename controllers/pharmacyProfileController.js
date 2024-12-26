const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');

// @desc    Get pharmacy profile
// @route   GET /api/pharmacy/profile
// @access  Private (Pharmacist)
exports.getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password');

  // Get statistics
  const totalProducts = await Medicine.countDocuments();
  const totalSales = await Sale.countDocuments({ pharmacist: req.user.id });

  // Calculate total sales value
  const salesData = await Sale.aggregate([
    {
      $match: { pharmacist: req.user._id }
    },
    {
      $group: {
        _id: null,
        totalValue: { $sum: '$totalAmount' }
      }
    }
  ]);

  const profileData = {
    ...user.toObject(),
    stats: {
      totalProducts,
      totalSales,
      totalSalesValue: salesData[0]?.totalValue || 0,
      productsManaged: totalProducts
    }
  };

  res.status(200).json({
    success: true,
    data: profileData
  });
});

// @desc    Update pharmacy profile
// @route   PUT /api/pharmacy/profile
// @access  Private (Pharmacist)
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    licenseNumber: req.body.licenseNumber
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => 
    fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  const user = await User.findByIdAndUpdate(
    req.user.id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true
    }
  ).select('-password');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update profile image
// @route   PUT /api/pharmacy/profile/image
// @access  Private (Pharmacist)
exports.updateProfileImage = asyncHandler(async (req, res, next) => {
  if (!req.files) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  const file = req.files.image;

  // Make sure the image is a photo
  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse('Please upload an image file', 400));
  }

  // Check filesize
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new ErrorResponse(
        `Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
        400
      )
    );
  }

  // Create custom filename
  file.name = `photo_${req.user.id}${path.parse(file.name).ext}`;

  // Upload file
  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse('Problem with file upload', 500));
    }

    await User.findByIdAndUpdate(req.user.id, { image: file.name });

    res.status(200).json({
      success: true,
      data: file.name
    });
  });
});

// @desc    Change password
// @route   PUT /api/pharmacy/profile/password
// @access  Private (Pharmacist)
exports.changePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
}); 