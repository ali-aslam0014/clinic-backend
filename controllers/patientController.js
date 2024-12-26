const asyncHandler = require('express-async-handler');
const Patient = require('../models/Patient');
const ErrorResponse = require('../utils/errorResponse');
const MedicalRecord = require('../models/MedicalRecord');
const Document = require('../models/Document');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const moment = require('moment');
const getPagination = require('../utils/pagination');
const Appointment = require('../models/Appointment');

// @desc    Get all patients with pagination and search
// @route   GET /api/patients
// @access  Private
const getPatients = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Patient.countDocuments();

  const query = Patient.find()
    .populate('createdBy', 'name')
    .sort('-createdAt')
    .skip(startIndex)
    .limit(limit);

  // Search functionality
  if (req.query.search) {
    query.or([
      { firstName: { $regex: req.query.search, $options: 'i' } },
      { lastName: { $regex: req.query.search, $options: 'i' } },
      { patientId: { $regex: req.query.search, $options: 'i' } },
      { contactNumber: { $regex: req.query.search, $options: 'i' } }
    ]);
  }

  // Filter by status
  if (req.query.status) {
    query.where('status').equals(req.query.status);
  }

  const patients = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = { page: page + 1, limit };
  }

  if (startIndex > 0) {
    pagination.prev = { page: page - 1, limit };
  }

  res.json({
    success: true,
    count: patients.length,
    pagination,
    data: patients
  });
});

// @desc    Get single patient with related data
// @route   GET /api/patients/:id
// @access  Private
const getPatientById = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id)
    .populate('createdBy', 'name')
    .populate('appointments')
    .populate('bills')
    .populate('documents');

  if (!patient) {
    throw new ErrorResponse('Patient not found', 404);
  }

  res.json({
    success: true,
    data: patient
  });
});

// @desc    Create new patient
// @route   POST /api/v1/patients
// @access  Private
const createPatient = asyncHandler(async (req, res) => {
  try {
    console.log('Received data:', req.body);

    // Create patient data object
    const patientData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      patientId: req.body.patientId,
      email: req.body.email,
      contactNumber: req.body.contactNumber, // This maps to 'phone' in validation
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      bloodGroup: req.body.bloodGroup,
      address: req.body.address,
      status: req.body.status || 'ACTIVE',
      createdBy: req.user._id, // Get from authenticated user
      image: req.file ? req.file.path : undefined,
      emergencyContact: req.body.emergencyContact ? JSON.parse(req.body.emergencyContact) : undefined
    };

    console.log('Formatted patient data:', patientData);

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'patientId', 'email', 'contactNumber', 'dateOfBirth', 'gender'];
    const missingFields = requiredFields.filter(field => !patientData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const patient = await Patient.create(patientData);

    res.status(201).json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Error in createPatient:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error creating patient'
    });
  }
});

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private
const updatePatient = asyncHandler(async (req, res) => {
  let patient = await Patient.findById(req.params.id);

  if (!patient) {
    throw new ErrorResponse('Patient not found', 404);
  }

  patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.json({
    success: true,
    data: patient
  });
});

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Private
const deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    throw new ErrorResponse('Patient not found', 404);
  }

  await patient.remove();

  res.json({
    success: true,
    data: {}
  });
});

// @desc    Get patient appointments
// @route   GET /api/patients/:id/appointments
// @access  Private
const getPatientAppointments = asyncHandler(async (req, res) => {
  console.log('Fetching appointments for patient:', req.params.id); // Debug log

  const appointments = await Appointment.find({ 
    patient: req.params.id 
  })
  .populate('doctor', 'firstName lastName')
  .populate('patient', 'firstName lastName');

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments
  });
});

// @desc    Get patient bills
// @route   GET /api/patients/:id/bills
// @access  Private
const getPatientBills = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id).populate('bills');
  
  if (!patient) {
    throw new ErrorResponse('Patient not found', 404);
  }

  res.json({
    success: true,
    data: patient.bills
  });
});

