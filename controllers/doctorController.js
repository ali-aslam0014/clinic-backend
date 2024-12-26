const Doctor = require('../models/doctorModel');
const multer = require('multer');
const path = require('path');
const LeaveSchedule = require('../models/LeaveSchedule');
const Appointment = require('../models/Appointment');
const moment = require('moment');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/doctors');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doctor-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
}).single('image');

// Get all doctors
const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find();
    res.status(200).json({
      success: true,
      data: doctors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add new doctor
const addDoctor = async (req, res) => {
  try {
    console.log('Adding doctor with data:', {
      body: req.body,
      file: req.file
    });

    // Create doctor data object
    const doctorData = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      specialization: req.body.specialization,
      experience: req.body.experience,
      qualifications: req.body.qualifications,
      address: req.body.address,
      consultationFee: req.body.consultationFee,
      image: req.file ? `/uploads/doctors/${req.file.filename}` : ''
    };

    console.log('Doctor data to save:', doctorData);

    // Create new doctor
    const newDoctor = new Doctor(doctorData);
    const savedDoctor = await newDoctor.save();

    console.log('Doctor saved:', savedDoctor);

    res.status(201).json({
      success: true,
      message: 'Doctor added successfully',
      data: savedDoctor
    });
  } catch (error) {
    console.error('Error in addDoctor:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error adding doctor'
    });
  }
};

// Get doctor by ID
const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update doctor
const updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Doctor updated successfully',
      data: doctor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete doctor
