const asyncHandler = require('express-async-handler');
const moment = require('moment');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// Get all appointments
exports.getAllAppointments = asyncHandler(async (req, res) => {
    const appointments = await Appointment.find()
        .populate('doctorId', 'name specialization')
        .populate('patientId', 'name email')
        .sort('-appointmentDate');

    res.status(200).json({
        success: true,
        data: appointments
    });
});

// Get appointments by status
exports.getAppointmentsByStatus = asyncHandler(async (req, res) => {
    const appointments = await Appointment.find({ status: req.params.status })
        .populate('doctorId', 'name specialization')
        .populate('patientId', 'name email');

    res.status(200).json({
        success: true,
        data: appointments
    });
});

// Get appointments by doctor
exports.getAppointmentsByDoctor = asyncHandler(async (req, res) => {
    const appointments = await Appointment.find({ doctorId: req.params.doctorId })
        .populate('patientId', 'name email');

    res.status(200).json({
        success: true,
        data: appointments
    });
});

// Get doctor schedule
exports.getDoctorSchedule = asyncHandler(async (req, res) => {
    const schedule = await Appointment.find({
        doctorId: req.params.doctorId,
        appointmentDate: {
            $gte: moment().startOf('day'),
            $lte: moment().endOf('day')
        }
    }).populate('patientId', 'name');

    res.status(200).json({
        success: true,
        data: schedule
    });
});

// Get appointments by date range
exports.getAppointmentsByDateRange = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const appointments = await Appointment.find({
        appointmentDate: {
            $gte: moment(startDate).startOf('day'),
            $lte: moment(endDate).endOf('day')
        }
    }).populate('doctorId patientId');

    res.status(200).json({
        success: true,
        data: appointments
    });
});

// Check slot availability
exports.checkSlotAvailability = asyncHandler(async (req, res) => {
    const { doctorId, date, startTime, endTime } = req.body;
    const isAvailable = await Appointment.isSlotAvailable(doctorId, date, startTime, endTime);

    res.status(200).json({
        success: true,
        available: isAvailable
    });
});

// Get available slots
exports.getAvailableSlots = asyncHandler(async (req, res) => {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
        throw new ErrorResponse('Please provide both doctorId and date', 400);
    }

    const doctor = await User.findOne({ 
        _id: doctorId, 
        role: 'doctor' 
    }).select('schedule workingHours');
    
    if (!doctor) {
        throw new ErrorResponse('Doctor not found', 404);
    }

    const existingAppointments = await Appointment.find({
        doctorId,
        appointmentDate: {
            $gte: moment(date).startOf('day'),
            $lte: moment(date).endOf('day')
        },
        status: { $nin: ['cancelled', 'completed', 'no-show'] }
    }).select('timeSlot');

    const workingHours = doctor.workingHours || {
        start: '09:00',
        end: '17:00',
        slotDuration: 30
    };

    const slots = [];
    const startTime = moment(workingHours.start, 'HH:mm');
    const endTime = moment(workingHours.end, 'HH:mm');
    const slotDuration = workingHours.slotDuration || 30;

    while (startTime.isBefore(endTime)) {
        const slotStart = startTime.format('HH:mm');
        const slotEnd = startTime.add(slotDuration, 'minutes').format('HH:mm');
        
        const isAvailable = await Appointment.isSlotAvailable(
            doctorId,
            moment(date).toDate(),
            slotStart,
            slotEnd
        );

        if (isAvailable) {
            slots.push({
                start: slotStart,
                end: slotEnd,
                duration: slotDuration
            });
        }
    }

    res.status(200).json({
        success: true,
        data: slots
    });
});

// Create appointment
exports.createAppointment = asyncHandler(async (req, res) => {
    const appointment = await Appointment.create(req.body);
    res.status(201).json({
        success: true,
        data: appointment
    });
});

// Update appointment
exports.updateAppointment = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!appointment) {
        throw new ErrorResponse('Appointment not found', 404);
    }

    res.status(200).json({
        success: true,
        data: appointment
    });
});

// Delete appointment
exports.deleteAppointment = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);

    if (!appointment) {
        throw new ErrorResponse('Appointment not found', 404);
    }

    res.status(200).json({
        success: true,
        data: {}
    });
});

// Get appointment by ID
exports.getAppointmentById = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id)
        .populate('doctorId', 'name specialization')
        .populate('patientId', 'name email');

    if (!appointment) {
        throw new ErrorResponse('Appointment not found', 404);
    }

    res.status(200).json({
        success: true,
        data: appointment
    });
});

// Check-in appointment
exports.checkInAppointment = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        {
            'checkedIn.status': true,
            'checkedIn.time': Date.now()
        },
        { new: true }
    );

    if (!appointment) {
        throw new ErrorResponse('Appointment not found', 404);
    }

    res.status(200).json({
        success: true,
        data: appointment
    });
});

// Cancel appointment
exports.cancelAppointment = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        {
            status: 'cancelled',
            'cancelledBy.user': req.user.id,
            'cancelledBy.reason': req.body.reason,
            'cancelledBy.date': Date.now()
        },
        { new: true }
    );

    if (!appointment) {
        throw new ErrorResponse('Appointment not found', 404);
    }

    res.status(200).json({
        success: true,
        data: appointment
    });
});

// Complete appointment
exports.completeAppointment = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        {
            status: 'completed',
            completedAt: Date.now(),
            ...req.body
        },
        { new: true }
    );

    if (!appointment) {
        throw new ErrorResponse('Appointment not found', 404);
    }

    res.status(200).json({
        success: true,
        data: appointment
    });
});

