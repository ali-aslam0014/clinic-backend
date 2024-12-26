const asyncHandler = require('express-async-handler');
const TreatmentPlan = require('../models/TreatmentPlan');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all treatment plans for a patient
// @route   GET /api/patients/:patientId/treatment-plans
// @access  Private
exports.getTreatmentPlans = asyncHandler(async (req, res) => {
  const plans = await TreatmentPlan.find({ patient: req.params.patientId })
    .populate('doctor', 'name')
    .sort('-startDate');

  res.json({
    success: true,
    count: plans.length,
    data: plans
  });
});

// @desc    Get single treatment plan
// @route   GET /api/patients/:patientId/treatment-plans/:id
// @access  Private
exports.getTreatmentPlan = asyncHandler(async (req, res) => {
  const plan = await TreatmentPlan.findById(req.params.id)
    .populate('doctor', 'name')
    .populate('patient', 'firstName lastName patientId');

  if (!plan) {
    throw new ErrorResponse('Treatment plan not found', 404);
  }

  res.json({
    success: true,
    data: plan
  });
});

// @desc    Create treatment plan
// @route   POST /api/patients/:patientId/treatment-plans
// @access  Private
exports.createTreatmentPlan = asyncHandler(async (req, res) => {
  req.body.patient = req.params.patientId;
  req.body.doctor = req.user.id;

  const plan = await TreatmentPlan.create(req.body);

  res.status(201).json({
    success: true,
    data: plan
  });
});

// @desc    Update treatment plan
// @route   PUT /api/patients/:patientId/treatment-plans/:id
// @access  Private
exports.updateTreatmentPlan = asyncHandler(async (req, res) => {
  let plan = await TreatmentPlan.findById(req.params.id);

  if (!plan) {
    throw new ErrorResponse('Treatment plan not found', 404);
  }

  // Make sure user is plan owner
  if (plan.doctor.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to update this plan', 401);
  }

  plan = await TreatmentPlan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.json({
    success: true,
    data: plan
  });
});

// @desc    Delete treatment plan
// @route   DELETE /api/patients/:patientId/treatment-plans/:id
// @access  Private
exports.deleteTreatmentPlan = asyncHandler(async (req, res) => {
  const plan = await TreatmentPlan.findById(req.params.id);

  if (!plan) {
    throw new ErrorResponse('Treatment plan not found', 404);
  }

  // Make sure user is plan owner
  if (plan.doctor.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to delete this plan', 401);
  }

  await plan.remove();

  res.json({
    success: true,
    data: {}
  });
});

// @desc    Update treatment plan progress
// @route   POST /api/patients/:patientId/treatment-plans/:id/progress
// @access  Private
exports.updateProgress = asyncHandler(async (req, res) => {
  const plan = await TreatmentPlan.findById(req.params.id);

  if (!plan) {
    throw new ErrorResponse('Treatment plan not found', 404);
  }

  plan.progress.push({
    ...req.body,
    recordedBy: req.user.id,
    date: new Date()
  });

  await plan.save();

  res.json({
    success: true,
    data: plan
  });
});

// @desc    Update goal status
// @route   PUT /api/patients/:patientId/treatment-plans/:id/goals/:goalId
// @access  Private
exports.updateGoalStatus = asyncHandler(async (req, res) => {
  const plan = await TreatmentPlan.findById(req.params.id);

  if (!plan) {
    throw new ErrorResponse('Treatment plan not found', 404);
  }

  const goal = plan.goals.id(req.params.goalId);
  if (!goal) {
    throw new ErrorResponse('Goal not found', 404);
  }

  goal.status = req.body.status;
  goal.notes = req.body.notes;

  await plan.save();

  res.json({
    success: true,
    data: plan
  });
});