const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Doctor deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Search doctors with filters
// @route   GET /api/v1/doctors/search
// @access  Public
const searchDoctors = async (req, res) => {
  try {
    const {
      search,
      specialization,
      experience,
      gender,
      availability,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    // Search by name or specialization
    if (search) {
      query.$or = [
        { 'user.name': { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by specialization
    if (specialization) {
      query.specialization = specialization;
    }

    // Filter by experience
    if (experience) {
      if (experience === '0-5') {
        query.experience = { $lte: 5 };
      } else if (experience === '5-10') {
        query.experience = { $gt: 5, $lte: 10 };
      } else if (experience === '10+') {
        query.experience = { $gt: 10 };
      }
    }

    // Filter by gender
    if (gender) {
      query['user.gender'] = gender;
    }

    // Filter by availability
    if (availability === 'available') {
      query.status = 'active';
      query['availabilitySchedule.isAvailable'] = true;
    }

    const doctors = await Doctor.find(query)
      .populate('userId', 'name email gender profileImage')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ averageRating: -1 });

    const total = await Doctor.countDocuments(query);

    res.status(200).json({
      success: true,
      data: doctors,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all specializations
// @route   GET /api/v1/doctors/specializations
// @access  Public
const getSpecializations = async (req, res) => {
  try {
    const specializations = await Doctor.distinct('specialization');
    res.status(200).json({
      success: true,
      data: specializations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get doctor's availability
// @route   GET /api/v1/doctors/:id/availability
// @access  Public
const getDoctorAvailability = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .select('availabilitySchedule');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: doctor.availabilitySchedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get doctor's schedule
// @route   GET /api/doctors/:id/schedule
// @access  Private (Receptionist, Doctor)
const getDoctorSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, month } = req.query;

  // Find doctor
  const doctor = await Doctor.findById(id);
  if (!doctor) {
    throw new ErrorResponse('Doctor not found', 404);
  }

  let startDate, endDate;

  if (month) {
    // If month is provided, get schedule for entire month
    startDate = moment(month).startOf('month');
    endDate = moment(month).endOf('month');
  } else if (date) {
    // If specific date is provided
    startDate = moment(date).startOf('day');
    endDate = moment(date).endOf('day');
  } else {
    // Default to current month
    startDate = moment().startOf('month');
    endDate = moment().endOf('month');
  }

  // Get doctor's working hours and leave schedule
  const workingHours = doctor.workingHours || [];
  const leaveSchedule = await LeaveSchedule.find({
    doctorId: id,
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  });

  // Get all appointments in the date range
  const appointments = await Appointment.find({
    doctorId: id,
    appointmentDate: {
      $gte: startDate.toDate(),
      $lte: endDate.toDate()
    },
    status: { $nin: ['cancelled', 'no-show'] }
  }).populate('patientId', 'firstName lastName contactNumber');

  // Generate schedule for each day
  const schedule = [];
  let currentDate = moment(startDate);

  while (currentDate.isSameOrBefore(endDate)) {
    const dayOfWeek = currentDate.format('dddd').toLowerCase();
    const dayWorkingHours = workingHours.find(wh => wh.day === dayOfWeek);

    // Check if doctor is on leave
    const isOnLeave = leaveSchedule.some(leave => 
      moment(currentDate).isBetween(leave.startDate, leave.endDate, 'day', '[]')
    );

    // Get day's appointments
    const dayAppointments = appointments.filter(apt => 
      moment(apt.appointmentDate).isSame(currentDate, 'day')
    );

    // Generate time slots if doctor is working
    let timeSlots = [];
    if (dayWorkingHours?.isAvailable && !isOnLeave) {
      timeSlots = generateTimeSlots(
        dayWorkingHours.startTime,
        dayWorkingHours.endTime,
        doctor.appointmentDuration || 30
      );

      // Mark booked slots
      timeSlots = timeSlots.map(slot => ({
        ...slot,
        isBooked: dayAppointments.some(apt => 
          apt.timeSlot.start === slot.start && apt.timeSlot.end === slot.end
        ),
        appointment: dayAppointments.find(apt => 
          apt.timeSlot.start === slot.start && apt.timeSlot.end === slot.end
        )
      }));
    }

    schedule.push({
      date: currentDate.format('YYYY-MM-DD'),
      isWorkingDay: dayWorkingHours?.isAvailable || false,
      isOnLeave,
      workingHours: dayWorkingHours,
      timeSlots,
      appointments: dayAppointments
    });

    currentDate.add(1, 'day');
  }

  res.status(200).json({
    success: true,
    data: schedule
  });
});

// @desc    Get doctor's appointments
// @route   GET /api/doctors/:id/appointments
// @access  Private (Receptionist, Doctor)
const getDoctorAppointments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, status } = req.query;

  const query = {
    doctorId: id,
    appointmentDate: {
      $gte: moment(date).startOf('day').toDate(),
      $lte: moment(date).endOf('day').toDate()
    }
  };

  if (status && status !== 'all') {
    query.status = status;
  }

  const appointments = await Appointment.find(query)
    .populate('patientId', 'firstName lastName contactNumber email')
    .sort({ 'timeSlot.start': 1 });

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments
  });
});

// @desc    Update doctor's schedule
// @route   PUT /api/doctors/:id/schedule
// @access  Private (Admin)
const updateDoctorSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { workingHours } = req.body;

  const doctor = await Doctor.findById(id);
  if (!doctor) {
    throw new ErrorResponse('Doctor not found', 404);
  }

  // Validate working hours
  if (workingHours) {
    workingHours.forEach(wh => {
      if (wh.isAvailable) {
        if (!wh.startTime || !wh.endTime) {
          throw new ErrorResponse('Start time and end time are required for working days', 400);
        }
        if (moment(wh.startTime, 'HH:mm').isAfter(moment(wh.endTime, 'HH:mm'))) {
          throw new ErrorResponse('Start time must be before end time', 400);
        }
      }
    });
  }

  doctor.workingHours = workingHours;
  await doctor.save();

  res.status(200).json({
    success: true,
    data: doctor
  });
});

// Helper function to generate time slots
const generateTimeSlots = (startTime, endTime, duration) => {
  const slots = [];
  let currentTime = moment(startTime, 'HH:mm');
  const end = moment(endTime, 'HH:mm');

  while (currentTime.isBefore(end)) {
    const slotEnd = moment(currentTime).add(duration, 'minutes');
    if (slotEnd.isAfter(end)) break;

    slots.push({
      start: currentTime.format('HH:mm'),
      end: slotEnd.format('HH:mm'),
      duration
    });

    currentTime = slotEnd;
  }

  return slots;
};

module.exports = {
  getAllDoctors,
  addDoctor,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  searchDoctors,
  getSpecializations,
  getDoctorAvailability,
  getDoctorSchedule,
  getDoctorAppointments,
  updateDoctorSchedule
};