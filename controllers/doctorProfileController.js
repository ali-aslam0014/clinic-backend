const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get doctor profile
// @route   GET /api/doctors/profile
// @access  Private (Doctor only)
const getDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = await User.findById(req.user.id).select('-password');

  if (!doctor) {
    throw new ErrorResponse('Doctor not found', 404);
  }

  res.json({
    success: true,
    data: doctor
  });
});

// @desc    Update doctor profile
// @route   PUT /api/doctors/profile
// @access  Private (Doctor only)
const updateDoctorProfile = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    specializations: req.body.specializations,
    qualifications: req.body.qualifications,
    experience: req.body.experience,
    about: req.body.about
  };

  const doctor = await User.findByIdAndUpdate(
    req.user.id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true
    }
  ).select('-password');

  res.json({
    success: true,
    data: doctor
  });
});

// @desc    Upload profile image
// @route   PUT /api/doctors/profile/image
// @access  Private (Doctor only)
const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.files) {
    throw new ErrorResponse('Please upload a file', 400);
  }

  const file = req.files.file;

  // Make sure the image is a photo
  if (!file.mimetype.startsWith('image')) {
    throw new ErrorResponse('Please upload an image file', 400);
  }

  // Check filesize
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    throw new ErrorResponse(
      `Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
      400
    );
  }

  // Create custom filename
  file.name = `photo_${req.user.id}${path.parse(file.name).ext}`;

  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
    if (err) {
      console.error(err);
      throw new ErrorResponse(`Problem with file upload`, 500);
    }

    await User.findByIdAndUpdate(req.user.id, {
      profileImage: file.name
    });

    res.json({
      success: true,
      data: file.name
    });
  });
});

module.exports = {
  getDoctorProfile,
  updateDoctorProfile,
  uploadProfileImage
};