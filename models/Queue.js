const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  tokenNumber: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'in-consultation', 'completed', 'cancelled', 'no-show'],
    default: 'waiting'
  },
  checkInTime: {
    type: Date,
    default: Date.now
  },
  consultationStartTime: Date,
  consultationEndTime: Date,
  notes: String
}, {
  timestamps: true
});

// Generate token number
queueSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastQueue = await this.constructor.findOne({
      doctorId: this.doctorId,
      date: {
        $gte: moment(this.date).startOf('day'),
        $lte: moment(this.date).endOf('day')
      }
    }).sort({ tokenNumber: -1 });

    this.tokenNumber = lastQueue ? lastQueue.tokenNumber + 1 : 1;
  }
  next();
});

module.exports = mongoose.model('Queue', queueSchema);