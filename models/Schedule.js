const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  start: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time in HH:mm format']
  },
  end: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time in HH:mm format']
  }
});

const scheduleSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  day: {
    type: String,
    required: [true, 'Day is required'],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  timeSlots: [timeSlotSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Prevent duplicate schedules for same doctor and day
scheduleSchema.index({ doctorId: 1, day: 1 }, { unique: true });

// Method to check if time slots overlap
scheduleSchema.methods.hasOverlappingSlots = function() {
  const slots = this.timeSlots.map(slot => ({
    start: moment(slot.start, 'HH:mm'),
    end: moment(slot.end, 'HH:mm')
  }));

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (
        (slots[i].start <= slots[j].end && slots[i].end >= slots[j].start) ||
        (slots[j].start <= slots[i].end && slots[j].end >= slots[i].start)
      ) {
        return true;
      }
    }
  }
  return false;
};

module.exports = mongoose.model('Schedule', scheduleSchema);