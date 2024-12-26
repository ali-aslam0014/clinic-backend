const DiagnosisRecord = require('../models/DiagnosisRecord');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all diagnosis records for a patient
exports.getDiagnosisRecords = asyncHandler(async (req, res, next) => {
  const records = await DiagnosisRecord.find({ patientId: req.params.patientId })
    .populate('doctorId', 'name specialization')
    .sort('-diagnosisDate');

  res.status(200).json({
    success: true,
    count: records.length,
    data: records
  });
});

// @desc    Get single diagnosis record
exports.getDiagnosisRecord = asyncHandler(async (req, res, next) => {
  const record = await DiagnosisRecord.findById(req.params.id)
    .populate('doctorId', 'name specialization')
    .populate('patientId', 'name age gender');

  if (!record) {
    return next(new ErrorResponse('Diagnosis record not found', 404));
  }

  res.status(200).json({
    success: true,
    data: record
  });
});

// @desc    Create diagnosis record
exports.createDiagnosisRecord = asyncHandler(async (req, res, next) => {
  req.body.doctorId = req.user.id;
  req.body.patientId = req.params.patientId;

  const record = await DiagnosisRecord.create(req.body);

  res.status(201).json({
    success: true,
    data: record
  });
});

// @desc    Update diagnosis record
exports.updateDiagnosisRecord = asyncHandler(async (req, res) => {
  const { patientId, id } = req.params;
  
  let diagnosisRecord = await DiagnosisRecord.findOne({
    _id: id,
    patient: patientId
  });

  if (!diagnosisRecord) {
    throw new ErrorResponse('Diagnosis record not found', 404);
  }

  // Check if user is authorized to update
  if (diagnosisRecord.doctor.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to update this record', 401);
  }

  diagnosisRecord = await DiagnosisRecord.findByIdAndUpdate(
    id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.json({
    success: true,
    data: diagnosisRecord
  });
});

// @desc    Delete diagnosis record
exports.deleteDiagnosisRecord = asyncHandler(async (req, res, next) => {
  const record = await DiagnosisRecord.findById(req.params.id);

  if (!record) {
    return next(new ErrorResponse('Diagnosis record not found', 404));
  }

  // Make sure user is record owner
  if (record.doctorId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to delete this record', 401));
  }

  await record.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Add attachment to diagnosis record
exports.addDiagnosisAttachment = asyncHandler(async (req, res, next) => {
  const record = await DiagnosisRecord.findById(req.params.id);

  if (!record) {
    return next(new ErrorResponse('Diagnosis record not found', 404));
  }

  // Check if file was uploaded
  if (!req.files) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  const file = req.files.file;

  // Make sure the file is a valid type
  if (!file.mimetype.startsWith('image') && !file.mimetype.startsWith('application/pdf')) {
    return next(new ErrorResponse('Please upload an image or PDF file', 400));
  }

  // Create custom filename
  file.name = `diagnosis_${record._id}_${Date.now()}${path.parse(file.name).ext}`;

  // Upload file
  await file.mv(`./public/uploads/${file.name}`);

  // Add to record attachments
  record.attachments.push({
    name: file.name,
    fileUrl: `/uploads/${file.name}`,
    fileType: file.mimetype
  });

  await record.save();

  res.status(200).json({
    success: true,
    data: record
  });
});