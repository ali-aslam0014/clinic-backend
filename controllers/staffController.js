const Staff = require('../models/staffModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all receptionists
// @route   GET /api/v1/admin/staff/receptionists
// @access  Private/Admin
exports.getReceptionists = asyncHandler(async (req, res, next) => {
  const receptionists = await Staff.find({ role: 'receptionist' })
    .select('-password')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    data: receptionists
  });
});

// @desc    Add new receptionist
// @route   POST /api/v1/admin/staff/receptionists
// @access  Private/Admin
exports.addReceptionist = asyncHandler(async (req, res, next) => {
  req.body.role = 'receptionist';
  
  const receptionist = await Staff.create(req.body);
  
  // Remove password from response
  receptionist.password = undefined;

  res.status(201).json({
    success: true,
    data: receptionist
  });
});

// @desc    Update receptionist
// @route   PUT /api/v1/admin/staff/receptionists/:id
// @access  Private/Admin
exports.updateReceptionist = asyncHandler(async (req, res, next) => {
  let receptionist = await Staff.findById(req.params.id);

  if (!receptionist) {
    return next(new ErrorResponse(`Receptionist not found with id of ${req.params.id}`, 404));
  }

  // Don't allow role change through this endpoint
  delete req.body.role;
  
  receptionist = await Staff.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).select('-password');

  res.status(200).json({
    success: true,
    data: receptionist
  });
});

// @desc    Delete receptionist
// @route   DELETE /api/v1/admin/staff/receptionists/:id
// @access  Private/Admin
exports.deleteReceptionist = asyncHandler(async (req, res, next) => {
  const receptionist = await Staff.findById(req.params.id);

  if (!receptionist) {
    return next(new ErrorResponse(`Receptionist not found with id of ${req.params.id}`, 404));
  }

  await receptionist.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update receptionist status
// @route   PATCH /api/v1/admin/staff/receptionists/:id/status
// @access  Private/Admin
exports.updateReceptionistStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return next(new ErrorResponse('Invalid status value', 400));
  }

  const receptionist = await Staff.findByIdAndUpdate(
    req.params.id,
    { status },
    {
      new: true,
      runValidators: true
    }
  ).select('-password');

  if (!receptionist) {
    return next(new ErrorResponse(`Receptionist not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: receptionist
  });
});

// @desc    Get all pharmacists
// @route   GET /api/v1/admin/staff/pharmacists
// @access  Private/Admin
exports.getPharmacists = asyncHandler(async (req, res, next) => {
  const pharmacists = await Staff.find({ role: 'pharmacist' })
    .select('-password')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    data: pharmacists
  });
});

// @desc    Add new pharmacist
// @route   POST /api/v1/admin/staff/pharmacists
// @access  Private/Admin
exports.addPharmacist = asyncHandler(async (req, res, next) => {
  // Validate license number
  if (!req.body.licenseNumber) {
    return next(new ErrorResponse('License number is required for pharmacists', 400));
  }

  // Check if license number already exists
  const existingPharmacist = await Staff.findOne({ licenseNumber: req.body.licenseNumber });
  if (existingPharmacist) {
    return next(new ErrorResponse('License number already exists', 400));
  }

  req.body.role = 'pharmacist';
  
  const pharmacist = await Staff.create(req.body);
  
  // Remove password from response
  pharmacist.password = undefined;

  res.status(201).json({
    success: true,
    data: pharmacist
  });
});

// @desc    Update pharmacist
// @route   PUT /api/v1/admin/staff/pharmacists/:id
// @access  Private/Admin
exports.updatePharmacist = asyncHandler(async (req, res, next) => {
  let pharmacist = await Staff.findById(req.params.id);

  if (!pharmacist) {
    return next(new ErrorResponse(`Pharmacist not found with id of ${req.params.id}`, 404));
  }

  if (pharmacist.role !== 'pharmacist') {
    return next(new ErrorResponse('This staff member is not a pharmacist', 400));
  }

  // Check if updating license number and if it already exists
  if (req.body.licenseNumber && req.body.licenseNumber !== pharmacist.licenseNumber) {
    const existingPharmacist = await Staff.findOne({ licenseNumber: req.body.licenseNumber });
    if (existingPharmacist) {
      return next(new ErrorResponse('License number already exists', 400));
    }
  }

  // Don't allow role change through this endpoint
  delete req.body.role;
  
  pharmacist = await Staff.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).select('-password');

  res.status(200).json({
    success: true,
    data: pharmacist
  });
});

// @desc    Delete pharmacist
// @route   DELETE /api/v1/admin/staff/pharmacists/:id
// @access  Private/Admin
exports.deletePharmacist = asyncHandler(async (req, res, next) => {
  const pharmacist = await Staff.findById(req.params.id);

  if (!pharmacist) {
    return next(new ErrorResponse(`Pharmacist not found with id of ${req.params.id}`, 404));
  }

  if (pharmacist.role !== 'pharmacist') {
    return next(new ErrorResponse('This staff member is not a pharmacist', 400));
  }

  await pharmacist.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update pharmacist duty status
// @route   PATCH /api/v1/admin/staff/pharmacists/:id/duty-status
// @access  Private/Admin
exports.updatePharmacistDutyStatus = asyncHandler(async (req, res, next) => {
  const { isOnDuty } = req.body;

  if (typeof isOnDuty !== 'boolean') {
    return next(new ErrorResponse('Invalid duty status value', 400));
  }

  const pharmacist = await Staff.findByIdAndUpdate(
    req.params.id,
    { isOnDuty },
    {
      new: true,
      runValidators: true
    }
  ).select('-password');

  if (!pharmacist) {
    return next(new ErrorResponse(`Pharmacist not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: pharmacist
  });
});