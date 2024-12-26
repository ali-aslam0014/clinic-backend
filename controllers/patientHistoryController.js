const PatientHistory = require('../models/PatientHistory');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Patient = require('../models/Patient');

exports.getPatientHistory = asyncHandler(async (req, res, next) => {
  const history = await PatientHistory.findOne({ patientId: req.params.patientId });

  if (!history) {
    return next(new ErrorResponse('No history found for this patient', 404));
  }

  res.status(200).json({
    success: true,
    data: history
  });
});

exports.createPatientHistory = asyncHandler(async (req, res, next) => {
  req.body.patientId = req.params.patientId;
  req.body.createdBy = req.user.id;

  const history = await PatientHistory.create(req.body);

  res.status(201).json({
    success: true,
    data: history
  });
});

exports.updatePatientHistory = asyncHandler(async (req, res, next) => {
  let history = await PatientHistory.findOne({ patientId: req.params.patientId });

  if (!history) {
    return next(new ErrorResponse('No history found for this patient', 404));
  }

  history = await PatientHistory.findByIdAndUpdate(history._id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: history
  });
});

exports.addAllergy = asyncHandler(async (req, res, next) => {
  const history = await PatientHistory.findOne({ patientId: req.params.patientId });

  if (!history) {
    return next(new ErrorResponse('No history found for this patient', 404));
  }

  history.allergies.push(req.body);
  await history.save();

  res.status(200).json({
    success: true,
    data: history
  });
});

exports.updateAllergy = asyncHandler(async (req, res, next) => {
  const history = await PatientHistory.findOne({ patientId: req.params.patientId });

  if (!history) {
    return next(new ErrorResponse('No history found for this patient', 404));
  }

  const allergyIndex = history.allergies.findIndex(
    allergy => allergy._id.toString() === req.params.allergyId
  );

  if (allergyIndex === -1) {
    return next(new ErrorResponse('Allergy not found', 404));
  }

  history.allergies[allergyIndex] = { ...history.allergies[allergyIndex], ...req.body };
  await history.save();

  res.status(200).json({
    success: true,
    data: history
  });
});

exports.deleteAllergy = asyncHandler(async (req, res, next) => {
  const history = await PatientHistory.findOne({ patientId: req.params.patientId });

  if (!history) {
    return next(new ErrorResponse('No history found for this patient', 404));
  }

  history.allergies = history.allergies.filter(
    allergy => allergy._id.toString() !== req.params.allergyId
  );
  await history.save();

  res.status(200).json({
    success: true,
    data: history
  });
});

exports.addMedication = asyncHandler(async (req, res, next) => {
  const history = await PatientHistory.findOne({ patientId: req.params.patientId });

  if (!history) {
    return next(new ErrorResponse('No history found for this patient', 404));
  }

  history.medications.push(req.body);
  await history.save();

  res.status(200).json({
    success: true,
    data: history
  });
});

exports.updateMedication = asyncHandler(async (req, res, next) => {
  const history = await PatientHistory.findOne({ patientId: req.params.patientId });

  if (!history) {
    return next(new ErrorResponse('No history found for this patient', 404));
  }

  const medicationIndex = history.medications.findIndex(
    medication => medication._id.toString() === req.params.medicationId
  );

  if (medicationIndex === -1) {
    return next(new ErrorResponse('Medication not found', 404));
  }

  history.medications[medicationIndex] = { ...history.medications[medicationIndex], ...req.body };
  await history.save();

  res.status(200).json({
    success: true,
    data: history
  });
});

exports.deleteMedication = asyncHandler(async (req, res, next) => {
  const history = await PatientHistory.findOne({ patientId: req.params.patientId });

  if (!history) {
    return next(new ErrorResponse('No history found for this patient', 404));
  }

  history.medications = history.medications.filter(
    medication => medication._id.toString() !== req.params.medicationId
  );
  await history.save();

  res.status(200).json({
    success: true,
    data: history
  });
});

// @desc    Get patient history for receptionist view
// @route   GET /api/patients/:patientId/history/receptionist
// @access  Private (Receptionist)
exports.getReceptionistPatientHistory = asyncHandler(async (req, res, next) => {
  const history = await PatientHistory.findOne({ patientId: req.params.patientId })
    .populate([
      {
        path: 'patientId',
        select: 'firstName lastName mrNumber'
      },
      {
        path: 'createdBy',
        select: 'name'
      }
    ]);

  if (!history) {
    return next(new ErrorResponse('No history found for this patient', 404));
  }

  // Format data for receptionist view (limited information)
  const formattedHistory = {
    patientInfo: {
      id: history.patientId._id,
      name: `${history.patientId.firstName} ${history.patientId.lastName}`,
      mrNumber: history.patientId.mrNumber
    },
    allergies: history.allergies.map(allergy => ({
      allergen: allergy.allergen,
      severity: allergy.severity,
      status: allergy.status
    })),
    medications: history.medications.map(med => ({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      status: med.status
    })),
    immunizations: history.immunizations.map(imm => ({
      vaccine: imm.vaccine,
      date: imm.date,
      status: imm.status
    })),
    socialHistory: {
      smoking: history.socialHistory?.smoking?.status || 'Not Recorded',
      alcohol: history.socialHistory?.alcohol?.status || 'Not Recorded'
    },
    lastUpdated: history.updatedAt,
    updatedBy: history.updatedBy ? history.updatedBy.name : history.createdBy.name
  };

  res.status(200).json({
    success: true,
    data: formattedHistory
  });
});