// @desc    Get patient documents
// @route   GET /api/patients/:id/documents
// @access  Private
const getPatientDocuments = asyncHandler(async (req, res) => {
  const documents = await Document.find({ 
    patient: req.params.id,
    $or: [
      { isPrivate: false },
      { uploadedBy: req.user.id }
    ]
  })
    .populate('uploadedBy', 'name')
    .sort('-createdAt');

  res.json({
    success: true,
    count: documents.length,
    data: documents
  });
});

// @desc    Get patient medical records
// @route   GET /api/patients/:id/medical-records
// @access  Private
const getPatientMedicalRecords = asyncHandler(async (req, res) => {
  const records = await MedicalRecord.find({ patient: req.params.id })
    .populate('doctor', 'name')
    .sort('-date');

  res.json({
    success: true,
    count: records.length,
    data: records
  });
});

// @desc    Add medical record
// @route   POST /api/patients/:id/medical-records
// @access  Private
const addMedicalRecord = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    throw new ErrorResponse('Patient not found', 404);
  }

  req.body.patient = req.params.id;
  req.body.doctor = req.user.id;

  const record = await MedicalRecord.create(req.body);

  res.status(201).json({
    success: true,
    data: record
  });
});

// @desc    Upload patient document
// @route   POST /api/patients/:id/documents
// @access  Private
const uploadDocument = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    throw new ErrorResponse('Patient not found', 404);
  }

  // Handle file upload here (you'll need to implement file upload middleware)
  if (!req.file) {
    throw new ErrorResponse('Please upload a file', 400);
  }

  const document = await Document.create({
    patient: req.params.id,
    name: req.body.name,
    type: req.body.type,
    fileUrl: req.file.path, // This will come from your file upload middleware
    fileType: req.file.mimetype,
    uploadedBy: req.user.id,
    description: req.body.description,
    tags: req.body.tags,
    isPrivate: req.body.isPrivate
  });

  res.status(201).json({
    success: true,
    data: document
  });
});

// @desc    Update medical record
// @route   PUT /api/patients/:patientId/medical-records/:id
// @access  Private
const updateMedicalRecord = asyncHandler(async (req, res) => {
  let record = await MedicalRecord.findById(req.params.id);

  if (!record) {
    throw new ErrorResponse('Medical record not found', 404);
  }

  // Make sure user is record owner
  if (record.doctor.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to update this record', 401);
  }

  record = await MedicalRecord.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.json({
    success: true,
    data: record
  });
});

// @desc    Get patient profile
// @route   GET /api/patients/profile
// @access  Private (Patient)
const getMyProfile = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.user.id)
    .select('-createdBy -__v');

  if (!patient) {
    throw new ErrorResponse('Patient not found', 404);
  }

  res.json({
    success: true,
    data: patient
  });
});

// @desc    Update patient profile
// @route   PUT /api/patients/profile
// @access  Private (Patient)
const updateMyProfile = asyncHandler(async (req, res) => {
  // Fields to allow updating
  const fieldsToUpdate = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    contactNumber: req.body.contactNumber,
    email: req.body.email,
    address: req.body.address,
    emergencyContact: req.body.emergencyContact,
    bloodGroup: req.body.bloodGroup,
    dateOfBirth: req.body.dateOfBirth,
    gender: req.body.gender
  };

  const patient = await Patient.findByIdAndUpdate(
    req.user.id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true
    }
  );

  res.json({
    success: true,
    data: patient
  });
});

// @desc    Upload profile image
// @route   PUT /api/patients/profile/image
// @access  Private (Patient)
const updateProfileImage = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.user.id);

  if (!patient) {
    throw new ErrorResponse('Patient not found', 404);
  }

  if (!req.file) {
    throw new ErrorResponse('Please upload a file', 400);
  }

  // Update profile image field
  patient.profileImage = req.file.path;
  await patient.save();

  res.json({
    success: true,
    data: {
      url: patient.profileImage
    }
  });
});

