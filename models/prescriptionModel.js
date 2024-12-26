const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  frequency: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  durationUnit: {
    type: String,
    enum: ['days', 'weeks', 'months'],
    default: 'days'
  },
  instructions: String,
  startDate: Date,
  endDate: Date
});

const prescriptionSchema = new mongoose.Schema({
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
  prescriptionDate: {
    type: Date,
    required: true
  },
  diagnosis: String,
  medicines: [medicineSchema],
  instructions: String,
  followUpDate: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Prescription', prescriptionSchema);