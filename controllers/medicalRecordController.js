const asyncHandler = require('express-async-handler');
const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/patientModel');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all medical records for a patient
// @route   GET /api/v1/medical-records/:patientId
// @access  Private
exports.getMedicalRecords = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  
  if (!patientId) {
    return res.status(400).json({
      success: false,
      error: 'Patient ID is required'
    });
  }

  try {
    const records = await MedicalRecord.find({ patient: patientId })
      .populate('doctorId', 'name')
      .sort('-visitDate');

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching medical records'
    });
  }
});

// @desc    Create medical record
// @route   POST /api/v1/doctor/medical-records
// @access  Private/Doctor
exports.createMedicalRecord = asyncHandler(async (req, res) => {
  try {
    console.log('Received data:', req.body); // Debug log

    if (!req.body.patient) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID is required'
      });
    }

    const medicalRecord = await MedicalRecord.create({
      ...req.body,
      doctorId: req.user._id,
      visitDate: req.body.visitDate || new Date()
    });

    res.status(201).json({
      success: true,
      data: medicalRecord
    });
  } catch (error) {
    console.error('Error creating medical record:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating medical record'
    });
  }
});

// Update medical record
exports.updateMedicalRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    let record = await MedicalRecord.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Medical record not found'
      });
    }

    record = await MedicalRecord.findByIdAndUpdate(
      id, 
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Error updating medical record:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating medical record'
    });
  }
});

// Delete medical record
exports.deleteMedicalRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const record = await MedicalRecord.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Medical record not found'
      });
    }

    await record.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting medical record:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting medical record'
    });
  }
});

// Update status
exports.updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const record = await MedicalRecord.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Medical record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating status'
    });
  }
});

// @desc    Add attachment to medical record
// @route   POST /api/v1/medical-records/:id/attachments
// @access  Private
exports.addAttachment = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);

  if (!record) {
    return res.status(404).json({
      success: false,
      error: 'Medical record not found'
    });
  }

  if (!req.files) {
    return res.status(400).json({
      success: false,
      error: 'Please upload a file'
    });
  }

  const file = req.files.attachments;
  const fileName = `medical_record_${record._id}_${Date.now()}${path.extname(file.name)}`;

  // Move file to uploads directory
  await file.mv(`./uploads/medical-records/${fileName}`);

  // Add file to record attachments
  record.attachments.push({
    fileName,
    filePath: `/uploads/medical-records/${fileName}`,
    fileType: file.mimetype
  });

  await record.save();

  res.status(200).json({
    success: true,
    data: fileName
  });
});

// @desc    Get all medical records for logged in doctor
// @route   GET /api/v1/doctor/medical-records
// @access  Private/Doctor
exports.getDoctorMedicalRecords = asyncHandler(async (req, res) => {
  try {
    const records = await MedicalRecord.find({ doctorId: req.user._id })
      .populate('patient', 'firstName lastName patientId')
      .sort('-visitDate');

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching medical records'
    });
  }
});