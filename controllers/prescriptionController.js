const asyncHandler = require('express-async-handler');
const Prescription = require('../models/prescriptionModel');
const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');
const moment = require('moment');

// @desc    Create new prescription
// @route   POST /api/prescriptions
// @access  Private
const createPrescription = asyncHandler(async (req, res) => {
  req.body.doctorId = req.user._id;
  
  const prescription = await Prescription.create(req.body);
  
  await prescription.populate([
    { path: 'patientId', select: 'name age gender contactNumber' },
    { path: 'doctorId', select: 'name specialization' },
    { path: 'medicines.medicine', select: 'name type dosageForm strength' }
  ]);
  
  res.status(201).json({
    success: true,
    data: prescription
  });
});

// @desc    Get all prescriptions
// @route   GET /api/prescriptions
// @access  Private
const getPrescriptions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  let query = {};
  
  // Enhanced filtering options
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  if (req.query.date) {
    query.prescriptionDate = {
      $gte: new Date(req.query.date),
      $lt: new Date(new Date(req.query.date).setDate(new Date(req.query.date).getDate() + 1))
    };
  }

  if (req.query.dateRange) {
    const [startDate, endDate] = req.query.dateRange.split(',');
    query.prescriptionDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  if (req.query.search) {
    query.$or = [
      { 'diagnosis.condition': { $regex: req.query.search, $options: 'i' } },
      { 'notes': { $regex: req.query.search, $options: 'i' } },
      { 'medicines.instructions': { $regex: req.query.search, $options: 'i' } }
    ];
  }

  if (req.query.medicine) {
    query['medicines.medicine'] = req.query.medicine;
  }

  if (req.query.doctor) {
    query.doctorId = req.query.doctor;
  }

  const prescriptions = await Prescription.find(query)
    .populate('patientId', 'name age gender contactNumber')
    .populate('doctorId', 'name specialization')
    .populate('medicines.medicine')
    .sort({ prescriptionDate: -1 })
    .skip(startIndex)
    .limit(limit);

  const total = await Prescription.countDocuments(query);

  res.json({
    success: true,
    count: prescriptions.length,
    total,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit)
    },
    data: prescriptions
  });
});

// @desc    Get prescription by ID
// @route   GET /api/prescriptions/:id
// @access  Private
const getPrescriptionById = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('patientId', 'name age gender contactNumber')
    .populate('doctorId', 'name specialization')
    .populate('medicines.medicine');

  if (!prescription) {
    res.status(404);
    throw new Error('Prescription not found');
  }

  res.json({
    success: true,
    data: prescription
  });
});

// @desc    Update prescription
// @route   PUT /api/prescriptions/:id
// @access  Private
const updatePrescription = asyncHandler(async (req, res) => {
  let prescription = await Prescription.findById(req.params.id);

  if (!prescription) {
    res.status(404);
    throw new Error('Prescription not found');
  }

  // Check if user is authorized to update
  if (prescription.doctorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this prescription');
  }

  // Check if prescription is already dispensed
  if (prescription.status === 'Dispensed') {
    res.status(400);
    throw new Error('Cannot modify dispensed prescription');
  }

  prescription = await Prescription.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate(['patientId', 'doctorId', 'medicines.medicine']);

  res.json({
    success: true,
    data: prescription
  });
});

// @desc    Delete prescription
// @route   DELETE /api/prescriptions/:id
// @access  Private
const deletePrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);

  if (!prescription) {
    res.status(404);
    throw new Error('Prescription not found');
  }

  // Check if user is authorized to delete
  if (prescription.doctorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this prescription');
  }

  // Check if prescription is already dispensed
  if (prescription.status === 'Dispensed') {
    res.status(400);
    throw new Error('Cannot delete dispensed prescription');
  }

  await prescription.remove();

  res.json({
    success: true,
    data: {}
  });
});

// @desc    Get patient prescriptions
// @route   GET /api/patients/:patientId/prescriptions
// @access  Private
const getPatientPrescriptions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const prescriptions = await Prescription.find({ patientId: req.params.patientId })
    .populate('doctorId', 'name specialization')
    .populate('medicines.medicine')
    .sort({ prescriptionDate: -1 })
    .skip(startIndex)
    .limit(limit);

  const total = await Prescription.countDocuments({ patientId: req.params.patientId });

  res.json({
    success: true,
    count: prescriptions.length,
    total,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit)
    },
    data: prescriptions
  });
});

// @desc    Get active prescriptions for patient dashboard
// @route   GET /api/prescriptions/active
// @access  Private (Patient)
const getActivePrescriptions = asyncHandler(async (req, res) => {
  const currentDate = new Date();
  
  const prescriptions = await Prescription.find({
    patient: req.user._id,
    status: 'Active',
    template: false,
    // Check if prescription is within 30 days from issue date
    date: {
      $gte: new Date(currentDate.setDate(currentDate.getDate() - 30))
    }
  })
  .populate('doctor', 'name specialization profileImage')
  .populate('medicines.medicine', 'name type dosageForm strength')
  .sort({ date: -1 })
  .limit(5);

  // Add additional information for each prescription
  const enhancedPrescriptions = prescriptions.map(prescription => {
    const issueDate = new Date(prescription.date);
    const expiryDate = new Date(issueDate);
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    return {
      ...prescription._doc,
      issuedOn: moment(issueDate).format('MMMM DD, YYYY'),
      expiresOn: moment(expiryDate).format('MMMM DD, YYYY'),
      remainingDays: Math.max(0, Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))),
      isExpiringSoon: Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) <= 5,
      totalMedicines: prescription.medications.length
    };
  });

  res.status(200).json({
    success: true,
    count: enhancedPrescriptions.length,
    data: enhancedPrescriptions
  });
});

