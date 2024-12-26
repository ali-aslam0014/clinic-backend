const asyncHandler = require('express-async-handler');
const DoctorSchedule = require('../models/DoctorSchedule');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get doctor schedule
// @route   GET /api/doctors/schedule
// @access  Private (Doctor only)
const getSchedule = asyncHandler(async (req, res) => {
  const schedule = await DoctorSchedule.find({ doctorId: req.user.id });

  res.json({
    success: true,
    count: schedule.length,
    data: schedule
  });
});

// @desc    Add schedule
// @route   POST /api/doctors/schedule
// @access  Private (Doctor only)
const addSchedule = asyncHandler(async (req, res) => {
  req.body.doctorId = req.user.id;

  const schedule = await DoctorSchedule.create(req.body);

  res.status(201).json({
    success: true,
    data: schedule
  });
});

// @desc    Update schedule
// @route   PUT /api/doctors/schedule/:id
// @access  Private (Doctor only)
const updateSchedule = asyncHandler(async (req, res) => {
  let schedule = await DoctorSchedule.findById(req.params.id);

  if (!schedule) {
    throw new ErrorResponse('Schedule not found', 404);
  }

  // Make sure doctor owns schedule
  if (schedule.doctorId.toString() !== req.user.id) {
    throw new ErrorResponse('Not authorized to update this schedule', 401);
  }

  schedule = await DoctorSchedule.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.json({
    success: true,
    data: schedule
  });
});

// @desc    Delete schedule
// @route   DELETE /api/doctors/schedule/:id
// @access  Private (Doctor only)
const deleteSchedule = asyncHandler(async (req, res) => {
  const schedule = await DoctorSchedule.findById(req.params.id);

  if (!schedule) {
    throw new ErrorResponse('Schedule not found', 404);
  }

  // Make sure doctor owns schedule
  if (schedule.doctorId.toString() !== req.user.id) {
    throw new ErrorResponse('Not authorized to delete this schedule', 401);
  }

  await schedule.remove();

  res.json({
    success: true,
    data: {}
  });
});

// @desc    Toggle schedule availability
// @route   PATCH /api/doctors/schedule/:id
// @access  Private (Doctor only)
const toggleAvailability = asyncHandler(async (req, res) => {
  const schedule = await DoctorSchedule.findById(req.params.id);

  if (!schedule) {
    throw new ErrorResponse('Schedule not found', 404);
  }

  // Make sure doctor owns schedule
  if (schedule.doctorId.toString() !== req.user.id) {
    throw new ErrorResponse('Not authorized to update this schedule', 401);
  }

  schedule.isAvailable = req.body.isAvailable;
  await schedule.save();

  res.json({
    success: true,
    data: schedule
  });
});

module.exports = {
  getSchedule,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  toggleAvailability
};