const Schedule = require('../models/scheduleModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const moment = require('moment');

// Get all schedules with filters
const getAllSchedules = asyncHandler(async (req, res) => {
  try {
    const schedules = await Schedule
      .find()
      .populate({
        path: 'doctorId',
        select: 'name email specialization',
        model: 'Doctor'  // Make sure this matches your Doctor model name
      });

    console.log('Raw schedules:', schedules); // Check raw data

    // Transform the data to include doctor name properly
    const formattedSchedules = schedules.map(schedule => {
      console.log('Individual schedule:', schedule); // Check each schedule
      console.log('Doctor details:', schedule.doctorId); // Check doctor details
      
      return {
        _id: schedule._id,
        doctor: {
          name: schedule.doctorId?.name,
          email: schedule.doctorId?.email
        },
        timeSlots: schedule.timeSlots,
        status: schedule.status
      };
    });

    console.log('Formatted schedules:', formattedSchedules); // Check formatted data

    res.status(200).json({
      success: true,
      data: formattedSchedules
    });
  } catch (error) {
    console.error('Error in getAllSchedules:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching schedules'
    });
  }
});

// Get doctor's schedule
const getDoctorSchedule = asyncHandler(async (req, res) => {
  const schedules = await Schedule.find({ 
    doctorId: req.params.doctorId,
    isActive: true 
  }).sort('day');

  res.status(200).json({
    success: true,
    data: schedules
  });
});

// Add new schedule
const addSchedule = asyncHandler(async (req, res) => {
  try {
    console.log('Received schedule data:', req.body); // Log the incoming data

    // Check for existing schedule
    const existingSchedule = await Schedule.findOne({
      doctorId: req.body.doctorId,
      'timeSlots.day': { $in: req.body.timeSlots.map(slot => slot.day) }
    });

    if (existingSchedule) {
      throw new ErrorResponse('Schedule already exists for this day', 400);
    }

    // Validate time slots
    const timeSlots = req.body.timeSlots;
    if (timeSlots) {
      // Check for valid time format
      const isValidTime = timeSlots.every(slot => {
        return moment(slot.startTime, 'HH:mm', true).isValid() &&
               moment(slot.endTime, 'HH:mm', true).isValid();
      });

      if (!isValidTime) {
        throw new ErrorResponse('Invalid time format. Use HH:mm format', 400);
      }

      // Check for overlapping slots
      for (let i = 0; i < timeSlots.length; i++) {
        for (let j = i + 1; j < timeSlots.length; j++) {
          if (
            moment(timeSlots[i].startTime, 'HH:mm').isSameOrBefore(moment(timeSlots[j].endTime, 'HH:mm')) &&
            moment(timeSlots[i].endTime, 'HH:mm').isSameOrAfter(moment(timeSlots[j].startTime, 'HH:mm'))
          ) {
            throw new ErrorResponse('Time slots cannot overlap', 400);
          }
        }
      }
    }

    const schedule = await Schedule.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Schedule added successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error adding schedule:', error); // Log the error
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update schedule
const updateSchedule = asyncHandler(async (req, res) => {
  let schedule = await Schedule.findById(req.params.id);

  if (!schedule) {
    throw new ErrorResponse('Schedule not found', 404);
  }

  // Validate time slots if updating
  if (req.body.timeSlots) {
    const timeSlots = req.body.timeSlots;
    
    // Check for valid time format
    const isValidTime = timeSlots.every(slot => {
      return moment(slot.start, 'HH:mm', true).isValid() &&
             moment(slot.end, 'HH:mm', true).isValid();
    });

    if (!isValidTime) {
      throw new ErrorResponse('Invalid time format. Use HH:mm format', 400);
    }

    // Check for overlapping slots
    for (let i = 0; i < timeSlots.length; i++) {
      for (let j = i + 1; j < timeSlots.length; j++) {
        if (
          moment(timeSlots[i].start, 'HH:mm').isSameOrBefore(moment(timeSlots[j].end, 'HH:mm')) &&
          moment(timeSlots[i].end, 'HH:mm').isSameOrAfter(moment(timeSlots[j].start, 'HH:mm'))
        ) {
          throw new ErrorResponse('Time slots cannot overlap', 400);
        }
      }
    }
  }

  schedule = await Schedule.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    message: 'Schedule updated successfully',
    data: schedule
  });
});

// Delete schedule
const deleteSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);

  if (!schedule) {
    throw new ErrorResponse('Schedule not found', 404);
  }

  await schedule.remove();

  res.status(200).json({
    success: true,
    message: 'Schedule deleted successfully'
  });
});

// Get available slots for a specific date
const getAvailableSlots = asyncHandler(async (req, res) => {
  const { doctorId, date } = req.query;

  if (!doctorId || !date) {
    throw new ErrorResponse('Please provide doctorId and date', 400);
  }

  const dayOfWeek = moment(date).format('dddd');

  const schedule = await Schedule.findOne({
    doctorId,
    day: dayOfWeek,
    isActive: true
  });

  if (!schedule) {
    return res.status(200).json({
      success: true,
      message: 'No schedule found for this day',
      data: []
    });
  }

  res.status(200).json({
    success: true,
    data: schedule.timeSlots
  });
});

module.exports = {
  getAllSchedules,
  getDoctorSchedule,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  getAvailableSlots
};