const FollowUp = require('../models/FollowUp');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const moment = require('moment');

// Get all follow-ups for a doctor
const getDoctorFollowUps = asyncHandler(async (req, res) => {
  const { doctorId, status, startDate, endDate } = req.query;

  const query = { doctorId };

  if (status) {
    query.status = status;
  }

  if (startDate && endDate) {
    query.followUpDate = {
      $gte: moment(startDate).startOf('day'),
      $lte: moment(endDate).endOf('day')
    };
  }

  const followUps = await FollowUp.find(query)
    .populate('patientId', 'name email phone')
    .populate('consultationId')
    .sort({ followUpDate: 1 });

  res.status(200).json({
    success: true,
    count: followUps.length,
    data: followUps
  });
});

// Create new follow-up
const createFollowUp = asyncHandler(async (req, res) => {
  const followUp = await FollowUp.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Follow-up created successfully',
    data: followUp
  });
});

// Update follow-up
const updateFollowUp = asyncHandler(async (req, res) => {
  let followUp = await FollowUp.findById(req.params.id);

  if (!followUp) {
    throw new ErrorResponse('Follow-up not found', 404);
  }

  followUp = await FollowUp.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    message: 'Follow-up updated successfully',
    data: followUp
  });
});

// Delete follow-up
const deleteFollowUp = asyncHandler(async (req, res) => {
  const followUp = await FollowUp.findById(req.params.id);

  if (!followUp) {
    throw new ErrorResponse('Follow-up not found', 404);
  }

  await followUp.remove();

  res.status(200).json({
    success: true,
    message: 'Follow-up deleted successfully'
  });
});

// Update follow-up status
const updateFollowUpStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  let followUp = await FollowUp.findById(req.params.id);

  if (!followUp) {
    throw new ErrorResponse('Follow-up not found', 404);
  }

  followUp.status = status;
  await followUp.save();

  res.status(200).json({
    success: true,
    message: 'Follow-up status updated successfully',
    data: followUp
  });
});

// Get upcoming follow-ups
const getUpcomingFollowUps = asyncHandler(async (req, res) => {
  const { doctorId } = req.query;

  const followUps = await FollowUp.find({
    doctorId,
    status: 'pending',
    followUpDate: {
      $gte: moment().startOf('day'),
      $lte: moment().add(7, 'days').endOf('day')
    }
  })
    .populate('patientId', 'name email phone')
    .sort({ followUpDate: 1 });

  res.status(200).json({
    success: true,
    count: followUps.length,
    data: followUps
  });
});

module.exports = {
  getDoctorFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  updateFollowUpStatus,
  getUpcomingFollowUps
};