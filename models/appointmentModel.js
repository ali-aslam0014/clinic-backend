const mongoose = require('mongoose');
const moment = require('moment');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  timeSlot: {
    start: {
      type: String,
      required: true
    },
    end: {
      type: String,
      required: true
    }
  },
  type: {
    type: String,
    enum: ['regular', 'followup', 'emergency'],
    default: 'regular'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  reason: {
    type: String,
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  patientPhone: {
    type: String,
    required: true
  },
  notes: String,
  cancelReason: String,
  tokenNumber: {
    type: Number
  },
  checkInTime: {
    type: Date
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  waitingTime: {
    type: Number  // in minutes
  },
  queuePosition: {
    type: Number
  },
  severity: {
    type: String,
    enum: ['critical', 'severe', 'moderate', 'minor'],
    required: function() {
      return this.type === 'emergency';
    }
  },
  chiefComplaint: {
    type: String,
    required: function() {
      return this.type === 'emergency';
    }
  },
  vitalSigns: {
    bp: String,
    pulse: String,
    temp: String,
    oxygen: String
  },
  priority: {
    type: Number,
    default: function() {
      if (this.type !== 'emergency') return 0;
      switch (this.severity) {
        case 'critical': return 4;
        case 'severe': return 3;
        case 'moderate': return 2;
        case 'minor': return 1;
        default: return 0;
      }
    }
  }
}, {
  timestamps: true
});

// Calculate waiting time
appointmentSchema.methods.calculateWaitingTime = function() {
  if (this.startTime && this.checkInTime) {
    return moment(this.startTime).diff(moment(this.checkInTime), 'minutes');
  }
  return 0;
};

// Static method to check slot availability
appointmentSchema.statics.isSlotAvailable = async function(doctorId, date, startTime, endTime) {
  const existingAppointment = await this.findOne({
    doctorId,
    appointmentDate: {
      $eq: moment(date).startOf('day').toDate()
    },
    status: { $nin: ['cancelled'] },
    'timeSlot.start': startTime
  });

  return !existingAppointment;
};

// Add index for priority queuing
appointmentSchema.index({ priority: -1, createdAt: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);