// @desc    Update medical history
// @route   PUT /api/patients/profile/medical-history
// @access  Private (Patient)
const updateMedicalHistory = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.user.id);

  if (!patient) {
    throw new ErrorResponse('Patient not found', 404);
  }

  // Update medical history fields
  if (req.body.allergies) {
    patient.allergies = req.body.allergies;
  }
  
  if (req.body.medicalHistory) {
    patient.medicalHistory = req.body.medicalHistory;
  }
  
  if (req.body.currentMedications) {
    patient.currentMedications = req.body.currentMedications;
  }

  await patient.save();

  res.json({
    success: true,
    data: patient
  });
});

// @desc    Search patients
const searchPatients = asyncHandler(async (req, res) => {
  const { type, value } = req.query;

  if (!type || !value) {
    throw new ErrorResponse('Please provide search type and value', 400);
  }

  // Validate search type
  const validTypes = ['phone', 'mrNumber', 'name', 'cnic'];
  if (!validTypes.includes(type)) {
    throw new ErrorResponse(`Invalid search type. Must be one of: ${validTypes.join(', ')}`, 400);
  }

  // Validate value length
  if (value.length < 2) {
    throw new ErrorResponse('Search value must be at least 2 characters long', 400);
  }

  let query = {};

  // Build search query based on type
  switch (type) {
    case 'phone':
      query.contactNumber = new RegExp(value, 'i');
      break;
    
    case 'mrNumber':
      query.mrNumber = new RegExp(value, 'i');
      break;
    
    case 'name':
      query.$or = [
        { firstName: new RegExp(value, 'i') },
        { lastName: new RegExp(value, 'i') }
      ];
      break;
    
    case 'cnic':
      query.cnic = new RegExp(value, 'i');
      break;
    
    default:
      throw new ErrorResponse('Invalid search type', 400);
  }

  const patients = await Patient.find(query)
    .select('-password -__v')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: patients.length,
    data: patients
  });
});

// @desc    Get patient details
const getPatientDetails = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id)
    .select('-password -__v')
    .populate({
      path: 'appointments',
      select: 'appointmentDate timeSlot status type doctorId',
      populate: {
        path: 'doctorId',
        select: 'name specialization'
      }
    });

  if (!patient) {
    throw new ErrorResponse('Patient not found', 404);
  }

  res.status(200).json({
    success: true,
    data: patient
  });
});

// @desc    Get patient card details
// @route   GET /api/patients/:id/card
// @access  Private (Receptionist)
const getPatientCard = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id)
    .select('-password -__v')
    .populate('createdBy', 'name');

  if (!patient) {
    throw new ErrorResponse('Patient not found', 404);
  }

  res.status(200).json({
    success: true,
    data: patient
  });
});