// Reschedule appointment
exports.rescheduleAppointment = asyncHandler(async (req, res) => {
    const { appointmentDate, timeSlot } = req.body;
    
    const appointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        {
            appointmentDate,
            timeSlot,
            status: 'rescheduled'
        },
        { new: true }
    );

    if (!appointment) {
        throw new ErrorResponse('Appointment not found', 404);
    }

    res.status(200).json({
        success: true,
        data: appointment
    });
});

// Get appointment stats
exports.getAppointmentStats = asyncHandler(async (req, res) => {
    const stats = await Appointment.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: stats
    });
});

// Get my appointments (for patients)
exports.getMyAppointments = asyncHandler(async (req, res) => {
    try {
        console.log('User ID:', req.user._id); // Debug log

        const appointments = await Appointment.find({ 
            patientId: req.user._id 
        })
        .populate('doctorId', 'name specialization profileImage')
        .sort('-appointmentDate');

        console.log('Found appointments:', appointments); // Debug log

        res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments
        });
    } catch (error) {
        console.error('Error in getMyAppointments:', error); // Debug log
        throw new ErrorResponse('Error fetching appointments', 500);
    }
});

// Book appointment (for patients)
exports.bookAppointment = asyncHandler(async (req, res) => {
    req.body.patientId = req.user.id;
    const appointment = await Appointment.create(req.body);

    res.status(201).json({
        success: true,
        data: appointment
    });
});

// Get upcoming appointments
exports.getUpcomingAppointments = asyncHandler(async (req, res) => {
    const appointments = await Appointment.find({
        appointmentDate: { $gte: new Date() },
        status: { $in: ['pending', 'confirmed'] }
    }).populate('doctorId patientId');

    res.status(200).json({
        success: true,
        data: appointments
    });
});

// Get patient appointment stats
exports.getPatientAppointmentStats = asyncHandler(async (req, res) => {
    const stats = await Appointment.aggregate([
        {
            $match: { patientId: req.user._id }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: stats
    });
});

// Search appointments
exports.searchAppointments = asyncHandler(async (req, res) => {
    const { query } = req.query;
    const appointments = await Appointment.find({
        $or: [
            { 'patientId.name': { $regex: query, $options: 'i' } },
            { 'doctorId.name': { $regex: query, $options: 'i' } }
        ]
    }).populate('doctorId patientId');

    res.status(200).json({
        success: true,
        data: appointments
    });
});

// Get queue by date
exports.getQueueByDate = asyncHandler(async (req, res) => {
    const { date } = req.query;
    const queue = await Appointment.find({
        appointmentDate: {
            $gte: moment(date).startOf('day'),
            $lte: moment(date).endOf('day')
        },
        status: 'confirmed',
        'checkedIn.status': true
    }).sort('checkedIn.time');

    res.status(200).json({
        success: true,
        data: queue
    });
});

// Get queue stats
exports.getQueueStats = asyncHandler(async (req, res) => {
    const stats = await Appointment.aggregate([
        {
            $match: {
                appointmentDate: {
                    $gte: moment().startOf('day').toDate(),
                    $lte: moment().endOf('day').toDate()
                }
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: stats
    });
});

// Call next patient
exports.callNextPatient = asyncHandler(async (req, res) => {
    const nextPatient = await Appointment.findOneAndUpdate(
        {
            appointmentDate: {
                $gte: moment().startOf('day'),
                $lte: moment().endOf('day')
            },
            status: 'confirmed',
            'checkedIn.status': true,
            'called': { $ne: true }
        },
        { called: true },
        { new: true, sort: { 'checkedIn.time': 1 } }
    );

    res.status(200).json({
        success: true,
        data: nextPatient
    });
});

// Create emergency appointment
exports.createEmergencyAppointment = asyncHandler(async (req, res) => {
    req.body.type = 'Emergency';
    req.body.priority = 'Urgent';
    const appointment = await Appointment.create(req.body);

    res.status(201).json({
        success: true,
        data: appointment
    });
});

// Get emergency queue
exports.getEmergencyQueue = asyncHandler(async (req, res) => {
    const queue = await Appointment.find({
        type: 'Emergency',
        status: { $in: ['pending', 'confirmed'] }
    }).sort('-priority createdAt');

    res.status(200).json({
        success: true,
        data: queue
    });
});

// Get emergency stats
exports.getEmergencyStats = asyncHandler(async (req, res) => {
    const stats = await Appointment.aggregate([
        {
            $match: { type: 'Emergency' }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: stats
    });
});

// Get today's appointments
exports.getTodayAppointments = asyncHandler(async (req, res) => {
    const appointments = await Appointment.find({
        appointmentDate: {
            $gte: moment().startOf('day'),
            $lte: moment().endOf('day')
        }
    }).populate('doctorId patientId');

    res.status(200).json({
        success: true,
        data: appointments
    });
});

// Update today's appointment status
exports.updateTodayAppointmentStatus = asyncHandler(async (req, res) => {
    const appointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
    );

    if (!appointment) {
        throw new ErrorResponse('Appointment not found', 404);
    }

    res.status(200).json({
        success: true,
        data: appointment
    });
});

// Get today's appointment stats
exports.getTodayAppointmentStats = asyncHandler(async (req, res) => {
    const stats = await Appointment.aggregate([
        {
            $match: {
                appointmentDate: {
                    $gte: moment().startOf('day').toDate(),
                    $lte: moment().endOf('day').toDate()
                }
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: stats
    });
});

// Schedule appointment
exports.scheduleAppointment = asyncHandler(async (req, res) => {
    const appointment = await Appointment.create(req.body);

    res.status(201).json({
        success: true,
        data: appointment
    });
});