const Clinic = require('../models/clinicModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const path = require('path');
const fs = require('fs');

// @desc    Get clinic details
// @route   GET /api/v1/admin/settings/clinic
// @access  Private/Admin
exports.getClinicDetails = asyncHandler(async (req, res, next) => {
  let clinic = await Clinic.findOne().populate('updatedBy', 'name');

  if (!clinic) {
    clinic = await Clinic.create({
      name: 'My Clinic',
      email: 'clinic@example.com',
      phone: '1234567890',
      address: 'Clinic Address',
      openingTime: '09:00',
      closingTime: '17:00',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    });
  }

  res.status(200).json({
    success: true,
    data: clinic
  });
});

// @desc    Update clinic details
// @route   PUT /api/v1/admin/settings/clinic
// @access  Private/Admin
exports.updateClinicDetails = asyncHandler(async (req, res, next) => {
  let clinic = await Clinic.findOne();

  if (!clinic) {
    return next(new ErrorResponse('Clinic details not found', 404));
  }

  // Handle file upload
  if (req.files && req.files.logo) {
    const file = req.files.logo;

    // Validate file type
    if (!file.mimetype.startsWith('image')) {
      return next(new ErrorResponse('Please upload an image file', 400));
    }

    // Check file size
    if (file.size > process.env.MAX_FILE_UPLOAD) {
      return next(new ErrorResponse(`Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`, 400));
    }

    // Create custom filename
    const fileName = `logo_${clinic._id}${path.parse(file.name).ext}`;

    // Delete old logo if exists
    if (clinic.logo && clinic.logo !== 'default-logo.png') {
      const oldLogoPath = path.join(__dirname, `../public/uploads/${clinic.logo}`);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Move file to upload path
    file.mv(`${process.env.FILE_UPLOAD_PATH}/${fileName}`, async err => {
      if (err) {
        console.error(err);
        return next(new ErrorResponse('Problem with file upload', 500));
      }

      req.body.logo = fileName;
    });
  }

  // Update clinic details
  clinic = await Clinic.findOneAndUpdate({}, {
    ...req.body,
    updatedBy: req.user._id
  }, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: clinic
  });
});

// @desc    Upload clinic logo
// @route   POST /api/v1/admin/settings/upload-logo
// @access  Private/Admin
exports.uploadLogo = asyncHandler(async (req, res, next) => {
  const clinic = await Clinic.findOne();

  if (!clinic) {
    return next(new ErrorResponse('Clinic details not found', 404));
  }

  if (!req.files) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  const file = req.files.logo;

  // Validate file type
  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse('Please upload an image file', 400));
  }

  // Check file size
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(new ErrorResponse(`Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`, 400));
  }

  // Create custom filename
  const fileName = `logo_${clinic._id}${path.parse(file.name).ext}`;

  // Delete old logo if exists
  if (clinic.logo && clinic.logo !== 'default-logo.png') {
    const oldLogoPath = path.join(__dirname, `../public/uploads/${clinic.logo}`);
    if (fs.existsSync(oldLogoPath)) {
      fs.unlinkSync(oldLogoPath);
    }
  }

  // Move file to upload path
  file.mv(`${process.env.FILE_UPLOAD_PATH}/${fileName}`, async err => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse('Problem with file upload', 500));
    }

    await Clinic.findOneAndUpdate({}, {
      logo: fileName,
      updatedBy: req.user._id
    });

    res.status(200).json({
      success: true,
      data: fileName
    });
  });
});