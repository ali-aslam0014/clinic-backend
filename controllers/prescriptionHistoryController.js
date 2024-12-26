const Prescription = require('../models/Prescription');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const moment = require('moment');

// Get prescription history with filters
const getPrescriptionHistory = asyncHandler(async (req, res) => {
  const {
    startDate,
    endDate,
    status,
    patientId,
    search,
    page = 1,
    limit = 10
  } = req.query;

  const query = { doctor: req.user._id };

  // Date range filter
  if (startDate && endDate) {
    query.date = {
      $gte: moment(startDate).startOf('day'),
      $lte: moment(endDate).endOf('day')
    };
  }

  // Status filter
  if (status) {
    query.status = status;
  }

  // Patient filter
  if (patientId) {
    query.patient = patientId;
  }

  // Search filter
  if (search) {
    query.$or = [
      { 'diagnosis.condition': { $regex: search, $options: 'i' } },
      { 'medications.name': { $regex: search, $options: 'i' } },
      { prescriptionId: { $regex: search, $options: 'i' } }
    ];
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { date: -1 },
    populate: [
      { path: 'patient', select: 'name age gender phone' },
      { path: 'doctor', select: 'name specialization' }
    ]
  };

  const prescriptions = await Prescription.paginate(query, options);

  res.status(200).json({
    success: true,
    data: prescriptions
  });
});

// Get version history of a prescription
const getVersionHistory = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('modificationHistory.modifiedBy', 'name');

  if (!prescription) {
    throw new ErrorResponse('Prescription not found', 404);
  }

  // Check ownership
  if (prescription.doctor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to view this prescription', 401);
  }

  res.status(200).json({
    success: true,
    data: prescription.modificationHistory
  });
});

// Get prescription statistics
const getPrescriptionStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const matchStage = {
    doctor: req.user._id
  };

  if (startDate && endDate) {
    matchStage.date = {
      $gte: moment(startDate).startOf('day').toDate(),
      $lte: moment(endDate).endOf('day').toDate()
    };
  }

  const stats = await Prescription.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          status: '$status',
          month: { $month: '$date' },
          year: { $year: '$date' }
        },
        count: { $sum: 1 },
        medications: { $push: '$medications' }
      }
    },
    {
      $sort: {
        '_id.year': -1,
        '_id.month': -1
      }
    }
  ]);

  // Process medication statistics
  const medicationStats = stats.reduce((acc, stat) => {
    stat.medications.flat().forEach(med => {
      if (!acc[med.name]) {
        acc[med.name] = 0;
      }
      acc[med.name]++;
    });
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: {
      prescriptionStats: stats,
      medicationStats
    }
  });
});

module.exports = {
  getPrescriptionHistory,
  getVersionHistory,
  getPrescriptionStats
};