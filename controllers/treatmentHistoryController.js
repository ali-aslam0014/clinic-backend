const asyncHandler = require('express-async-handler');
const TreatmentHistory = require('../models/TreatmentHistory');

// @desc    Get all treatments for a patient
const getPatientTreatments = asyncHandler(async (req, res) => {
  const treatments = await TreatmentHistory.find({ patientId: req.params.patientId })
    .populate('doctorId', 'name specialization')
    .sort('-visitDate');

  res.json({
    success: true,
    count: treatments.length,
    data: treatments
  });
});

// @desc    Get single treatment
const getTreatment = asyncHandler(async (req, res) => {
  const treatment = await TreatmentHistory.findById(req.params.id)
    .populate('doctorId', 'name specialization')
    .populate('patientId', 'name age gender');

  if (!treatment) {
    res.status(404);
    throw new Error('Treatment record not found');
  }

  res.json({
    success: true,
    data: treatment
  });
});

// @desc    Create treatment record
const createTreatment = asyncHandler(async (req, res) => {
  const treatment = await TreatmentHistory.create({
    ...req.body,
    patientId: req.params.patientId,
    doctorId: req.user._id
  });

  await treatment.populate('doctorId', 'name specialization');

  res.status(201).json({
    success: true,
    data: treatment
  });
});

// @desc    Update treatment record
const updateTreatment = asyncHandler(async (req, res) => {
  let treatment = await TreatmentHistory.findById(req.params.id);

  if (!treatment) {
    res.status(404);
    throw new Error('Treatment record not found');
  }

  // Check authorization
  if (treatment.doctorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Not authorized to update this record');
  }

  treatment = await TreatmentHistory.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('doctorId', 'name specialization');

  res.json({
    success: true,
    data: treatment
  });
});

// @desc    Delete treatment record
const deleteTreatment = asyncHandler(async (req, res) => {
  const treatment = await TreatmentHistory.findById(req.params.id);

  if (!treatment) {
    res.status(404);
    throw new Error('Treatment record not found');
  }

  // Check authorization
  if (treatment.doctorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Not authorized to delete this record');
  }

  await treatment.remove();

  res.json({
    success: true,
    data: {}
  });
});

// @desc    Add attachment to treatment record
const addTreatmentAttachment = asyncHandler(async (req, res) => {
  const treatment = await TreatmentHistory.findById(req.params.id);

  if (!treatment) {
    res.status(404);
    throw new Error('Treatment record not found');
  }

  if (!req.files) {
    res.status(400);
    throw new Error('Please upload a file');
  }

  const file = req.files.file;

  // Make sure the file is a valid type
  if (!file.mimetype.startsWith('image') && !file.mimetype.startsWith('application/pdf')) {
    res.status(400);
    throw new Error('Please upload an image or PDF file');
  }

  file.name = `treatment_${treatment._id}_${Date.now()}${path.parse(file.name).ext}`;

  file.mv(`./public/uploads/${file.name}`, async err => {
    if (err) {
      console.error(err);
      res.status(500);
      throw new Error('Problem with file upload');
    }

    await TreatmentHistory.findByIdAndUpdate(req.params.id, {
      $push: {
        attachments: {
          name: file.name,
          fileUrl: `/uploads/${file.name}`,
          fileType: file.mimetype
        }
      }
    });

    res.status(200).json({
      success: true,
      data: file.name
    });
  });
});

module.exports = {
  getPatientTreatments,
  getTreatment,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  addTreatmentAttachment
};