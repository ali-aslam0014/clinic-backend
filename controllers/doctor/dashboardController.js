const Doctor = require('../../models/Doctor');
const Appointment = require('../../models/Appointment');
const Patient = require('../../models/Patient');
const ErrorResponse = require('../../utils/errorResponse');
const asyncHandler = require('../../middleware/async');

// @desc    Get all dashboard data
// @route   GET /api/v1/doctor/dashboard
// @access  Private/Doctor
exports.getDashboardData = asyncHandler(async (req, res, next) => {
  const doctorId = req.user.doctorId;

  // Get basic stats
  const stats = await getBasicStats(doctorId);
  
  // Get recent patients
  const recentPatients = await getRecentPatients(doctorId);
  
  // Get upcoming appointments
  const upcomingAppointments = await getUpcomingAppointments(doctorId);
  
  // Get today's schedule
  const todaySchedule = await getTodaySchedule(doctorId);

  res.status(200).json({
    success: true,
    data: {
      stats,
      recentPatients,
      upcomingAppointments,
      todaySchedule
    }
  });
});

// @desc    Get dashboard stats
// @route   GET /api/v1/doctor/dashboard/stats
// @access  Private/Doctor
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  const doctorId = req.user.doctorId;
  const stats = await getBasicStats(doctorId);
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

// @desc    Get recent appointments
// @route   GET /api/v1/doctor/dashboard/appointments/recent
// @access  Private/Doctor
exports.getRecentAppointments = asyncHandler(async (req, res, next) => {
  const doctorId = req.user.doctorId;
  const appointments = await getRecentPatients(doctorId);
  
  res.status(200).json({
    success: true,
    data: appointments
  });
});

// @desc    Get upcoming appointments
// @route   GET /api/v1/doctor/dashboard/appointments/upcoming
// @access  Private/Doctor
exports.getUpcomingAppointments = asyncHandler(async (req, res, next) => {
  const doctorId = req.user.doctorId;
  const appointments = await getUpcomingAppointments(doctorId);
  
  res.status(200).json({
    success: true,
    data: appointments
  });
});

// @desc    Get monthly stats
// @route   GET /api/v1/doctor/dashboard/stats/monthly
// @access  Private/Doctor
exports.getMonthlyStats = asyncHandler(async (req, res, next) => {
  const doctorId = req.user.doctorId;
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  const stats = await Appointment.aggregate([
    {
      $match: {
        doctor: doctorId,
        date: { $gte: lastMonth }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
          day: { $dayOfMonth: "$date" }
        },
        count: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
          }
        }
      }
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: stats
  });
});

// Helper function to get basic stats
const getBasicStats = async (doctorId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalPatients,
    todayAppointments,
    completedAppointments,
    pendingAppointments
  ] = await Promise.all([
    // Total unique patients
    Appointment.distinct('patient', { doctor: doctorId }).then(patients => patients.length),
    
    // Today's appointments
    Appointment.countDocuments({
      doctor: doctorId,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }),
    
    // Completed appointments
    Appointment.countDocuments({
      doctor: doctorId,
      status: 'completed'
    }),
    
    // Pending appointments
    Appointment.countDocuments({
      doctor: doctorId,
      status: 'pending'
    })
  ]);

  return {
    totalPatients,
    todayAppointments,
    completedAppointments,
    pendingAppointments
  };
};

// Helper function to get recent patients
const getRecentPatients = async (doctorId) => {
  return await Appointment.find({ doctor: doctorId })
    .sort('-date')
    .limit(5)
    .populate('patient', 'name email phone lastVisit status')
    .select('patient date status')
    .then(appointments => appointments.map(apt => ({
      id: apt.patient._id,
      name: apt.patient.name,
      lastVisit: apt.date,
      status: apt.status
    })));
};

// Helper function to get upcoming appointments
const getUpcomingAppointments = async (doctorId) => {
  const now = new Date();
  
  return await Appointment.find({
    doctor: doctorId,
    date: { $gt: now },
    status: { $ne: 'cancelled' }
  })
    .sort('date')
    .limit(5)
    .populate('patient', 'name')
    .select('date type status')
    .then(appointments => appointments.map(apt => ({
      id: apt._id,
      time: apt.date.toLocaleTimeString(),
      patientName: apt.patient.name,
      type: apt.type,
      status: apt.status
    })));
};

// Helper function to get today's schedule
const getTodaySchedule = async (doctorId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await Appointment.find({
    doctor: doctorId,
    date: {
      $gte: today,
      $lt: tomorrow
    }
  })
    .sort('date')
    .populate('patient', 'name')
    .select('date type status')
    .then(appointments => appointments.map(apt => ({
      id: apt._id,
      time: apt.date.toLocaleTimeString(),
      patientName: apt.patient.name,
      type: apt.type,
      status: apt.status
    })));
};

// @desc    Get doctor profile
// @route   GET /api/v1/doctor/profile
// @access  Private/Doctor
exports.getDoctorProfile = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findById(req.user.doctorId)
    .select('name email specialization');

  if (!doctor) {
    return next(new ErrorResponse('Doctor not found', 404));
  }

  res.status(200).json({
    success: true,
    data: doctor
  });
});