// @desc    Mark prescription as dispensed
// @route   PUT /api/prescriptions/:id/dispense
// @access  Private
const dispensePrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);

  if (!prescription) {
    res.status(404);
    throw new Error('Prescription not found');
  }

  if (prescription.status === 'Dispensed') {
    res.status(400);
    throw new Error('Prescription already dispensed');
  }

  prescription.status = 'Dispensed';
  prescription.dispensedBy = req.user._id;
  prescription.dispensedAt = new Date();

  await prescription.save();

  res.json({
    success: true,
    data: prescription
  });
});

// Create prescription from template
const createFromTemplate = asyncHandler(async (req, res) => {
  const { templateId } = req.body;
  const template = await Prescription.findOne({ _id: templateId, template: true });
  
  if (!template) {
    throw new ErrorResponse('Template not found', 404);
  }

  const prescription = new Prescription({
    ...template.toObject(),
    _id: undefined,
    template: false,
    date: new Date(),
    doctor: req.user._id,
    patient: req.body.patientId
  });

  await prescription.save();
  
  res.status(201).json({
    success: true,
    data: prescription
  });
});

// Save as template
const saveAsTemplate = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);
  
  if (!prescription) {
    throw new ErrorResponse('Prescription not found', 404);
  }

  const template = new Prescription({
    ...prescription.toObject(),
    _id: undefined,
    template: true,
    name: req.body.templateName
  });

  await template.save();

  res.status(201).json({
    success: true,
    data: template
  });
});

// Generate PDF
const generatePDF = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('patient', 'name age gender contactNumber')
    .populate('doctor', 'name specialization signature');

  if (!prescription) {
    throw new ErrorResponse('Prescription not found', 404);
  }

  const pdfBuffer = await prescription.generatePDF();

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=prescription-${prescription.prescriptionId}.pdf`
  });

  res.send(pdfBuffer);
});

// Send to pharmacy
const sendToPharmacy = asyncHandler(async (req, res) => {
  const { pharmacyId } = req.body;
  const prescription = await Prescription.findById(req.params.id);

  if (!prescription) {
    throw new ErrorResponse('Prescription not found', 404);
  }

  await prescription.sendToPharmacy(pharmacyId);

  res.status(200).json({
    success: true,
    message: 'Prescription sent to pharmacy successfully'
  });
});

// Get prescription statistics
const getPrescriptionStats = asyncHandler(async (req, res) => {
  const stats = await Prescription.aggregate([
    {
      $match: {
        doctor: mongoose.Types.ObjectId(req.user._id),
        template: false
      }
    },
    {
      $group: {
        _id: {
          month: { $month: '$date' },
          year: { $year: '$date' }
        },
        count: { $sum: 1 },
        medications: { $push: '$medications' }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: stats
  });
});

// @desc    Get patient's own prescriptions
// @route   GET /api/prescriptions/my-prescriptions
// @access  Private (Patient)
const getMyPrescriptions = asyncHandler(async (req, res) => {
  const prescriptions = await Prescription.find({ 
    patient: req.user._id,
    template: false 
  })
  .populate('doctor', 'name specialization')
  .sort({ date: -1 });

  res.status(200).json({
    success: true,
    count: prescriptions.length,
    data: prescriptions
  });
});

// @desc    Get single prescription detail for patient
// @route   GET /api/prescriptions/my-prescriptions/:id
// @access  Private (Patient)
const getMyPrescriptionDetail = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findOne({
    _id: req.params.id,
    patient: req.user._id
  }).populate('doctor', 'name specialization');

  if (!prescription) {
    throw new ErrorResponse('Prescription not found', 404);
  }

  res.status(200).json({
    success: true,
    data: prescription
  });
});

// @desc    Download prescription PDF
// @route   GET /api/prescriptions/my-prescriptions/:id/download
// @access  Private (Patient)
const downloadMyPrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findOne({
    _id: req.params.id,
    patient: req.user._id
  }).populate([
    { path: 'doctor', select: 'name specialization signature' },
    { path: 'patient', select: 'name age gender contactNumber' }
  ]);

  if (!prescription) {
    throw new ErrorResponse('Prescription not found', 404);
  }

  const pdfBuffer = await prescription.generatePDF();

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=prescription-${prescription.prescriptionId}.pdf`
  });

  res.send(pdfBuffer);
});

module.exports = {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  updatePrescription,
  deletePrescription,
  getPatientPrescriptions,
  getActivePrescriptions,
  dispensePrescription,
  createFromTemplate,
  saveAsTemplate,
  generatePDF,
  sendToPharmacy,
  getPrescriptionStats,
  getMyPrescriptions,
  getMyPrescriptionDetail,
  downloadMyPrescription
};