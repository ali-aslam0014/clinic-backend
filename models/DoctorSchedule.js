const mongoose = require('mongoose');

const doctorScheduleSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  slotDuration: {
    type: Number,
    required: true
  },
  maxAppointments: {
    type: Number,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Prevent duplicate schedules for same day
doctorScheduleSchema.index({ doctorId: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('DoctorSchedule', doctorScheduleSchema);