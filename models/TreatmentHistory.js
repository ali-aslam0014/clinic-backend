const mongoose = require('mongoose');

const treatmentHistorySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  visitDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  chiefComplaint: {
    type: String,
    required: [true, 'Please add chief complaint']
  },
  diagnosis: {
    type: String,
    required: [true, 'Please add diagnosis']
  },
  symptoms: [{
    type: String,
    required: true
  }],
  vitalSigns: {
    bloodPressure: String,
    temperature: String,
    pulseRate: String,
    respiratoryRate: String,
    weight: String,
    height: String,
    bmi: String
  },
  treatment: {
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    procedures: [{
      name: String,
      description: String,
      date: Date,
      notes: String
    }],
    instructions: String
  },
  followUp: {
    required: {
      type: Boolean,
      default: false
    },
    date: Date,
    notes: String
  },
  attachments: [{
    name: String,
    fileUrl: String,
    fileType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  notes: String,
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Scheduled', 'Cancelled'],
    default: 'Active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TreatmentHistory', treatmentHistorySchema);