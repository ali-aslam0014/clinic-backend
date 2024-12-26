const mongoose = require('mongoose');

const leaveScheduleSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Vacation', 'Sick', 'Conference', 'Other'],
    default: 'Other'
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Validate date range
leaveScheduleSchema.pre('save', function(next) {
  if (this.startDate > this.endDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

module.exports = mongoose.model('LeaveSchedule', leaveScheduleSchema);