// @desc    Generate PDF patient card
// @route   GET /api/patients/:id/card/pdf
// @access  Private (Receptionist)
const generatePatientCard = asyncHandler(async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .select('-password -__v')
      .populate('createdBy', 'name');

    if (!patient) {
      throw new ErrorResponse('Patient not found', 404);
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A6',
      margins: {
        top: 20,
        bottom: 20,
        left: 40,
        right: 40
      }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=patient-card-${patient._id}.pdf`);

    // Handle errors in PDF generation
    doc.on('error', (err) => {
      console.error('PDF Generation Error:', err);
      throw new ErrorResponse('Error generating PDF', 500);
    });

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add hospital logo if exists
    if (process.env.HOSPITAL_LOGO) {
      doc.image(process.env.HOSPITAL_LOGO, {
        fit: [100, 100],
        align: 'center'
      });
    }

    // Add content to PDF
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Patient Card', { align: 'center' })
      .moveDown();

    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Patient ID: ${patient.mrNumber}`)
      .text(`Name: ${patient.firstName} ${patient.lastName}`)
      .text(`Gender: ${patient.gender}`)
      .text(`Blood Group: ${patient.bloodGroup}`)
      .text(`Date of Birth: ${moment(patient.dateOfBirth).format('DD-MM-YYYY')}`)
      .text(`Contact: ${patient.contactNumber}`)
      .moveDown();

  // Emergency contact
  doc
    .font('Helvetica-Bold')
    .text('Emergency Contact')
    .font('Helvetica')
    .text(`Name: ${patient.emergencyContact?.name || 'N/A'}`)
    .text(`Relationship: ${patient.emergencyContact?.relationship || 'N/A'}`)
    .text(`Phone: ${patient.emergencyContact?.phone || 'N/A'}`)
    .moveDown();

    // Add QR Code if needed
    if (process.env.FRONTEND_URL) {
      const qrCode = await QRCode.toDataURL(`${process.env.FRONTEND_URL}/patients/${patient._id}`);
      doc.image(qrCode, {
        fit: [100, 100],
        align: 'center'
      });
    }

    // Add footer
    doc
      .fontSize(10)
      .text('Valid from: ' + moment(patient.createdAt).format('DD-MM-YYYY'), { align: 'center' })
      .text('This card must be presented during hospital visits', { align: 'center' })
      .moveDown()
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(process.env.HOSPITAL_NAME || 'Your Hospital Name', { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error in generatePatientCard:', error);
    if (!res.headersSent) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Error generating patient card'
      });
    }
  }
});

// @desc    Get patient history
const getPatientHistory = asyncHandler(async (req, res) => {
  const history = await Patient.findById(req.params.id)
    .select('-password -__v')
    .populate([
      {
        path: 'appointments',
        select: 'appointmentDate timeSlot status type doctorId diagnosis prescription',
        populate: {
          path: 'doctorId',
          select: 'name specialization'
        }
      },
      {
        path: 'prescriptions',
        select: 'date medicines diagnosis notes doctorId',
        populate: {
          path: 'doctorId',
          select: 'name specialization'
        }
      },
      {
        path: 'labReports',
        select: 'date testType result status'
      }
    ]);

  if (!history) {
    throw new ErrorResponse('Patient not found', 404);
  }

  res.status(200).json({
    success: true,
    data: history
  });
});

// @desc    Get patients for doctor
// @route   GET /api/v1/doctor/patients
// @access  Private (Doctor only)
const getDoctorPatients = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Get doctor's ID from authenticated user
  const doctorId = req.user._id;
  
  // Create base query with doctor filter
  let query = {
    assignedDoctor: doctorId
  };

  // Add search functionality
  if (req.query.search) {
    query = {
      ...query,
      $or: [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { patientId: { $regex: req.query.search, $options: 'i' } },
        { contactNumber: { $regex: req.query.search, $options: 'i' } }
      ]
    };
  }

  // Get total count for pagination
  const total = await Patient.countDocuments(query);
  const pagination = getPagination(page, limit, total);

  // Execute query with pagination
  const patients = await Patient.find(query)
    .populate('assignedDoctor', 'name')
    .sort('-createdAt')
    .skip(startIndex)
    .limit(limit);

  console.log('Doctor ID:', doctorId);
  console.log('Query:', query);
  console.log('Found Patients:', patients.length);

  res.json({
    success: true,
    count: patients.length,
    pagination,
    data: patients
  });
});

const getPatient = asyncHandler(async (req, res) => {
  try {
    console.log('Fetching patient with ID:', req.params.id); // Debug log

    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Error in getPatient:', error); // Debug log
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching patient'
    });
  }
});

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientAppointments,
  getPatientBills,
  getPatientDocuments,
  getPatientMedicalRecords,
  addMedicalRecord,
  uploadDocument,
  updateMedicalRecord,
  getMyProfile,
  updateMyProfile,
  updateProfileImage,
  updateMedicalHistory,
  searchPatients,
  getPatientDetails,
  getPatientCard,
  generatePatientCard,
  getPatientHistory,
  getDoctorPatients,
  getPatient
};
